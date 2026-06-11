/**
 * calculator.js – Carbon Footprint Calculation Engine
 * Pure functions only – no side effects, fully testable.
 *
 * Emission factors sourced from:
 *  - IPCC AR6 (2022)
 *  - UK DEFRA GHG Conversion Factors (2023)
 *  - EPA Emission Factors Hub
 *
 * All values in kg CO2e per unit (monthly unless noted).
 */

// ── Emission Factors ──────────────────────────────────────────────────────────

/** Grid electricity emission factor (kg CO2e / kWh) by region */
const ELECTRICITY_FACTORS = {
  north_america:  0.386,
  europe:         0.276,
  asia_pacific:   0.555,
  south_asia:     0.708,
  latin_america:  0.218,
  africa:         0.481,
  middle_east:    0.578,
};

/** Natural gas emission factor (kg CO2e / m³) */
const GAS_FACTOR = 2.02;

/** Vehicle emission factors (kg CO2e / km) */
const VEHICLE_FACTORS = {
  none:          0.000,
  electric:      0.053,  // includes grid average
  hybrid:        0.092,
  small_petrol:  0.114,
  medium_petrol: 0.171,
  large_petrol:  0.270,
  diesel:        0.164,
};

/** Public transit factor (kg CO2e / km) */
const TRANSIT_FACTOR = 0.089;

/** Flight emission factors (kg CO2e / flight, includes radiative forcing ×1.9) */
const FLIGHT_FACTORS = {
  short:  230,
  medium: 620,
  long:   1850,
};

/** Diet base emissions (kg CO2e / month per person) */
const DIET_FACTORS = {
  vegan:       53,
  vegetarian:  70,
  pescatarian: 89,
  flexitarian: 113,
  omnivore:    158,
  heavy_meat:  225,
};

/** Food waste multipliers */
const FOOD_WASTE_MULTIPLIERS = {
  low:    1.00,
  medium: 1.12,
  high:   1.28,
};

/** Shopping emission factors */
const CLOTHING_FACTOR    = 7.5;   // kg CO2e / new item
const ELECTRONICS_FACTOR = 300;   // kg CO2e / device/year
const SHOPPING_FACTOR    = 0.5;   // kg CO2e / USD spent

/** Waste emission factors */
const WASTE_BAG_FACTOR   = 4.2;   // kg CO2e / bag/week
const COMPOST_BONUS = { yes: 0.85, sometimes: 0.93, no: 1.00 };
const RECYCLE_SAVINGS_MAX = 0.30; // up to 30% reduction

// ── Calculation Functions ─────────────────────────────────────────────────────

/**
 * Calculate home energy emissions (monthly kg CO2e)
 * @param {object} params
 * @param {number} params.elecKwh      - Monthly electricity in kWh
 * @param {number} params.gasUsage     - Monthly gas in m³
 * @param {number} params.renewablePct - Renewable energy percentage (0-100)
 * @param {string} params.region       - Region key
 * @returns {number} Monthly kg CO2e
 */
export function calcEnergyEmissions({ elecKwh, gasUsage, renewablePct, region }) {
  const factor = ELECTRICITY_FACTORS[region] ?? ELECTRICITY_FACTORS.europe;
  const nonRenewableFraction = 1 - (renewablePct / 100);
  const elecEmissions = elecKwh * factor * nonRenewableFraction;
  const gasEmissions  = gasUsage * GAS_FACTOR;
  return Math.round(elecEmissions + gasEmissions);
}

/**
 * Calculate transport emissions (monthly kg CO2e)
 * @param {object} params
 * @param {string} params.carType      - Vehicle type key
 * @param {number} params.carKm        - Weekly km driven
 * @param {number} params.publicTransit- Weekly public transit km
 * @param {number} params.flightsYear  - Flights per year
 * @param {string} params.flightType   - Flight distance category
 * @returns {number} Monthly kg CO2e
 */
export function calcTransportEmissions({ carType, carKm, publicTransit, flightsYear, flightType }) {
  const carFactor     = VEHICLE_FACTORS[carType] ?? 0;
  const carEmissions  = carKm * 4.33 * carFactor;           // weekly → monthly
  const busEmissions  = publicTransit * 4.33 * TRANSIT_FACTOR;
  const flightFactor  = FLIGHT_FACTORS[flightType] ?? FLIGHT_FACTORS.medium;
  const flightEmissions = (flightsYear / 12) * flightFactor; // annualized → monthly
  return Math.round(carEmissions + busEmissions + flightEmissions);
}

/**
 * Calculate food emissions (monthly kg CO2e)
 * @param {object} params
 * @param {string} params.dietType  - Diet type key
 * @param {string} params.foodWaste - Waste level key
 * @param {number} params.localFood - % of local/seasonal food (0-100)
 * @returns {number} Monthly kg CO2e
 */
export function calcFoodEmissions({ dietType, foodWaste, localFood }) {
  const base       = DIET_FACTORS[dietType] ?? DIET_FACTORS.omnivore;
  const wasteMulti = FOOD_WASTE_MULTIPLIERS[foodWaste] ?? 1;
  const localBonus = 1 - (localFood / 100) * 0.08; // up to 8% reduction
  return Math.round(base * wasteMulti * localBonus);
}

/**
 * Calculate shopping emissions (monthly kg CO2e)
 * @param {object} params
 * @param {number} params.clothingItems  - New clothing items per month
 * @param {number} params.electronics    - New electronics per year
 * @param {number} params.shoppingSpend  - Monthly USD general shopping
 * @param {number} params.secondhandPct  - % secondhand (0-100)
 * @returns {number} Monthly kg CO2e
 */
export function calcShoppingEmissions({ clothingItems, electronics, shoppingSpend, secondhandPct }) {
  const secondhandMulti  = 1 - (secondhandPct / 100) * 0.85;
  const clothingEmissions = clothingItems * CLOTHING_FACTOR * secondhandMulti;
  const electronicsEmissions = (electronics / 12) * ELECTRONICS_FACTOR;
  const spendEmissions   = shoppingSpend * SHOPPING_FACTOR * secondhandMulti;
  return Math.round(clothingEmissions + electronicsEmissions + spendEmissions);
}

/**
 * Calculate waste emissions (monthly kg CO2e)
 * @param {object} params
 * @param {number} params.recyclingRate - Recycling rate % (0-100)
 * @param {string} params.composting    - Composting frequency key
 * @param {number} params.wasteBags     - Bin bags per week
 * @returns {number} Monthly kg CO2e
 */
export function calcWasteEmissions({ recyclingRate, composting, wasteBags }) {
  const baseWaste    = wasteBags * 4.33 * WASTE_BAG_FACTOR;
  const recycleSaving = (recyclingRate / 100) * RECYCLE_SAVINGS_MAX;
  const compostMulti  = COMPOST_BONUS[composting] ?? 1;
  return Math.round(baseWaste * (1 - recycleSaving) * compostMulti);
}

/**
 * Calculate all category emissions and total
 * @param {object} inputs - All calculator form inputs
 * @param {string} region - User region
 * @returns {{ energy, transport, food, shopping, waste, total }}
 */
export function calcAllEmissions(inputs, region) {
  const energy    = calcEnergyEmissions({ ...inputs, region });
  const transport = calcTransportEmissions(inputs);
  const food      = calcFoodEmissions(inputs);
  const shopping  = calcShoppingEmissions(inputs);
  const waste     = calcWasteEmissions(inputs);
  const total     = energy + transport + food + shopping + waste;
  return { energy, transport, food, shopping, waste, total };
}

/**
 * Get a score label based on monthly CO2e
 * @param {number} monthlyKg
 * @returns {{ label: string, color: string, tier: string }}
 */
export function getScoreLabel(monthlyKg) {
  if (monthlyKg < 100)  return { label: 'Exceptional 🌟', color: '#00E5A0', tier: 'exceptional' };
  if (monthlyKg < 167)  return { label: 'On Target ✅',   color: '#00C97F', tier: 'good' };
  if (monthlyKg < 300)  return { label: 'Below Avg 👍',  color: '#8BCF4A', tier: 'below_avg' };
  if (monthlyKg < 400)  return { label: 'Average ⚠️',    color: '#F4A30E', tier: 'average' };
  if (monthlyKg < 700)  return { label: 'Above Avg 🔴',  color: '#FF8E3C', tier: 'above_avg' };
  return { label: 'High Impact 🚨',  color: '#FF5D5D', tier: 'high' };
}

/**
 * Compare user to global average and return percentage diff
 * @param {number} monthlyKg
 * @returns {number} percentage relative to global average (400 kg/mo)
 */
export function compareToAverage(monthlyKg) {
  const avg = 400;
  return Math.round(((monthlyKg - avg) / avg) * 100);
}

/**
 * Estimate annual CO2e in tonnes
 * @param {number} monthlyKg
 * @returns {number}
 */
export function toAnnualTonnes(monthlyKg) {
  return Math.round((monthlyKg * 12) / 100) / 10;
}
