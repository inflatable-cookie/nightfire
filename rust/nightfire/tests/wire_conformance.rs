use nightfire::{BlockVersions, NightfireValue};
use serde::Deserialize;
use serde_json::Value;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Fixture {
    values: Vec<FixtureValue>,
    version_coercion: VersionCoercion,
    rejected_v1: Value,
}

#[derive(Debug, Deserialize)]
struct FixtureValue {
    name: String,
    value: Value,
}

#[derive(Debug, Deserialize)]
struct VersionCoercion {
    r#type: String,
    current: String,
    supported: Vec<String>,
    stored: String,
    unknown: String,
}

fn fixture() -> Fixture {
    serde_json::from_str(include_str!(
        "../../../fixtures/wire/v1/nightfire-values.json"
    ))
    .expect("shared wire fixture must parse")
}

#[test]
fn accepts_every_v2_fixture_value() {
    let fixture = fixture();
    let mut names = Vec::new();

    for entry in fixture.values {
        let value: NightfireValue =
            serde_json::from_value(entry.value).expect("v2 fixture value must deserialize");
        names.push(entry.name);
        assert!(serde_json::to_value(value).unwrap()["blocks"].is_array());
    }

    assert_eq!(names, ["empty", "single", "multi"]);
}

#[test]
fn rejects_the_shared_legacy_envelope() {
    assert!(serde_json::from_value::<NightfireValue>(fixture().rejected_v1).is_err());
}

#[test]
fn applies_the_shared_version_contract() {
    let fixture = fixture().version_coercion;
    let versions = BlockVersions {
        current: "2",
        supported: &["2", "1"],
    };

    assert_eq!(fixture.r#type, "callout");
    assert_eq!(fixture.current, versions.current);
    assert_eq!(fixture.supported, versions.supported);
    assert_eq!(versions.coerce(&fixture.stored), Some("2"));
    assert_eq!(versions.coerce(&fixture.unknown), None);
}
