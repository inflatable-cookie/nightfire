use std::num::NonZeroUsize;

use nightfire::{
    generate_block_id, resolve_nightfire_value_by_schema, BlockDescriptor, BlockRegistry,
    BlockVersions, MultiConfig, NightfireMediaLocator, NightfireStrategy, NightfireValue,
    StrategyCardinality, StrategyRegistry,
};
use serde::Deserialize;
use serde_json::Value;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Fixture {
    values: Vec<FixtureValue>,
    id_generation: IdGeneration,
    registry: RegistryFixture,
    validation_cases: Vec<ValidationCase>,
    media_value: Value,
    media_locator_cases: Vec<MediaLocatorCase>,
    rejected_v1: Value,
}

#[derive(Debug, Deserialize)]
struct FixtureValue {
    value: Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IdGeneration {
    prefix: String,
    length: usize,
    version_nibble: Nibble,
    variant_nibble: VariantNibble,
}

#[derive(Debug, Deserialize)]
struct Nibble {
    index: usize,
    value: char,
}

#[derive(Debug, Deserialize)]
struct VariantNibble {
    index: usize,
    allowed: Vec<char>,
}

#[derive(Debug, Deserialize)]
struct RegistryFixture {
    blocks: Vec<BlockSpec>,
    strategy: StrategySpec,
}

#[derive(Debug, Deserialize)]
struct BlockSpec {
    r#type: String,
    label: String,
    category: String,
    current: String,
    supported: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StrategySpec {
    id: String,
    cardinality: CardinalitySpec,
    allowed_types: Vec<String>,
    allowed_categories: Vec<String>,
    default_type: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CardinalitySpec {
    mode: String,
    min_blocks: Option<usize>,
    max_blocks: Option<usize>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ValidationCase {
    name: String,
    value: Value,
    accepted: bool,
    resolved_versions: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MediaLocatorCase {
    locator: String,
    block_id: String,
    data_pointer: String,
    found: bool,
    resolved: Option<Value>,
}

fn fixture() -> Fixture {
    serde_json::from_str(include_str!("../fixtures/wire/v1/nightfire-values.json"))
        .expect("shared wire fixture must parse")
}

fn leak(value: String) -> &'static str {
    Box::leak(value.into_boxed_str())
}

fn registries(fixture: &RegistryFixture) -> (BlockRegistry<String>, StrategyRegistry<String>) {
    let mut blocks = BlockRegistry::new();
    for spec in &fixture.blocks {
        let supported: Vec<&'static str> = spec.supported.iter().cloned().map(leak).collect();
        blocks.register(
            BlockDescriptor::new(
                leak(spec.r#type.clone()),
                leak(spec.label.clone()),
                spec.category.clone(),
            )
            .with_versions(BlockVersions {
                current: leak(spec.current.clone()),
                supported: Box::leak(supported.into_boxed_slice()),
            }),
        );
    }

    let cardinality = match fixture.strategy.cardinality.mode.as_str() {
        "single" => StrategyCardinality::Single,
        "multi" => {
            let minimum = NonZeroUsize::new(
                fixture
                    .strategy
                    .cardinality
                    .min_blocks
                    .expect("multi strategy needs minBlocks"),
            )
            .expect("minBlocks must be non-zero");
            let mut config = MultiConfig::new(minimum);
            if let Some(maximum) = fixture.strategy.cardinality.max_blocks {
                config = config.with_max_blocks(maximum);
            }
            StrategyCardinality::Multi(config)
        }
        mode => panic!("unsupported fixture cardinality {mode}"),
    };

    let mut strategies = StrategyRegistry::new();
    strategies.register(NightfireStrategy {
        id: fixture.strategy.id.as_str().into(),
        cardinality,
        allowed_types: fixture.strategy.allowed_types.clone(),
        allowed_categories: fixture.strategy.allowed_categories.clone(),
        default_type: fixture.strategy.default_type.clone(),
    });

    (blocks, strategies)
}

#[test]
fn round_trips_every_v2_fixture_value() {
    for entry in fixture().values {
        let value: NightfireValue =
            serde_json::from_value(entry.value.clone()).expect("v2 fixture value must deserialize");
        assert_eq!(serde_json::to_value(value).unwrap(), entry.value);
    }
}

#[test]
fn generates_ids_using_the_shared_contract() {
    let expected = fixture().id_generation;
    let id = generate_block_id();
    let characters: Vec<char> = id.chars().collect();

    assert!(id.starts_with(&expected.prefix));
    assert_eq!(characters.len(), expected.length);
    assert_eq!(
        characters[expected.version_nibble.index],
        expected.version_nibble.value
    );
    assert!(expected
        .variant_nibble
        .allowed
        .contains(&characters[expected.variant_nibble.index]));
}

#[test]
fn builds_real_block_and_strategy_registries_from_the_shared_contract() {
    let fixture = fixture();
    let (blocks, strategies) = registries(&fixture.registry);

    for expected in &fixture.registry.blocks {
        let actual = blocks
            .get(&expected.r#type)
            .expect("fixture block must be registered");
        assert_eq!(actual.label, expected.label);
        assert_eq!(actual.category, expected.category);
        assert_eq!(actual.versions.current, expected.current);
        assert_eq!(actual.versions.supported, expected.supported);
    }

    let actual = strategies
        .get_by_str(&fixture.registry.strategy.id)
        .expect("fixture strategy must be registered");
    assert_eq!(actual.default_type, fixture.registry.strategy.default_type);
    assert_eq!(
        actual.allowed_types,
        fixture.registry.strategy.allowed_types
    );
    assert_eq!(
        actual.allowed_categories,
        fixture.registry.strategy.allowed_categories
    );
}

#[test]
fn validates_shared_cases_through_the_real_registries() {
    let fixture = fixture();
    let (blocks, strategies) = registries(&fixture.registry);

    for case in fixture.validation_cases {
        let value: NightfireValue =
            serde_json::from_value(case.value).expect("validation value must deserialize");
        let result = resolve_nightfire_value_by_schema(&value, &strategies, &blocks);
        assert_eq!(result.is_ok(), case.accepted, "{}", case.name);

        let versions: Vec<String> = result
            .map(|resolved| {
                resolved
                    .blocks
                    .iter()
                    .map(|block| block.current_version.to_owned())
                    .collect()
            })
            .unwrap_or_default();
        assert_eq!(versions, case.resolved_versions, "{}", case.name);
    }
}

#[test]
fn resolves_shared_media_locator_cases() {
    let fixture = fixture();
    let value: NightfireValue =
        serde_json::from_value(fixture.media_value).expect("media value must deserialize");

    for expected in fixture.media_locator_cases {
        let locator = NightfireMediaLocator::parse(&expected.locator)
            .expect("shared media locator must parse");
        assert_eq!(locator.block_id, expected.block_id);
        assert_eq!(locator.data_pointer, expected.data_pointer);
        assert_eq!(locator.to_locator_key(), expected.locator);

        let resolved = locator.resolve_in_value(&value);
        assert_eq!(resolved.is_some(), expected.found);
        assert_eq!(resolved.cloned(), expected.resolved);
    }
}

#[test]
fn rejects_the_shared_legacy_envelope() {
    assert!(serde_json::from_value::<NightfireValue>(fixture().rejected_v1).is_err());
}
