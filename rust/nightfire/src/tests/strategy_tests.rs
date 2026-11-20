use super::*;

fn two() -> NonZeroUsize {
    NonZeroUsize::new(2).expect("two is non-zero")
}

#[test]
fn max_below_min_is_rejected() {
    let config = MultiConfig::new(two());

    assert_eq!(
        config.with_max_blocks(1),
        Err(MultiConfigError::MaxBelowMin {
            min_blocks: two(),
            max_blocks: 1,
        })
    );
}

#[test]
fn zero_max_is_rejected_for_any_minimum() {
    assert!(MultiConfig::one_or_more().with_max_blocks(0).is_err());
    assert!(MultiConfig::new(two()).with_max_blocks(0).is_err());
}

#[test]
fn max_equal_to_min_is_accepted() {
    let config = MultiConfig::new(two())
        .with_max_blocks(2)
        .expect("a max equal to the min is satisfiable");

    assert_eq!(config.min_blocks(), two());
    assert_eq!(config.max_blocks(), Some(2));
}

#[test]
fn no_maximum_by_default() {
    assert_eq!(MultiConfig::one_or_more().max_blocks(), None);
}

#[test]
fn cardinality_displays_as_plain_english() {
    assert_eq!(StrategyCardinality::Single.to_string(), "exactly 1 block");
    assert_eq!(
        StrategyCardinality::Multi(MultiConfig::one_or_more()).to_string(),
        "1+ blocks"
    );
    assert_eq!(
        StrategyCardinality::Multi(MultiConfig::new(two()).with_max_blocks(4).expect("4 >= 2"))
            .to_string(),
        "2 to 4 blocks"
    );
}
