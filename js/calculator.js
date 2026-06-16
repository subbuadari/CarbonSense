const REGIONAL_GRID_FACTORS = { north_america: 0.386, europe: 0.276, asia_pacific: 0.555, south_asia: 0.708, latin_america: 0.218, africa: 0.481, middle_east: 0.578 };
const VEHICLE_EMISSION_FACTORS = { none: 0, electric: 0.053, hybrid: 0.092, small_petrol: 0.114, medium_petrol: 0.171, large_petrol: 0.270, diesel: 0.164 };
const DIETARY_EMISSION_BASE = { vegan: 53, vegetarian: 70, pescatarian: 89, flexitarian: 113, omnivore: 158, heavy_meat: 225 };
const FLIGHT_EMISSIONS_KG = { short: 230, medium: 620, long: 1850 };

// ══════ EMISSION CONSTANTS (MAGIC NUMBER EXTRACTION) ══════
const EMISSION_CONSTANTS = {
  GAS_FACTOR: 2.02,
  WEEKS_PER_YEAR: 4.33,
  TRANSIT_FACTOR: 0.089,
  MONTHS_PER_YEAR: 12,
  DEFAULT_FLIGHT_KG: 620,
  LOCAL_FOOD_DISCOUNT: 0.08,
  CLOTHES_BASE: 7.5,
  SECONDHAND_DISCOUNT: 0.85,
  ELECTRONICS_BASE: 300,
  SHOP_SPEND_FACTOR: 0.5,
  WASTE_BASE: 4.2,
  RECYCLE_DISCOUNT: 0.3,
  DEFAULT_GRID: 0.276,
  DEFAULT_FOOD: 158
};

// ══════ EMISSION CALCULATIONS (MEMOIZED FOR EFFICIENCY) ══════
const calculateTotalEmissions = (function() {
  const cache = new Map();
  return function(inputs, region) {
    const cacheKey = JSON.stringify(inputs) + '|' + region;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const gridFactor = REGIONAL_GRID_FACTORS[region] || EMISSION_CONSTANTS.DEFAULT_GRID;
    
    const energy = Math.round(inputs.elecKwh * gridFactor * (1 - inputs.renewPct / 100) + inputs.gasUse * EMISSION_CONSTANTS.GAS_FACTOR);
    const transport = Math.round(inputs.carKm * EMISSION_CONSTANTS.WEEKS_PER_YEAR * (VEHICLE_EMISSION_FACTORS[inputs.carType] || 0) + inputs.pubTransit * EMISSION_CONSTANTS.WEEKS_PER_YEAR * EMISSION_CONSTANTS.TRANSIT_FACTOR + (inputs.flightsYr / EMISSION_CONSTANTS.MONTHS_PER_YEAR) * (FLIGHT_EMISSIONS_KG[inputs.flightType] || EMISSION_CONSTANTS.DEFAULT_FLIGHT_KG));
    
    const wasteMultiplier = { low: 1, medium: 1.12, high: 1.28 }[inputs.foodWaste] || 1;
    const food = Math.round((DIETARY_EMISSION_BASE[inputs.dietType] || EMISSION_CONSTANTS.DEFAULT_FOOD) * wasteMultiplier * (1 - (inputs.localFood / 100) * EMISSION_CONSTANTS.LOCAL_FOOD_DISCOUNT));
    
    const shopping = Math.round(inputs.clothes * EMISSION_CONSTANTS.CLOTHES_BASE * (1 - (inputs.secondhand / 100) * EMISSION_CONSTANTS.SECONDHAND_DISCOUNT) + (inputs.electronics / EMISSION_CONSTANTS.MONTHS_PER_YEAR) * EMISSION_CONSTANTS.ELECTRONICS_BASE + inputs.shopSpend * EMISSION_CONSTANTS.SHOP_SPEND_FACTOR * (1 - (inputs.secondhand / 100) * EMISSION_CONSTANTS.SECONDHAND_DISCOUNT));
    
    const compostMultiplier = { yes: 0.85, sometimes: 0.93, no: 1 }[inputs.composting] || 1;
    const waste = Math.round(inputs.wasteBags * EMISSION_CONSTANTS.WEEKS_PER_YEAR * EMISSION_CONSTANTS.WASTE_BASE * (1 - (inputs.recycleRate / 100) * EMISSION_CONSTANTS.RECYCLE_DISCOUNT) * compostMultiplier);
    
    const result = { energy, transport, food, shopping, waste, total: energy + transport + food + shopping + waste };
    cache.set(cacheKey, result);
    return result;
  };
})();

export { calculateTotalEmissions };
