use super::*;
use serde_json::json;

#[test]
fn hash_is_deterministic() {
    let data = json!({"text": "hello world"});
    let hash1 = compute_block_hash(&data);
    let hash2 = compute_block_hash(&data);
    assert_eq!(hash1, hash2);
}

#[test]
fn hash_ignores_object_key_order() {
    let ab = json!({"a": 1, "b": 2});
    let ba = json!({"b": 2, "a": 1});

    assert_eq!(compute_block_hash(&ab), compute_block_hash(&ba));
}

#[test]
fn different_data_produces_different_hash() {
    let data1 = json!({"text": "hello"});
    let data2 = json!({"text": "world"});
    let hash1 = compute_block_hash(&data1);
    let hash2 = compute_block_hash(&data2);
    assert_ne!(hash1, hash2);
}
