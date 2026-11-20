use super::*;
use crate::block::BlockVersions;
use crate::registry::BlockDescriptor;
use crate::strategy::MultiConfig;
use crate::value::SchemaId;
use serde_json::json;
use std::num::NonZeroUsize;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TestCategory {
    Text,
    Media,
}

fn make_block(type_name: &str) -> BlockData {
    BlockData {
        id: "block_1".to_string(),
        r#type: type_name.to_string(),
        version: "initial".to_string(),
        data: json!({}),
    }
}

fn make_block_at(type_name: &str, version: &str) -> BlockData {
    make_block(type_name).with_version(version)
}

fn test_registry() -> BlockRegistry<TestCategory> {
    let mut registry = BlockRegistry::new();
    registry.register(BlockDescriptor::new(
        "paragraph",
        "Paragraph",
        TestCategory::Text,
    ));
    registry.register(BlockDescriptor::new("image", "Image", TestCategory::Media));
    registry.register(
        BlockDescriptor::new("callout", "Callout", TestCategory::Text)
            .with_versions(BlockVersions::new("2", &["1", "2"]).expect("test versions are valid")),
    );
    registry
}

fn single_strategy() -> NightfireStrategy<TestCategory> {
    NightfireStrategy {
        id: SchemaId::from("test:single"),
        cardinality: StrategyCardinality::Single,
        allowed_types: vec![],
        allowed_categories: vec![TestCategory::Text],
        default_type: "paragraph".to_string(),
    }
}

fn multi_strategy(config: MultiConfig) -> NightfireStrategy<TestCategory> {
    NightfireStrategy {
        id: SchemaId::from("test:multi"),
        cardinality: StrategyCardinality::Multi(config),
        allowed_types: vec![],
        allowed_categories: vec![TestCategory::Text],
        default_type: "paragraph".to_string(),
    }
}

fn allowed_types_only(types: &[&str]) -> NightfireStrategy<TestCategory> {
    NightfireStrategy {
        id: SchemaId::from("test:types"),
        cardinality: StrategyCardinality::Multi(MultiConfig::one_or_more()),
        allowed_types: types.iter().map(|t| (*t).to_string()).collect(),
        allowed_categories: vec![],
        default_type: "paragraph".to_string(),
    }
}

#[test]
fn validates_single_block_in_blocks_array() {
    let registry = test_registry();
    let strategy = single_strategy();
    let value = NightfireValue::single("test:single", make_block("paragraph"));
    let result = validate_nightfire_value(&value, &strategy, &registry);
    assert!(result.is_ok());
}

#[test]
fn rejects_zero_blocks_for_single_strategy() {
    let registry = test_registry();
    let strategy = single_strategy();
    let value = NightfireValue::new("test:single", vec![]);
    let result = validate_nightfire_value(&value, &strategy, &registry);
    assert!(matches!(
        result,
        Err(NightfireValidationError::CardinalityMismatch {
            actual_blocks: 0,
            ..
        })
    ));
}

#[test]
fn rejects_two_blocks_for_single_strategy() {
    let registry = test_registry();
    let strategy = single_strategy();
    let value = NightfireValue::multi(
        "test:single",
        vec![make_block("paragraph"), make_block("paragraph")],
    );
    let result = validate_nightfire_value(&value, &strategy, &registry);
    assert!(matches!(
        result,
        Err(NightfireValidationError::CardinalityMismatch { .. })
    ));
}

#[test]
fn multi_below_min_blocks_is_rejected() {
    let registry = test_registry();
    let min_two = MultiConfig::new(NonZeroUsize::new(2).expect("two is non-zero"));
    let strategy = multi_strategy(min_two);

    let one = NightfireValue::single("test:multi", make_block("paragraph"));
    assert!(matches!(
        validate_nightfire_value(&one, &strategy, &registry),
        Err(NightfireValidationError::CardinalityMismatch {
            actual_blocks: 1,
            ..
        })
    ));

    let none = NightfireValue::new("test:multi", vec![]);
    assert!(matches!(
        validate_nightfire_value(&none, &strategy, &registry),
        Err(NightfireValidationError::CardinalityMismatch {
            actual_blocks: 0,
            ..
        })
    ));
}

#[test]
fn cardinality_mismatch_displays_without_debug_syntax() {
    let registry = test_registry();
    let value = NightfireValue::new("test:single", vec![]);
    let error = validate_nightfire_value(&value, &single_strategy(), &registry)
        .expect_err("zero blocks must fail a single strategy");

    assert_eq!(
        error.to_string(),
        "cardinality mismatch for schema test:single: expected exactly 1 block, got 0"
    );
}

#[test]
fn rejects_disallowed_category() {
    let registry = test_registry();
    let strategy = single_strategy();
    let value = NightfireValue::single("test:single", make_block("image"));
    let result = validate_nightfire_value(&value, &strategy, &registry);
    assert!(matches!(
        result,
        Err(NightfireValidationError::DisallowedBlockType { .. })
    ));
}

#[test]
fn allowed_types_only_accepts_listed_types() {
    let registry = test_registry();
    let strategy = allowed_types_only(&["paragraph"]);
    let value = NightfireValue::single("test:types", make_block("paragraph"));

    assert!(validate_nightfire_value(&value, &strategy, &registry).is_ok());
}

#[test]
fn allowed_types_only_rejects_unlisted_block_types() {
    let registry = test_registry();
    let strategy = allowed_types_only(&["paragraph"]);

    // `image` is registered and would pass a category check, but the strategy
    // has no categories, so the explicit type list is the only gate.
    let registered = NightfireValue::single("test:types", make_block("image"));
    assert!(matches!(
        validate_nightfire_value(&registered, &strategy, &registry),
        Err(NightfireValidationError::DisallowedBlockType { block_type, .. })
            if block_type == "image"
    ));

    // An unregistered type outside the list is also rejected, not waved through.
    let unknown = NightfireValue::single("test:types", make_block("mystery"));
    assert!(matches!(
        validate_nightfire_value(&unknown, &strategy, &registry),
        Err(NightfireValidationError::DisallowedBlockType { .. })
    ));
}

#[test]
fn validates_multi_block_within_range() {
    let registry = test_registry();
    let strategy = multi_strategy(
        MultiConfig::one_or_more()
            .with_max_blocks(3)
            .expect("3 >= 1"),
    );

    let value = NightfireValue::multi(
        "test:multi",
        vec![make_block("paragraph"), make_block("paragraph")],
    );
    let result = validate_nightfire_value(&value, &strategy, &registry);
    assert!(result.is_ok());
}

#[test]
fn rejects_too_many_blocks() {
    let registry = test_registry();
    let strategy = multi_strategy(
        MultiConfig::one_or_more()
            .with_max_blocks(2)
            .expect("2 >= 1"),
    );

    let value = NightfireValue::multi(
        "test:multi",
        vec![
            make_block("paragraph"),
            make_block("paragraph"),
            make_block("paragraph"),
        ],
    );
    let result = validate_nightfire_value(&value, &strategy, &registry);
    assert!(matches!(
        result,
        Err(NightfireValidationError::CardinalityMismatch { .. })
    ));
}

#[test]
fn older_supported_version_resolves_to_current_implementation() {
    let registry = test_registry();
    let strategy = single_strategy();
    let value = NightfireValue::single("test:single", make_block_at("callout", "1"));

    let resolved = resolve_nightfire_value(&value, &strategy, &registry).unwrap();
    assert_eq!(resolved.blocks.len(), 1);
    assert_eq!(resolved.blocks[0].current_version, "2");
    assert_eq!(resolved.blocks[0].descriptor.type_name, "callout");
    assert_eq!(value.blocks[0].version, "1");

    let mut coerced = value.clone();
    coerce_block_versions(&mut coerced, &registry).unwrap();
    assert_eq!(coerced.blocks[0].version, "2");
}

#[test]
fn unknown_version_fails_closed() {
    let registry = test_registry();
    let strategy = single_strategy();
    let value = NightfireValue::single("test:single", make_block_at("callout", "9"));
    let result = validate_nightfire_value(&value, &strategy, &registry);
    assert!(matches!(
        result,
        Err(NightfireValidationError::UnknownBlockVersion {
            version,
            ..
        }) if version == "9"
    ));
}

#[test]
fn unknown_block_type_fails_closed() {
    let registry = test_registry();
    let strategy = NightfireStrategy {
        id: SchemaId::from("test:open"),
        cardinality: StrategyCardinality::Single,
        allowed_types: vec![],
        allowed_categories: vec![],
        default_type: "paragraph".to_string(),
    };
    let value = NightfireValue::single("test:open", make_block("mystery"));
    let result = validate_nightfire_value(&value, &strategy, &registry);
    assert!(matches!(
        result,
        Err(NightfireValidationError::UnknownBlockType { .. })
    ));
}

#[test]
fn coerce_upgrades_every_supported_block() {
    let registry = test_registry();
    let mut value = NightfireValue::multi(
        "test:multi",
        vec![make_block_at("callout", "1"), make_block_at("callout", "2")],
    );

    coerce_block_versions(&mut value, &registry).expect("all versions are supported");

    assert_eq!(value.blocks[0].version, "2");
    assert_eq!(value.blocks[1].version, "2");
}

#[test]
fn coerce_rejects_unknown_version_and_leaves_value_unchanged() {
    let registry = test_registry();
    let mut value = NightfireValue::multi(
        "test:multi",
        vec![make_block_at("callout", "1"), make_block_at("callout", "9")],
    );
    let before = value.clone();

    let result = coerce_block_versions(&mut value, &registry);

    assert!(matches!(
        result,
        Err(NightfireValidationError::UnknownBlockVersion { version, .. }) if version == "9"
    ));
    // The first block was coercible, but a later failure must not leave it
    // half-upgraded.
    assert_eq!(value, before);
    assert_eq!(value.blocks[0].version, "1");
}

#[test]
fn coerce_rejects_unknown_block_type_and_leaves_value_unchanged() {
    let registry = test_registry();
    let mut value = NightfireValue::multi(
        "test:multi",
        vec![make_block_at("callout", "1"), make_block("mystery")],
    );
    let before = value.clone();

    let result = coerce_block_versions(&mut value, &registry);

    assert!(matches!(
        result,
        Err(NightfireValidationError::UnknownBlockType { block_type, .. }) if block_type == "mystery"
    ));
    assert_eq!(value, before);
}
