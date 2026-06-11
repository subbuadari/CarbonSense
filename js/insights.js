/**
 * insights.js – AI-like personalized insight generator
 * Uses a rule-based decision engine to produce context-aware recommendations.
 * All logic is deterministic and auditable — no black-box ML required.
 */

// ── Insight Rule Definitions ──────────────────────────────────────────────────
// Each rule: { id, icon, title, text, impact, saving, condition(emissions, inputs, profile) }

const INSIGHT_RULES = [

  // ── Transport Rules ──────────────────────────────────────────────────────
  {
    id: 'ev_switch',
    icon: '⚡',
    title: 'Switch to an Electric Vehicle',
    text: (e, i) => `Your car contributes ~${e.transport} kg CO₂e/mo. Switching to an EV could cut that by up to 65% on your region's grid.`,
    impact: 'high',
    saving: (e, i) => Math.round(e.transport * 0.65),
    category: 'transport',
    condition: (e, i) => ['medium_petrol','large_petrol','diesel','small_petrol'].includes(i.carType) && i.carKm > 80,
  },
  {
    id: 'reduce_flights',
    icon: '✈️',
    title: 'Cut Back on Flying',
    text: (e, i) => `Your ${i.flightsYear} flights/year account for a significant chunk of your footprint. Each round-trip long-haul flight emits ~${Math.round(FLIGHT_KG[i.flightType ?? 'medium'] * 2)} kg CO₂e.`,
    impact: 'high',
    saving: (e, i) => Math.round((i.flightsYear / 12) * FLIGHT_KG[i.flightType ?? 'medium'] * 0.5),
    category: 'transport',
    condition: (e, i) => i.flightsYear >= 4,
  },
  {
    id: 'public_transit',
    icon: '🚌',
    title: 'Use Public Transit More',
    text: (e, i) => `Replacing 50 km/week of car trips with public transit could save around ${Math.round(50 * 4.33 * 0.082)} kg CO₂e/mo.`,
    impact: 'medium',
    saving: (e, i) => Math.round(50 * 4.33 * 0.082),
    category: 'transport',
    condition: (e, i) => i.carKm > 50 && i.carType !== 'none' && i.publicTransit < 50,
  },
  {
    id: 'walk_cycle',
    icon: '🚲',
    title: 'Walk or Cycle Short Trips',
    text: () => 'For trips under 3 km, walking or cycling produces zero emissions and improves health. Even 3 trips/week makes a measurable difference.',
    impact: 'low',
    saving: () => 15,
    category: 'transport',
    condition: (e, i) => i.carKm > 20 && i.carType !== 'none',
  },
  {
    id: 'ev_great',
    icon: '🌟',
    title: 'Great – You\'re Driving Electric!',
    text: () => 'Your EV already massively reduces your transport footprint. Make sure your home energy is on a green tariff to maximize the benefit.',
    impact: 'low',
    saving: () => 0,
    category: 'transport',
    condition: (e, i) => i.carType === 'electric',
  },

  // ── Energy Rules ─────────────────────────────────────────────────────────
  {
    id: 'renewable_energy',
    icon: '☀️',
    title: 'Switch to Renewable Energy',
    text: (e, i) => `Your home energy emits ~${e.energy} kg CO₂e/mo. Switching to a 100% renewable tariff could eliminate your electricity emissions entirely.`,
    impact: 'high',
    saving: (e, i) => Math.round(e.energy * 0.75),
    category: 'energy',
    condition: (e, i) => i.renewablePct < 50 && e.energy > 60,
  },
  {
    id: 'reduce_electricity',
    icon: '💡',
    title: 'Reduce Electricity Consumption',
    text: () => 'Simple habits like LED bulbs, smart thermostats, and unplugging standby devices can cut household electricity by 15–20%.',
    impact: 'medium',
    saving: (e, i) => Math.round(e.energy * 0.17),
    category: 'energy',
    condition: (e, i) => i.elecKwh > 400,
  },
  {
    id: 'insulation',
    icon: '🏡',
    title: 'Improve Home Insulation',
    text: (e, i) => `High gas usage (${i.gasUsage} m³/mo) suggests heating losses. Good insulation and draught-proofing can cut heating demand by 25%.`,
    impact: 'medium',
    saving: (e, i) => Math.round(i.gasUsage * 2.02 * 0.25),
    category: 'energy',
    condition: (e, i) => i.gasUsage > 80,
  },
  {
    id: 'solar_panels',
    icon: '🔆',
    title: 'Consider Solar Panels',
    text: () => 'Rooftop solar can offset 50–90% of your electricity bill and pays for itself in 6–10 years. Many regions also offer feed-in tariffs.',
    impact: 'high',
    saving: (e, i) => Math.round(e.energy * 0.6),
    category: 'energy',
    condition: (e, i) => i.renewablePct < 30 && i.elecKwh > 300,
  },

  // ── Food Rules ───────────────────────────────────────────────────────────
  {
    id: 'reduce_meat',
    icon: '🥦',
    title: 'Reduce Meat Consumption',
    text: (e) => `Your diet contributes ~${e.food} kg CO₂e/mo. Cutting red meat intake to 2 days/week could save over 40 kg CO₂e/month.`,
    impact: 'high',
    saving: () => 42,
    category: 'food',
    condition: (e, i) => ['omnivore','heavy_meat'].includes(i.dietType),
  },
  {
    id: 'reduce_food_waste',
    icon: '🗑️',
    title: 'Cut Food Waste',
    text: () => 'About 1/3 of all food produced is wasted, generating 8% of global greenhouse gases. Plan meals, use shopping lists, and freeze leftovers.',
    impact: 'medium',
    saving: (e, i) => Math.round(e.food * 0.12),
    category: 'food',
    condition: (e, i) => ['medium','high'].includes(i.foodWaste),
  },
  {
    id: 'local_seasonal',
    icon: '🌿',
    title: 'Buy Local & Seasonal Food',
    text: () => 'Food miles account for ~10% of food emissions. Shopping at local markets and choosing seasonal produce reduces transport emissions and supports local farmers.',
    impact: 'low',
    saving: (e, i) => Math.round(e.food * 0.08),
    category: 'food',
    condition: (e, i) => i.localFood < 30,
  },
  {
    id: 'compost',
    icon: '🪱',
    title: 'Start Composting',
    text: () => 'Composting food scraps diverts them from landfill where they'd produce methane. It also creates free, rich fertilizer for your garden.',
    impact: 'medium',
    saving: () => 8,
    category: 'food',
    condition: (e, i) => i.composting === 'no',
  },
  {
    id: 'vegan_kudos',
    icon: '🌱',
    title: 'Amazing – You\'re Vegan!',
    text: (e) => `Your plant-based diet saves roughly 80 kg CO₂e/month vs the average omnivore. Your food footprint of ${e.food} kg/mo is already excellent.`,
    impact: 'low',
    saving: () => 0,
    category: 'food',
    condition: (e, i) => i.dietType === 'vegan',
  },

  // ── Shopping Rules ────────────────────────────────────────────────────────
  {
    id: 'slow_fashion',
    icon: '👗',
    title: 'Embrace Slow Fashion',
    text: (e, i) => `Buying ${i.clothingItems} new clothing items/month adds up. The fashion industry emits 10% of global CO₂. Buy less, choose quality, and opt for secondhand.`,
    impact: 'medium',
    saving: (e, i) => Math.round(i.clothingItems * 7.5 * 0.6),
    category: 'shopping',
    condition: (e, i) => i.clothingItems > 3,
  },
  {
    id: 'repair_electronics',
    icon: '🔧',
    title: 'Repair Don\'t Replace Electronics',
    text: () => 'Manufacturing a new smartphone emits ~70 kg CO₂e. Before buying new, repair, refurbish, or buy certified-refurbished electronics.',
    impact: 'medium',
    saving: () => 25,
    category: 'shopping',
    condition: (e, i) => i.electronics >= 2,
  },
  {
    id: 'secondhand_shopping',
    icon: '♻️',
    title: 'Shop Secondhand',
    text: () => 'Buying secondhand items reduces demand for new production and diverts goods from landfill. Platforms like eBay, Vinted, and thrift stores are great starting points.',
    impact: 'medium',
    saving: (e, i) => Math.round(e.shopping * 0.3),
    category: 'shopping',
    condition: (e, i) => i.secondhandPct < 20 && e.shopping > 50,
  },

  // ── Waste Rules ───────────────────────────────────────────────────────────
  {
    id: 'recycling',
    icon: '🔄',
    title: 'Improve Your Recycling Rate',
    text: (e, i) => `You're currently recycling ${i.recyclingRate}% of your waste. Getting to 70%+ can meaningfully reduce your waste emissions.`,
    impact: 'medium',
    saving: (e, i) => Math.round(e.waste * 0.2),
    category: 'waste',
    condition: (e, i) => i.recyclingRate < 60,
  },
  {
    id: 'reduce_waste_bags',
    icon: '🗃️',
    title: 'Produce Less Waste',
    text: (e, i) => `You fill ${i.wasteBags} bags/week. Reducing packaging (buy loose, use reusables) and food waste can cut that in half.`,
    impact: 'medium',
    saving: (e, i) => Math.round(i.wasteBags * 2 * 4.33 * 4.2 * 0.5),
    category: 'waste',
    condition: (e, i) => i.wasteBags > 3,
  },

  // ── General / Lifestyle ───────────────────────────────────────────────────
  {
    id: 'offset_remaining',
    icon: '🌳',
    title: 'Offset Your Remaining Footprint',
    text: (e) => `After reducing what you can, consider verified carbon offsets for the remainder. At ~$15/tonne, your annual ${Math.round(e.total*12/1000*10)/10}t footprint costs ~$${Math.round(e.total*12/1000*15)}/yr to offset.`,
    impact: 'low',
    saving: () => 0,
    category: 'general',
    condition: (e) => e.total > 100,
  },
];

const FLIGHT_KG = { short: 230, medium: 620, long: 1850 };

// ── Engine ────────────────────────────────────────────────────────────────────

/**
 * Generate personalized insights from emissions data.
 * Returns top matching insights sorted by potential saving (desc).
 *
 * @param {{ energy, transport, food, shopping, waste, total }} emissions
 * @param {object} inputs - Raw calculator inputs
 * @param {object} profile - User profile
 * @param {number} maxResults - Maximum number of insights to return
 * @returns {Array<object>} Sorted insight objects
 */
export function generateInsights(emissions, inputs, profile, maxResults = 8) {
  if (!emissions || !inputs || emissions.total === 0) return [];

  const matched = INSIGHT_RULES
    .filter(rule => {
      try {
        return rule.condition(emissions, inputs, profile);
      } catch (e) {
        return false;
      }
    })
    .map(rule => ({
      id:       rule.id,
      icon:     rule.icon,
      title:    rule.title,
      text:     safeCall(rule.text, emissions, inputs),
      impact:   rule.impact,
      saving:   Math.max(0, safeCall(rule.saving, emissions, inputs) || 0),
      category: rule.category,
    }))
    // Sort: high impact first, then by saving potential
    .sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      const diff = (impactOrder[b.impact] || 0) - (impactOrder[a.impact] || 0);
      return diff !== 0 ? diff : b.saving - a.saving;
    })
    .slice(0, maxResults);

  return matched;
}

/**
 * Calculate total potential monthly savings from all matched insights
 * @param {Array<object>} insights
 * @returns {number}
 */
export function totalPotentialSaving(insights) {
  return insights.reduce((sum, i) => sum + i.saving, 0);
}

/**
 * Generate a personalized greeting summary based on user score
 * @param {object} profile
 * @param {object} emissions
 * @returns {{ headline: string, subtext: string }}
 */
export function generateSummary(profile, emissions) {
  const name  = profile?.name || 'there';
  const total = emissions?.total || 0;
  const annualTonnes = Math.round(total * 12 / 100) / 10;

  if (total === 0) {
    return {
      headline: `Hi ${name}! Let's find your footprint.`,
      subtext:  'Complete the calculator to get personalised insights and recommendations.',
    };
  }
  if (total < 167) {
    return {
      headline: `Impressive, ${name}! You're on target 🌟`,
      subtext:  `At ${annualTonnes}t CO₂e/year, you're below the 2°C climate target. Here's how to go even further:`,
    };
  }
  if (total < 400) {
    return {
      headline: `Good start, ${name}! Room to improve 💪`,
      subtext:  `Your ${annualTonnes}t CO₂e/year is below average. These targeted actions can get you to the climate target:`,
    };
  }
  return {
    headline: `Let's make a difference, ${name}! 🌍`,
    subtext:  `Your ${annualTonnes}t CO₂e/year is above average. Don't worry — the actions below can cut it significantly:`,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeCall(fn, ...args) {
  try {
    return fn(...args);
  } catch (e) {
    return typeof fn === 'string' ? fn : '';
  }
}
