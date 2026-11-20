//! Nightfire value validation and two-lookup resolution.

use crate::block::BlockData;
use crate::registry::{BlockDescriptor, BlockRegistry, StrategyRegistry};
use crate::strategy::{NightfireStrategy, StrategyCardinality};
use crate::value::NightfireValue;

/// Validation error when checking a `NightfireValue` against a
/// `NightfireStrategy`.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum NightfireValidationError {
    /// The value's block count does not match the strategy's cardinality.
    #[error("cardinality mismatch for schema {schema}: expected {expected}, got {actual_blocks}")]
    CardinalityMismatch {
        schema: String,
        expected: StrategyCardinality,
        actual_blocks: usize,
    },
    /// The value references a block type that is not permitted by the
    /// strategy's `allowed_types` or `allowed_categories`.
    #[error("disallowed block type {block_type} for schema {schema}")]
    DisallowedBlockType { schema: String, block_type: String },
    /// The value references a block type that is unknown to the
    /// block registry.
    #[error("unknown block type {block_type} for schema {schema}")]
    UnknownBlockType { schema: String, block_type: String },
    /// The stored block version is not in the registry's supported set.
    #[error("unknown block version {version} for type {block_type} in schema {schema}")]
    UnknownBlockVersion {
        schema: String,
        block_type: String,
        version: String,
    },
    /// No strategy is registered for the given schema identifier.
    #[error("no strategy registered for schema {schema}")]
    UnknownStrategy { schema: String },
}

/// A stored block resolved to its current implementation.
#[derive(Debug, Clone, Copy)]
pub struct ResolvedBlock<'a, C> {
    pub block: &'a BlockData,
    pub descriptor: &'a BlockDescriptor<C>,
    pub current_version: &'static str,
}

/// A Nightfire value after the two-lookup resolution rule:
/// 1. strategy → cardinality + allowed types
/// 2. block type+version → current implementation
#[derive(Debug, Clone)]
pub struct ResolvedNightfireValue<'a, C> {
    pub schema: &'a str,
    pub strategy: &'a NightfireStrategy<C>,
    pub blocks: Vec<ResolvedBlock<'a, C>>,
}

/// Resolve one stored block's type and version to its current implementation.
///
/// Unknown types and unknown versions fail closed.
fn resolve_block<'a, C>(
    schema: &str,
    block: &BlockData,
    block_registry: &'a BlockRegistry<C>,
) -> Result<(&'a BlockDescriptor<C>, &'static str), NightfireValidationError> {
    let descriptor = block_registry.get(&block.r#type).ok_or_else(|| {
        NightfireValidationError::UnknownBlockType {
            schema: schema.to_owned(),
            block_type: block.r#type.clone(),
        }
    })?;

    let current = descriptor.versions.coerce(&block.version).ok_or_else(|| {
        NightfireValidationError::UnknownBlockVersion {
            schema: schema.to_owned(),
            block_type: block.r#type.clone(),
            version: block.version.clone(),
        }
    })?;

    Ok((descriptor, current))
}

/// Coerce every supported older block version onto the current
/// implementation version. Unknown versions fail closed.
///
/// Every block is resolved before any is changed, so an error leaves `value`
/// exactly as it was.
pub fn coerce_block_versions<C>(
    value: &mut NightfireValue,
    block_registry: &BlockRegistry<C>,
) -> Result<(), NightfireValidationError> {
    let schema = value.schema.as_str();

    for block in &value.blocks {
        resolve_block(schema, block, block_registry)?;
    }

    // The registry is borrowed immutably and each block is resolved against its
    // own original version before that block changes, so this pass cannot fail.
    for block in &mut value.blocks {
        let (_, current) = resolve_block(schema, block, block_registry)?;
        if block.version != current {
            block.version = current.to_owned();
        }
    }

    Ok(())
}

/// Resolve a stored value with the two-lookup rule.
pub fn resolve_nightfire_value<'a, C>(
    value: &'a NightfireValue,
    strategy: &'a NightfireStrategy<C>,
    block_registry: &'a BlockRegistry<C>,
) -> Result<ResolvedNightfireValue<'a, C>, NightfireValidationError>
where
    C: PartialEq,
{
    validate_cardinality(value, strategy)?;

    let schema = value.schema.as_str();
    let mut resolved_blocks = Vec::with_capacity(value.blocks.len());

    for block in &value.blocks {
        check_block_allowed(schema, block, strategy, block_registry)?;
        let (descriptor, current_version) = resolve_block(schema, block, block_registry)?;
        resolved_blocks.push(ResolvedBlock {
            block,
            descriptor,
            current_version,
        });
    }

    Ok(ResolvedNightfireValue {
        schema,
        strategy,
        blocks: resolved_blocks,
    })
}

/// Validate a `NightfireValue` against the given `NightfireStrategy`.
///
/// This enforces:
/// - Cardinality (`Single` means `blocks.len() == 1`; `Multi` uses min/max).
/// - Allowed block types, derived from:
///   - `allowed_types` (explicit allow list), and/or
///   - `allowed_categories` via the provided `BlockRegistry`.
///
/// When either list is non-empty, a block must match one of them.
/// - Block type registration and supported versions (unknown version fails
///   closed).
pub fn validate_nightfire_value<C>(
    value: &NightfireValue,
    strategy: &NightfireStrategy<C>,
    block_registry: &BlockRegistry<C>,
) -> Result<(), NightfireValidationError>
where
    C: PartialEq,
{
    resolve_nightfire_value(value, strategy, block_registry).map(|_| ())
}

/// Resolve and validate a value by looking up its schema in the strategy
/// registry, then resolving each block type+version.
pub fn resolve_nightfire_value_by_schema<'a, C>(
    value: &'a NightfireValue,
    strategy_registry: &'a StrategyRegistry<C>,
    block_registry: &'a BlockRegistry<C>,
) -> Result<ResolvedNightfireValue<'a, C>, NightfireValidationError>
where
    C: PartialEq,
{
    let schema = value.schema.as_str();
    let strategy = strategy_registry.get_by_str(schema).ok_or_else(|| {
        NightfireValidationError::UnknownStrategy {
            schema: schema.to_owned(),
        }
    })?;

    resolve_nightfire_value(value, strategy, block_registry)
}

fn validate_cardinality<C>(
    value: &NightfireValue,
    strategy: &NightfireStrategy<C>,
) -> Result<(), NightfireValidationError> {
    let block_count = value.blocks.len();
    let within_bounds = match strategy.cardinality {
        StrategyCardinality::Single => block_count == 1,
        StrategyCardinality::Multi(config) => {
            block_count >= config.min_blocks().get()
                && config.max_blocks().is_none_or(|max| block_count <= max)
        }
    };

    if within_bounds {
        return Ok(());
    }

    Err(NightfireValidationError::CardinalityMismatch {
        schema: value.schema.as_str().to_owned(),
        expected: strategy.cardinality,
        actual_blocks: block_count,
    })
}

/// Reject a block whose type fails both allowlists.
///
/// With neither list set, every type is allowed here and the registry lookup
/// in `resolve_block` decides. With either list set, a block must match a
/// listed type or a listed category; a block that matches neither is rejected.
fn check_block_allowed<C>(
    schema: &str,
    block: &BlockData,
    strategy: &NightfireStrategy<C>,
    block_registry: &BlockRegistry<C>,
) -> Result<(), NightfireValidationError>
where
    C: PartialEq,
{
    if strategy.allowed_types.is_empty() && strategy.allowed_categories.is_empty() {
        return Ok(());
    }

    if strategy.allowed_types.iter().any(|t| t == &block.r#type) {
        return Ok(());
    }

    if !strategy.allowed_categories.is_empty() {
        let descriptor = block_registry.get(&block.r#type).ok_or_else(|| {
            NightfireValidationError::UnknownBlockType {
                schema: schema.to_owned(),
                block_type: block.r#type.clone(),
            }
        })?;

        if strategy.allowed_categories.contains(&descriptor.category) {
            return Ok(());
        }
    }

    Err(NightfireValidationError::DisallowedBlockType {
        schema: schema.to_owned(),
        block_type: block.r#type.clone(),
    })
}

#[cfg(test)]
#[path = "tests/validation_tests.rs"]
mod tests;
