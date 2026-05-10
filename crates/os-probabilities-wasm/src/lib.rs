use js_sys::Array;
use os_probabilities_core::{derive_seed, format_decimal, parse_decimal, Pcg32};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn pcg32_vector(seed: &str, count: usize) -> Array {
    let mut rng = Pcg32::new(seed);
    let values = Array::new();
    for _ in 0..count {
        values.push(&JsValue::from_f64(f64::from(rng.next_u32())));
    }
    values
}

#[wasm_bindgen]
pub fn derive_draw_seed(seed: &str, table_id: &str, draw_index: usize) -> String {
    derive_seed(seed, table_id, draw_index)
}

#[wasm_bindgen]
pub fn parse_decimal_scaled(value: &str) -> Result<String, JsValue> {
    parse_decimal(value)
        .map(|scaled| scaled.to_string())
        .map_err(|error| JsValue::from_str(error.0))
}

#[wasm_bindgen]
pub fn format_decimal_scaled(value: &str) -> Result<String, JsValue> {
    let parsed = value
        .parse::<i128>()
        .map_err(|_| JsValue::from_str("expected a scaled integer"))?;
    Ok(format_decimal(parsed))
}
