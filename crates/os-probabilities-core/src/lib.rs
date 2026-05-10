const MASK_64: u64 = u64::MAX;
const PCG32_MULTIPLIER: u64 = 6364136223846793005;
const FNV_OFFSET: u64 = 14695981039346656037;
const FNV_PRIME: u64 = 1099511628211;
const DECIMAL_SCALE: i128 = 1_000_000;

#[derive(Debug, Clone)]
pub struct Pcg32 {
    state: u64,
    increment: u64,
}

impl Pcg32 {
    pub fn new(seed: &str) -> Self {
        let init_state = hash_utf8_to_u64(seed);
        let init_sequence = hash_utf8_to_u64(&format!("{}\0stream", seed));
        let mut rng = Self {
            state: 0,
            increment: (init_sequence << 1) | 1,
        };
        rng.next_u32();
        rng.state = rng.state.wrapping_add(init_state) & MASK_64;
        rng.next_u32();
        rng
    }

    pub fn next_u32(&mut self) -> u32 {
        let old_state = self.state;
        self.state = old_state
            .wrapping_mul(PCG32_MULTIPLIER)
            .wrapping_add(self.increment)
            & MASK_64;
        let xorshifted = (((old_state >> 18) ^ old_state) >> 27) as u32;
        let rotation = (old_state >> 59) as u32;
        xorshifted.rotate_right(rotation)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DecimalParseError(pub &'static str);

pub fn parse_decimal(value: &str) -> Result<i128, DecimalParseError> {
    if value.is_empty() {
        return Err(DecimalParseError("expected a decimal"));
    }

    let negative = value.starts_with('-');
    let unsigned = if negative { &value[1..] } else { value };
    let parts: Vec<&str> = unsigned.split('.').collect();
    if parts.is_empty() || parts.len() > 2 || parts[0].is_empty() {
        return Err(DecimalParseError("expected a decimal"));
    }
    if parts[0].len() > 1 && parts[0].starts_with('0') {
        return Err(DecimalParseError("leading zeroes are not allowed"));
    }
    if !parts[0].chars().all(|char| char.is_ascii_digit()) {
        return Err(DecimalParseError("expected decimal digits"));
    }

    let fraction = if parts.len() == 2 { parts[1] } else { "" };
    if fraction.len() > 6 || !fraction.chars().all(|char| char.is_ascii_digit()) {
        return Err(DecimalParseError("expected at most 6 fractional digits"));
    }

    let whole = parts[0]
        .parse::<i128>()
        .map_err(|_| DecimalParseError("decimal is too large"))?
        .checked_mul(DECIMAL_SCALE)
        .ok_or(DecimalParseError("decimal is too large"))?;
    let mut fraction_text = fraction.to_string();
    while fraction_text.len() < 6 {
        fraction_text.push('0');
    }
    let fraction_value = if fraction_text.is_empty() {
        0
    } else {
        fraction_text
            .parse::<i128>()
            .map_err(|_| DecimalParseError("decimal is too large"))?
    };
    let scaled = whole
        .checked_add(fraction_value)
        .ok_or(DecimalParseError("decimal is too large"))?;
    Ok(if negative { -scaled } else { scaled })
}

pub fn format_decimal(value: i128) -> String {
    let negative = value < 0;
    let absolute = if negative { -value } else { value };
    let whole = absolute / DECIMAL_SCALE;
    let fraction = absolute % DECIMAL_SCALE;
    let mut text = if fraction == 0 {
        whole.to_string()
    } else {
        let mut fraction_text = format!("{:06}", fraction);
        while fraction_text.ends_with('0') {
            fraction_text.pop();
        }
        format!("{}.{}", whole, fraction_text)
    };
    if negative {
        text.insert(0, '-');
    }
    text
}

pub fn derive_seed(seed: &str, table_id: &str, draw_index: usize) -> String {
    format!("os-probabilities/v1|{}|{}|{}", seed, table_id, draw_index)
}

fn hash_utf8_to_u64(value: &str) -> u64 {
    let mut hash = FNV_OFFSET;
    for byte in value.as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(FNV_PRIME) & MASK_64;
    }
    hash
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pcg32_matches_typescript_vector() {
        let mut rng = Pcg32::new("vector-seed");
        assert_eq!(
            vec![
                rng.next_u32(),
                rng.next_u32(),
                rng.next_u32(),
                rng.next_u32(),
                rng.next_u32(),
            ],
            vec![1228803170, 634923739, 694937849, 2477061812, 945323449]
        );
    }

    #[test]
    fn decimal_round_trips_scaled_values() {
        assert_eq!(parse_decimal("1.25"), Ok(1_250_000));
        assert_eq!(format_decimal(1_250_000), "1.25");
    }

    #[test]
    fn derives_seed_with_contract_prefix() {
        assert_eq!(
            derive_seed("run-1", "combat.reward", 2),
            "os-probabilities/v1|run-1|combat.reward|2"
        );
    }

    #[test]
    fn primitives_match_golden_fixture_file() {
        let fixture: serde_json::Value = serde_json::from_str(include_str!(
            "../../../fixtures/determinism/golden-vectors.json"
        ))
        .expect("fixture should parse");
        let rng = &fixture["rng"];
        let mut pcg = Pcg32::new(rng["seed"].as_str().expect("rng.seed"));
        let expected = rng["uint32"]
            .as_array()
            .expect("rng.uint32")
            .iter()
            .map(|value| value.as_u64().expect("u32 value") as u32)
            .collect::<Vec<_>>();
        let actual = (0..expected.len()).map(|_| pcg.next_u32()).collect::<Vec<_>>();

        assert_eq!(actual, expected);
        assert_eq!(
            derive_seed(
                fixture["seedDerivation"]["seed"].as_str().expect("seed"),
                fixture["seedDerivation"]["tableId"].as_str().expect("tableId"),
                fixture["seedDerivation"]["drawIndex"].as_u64().expect("drawIndex") as usize,
            ),
            fixture["seedDerivation"]["derivedSeed"].as_str().expect("derivedSeed")
        );
        assert_eq!(
            parse_decimal(fixture["decimal"]["input"].as_str().expect("decimal.input"))
                .expect("decimal should parse")
                .to_string(),
            fixture["decimal"]["scaled"].as_str().expect("decimal.scaled")
        );
    }
}
