use crate::media_locator::NightfireMediaLocatorError;
use crate::{BlockData, NightfireMediaLocator, NightfireValue};
use serde_json::json;

fn block(id: &str, data: serde_json::Value) -> BlockData {
    BlockData {
        id: id.to_string(),
        r#type: "test".to_string(),
        version: "initial".to_string(),
        data,
    }
}

#[test]
fn parses_and_formats_locator_key() {
    let locator =
        NightfireMediaLocator::parse("hero_01#/pages/1/image_id").expect("locator should parse");

    assert_eq!(locator.block_id(), "hero_01");
    assert_eq!(locator.data_pointer(), "/pages/1/image_id");
    assert_eq!(locator.to_locator_key(), "hero_01#/pages/1/image_id");
}

#[test]
fn rejects_locator_without_separator() {
    let error =
        NightfireMediaLocator::parse("hero_01:/pages/1/image_id").expect_err("locator should fail");

    assert_eq!(error, NightfireMediaLocatorError::MissingSeparator);
}

#[test]
fn rejects_locator_with_invalid_pointer() {
    let error =
        NightfireMediaLocator::new("hero_01", "pages/1/image_id").expect_err("locator should fail");

    assert!(matches!(
        error,
        NightfireMediaLocatorError::InvalidDataPointer(_)
    ));
}

#[test]
fn rejects_hash_in_block_id() {
    let error = NightfireMediaLocator::new("hero#01", "/image_id")
        .expect_err("a '#' in the block id would break the locator key");

    assert_eq!(
        error,
        NightfireMediaLocatorError::InvalidBlockId("hero#01".to_string())
    );
}

#[test]
fn rejects_empty_data_pointer() {
    let error = NightfireMediaLocator::parse("hero_01#").expect_err("empty pointer should fail");

    assert_eq!(
        error,
        NightfireMediaLocatorError::InvalidDataPointer(String::new())
    );
}

#[test]
fn rejects_missing_block_id() {
    assert_eq!(
        NightfireMediaLocator::parse("#/x").expect_err("no block id"),
        NightfireMediaLocatorError::MissingBlockId
    );
    assert_eq!(
        NightfireMediaLocator::parse("  #/x").expect_err("whitespace-only block id"),
        NightfireMediaLocatorError::MissingBlockId
    );
}

#[test]
fn trims_block_id_whitespace() {
    let locator = NightfireMediaLocator::parse(" hero_01 #/image_id").expect("should parse");

    assert_eq!(locator.block_id(), "hero_01");
    assert_eq!(locator.to_locator_key(), "hero_01#/image_id");
}

#[test]
fn accepts_rfc6901_escapes_and_resolves_them() {
    let locator = NightfireMediaLocator::parse("hero_01#/a~1b/m~0n")
        .expect("~0 and ~1 are valid RFC 6901 escapes");
    let value = NightfireValue::single(
        "test:schema",
        block("hero_01", json!({ "a/b": { "m~n": "media-1" } })),
    );

    assert_eq!(locator.resolve_in_value(&value), Some(&json!("media-1")));
}

#[test]
fn rejects_malformed_tilde_escape() {
    let error =
        NightfireMediaLocator::parse("hero_01#/a~2b").expect_err("~2 is not an RFC 6901 escape");

    assert!(matches!(
        error,
        NightfireMediaLocatorError::InvalidDataPointer(_)
    ));
}

#[test]
fn resolves_pointer_inside_single_block_value() {
    let value = NightfireValue::single(
        "test:schema",
        block(
            "hero_01",
            json!({ "image_id": "media-1", "caption": "Hero" }),
        ),
    );

    let locator = NightfireMediaLocator::parse("hero_01#/image_id").unwrap();
    let resolved = locator
        .resolve_in_value(&value)
        .expect("reference should resolve");

    assert_eq!(resolved, &json!("media-1"));
}

#[test]
fn resolves_pointer_inside_multi_block_value() {
    let value = NightfireValue::multi(
        "test:schema",
        vec![
            block("intro_01", json!({ "text": "Hello" })),
            block(
                "gallery_02",
                json!({ "pages": [{ "image_id": "media-1" }, { "image_id": "media-2" }] }),
            ),
        ],
    );

    let locator = NightfireMediaLocator::parse("gallery_02#/pages/1/image_id").unwrap();
    let resolved = locator
        .resolve_in_value(&value)
        .expect("reference should resolve");

    assert_eq!(resolved, &json!("media-2"));
}

#[test]
fn resolves_pointer_inside_nested_block_id() {
    let value = NightfireValue::single(
        "test:schema",
        block(
            "hero_01",
            json!({
                "children": [
                    {
                        "id": "gallery_02",
                        "type": "gallery",
                        "version": "initial",
                        "data": {
                            "pages": [{ "image_id": "media-1" }, { "image_id": "media-2" }]
                        }
                    }
                ]
            }),
        ),
    );

    let locator = NightfireMediaLocator::parse("gallery_02#/pages/1/image_id").unwrap();
    let resolved = locator
        .resolve_in_value(&value)
        .expect("reference should resolve");

    assert_eq!(resolved, &json!("media-2"));
}

#[test]
fn ignores_nested_payload_metadata_that_looks_like_a_block() {
    // `metadata` carries an `id` and a `data` but no block type, so it is
    // payload metadata. Only the typed block is addressable.
    let value = NightfireValue::single(
        "test:schema",
        block(
            "container_01",
            json!({
                "metadata": { "id": "x", "data": { "media": "wrong" } },
                "body": {
                    "id": "x",
                    "type": "image",
                    "version": "initial",
                    "data": { "media": "right" }
                }
            }),
        ),
    );

    let resolved = NightfireMediaLocator::parse("x#/media")
        .unwrap()
        .resolve_in_value(&value)
        .expect("reference should resolve");

    assert_eq!(resolved, &json!("right"));
}

#[test]
fn prefers_a_top_level_block_over_a_nested_one_with_the_same_id() {
    let value = NightfireValue::multi(
        "test:schema",
        vec![
            block(
                "list_01",
                json!({
                    "items": [{
                        "id": "dup",
                        "type": "image",
                        "version": "initial",
                        "data": { "image_id": "nested" }
                    }]
                }),
            ),
            block("dup", json!({ "image_id": "top" })),
        ],
    );

    let resolved = NightfireMediaLocator::parse("dup#/image_id")
        .unwrap()
        .resolve_in_value(&value)
        .expect("reference should resolve");

    assert_eq!(resolved, &json!("top"));
}

#[test]
fn returns_none_when_block_or_path_does_not_exist() {
    let value = NightfireValue::single(
        "test:schema",
        block("hero_01", json!({ "image_id": "media-1" })),
    );

    let missing_block = NightfireMediaLocator::parse("gallery_02#/image_id").unwrap();
    let missing_path = NightfireMediaLocator::parse("hero_01#/pages/1/image_id").unwrap();

    assert!(missing_block.resolve_in_value(&value).is_none());
    assert!(missing_path.resolve_in_value(&value).is_none());
}
