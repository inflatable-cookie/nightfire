//! Canonical Nightfire media-reference locators.
//!
//! These locators are designed for `media_usage.locator_key` values when a
//! media reference lives inside a Nightfire block payload. The canonical form
//! anchors on a stable block id and then uses an RFC 6901 JSON Pointer
//! relative to that block's `data` payload:
//!
//! `<block-id>#<json-pointer-relative-to-data>`
//!
//! Example:
//!
//! `hero_01#/pages/1/image_id`
//!
//! A block id never contains `#`, and a pointer is never empty: it must start
//! with `/`, and each `~` must escape `0` or `1`.

use serde_json::Value;

use crate::NightfireValue;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NightfireMediaLocator {
    block_id: String,
    data_pointer: String,
}

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum NightfireMediaLocatorError {
    #[error("locator key missing '#' separator")]
    MissingSeparator,
    #[error("locator missing block id")]
    MissingBlockId,
    #[error("block id must not contain '#': {0}")]
    InvalidBlockId(String),
    #[error("invalid data pointer: {0}")]
    InvalidDataPointer(String),
}

impl NightfireMediaLocator {
    /// Build a locator from a block id and an RFC 6901 pointer.
    ///
    /// The block id is trimmed. It must be non-empty and must not contain `#`,
    /// because `#` separates the block id from the pointer in the locator key.
    pub fn new(
        block_id: impl Into<String>,
        data_pointer: impl Into<String>,
    ) -> Result<Self, NightfireMediaLocatorError> {
        let block_id = block_id.into();
        let block_id = block_id.trim();

        if block_id.is_empty() {
            return Err(NightfireMediaLocatorError::MissingBlockId);
        }

        if block_id.contains('#') {
            return Err(NightfireMediaLocatorError::InvalidBlockId(
                block_id.to_owned(),
            ));
        }

        let data_pointer = data_pointer.into();
        if !is_well_formed_pointer(&data_pointer) {
            return Err(NightfireMediaLocatorError::InvalidDataPointer(data_pointer));
        }

        Ok(Self {
            block_id: block_id.to_owned(),
            data_pointer,
        })
    }

    pub fn parse(locator_key: &str) -> Result<Self, NightfireMediaLocatorError> {
        let (block_id, data_pointer) = locator_key
            .split_once('#')
            .ok_or(NightfireMediaLocatorError::MissingSeparator)?;

        Self::new(block_id, data_pointer)
    }

    /// The anchoring block id.
    pub fn block_id(&self) -> &str {
        &self.block_id
    }

    /// The RFC 6901 pointer, relative to the block's `data`.
    pub fn data_pointer(&self) -> &str {
        &self.data_pointer
    }

    pub fn to_locator_key(&self) -> String {
        format!("{}#{}", self.block_id, self.data_pointer)
    }

    pub fn resolve_in_value<'a>(&self, value: &'a NightfireValue) -> Option<&'a Value> {
        find_block_data_in_value(value, &self.block_id)?.pointer(&self.data_pointer)
    }
}

/// True for a non-empty RFC 6901 pointer: it starts with `/`, and every `~` is
/// followed by `0` or `1`.
fn is_well_formed_pointer(pointer: &str) -> bool {
    if !pointer.starts_with('/') {
        return false;
    }

    let mut chars = pointer.chars();
    while let Some(c) = chars.next() {
        if c == '~' && !matches!(chars.next(), Some('0' | '1')) {
            return false;
        }
    }

    true
}

fn find_block_data_in_value<'a>(value: &'a NightfireValue, block_id: &str) -> Option<&'a Value> {
    // Top-level blocks answer first, then nested ones: a nested block never
    // shadows a top-level block that carries the same id. The TypeScript
    // resolver has the same two passes.
    if let Some(block) = value.blocks.iter().find(|block| block.id == block_id) {
        return Some(&block.data);
    }

    value
        .blocks
        .iter()
        .find_map(|block| find_block_data_in_json(&block.data, block_id))
}

fn find_block_data_in_json<'a>(value: &'a Value, block_id: &str) -> Option<&'a Value> {
    match value {
        Value::Array(items) => items
            .iter()
            .find_map(|item| find_block_data_in_json(item, block_id)),
        Value::Object(map) => {
            // A nested payload is a block only when it carries the id, a string
            // `type` and a `data`. Another object with an `id` and a `data` is
            // payload metadata, and a locator does not address it. The
            // TypeScript resolver uses the same rule, so both name one block.
            let is_block = map
                .get("id")
                .and_then(Value::as_str)
                .is_some_and(|id| id == block_id)
                && map.get("type").is_some_and(Value::is_string)
                && map.contains_key("data");

            if is_block {
                return map.get("data");
            }

            map.values()
                .find_map(|child| find_block_data_in_json(child, block_id))
        }
        _ => None,
    }
}

#[cfg(test)]
#[path = "tests/media_locator_tests.rs"]
mod tests;
