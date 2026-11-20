use super::*;
use serde_json::json;

struct TestBlock {
    text: String,
}

impl Block for TestBlock {
    const TYPE_NAME: &'static str = "test";

    fn to_data(&self) -> Value {
        json!({"text": self.text})
    }
}

struct VersionedBlock;

impl Block for VersionedBlock {
    const TYPE_NAME: &'static str = "versioned";
    const VERSIONS: &'static [&'static str] = &["2", "1"];

    fn to_data(&self) -> Value {
        json!({})
    }
}

struct NoVersionsBlock;

impl Block for NoVersionsBlock {
    const TYPE_NAME: &'static str = "no-versions";
    const VERSIONS: &'static [&'static str] = &[];

    fn to_data(&self) -> Value {
        json!({})
    }
}

#[test]
fn export_creates_block_data_without_hash() {
    let block = TestBlock {
        text: "hello".to_string(),
    };
    let data = block.export();

    assert!(data.id.starts_with("nf_"));
    assert_eq!(data.r#type, "test");
    assert_eq!(data.version, "initial");
    assert_eq!(data.data, json!({"text": "hello"}));
}

#[test]
fn export_omits_hash_on_the_wire() {
    let data = TestBlock {
        text: "hello".to_string(),
    }
    .export();
    let value = serde_json::to_value(&data).unwrap();
    let object = value.as_object().unwrap();
    assert!(!object.contains_key("hash"));
    assert!(object.contains_key("id"));
    assert!(object.contains_key("type"));
    assert!(object.contains_key("version"));
    assert!(object.contains_key("data"));
}

#[test]
fn rejects_hash_on_block_data() {
    let result = serde_json::from_value::<BlockData>(json!({
        "id": "nf_1",
        "type": "test",
        "version": "initial",
        "hash": "abc123",
        "data": {}
    }));
    assert!(result.is_err());
}

#[test]
fn versions_uses_first_entry_as_current() {
    let versions = VersionedBlock::versions();
    assert_eq!(versions.current(), "2");
    assert_eq!(versions.supported(), &["2", "1"]);
    assert_eq!(versions.coerce("1"), Some("2"));
    assert_eq!(versions.coerce("9"), None);
}

#[test]
#[should_panic(expected = "at least one version")]
fn export_panics_when_block_lists_no_versions() {
    let _ = NoVersionsBlock.export();
}

#[test]
fn block_versions_accepts_current_inside_supported() {
    let versions = BlockVersions::new("2", &["1", "2"]).expect("current is supported");

    assert_eq!(versions.current(), "2");
    assert_eq!(versions.supported(), &["1", "2"]);
}

#[test]
fn block_versions_rejects_empty_supported_set() {
    assert_eq!(BlockVersions::new("1", &[]), Err(BlockVersionsError::Empty));
}

#[test]
fn block_versions_rejects_current_outside_supported() {
    assert_eq!(
        BlockVersions::new("3", &["1", "2"]),
        Err(BlockVersionsError::CurrentNotSupported { current: "3" })
    );
}

#[test]
fn block_data_new_assigns_generated_id_and_initial_version() {
    let block = BlockData::new("paragraph", json!({"text": "hi"}));

    assert!(block.id.starts_with("nf_"));
    assert!(block.has_id());
    assert_eq!(block.r#type, "paragraph");
    assert_eq!(block.version, "initial");
    assert_eq!(block.data, json!({"text": "hi"}));
}

#[test]
fn block_data_with_id_overrides_the_generated_id() {
    let block = BlockData::new("paragraph", json!({})).with_id("hero_01");

    assert_eq!(block.id, "hero_01");
    assert!(block.has_id());
}

#[test]
fn block_data_has_id_is_false_for_empty_and_whitespace_ids() {
    let empty = BlockData::new("paragraph", json!({})).with_id("");
    let spaces = BlockData::new("paragraph", json!({})).with_id("   ");

    assert!(!empty.has_id());
    assert!(!spaces.has_id());
}
