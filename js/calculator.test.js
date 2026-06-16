import test from 'node:test';
import assert from 'node:assert';
import { calculateTotalEmissions } from './calculator.js';

test('CarbonSense Calculation Engine', async (t) => {
  
  await t.test('should calculate emissions with zero-values returning positive baseline', () => {
    const testInputs = { 
      elecKwh: 0, gasUse: 0, renewPct: 0, 
      carType: 'gas', carKm: 0, pubTransit: 0, 
      flightsYr: 0, flightType: 'short', 
      dietType: 'vegan', foodWaste: 'low', localFood: 0, 
      clothes: 0, electronics: 0, shopSpend: 0, secondhand: 0, 
      recycleRate: 0, composting: 'yes', wasteBags: 0 
    };
    
    const result = calculateTotalEmissions(testInputs, 'global');
    assert.strictEqual(typeof result.total, 'number');
    assert.ok(result.total > 0, 'Total emissions should be greater than zero due to baselines');
    assert.strictEqual(result.food, 53, 'Vegan baseline should be 53');
  });

  await t.test('should accurately apply grid factors for energy', () => {
    const testInputs = { 
      elecKwh: 1000, gasUse: 0, renewPct: 0, 
      carType: 'gas', carKm: 0, pubTransit: 0, 
      flightsYr: 0, flightType: 'short', 
      dietType: 'vegan', foodWaste: 'low', localFood: 0, 
      clothes: 0, electronics: 0, shopSpend: 0, secondhand: 0, 
      recycleRate: 0, composting: 'yes', wasteBags: 0 
    };
    
    // global grid factor is ~0.276
    const result = calculateTotalEmissions(testInputs, 'global');
    assert.strictEqual(result.energy, 276, 'Energy emission should match grid factor calculation');
  });
});
