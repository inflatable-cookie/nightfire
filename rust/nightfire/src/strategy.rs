//! Nightfire strategy types for describing content shape.

use std::fmt;
use std::num::NonZeroUsize;

use crate::value::SchemaId;

/// Cardinality for a Nightfire strategy.
///
/// Strategies only describe non-null values. An "empty" Nightfire
/// payload should be normalised to `null` at the field boundary,
/// so `min_blocks` is always at least 1.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StrategyCardinality {
    /// Exactly one block.
    Single,
    /// Multiple blocks within a min/max range.
    Multi(MultiConfig),
}

impl fmt::Display for StrategyCardinality {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Single => write!(f, "exactly 1 block"),
            Self::Multi(config) => match config.max_blocks {
                Some(max) => write!(f, "{} to {max} blocks", config.min_blocks),
                None => write!(f, "{}+ blocks", config.min_blocks),
            },
        }
    }
}

/// Multi-block configuration for a strategy.
///
/// Construction guarantees that a maximum, when set, is at least the minimum.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MultiConfig {
    min_blocks: NonZeroUsize,
    max_blocks: Option<usize>,
}

/// Reasons a `MultiConfig` cannot be built.
#[derive(Debug, Clone, Copy, PartialEq, Eq, thiserror::Error)]
pub enum MultiConfigError {
    /// The maximum is below the minimum, so no value could satisfy it.
    #[error("max blocks {max_blocks} is below min blocks {min_blocks}")]
    MaxBelowMin {
        min_blocks: NonZeroUsize,
        max_blocks: usize,
    },
}

impl MultiConfig {
    /// Create a multi-block config with a minimum block count and no maximum.
    pub fn new(min_blocks: NonZeroUsize) -> Self {
        Self {
            min_blocks,
            max_blocks: None,
        }
    }

    /// Create a multi-block config that accepts one or more blocks.
    pub fn one_or_more() -> Self {
        Self::new(NonZeroUsize::MIN)
    }

    /// Set the maximum allowed block count.
    ///
    /// Fails when `max_blocks` is below the minimum, which includes zero.
    pub fn with_max_blocks(self, max_blocks: usize) -> Result<Self, MultiConfigError> {
        if max_blocks < self.min_blocks.get() {
            return Err(MultiConfigError::MaxBelowMin {
                min_blocks: self.min_blocks,
                max_blocks,
            });
        }
        Ok(Self {
            max_blocks: Some(max_blocks),
            ..self
        })
    }

    /// Return the minimum allowed block count.
    pub fn min_blocks(&self) -> NonZeroUsize {
        self.min_blocks
    }

    /// Return the maximum allowed block count.
    pub fn max_blocks(&self) -> Option<usize> {
        self.max_blocks
    }
}

/// Strategy describing how a Nightfire value is shaped and which
/// blocks it may contain for a given schema / strategy ID.
///
/// The `C` type parameter is the category enum used by the consuming
/// application.
#[derive(Debug, Clone)]
pub struct NightfireStrategy<C> {
    /// Schema identifier for this strategy.
    pub id: SchemaId,

    /// Cardinality constraint (single vs multi).
    pub cardinality: StrategyCardinality,

    /// Explicitly allowed block types by name.
    pub allowed_types: Vec<String>,

    /// Allowed block categories (resolved via registry).
    pub allowed_categories: Vec<C>,

    /// Default block type to use when creating new content.
    pub default_type: String,
}

#[cfg(test)]
#[path = "tests/strategy_tests.rs"]
mod tests;
