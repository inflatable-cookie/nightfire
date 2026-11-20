//! Nightfire – a generic block-based content protocol.
//!
//! This crate provides the core engine for Nightfire, a structured content
//! system for storing and validating JSON content with typed blocks and
//! validation strategies.
//!
//! ## Overview
//!
//! Nightfire values always use the shape:
//!
//! ```json
//! {
//!   "schema": "<schema-id>",
//!   "blocks": [ { "id": "nf_...", "type": "...", "version": "...", "data": {} } ]
//! }
//! ```
//!
//! Cardinality is a strategy rule (`len == 1` for singles), not a field
//! shape. Schema IDs are unversioned. Version lives on each block; the
//! registry declares supported versions and the coercion path to the
//! current implementation.
//!
//! ## Generic Design
//!
//! The core types are generic over a `Category` type parameter, allowing
//! consuming applications to define their own block categories (e.g.
//! `Text`, `Media`, `Layout`) without modifying this crate.
//!
//! ## Example
//!
//! ```rust
//! use nightfire::{
//!     Block, BlockDescriptor, BlockRegistry, MultiConfig, NightfireStrategy,
//!     NightfireValue, SchemaId, StrategyCardinality, StrategyRegistry,
//! };
//!
//! // Define your category enum
//! #[derive(Clone, Copy, PartialEq, Eq)]
//! enum MyCategory { Text }
//!
//! // Define a block type
//! struct ParagraphBlock { text: String }
//!
//! impl Block for ParagraphBlock {
//!     const TYPE_NAME: &'static str = "paragraph";
//!     fn to_data(&self) -> serde_json::Value {
//!         serde_json::json!({ "text": self.text })
//!     }
//! }
//!
//! let mut blocks = BlockRegistry::new();
//! blocks.register(BlockDescriptor::new("paragraph", "Paragraph", MyCategory::Text));
//!
//! let mut strategies = StrategyRegistry::new();
//! strategies.register(NightfireStrategy {
//!     id: SchemaId::from("app:content/body"),
//!     cardinality: StrategyCardinality::Multi(MultiConfig::one_or_more()),
//!     allowed_types: vec![],
//!     allowed_categories: vec![MyCategory::Text],
//!     default_type: "paragraph".to_string(),
//! });
//!
//! let block = ParagraphBlock { text: "Hello".into() }.export();
//! let value = NightfireValue::single("app:content/body", block);
//! strategies.validate(&value, &blocks).expect("paragraph is allowed");
//! ```

mod block;
mod hash;
mod media_locator;
mod registry;
mod strategy;
mod validation;
mod value;

// Re-export all public types at the crate root.
pub use block::{generate_block_id, Block, BlockData, BlockVersions, BlockVersionsError};
pub use hash::compute_block_hash;
pub use media_locator::{NightfireMediaLocator, NightfireMediaLocatorError};
pub use registry::{BlockDescriptor, BlockRegistration, BlockRegistry, StrategyRegistry};
pub use strategy::{MultiConfig, MultiConfigError, NightfireStrategy, StrategyCardinality};
pub use validation::{
    coerce_block_versions, resolve_nightfire_value, resolve_nightfire_value_by_schema,
    validate_nightfire_value, NightfireValidationError, ResolvedBlock, ResolvedNightfireValue,
};
pub use value::{ensure_block_ids, NightfireValue, SchemaId};
