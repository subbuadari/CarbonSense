/**
 * app.js – Main application entry point
 * Orchestrates all modules: routing, state, events, and rendering.
 *
 * Architecture:
 *  - State is stored in memory and persisted via storage.js
 *  - All user inputs are sanitized before storage or display
 *  - No external API calls; fully offline-capable
 */

import {
  calcAllEmissions,
  getScoreLabel,
  compareToAverage,
  toAnnualTonnes,
} from './calculator.js';

import {
  initStorage,
  saveProfile,
  loadProfile,
  hasProfile,
  saveEmissions,
  loadEmissions,
  loadHistory,
  saveActions,
  loadActions,
  saveGoal,
  loadGoal,
  updateStreak,
  loadStreak,
  clearAllData,
  sanitizeString,
  clampNumber,
} from './storage.js';

import {
  generateInsights,
  totalPotentialSaving,
  generateSummary,
} from './insights.js';

import {
  drawGauge,
  drawDonut,
  buildDonutLegend,
  drawTrend,
  drawGoalRing,
} from './charts.js';

import {
  el, qs, qsa,
  setText, showEl, hideEl,
  animateNumber,
  showToast,
  celebrate,
  openModal, closeModal,
  showFieldError, clearFieldError,
  debounce,
  switchTab,
  buildActionItem,
  buildInsightCard,
} from './ui.js';

// ── App State ─────────────────────────────────────────────────────────────────
const state = {
  profile:   null,
  emissions: null,
  goal:      null,
  actions:   {},   // { [actionId]: boolean }
  streak:    { count: 0, lastDate: null },
};

// ── Action Catalog (pledge-able actions) ──────────────────────────────────────
const ACTION_CATALOG = [
  { id: 'a1',  icon: '🚶', title: 'Walk or cycle to work 3x/week',      desc: 'Skip the car for short commutes and use active transport instead.',           saving: 20, effort: 'low',    category: 'Transport' },
  { id: 'a2',  icon: '🥩', title: 'Go meat-free 3 days a week',          desc: 'Replace meat meals with plant-based alternatives on three days.',             saving: 35, effort: 'low',    category: 'Food' },
  { id: 'a3',  icon: '💡', title: 'Switch to LED bulbs everywhere',       desc: 'Replace all remaining incandescent/halogen bulbs with LEDs.',                saving: 8,  effort: 'low',    category: 'Energy' },
  { id: 'a4',  icon: '♻️', title: 'Commit to 70%+ recycling rate',       desc: 'Learn your local recycling rules and sort waste diligently.',                 saving: 12, effort: 'low',    category: 'Waste' },
  { id: 'a5',  icon: '🛒', title: 'Buy only secondhand clothing',         desc: 'For one month, only buy clothing from thrift stores or resale platforms.',    saving: 22, effort: 'medium', category: 'Shopping' },
  { id: 'a6',  icon: '🌱', title: 'Start a compost bin',                  desc: 'Divert food scraps from landfill and create free fertilizer.',               saving: 8,  effort: 'medium', category: 'Waste' },
  { id: 'a7',  icon: '☀️', title: 'Switch to a green energy tariff',     desc: 'Contact your energy provider and switch to a 100% renewable electricity plan.', saving: 60, effort: 'low', category: 'Energy' },
  { id: 'a8',  icon: '🌡️', title: 'Lower thermostat by 2°C',            desc: 'Reduce heating by 2°C. This alone can cut heating bills by up to 10%.',      saving: 15, effort: 'low',    category: 'Energy' },
  { id: 'a9',  icon: '🛁', title: 'Take showers under 5 minutes',        desc: 'Shorter showers save hot water energy and reduce your footprint.',            saving: 5,  effort: 'low',    category: 'Energy' },
  { id: 'a10', icon: '🌾', title: 'Buy local food for one month',         desc: 'Shop at a local market or farm shop and choose seasonal produce.',            saving: 10, effort: 'medium', category: 'Food' },
  { id: 'a11', icon: '📱', title: 'Repair your next broken device',       desc: 'Instead of replacing broken electronics, visit a repair café or pay for repair.', saving: 25, effort: 'medium', category: 'Shopping' },
  { id: 'a12', icon: '🚗', title: 'Reduce driving by 30%',               desc: 'Combine errands, carpool, or work from home to cut weekly driving mileage.',  saving: 30, effort: 'medium', category: 'Transport' },
  { id: 'a13', icon: '🌊', title: 'Wash clothes in cold water',           desc: 'Cold-water washing uses 90% less energy than hot. Works for most fabrics.',   saving: 4,  effort: 'low',    category: 'Energy' },
  { id: 'a14', icon: '✈️', title: 'Replace one flight with train travel', desc: 'For trips under 600 km, take the train instead — 10× less CO₂ on average.', saving: 120, effort: 'high', category: 'Transport' },
  { id: 'a15', icon: '🥗', title: 'Plan meals & eliminate food waste',    desc: 'Make a weekly meal plan and shopping list to avoid buying excess food.',      saving: 18, effort: 'low',    category: 'Food' },
];

// ── Initialization ────────────────────────────────────────────────────────────

function init() {
  initStorage();

  // Load persisted state
  state.profile   = loadProfile();
  state.emissions = loadEmissions();
  state.goal      = loadGoal();
  state.actions   = loadActions() || {};
  state.streak    = loadStreak();

  if (hasProfile()) {
    showMainApp();
  } else {
    showOnboarding();
  }

  setupEventListeners();
  updateDashboardDate();
}

function showOnboarding() {
  const onboarding = el('screen-onboarding');
  const main       = el('screen-main');
  if (onboarding) { onboarding.classList.add('screen--active'); onboarding.removeAttribute('aria-hidden'); }
  if (main)       { main.classList.remove('screen--active');    main.setAttribute('aria-hidden', 'true'); }
}

function showMainApp() {
  const onboarding = el('screen-onboarding');
  const main       = el('screen-main');
  if (onboarding) { onboarding.classList.remove('screen--active'); onboarding.setAttribute('aria-hidden', 'true'); }
  if (main)       { main.classList.add('screen--active');           main.removeAttribute('aria-hidden'); }

  renderHeaderUser();
  renderDashboard();
  renderCalculatorValues();
  renderInsights();
  renderActions();
}

// ── Event Listeners ───────────────────────────────────────────────────────────

function setupEventListeners() {
  // Onboarding form
  const form = el('onboarding-form');
  if (form) form.addEventListener('submit', handleOnboardingSubmit);

  // Household stepper
  el('household-dec')?.addEventListener('click', () => stepHousehold(-1));
  el('household-inc')?.addEventListener('click', () => stepHousehold(1));

  // Navigation
  qsa('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab) switchTab(tab);
    });
  });

  // "Go to calculator" from empty state
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-goto]');
    if (target) switchTab(target.dataset.goto);
  });

  // Calculator: all range inputs
  qsa('.form-range').forEach(input => {
    input.addEventListener('input', debounce(handleRangeInput, 50));
    // Also update output on input (immediate for display)
    input.addEventListener('input', updateRangeOutput);
  });

  // Calculator: selects
  qsa('#calculator-form select').forEach(select => {
    select.addEventListener('change', debounce(recalculate, 100));
  });

  // Save calc button
  el('save-calc-btn')?.addEventListener('click', handleSaveCalc);

  // Goal
  el('set-goal-btn')?.addEventListener('click', () => openModal(el('goal-modal')));
  el('modal-cancel')?.addEventListener('click', () => closeModal(el('goal-modal')));
  el('modal-save')?.addEventListener('click', handleSaveGoal);

  // Reset
  el('reset-btn')?.addEventListener('click', handleReset);

  // Actions
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.action-check');
    if (btn) toggleAction(btn.dataset.actionId);
  });

  // Keyboard shortcut: Alt+1/2/3/4 for tab switching
  document.addEventListener('keydown', (e) => {
    if (!e.altKey) return;
    const tabs = ['dashboard','calculator','insights','actions'];
    const idx  = parseInt(e.key) - 1;
    if (idx >= 0 && idx < tabs.length) {
      e.preventDefault();
      switchTab(tabs[idx]);
    }
  });
}

// ── Onboarding ────────────────────────────────────────────────────────────────

function handleOnboardingSubmit(e) {
  e.preventDefault();
  let valid = true;

  // Validate name
  clearFieldError('user-name');
  const nameRaw = el('user-name')?.value || '';
  const name    = sanitizeString(nameRaw, 50);
  if (!name) {
    showFieldError('user-name', 'Please enter your name.');
    valid = false;
  }

  // Validate region
  clearFieldError('user-region');
  const region = el('user-region')?.value;
  if (!region) {
    showFieldError('user-region', 'Please select your region.');
    valid = false;
  }

  if (!valid) return;

  const household = clampNumber(parseInt(el('household-size')?.value || '1'), 1, 10);
  const lifestyle = qsa('input[name="lifestyle"]:checked').map(cb => cb.value);

  state.profile = { name, region, household, lifestyle };
  saveProfile(state.profile);

  // Pre-populate calculator based on lifestyle tags
  applyLifestylePresets(lifestyle);

  // Initial calculation
  recalculate();

  showMainApp();
  switchTab('dashboard');
  showToast(`Welcome, ${name}! Let's track your carbon footprint. 🌿`, 'success');
}

function applyLifestylePresets(lifestyle) {
  if (lifestyle.includes('vegan'))           { const d = el('diet-type'); if (d) d.value = 'vegan'; }
  if (lifestyle.includes('vegetarian'))      { const d = el('diet-type'); if (d) d.value = 'vegetarian'; }
  if (lifestyle.includes('car_free'))        { const c = el('car-type');  if (c) c.value = 'none'; }
  if (lifestyle.includes('renewable_energy')){ const r = el('renewable-pct'); if (r) { r.value = 80; updateRangeOutput({ target: r }); } }
  if (lifestyle.includes('frequent_flyer')) { const f = el('flights-year'); if (f) { f.value = 10; updateRangeOutput({ target: f }); } }
  if (lifestyle.includes('minimalist'))     { const s = el('shopping-spend'); if (s) { s.value = 50; updateRangeOutput({ target: s }); } }
}

function stepHousehold(delta) {
  const input = el('household-size');
  if (!input) return;
  const val = clampNumber(parseInt(input.value) + delta, 1, 10);
  input.value = val;
}

// ── Calculator ────────────────────────────────────────────────────────────────

function getCalcInputs() {
  return {
    elecKwh:       parseInt(el('elec-kwh')?.value       || 300),
    gasUsage:      parseInt(el('gas-usage')?.value      || 50),
    renewablePct:  parseInt(el('renewable-pct')?.value  || 0),
    carType:       el('car-type')?.value                || 'medium_petrol',
    carKm:         parseInt(el('car-km')?.value         || 100),
    publicTransit: parseInt(el('public-transit')?.value || 0),
    flightsYear:   parseInt(el('flights-year')?.value   || 2),
    flightType:    el('flight-type')?.value             || 'medium',
    dietType:      el('diet-type')?.value               || 'omnivore',
    foodWaste:     el('food-waste')?.value              || 'medium',
    localFood:     parseInt(el('local-food')?.value     || 20),
    clothingItems: parseInt(el('clothing-items')?.value || 2),
    electronics:   parseInt(el('electronics')?.value    || 1),
    shoppingSpend: parseInt(el('shopping-spend')?.value || 200),
    secondhandPct: parseInt(el('secondhand-pct')?.value || 10),
    recyclingRate: parseInt(el('recycling-rate')?.value || 40),
    composting:    el('composting')?.value              || 'no',
    wasteBags:     parseInt(el('waste-bags')?.value     || 2),
  };
}

function recalculate() {
  const inputs   = getCalcInputs();
  const region   = state.profile?.region || 'europe';
  const result   = calcAllEmissions(inputs, region);

  // Update category scores
  updateCategoryScore('energy',    result.energy);
  updateCategoryScore('transport', result.transport);
  updateCategoryScore('food',      result.food);
  updateCategoryScore('shopping',  result.shopping);
  updateCategoryScore('waste',     result.waste);

  // Update total
  const totalEl = el('calc-total-display');
  if (totalEl) totalEl.textContent = `${result.total} kg CO₂e`;

  return result;
}

function updateCategoryScore(cat, value) {
  const el_ = el(`cat-score-${cat}`);
  if (el_) el_.textContent = `${value} kg`;
}

function handleRangeInput(e) {
  recalculate();
}

function updateRangeOutput(e) {
  const input  = e.target || e;
  const output = document.querySelector(`output[for="${input.id}"]`);
  if (!output) return;

  const val = input.value;
  const id  = input.id;

  // Format based on field
  if (id === 'elec-kwh')        output.textContent = `${val} kWh`;
  else if (id === 'gas-usage')   output.textContent = `${val} m³`;
  else if (id === 'renewable-pct') output.textContent = `${val}%`;
  else if (id === 'car-km')      output.textContent = `${val} km/wk`;
  else if (id === 'public-transit') output.textContent = `${val} km/wk`;
  else if (id === 'flights-year') output.textContent = `${val} flight${val == 1 ? '' : 's'}`;
  else if (id === 'local-food')  output.textContent = `${val}%`;
  else if (id === 'clothing-items') output.textContent = `${val} item${val == 1 ? '' : 's'}`;
  else if (id === 'electronics') output.textContent = `${val} device${val == 1 ? '' : 's'}/yr`;
  else if (id === 'shopping-spend') output.textContent = `$${val}`;
  else if (id === 'secondhand-pct') output.textContent = `${val}%`;
  else if (id === 'recycling-rate') output.textContent = `${val}%`;
  else if (id === 'waste-bags')  output.textContent = `${val} bag${val == 1 ? '' : 's'}`;
  else output.textContent = val;
}

function renderCalculatorValues() {
  // Restore saved inputs if any
  const saved = state.emissions?.inputs;
  if (!saved) {
    // Trigger initial output display
    qsa('.form-range').forEach(input => updateRangeOutput({ target: input }));
    recalculate();
    return;
  }

  // Restore values
  const fieldMap = {
    'elec-kwh':        saved.elecKwh,
    'gas-usage':       saved.gasUsage,
    'renewable-pct':   saved.renewablePct,
    'car-km':          saved.carKm,
    'public-transit':  saved.publicTransit,
    'flights-year':    saved.flightsYear,
    'local-food':      saved.localFood,
    'clothing-items':  saved.clothingItems,
    'electronics':     saved.electronics,
    'shopping-spend':  saved.shoppingSpend,
    'secondhand-pct':  saved.secondhandPct,
    'recycling-rate':  saved.recyclingRate,
    'waste-bags':      saved.wasteBags,
  };

  Object.entries(fieldMap).forEach(([id, val]) => {
    const input = el(id);
    if (input && val !== undefined) {
      input.value = val;
      updateRangeOutput({ target: input });
    }
  });

  const selectMap = {
    'car-type':    saved.carType,
    'flight-type': saved.flightType,
    'diet-type':   saved.dietType,
    'food-waste':  saved.foodWaste,
    'composting':  saved.composting,
  };
  Object.entries(selectMap).forEach(([id, val]) => {
    const sel = el(id);
    if (sel && val) sel.value = val;
  });

  recalculate();
}

function handleSaveCalc() {
  const inputs  = getCalcInputs();
  const region  = state.profile?.region || 'europe';
  const result  = calcAllEmissions(inputs, region);
  result.inputs = inputs;

  state.emissions = saveEmissions(result);
  state.streak    = updateStreak();

  renderDashboard();
  renderInsights();
  renderActions();
  switchTab('dashboard');
  showToast('Footprint updated! Dashboard refreshed. ✅', 'success');

  // Celebrate if score is great
  if (result.total < 167) {
    setTimeout(celebrate, 500);
  }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function renderDashboard() {
  const e = state.emissions;

  if (!e) {
    // Show zeroed state
    animateNumber(el('score-display'), 0);
    setText('score-label', '–');
    drawGauge(el('gauge-canvas'), 0, 1000);
    drawDonut(el('donut-canvas'), { energy:0, transport:0, food:0, shopping:0, waste:0 });
    el('donut-legend').innerHTML = '';
    drawTrend(el('trend-canvas'), loadHistory());
    drawGoalRing(el('goal-canvas'), 0);
    return;
  }

  const total    = e.total;
  const label    = getScoreLabel(total);
  const history  = loadHistory();

  // Score number with animation
  animateNumber(el('score-display'), total);

  // Score label
  setText('score-label', label.label);
  const scoreNumEl = el('score-display');
  if (scoreNumEl) scoreNumEl.style.color = '';

  // Gauge
  drawGauge(el('gauge-canvas'), total, 1000);

  // Comparison bars
  const pct = Math.min(100, (total / 1000) * 100);
  const compareYou = el('compare-you');
  if (compareYou) compareYou.style.width = pct + '%';
  setText('compare-you-val', total);

  const compareBar = qs('[aria-label="Your footprint"]');
  if (compareBar) {
    compareBar.setAttribute('aria-valuenow', total);
    compareBar.setAttribute('aria-valuetext', `${total} kg CO₂e per month`);
  }

  // Donut chart
  const catData = { energy: e.energy, transport: e.transport, food: e.food, shopping: e.shopping, waste: e.waste };
  drawDonut(el('donut-canvas'), catData);
  el('donut-legend').innerHTML = buildDonutLegend(catData);

  // Trend
  drawTrend(el('trend-canvas'), history);
  renderTrendBadge(history);

  // Goal ring
  renderGoalCard();
}

function renderTrendBadge(history) {
  const badge = el('trend-badge');
  if (!badge || history.length < 2) { if(badge) badge.textContent = ''; return; }

  const prev = history[history.length - 2].kg;
  const curr = history[history.length - 1].kg;
  const pct  = Math.round(((curr - prev) / prev) * 100);

  if (pct < -2) {
    badge.className = 'trend-badge trend-badge--down';
    badge.textContent = `↓ ${Math.abs(pct)}%`;
  } else if (pct > 2) {
    badge.className = 'trend-badge trend-badge--up';
    badge.textContent = `↑ ${pct}%`;
  } else {
    badge.className = 'trend-badge trend-badge--flat';
    badge.textContent = '→ Stable';
  }
}

function renderGoalCard() {
  const goal     = state.goal;
  const total    = state.emissions?.total || 0;
  const goalDesc = el('goal-desc');
  const goalPct  = el('goal-pct');
  const canvas   = el('goal-canvas');

  if (!goal) {
    if (goalDesc) goalDesc.textContent = 'Set a reduction target to track your progress.';
    if (goalPct)  goalPct.textContent  = '–';
    if (canvas)   drawGoalRing(canvas, 0);
    return;
  }

  const pct = total === 0 ? 0 : Math.round((goal / total) * 100);
  const achieved = total <= goal;

  if (goalDesc) {
    goalDesc.textContent = achieved
      ? `🎉 Goal achieved! You're at ${total} kg, under your ${goal} kg target.`
      : `Target: ${goal} kg/mo. Current: ${total} kg/mo. ${Math.max(0, total - goal)} kg to go.`;
  }

  if (goalPct) goalPct.textContent = achieved ? '✓' : `${pct}%`;
  if (canvas)  drawGoalRing(canvas, pct);

  if (achieved && state.emissions) celebrate();
}

function updateDashboardDate() {
  const el_ = el('dashboard-date');
  if (el_) {
    el_.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'short', month: 'long', day: 'numeric'
    });
  }
}

function renderHeaderUser() {
  const el_ = el('header-user-info');
  if (el_ && state.profile) {
    el_.textContent = `👤 ${state.profile.name}`;
  }
}

// ── Insights ──────────────────────────────────────────────────────────────────

function renderInsights() {
  const container  = el('insights-container');
  const emptyState = el('insights-empty');
  if (!container) return;

  const e = state.emissions;
  if (!e || e.total === 0) {
    container.innerHTML = '';
    if (emptyState) container.appendChild(emptyState);
    return;
  }

  container.innerHTML = '';

  // Summary card
  const summary = generateSummary(state.profile, e);
  const summaryCard = document.createElement('div');
  summaryCard.className = 'insights-summary-card';
  summaryCard.setAttribute('role', 'region');
  summaryCard.setAttribute('aria-label', 'Personalized summary');

  const headline = document.createElement('div');
  headline.className = 'summary-title';
  headline.textContent = summary.headline;

  const subtext = document.createElement('p');
  subtext.className = 'summary-text';
  subtext.textContent = summary.subtext;

  const annualTonnes = toAnnualTonnes(e.total);
  const savingEl = document.createElement('div');
  savingEl.className = 'summary-saving';
  savingEl.textContent = `${annualTonnes}t CO₂e/yr`;

  const savingLabel = document.createElement('div');
  savingLabel.className = 'summary-saving-label';
  savingLabel.textContent = 'Your annual carbon footprint';

  summaryCard.appendChild(headline);
  summaryCard.appendChild(subtext);
  summaryCard.appendChild(savingEl);
  summaryCard.appendChild(savingLabel);
  container.appendChild(summaryCard);

  // Insight cards
  const insights = generateInsights(e, e.inputs || {}, state.profile);

  if (insights.length === 0) {
    const msg = document.createElement('p');
    msg.style.cssText = 'text-align:center;color:var(--color-text-muted);padding:2rem';
    msg.textContent = 'Great job! No major improvements detected. Keep it up!';
    container.appendChild(msg);
    return;
  }

  const totalSaving = totalPotentialSaving(insights);
  if (totalSaving > 0) {
    const savingsHint = document.createElement('p');
    savingsHint.style.cssText = 'font-size:0.8125rem;color:var(--color-primary);font-weight:600;text-align:center;padding:0.5rem 0';
    savingsHint.setAttribute('aria-live', 'polite');
    savingsHint.textContent = `💡 These tips could save you ~${totalSaving} kg CO₂e/month`;
    container.appendChild(savingsHint);
  }

  insights.forEach((insight, i) => {
    const card = buildInsightCard(insight, i * 60);
    container.appendChild(card);
  });
}

// ── Actions ───────────────────────────────────────────────────────────────────

function renderActions() {
  const list = el('actions-list');
  if (!list) return;

  list.innerHTML = '';

  ACTION_CATALOG.forEach(action => {
    const done    = !!state.actions[action.id];
    const itemEl  = buildActionItem({ ...action, done });
    list.appendChild(itemEl);
  });

  updateActionStats();
}

function toggleAction(actionId) {
  if (!actionId) return;
  state.actions[actionId] = !state.actions[actionId];
  saveActions(state.actions);

  // Update UI
  const item    = qs(`[data-action-id="${actionId}"].action-item`);
  const checkBtn = qs(`[data-action-id="${actionId}"].action-check`);
  const action   = ACTION_CATALOG.find(a => a.id === actionId);

  if (item) item.classList.toggle('action-item--done', state.actions[actionId]);
  if (checkBtn) {
    checkBtn.classList.toggle('action-check--done', state.actions[actionId]);
    if (action) {
      checkBtn.setAttribute('aria-label',
        `Mark "${action.title}" as ${state.actions[actionId] ? 'incomplete' : 'complete'}`);
    }
  }

  if (state.actions[actionId]) {
    const action_ = ACTION_CATALOG.find(a => a.id === actionId);
    if (action_) showToast(`Action completed! Saving ~${action_.saving} kg CO₂/mo 🌍`, 'success');
  }

  updateActionStats();
  state.streak = updateStreak();
  setText('actions-streak', `${state.streak.count}🔥`);
}

function updateActionStats() {
  const doneIds = Object.keys(state.actions).filter(k => state.actions[k]);
  const completed = doneIds.length;
  const saved = doneIds.reduce((sum, id) => {
    const action = ACTION_CATALOG.find(a => a.id === id);
    return sum + (action?.saving || 0);
  }, 0);

  animateNumber(el('actions-completed'), completed, 400);
  animateNumber(el('actions-saved'), saved, 600);
  setText('actions-streak', `${state.streak.count}🔥`);
}

// ── Goal ──────────────────────────────────────────────────────────────────────

function handleSaveGoal() {
  const input   = el('goal-input');
  const modal   = el('goal-modal');
  const val     = parseInt(input?.value || '200');
  const clamped = clampNumber(val, 50, 5000);

  state.goal = clamped;
  saveGoal(clamped);
  closeModal(modal);
  renderGoalCard();
  showToast(`Monthly goal set: ${clamped} kg CO₂e 🎯`, 'success');
}

// ── Reset ─────────────────────────────────────────────────────────────────────

function handleReset() {
  const confirmed = window.confirm(
    'Reset all data? This will clear your profile, emissions data, and actions. This cannot be undone.'
  );
  if (!confirmed) return;

  clearAllData();
  state.profile   = null;
  state.emissions = null;
  state.goal      = null;
  state.actions   = {};
  state.streak    = { count: 0, lastDate: null };

  showOnboarding();
}

// ── Start App ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
