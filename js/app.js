"use strict";

/**
 * @typedef {Object} UserProfile
 * @property {string} name
 * @property {string} region
 * @property {number} household
 * @property {string[]} lifestyle
 */

/**
 * @typedef {Object} CarbonEmissions
 * @property {number} energy
 * @property {number} transport
 * @property {number} food
 * @property {number} shopping
 * @property {number} waste
 * @property {number} total
 * @property {Object} inputs
 */

// ══════ CONFIGURATION & CONSTANTS ══════

const CATEGORY_COLORS = { energy: '#4CAF50', transport: '#FF7043', food: '#FFA726', shopping: '#AB47BC', waste: '#26A69A' };
const CATEGORY_LABELS = { energy: '🏠 Energy', transport: '🚗 Transport', food: '🍔 Food', shopping: '🛍️ Shopping', waste: '♻️ Waste' };

const ACTION_CATALOG = [
  { id: 'a1', icon: '🚶', title: 'Walk or cycle 3x per week', desc: 'Skip the car for short trips under 3 km.', save: 20, effort: 'Easy', cat: 'Transport' },
  { id: 'a2', icon: '🥩', title: 'Meat-free 3 days a week', desc: 'Replace meat meals with plant-based alternatives.', save: 35, effort: 'Easy', cat: 'Food' },
  { id: 'a3', icon: '💡', title: 'Switch all bulbs to LED', desc: 'LEDs use 80% less energy and last 10× longer.', save: 8, effort: 'Easy', cat: 'Energy' },
  { id: 'a4', icon: '♻️', title: 'Achieve 70%+ recycling rate', desc: 'Learn your local recycling rules and sort carefully.', save: 12, effort: 'Easy', cat: 'Waste' },
  { id: 'a5', icon: '👗', title: 'Buy only secondhand clothing', desc: 'Thrift stores, Vinted, eBay – zero new production.', save: 22, effort: 'Medium', cat: 'Shopping' },
  { id: 'a6', icon: '🌱', title: 'Start composting food scraps', desc: 'Diverts waste from landfill and creates free fertiliser.', save: 8, effort: 'Medium', cat: 'Waste' },
  { id: 'a7', icon: '☀️', title: 'Switch to a green energy tariff', desc: '100% renewable electricity from your provider.', save: 60, effort: 'Easy', cat: 'Energy' },
  { id: 'a8', icon: '🌡️', title: 'Lower thermostat by 2°C', desc: 'Saves up to 10% of your heating bill.', save: 15, effort: 'Easy', cat: 'Energy' },
  { id: 'a9', icon: '🛒', title: 'Shop at a local market', desc: 'Buy seasonal, local produce for one month.', save: 10, effort: 'Medium', cat: 'Food' },
  { id: 'a10', icon: '📱', title: 'Repair your next broken device', desc: 'Saves ~70 kg CO₂e vs buying new.', save: 25, effort: 'Medium', cat: 'Shopping' },
  { id: 'a11', icon: '🚗', title: 'Reduce driving by 30%', desc: 'Combine errands, carpool, or work from home.', save: 30, effort: 'Medium', cat: 'Transport' },
  { id: 'a12', icon: '✈️', title: 'Replace one flight with train', desc: 'Rail emits 10× less CO₂ for trips under 600 km.', save: 120, effort: 'Hard', cat: 'Transport' },
  { id: 'a13', icon: '🥗', title: 'Meal plan to cut food waste', desc: 'Weekly planning eliminates impulse waste.', save: 18, effort: 'Easy', cat: 'Food' },
  { id: 'a14', icon: '🌊', title: 'Wash clothes in cold water', desc: 'Cold washing uses 90% less energy.', save: 4, effort: 'Easy', cat: 'Energy' }
];

const INSIGHT_RULES = [
  { icon: '⚡', title: 'Switch to an Electric Vehicle', text: (e) => `Your car causes ~${e.transport} kg CO₂/mo. An EV cuts that by 65%.`, impact: 'high', save: (e) => Math.round(e.transport * 0.65), cond: (e, i) => ['medium_petrol', 'large_petrol', 'diesel', 'small_petrol'].includes(i.carType) && i.carKm > 80 },
  { icon: '✈️', title: 'Fly less', text: (e, i) => `Your ${i.flightsYr} flights/year are a major emission source.`, impact: 'high', save: (e, i) => Math.round(i.flightsYr / 12 * FLIGHT_EMISSIONS_KG[i.flightType || 'medium'] * 0.5), cond: (e, i) => i.flightsYr >= 4 },
  { icon: '🚌', title: 'Use public transit more', text: () => 'Replacing 50 km/week of driving saves ~18 kg CO₂/mo.', impact: 'medium', save: () => 18, cond: (e, i) => i.carKm > 50 && i.carType !== 'none' && i.pubTransit < 50 },
  { icon: '☀️', title: 'Switch to renewable energy', text: (e) => `Home energy = ${e.energy} kg CO₂/mo. Green tariff cuts this 75%.`, impact: 'high', save: (e) => Math.round(e.energy * 0.75), cond: (e, i) => i.renewPct < 50 && e.energy > 60 },
  { icon: '💡', title: 'Reduce electricity use', text: () => 'LEDs, smart thermostat & standby cuts usage 15–20%.', impact: 'medium', save: (e) => Math.round(e.energy * 0.17), cond: (e, i) => i.elecKwh > 400 },
  { icon: '🥦', title: 'Eat less meat', text: (e) => `Diet = ${e.food} kg CO₂/mo. Cutting red meat 3 days/week saves ~42 kg.`, impact: 'high', save: () => 42, cond: (e, i) => ['omnivore', 'heavy_meat'].includes(i.dietType) },
  { icon: '🗑️', title: 'Reduce food waste', text: () => 'Plan meals and freeze leftovers to cut waste emissions.', impact: 'medium', save: (e) => Math.round(e.food * 0.12), cond: (e, i) => ['medium', 'high'].includes(i.foodWaste) },
  { icon: '🪱', title: 'Start composting', text: () => 'Composting stops food scraps producing methane in landfill.', impact: 'medium', save: () => 8, cond: (e, i) => i.composting === 'no' },
  { icon: '👗', title: 'Slow down fashion', text: (e, i) => `Buying ${i.clothes} items/month adds up fast.`, impact: 'medium', save: (e, i) => Math.round(i.clothes * 7.5 * 0.6), cond: (e, i) => i.clothes > 3 },
  { icon: '♻️', title: 'Shop secondhand', text: () => 'Secondhand reduces demand for new production significantly.', impact: 'medium', save: (e) => Math.round(e.shopping * 0.3), cond: (e, i) => i.secondhand < 20 && e.shopping > 50 },
  { icon: '🔄', title: 'Improve recycling rate', text: (e, i) => `You recycle ${i.recycleRate}%. Getting to 70% makes a real difference.`, impact: 'medium', save: (e) => Math.round(e.waste * 0.2), cond: (e, i) => i.recycleRate < 60 },
  { icon: '🌱', title: 'Great – You\'re vegan!', text: (e) => `Plant-based eating saves ~80 kg/mo vs average. Your food: ${e.food} kg.`, impact: 'low', save: () => 0, cond: (e, i) => i.dietType === 'vegan' },
  { icon: '🌟', title: 'Great – You drive electric!', text: () => 'Pair your EV with renewable energy for maximum impact.', impact: 'low', save: () => 0, cond: (e, i) => i.carType === 'electric' }
];

// ══════ APPLICATION STATE ══════
const AppState = {
  profile: null,
  emissions: null,
  goal: null,
  actions: {},
  streak: { count: 0, lastDate: null },
  householdCount: 1
};

// ══════ STORAGE UTILITIES ══════
const StorageManager = {
  save: (key, value) => {
    try { localStorage.setItem('cw2_' + key, JSON.stringify(value)); } catch (e) { console.warn('Storage quota exceeded'); }
  },
  load: (key, defaultValue) => {
    try {
      const result = localStorage.getItem('cw2_' + key);
      return result === null ? defaultValue : JSON.parse(result);
    } catch (e) {
      return defaultValue;
    }
  },
  clearAll: () => {
    ['profile', 'emissions', 'history', 'actions', 'goal', 'streak'].forEach(k => localStorage.removeItem('cw2_' + k));
  }
};

// ══════ DOM HELPERS & SECURITY ══════
const DOM = {
  get: (id) => document.getElementById(id),
  setText: (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(text);
  },
  /** Sanitizes strings to prevent XSS injection. */
  sanitize: (str, maxLen = 100) => {
    if (typeof str !== 'string') return '';
    return str.replace(/<[^>]*>/g, '').trim().slice(0, maxLen);
  },
  clampValue: (val, min, max) => {
    const num = Number(val);
    return isFinite(num) ? Math.max(min, Math.min(max, num)) : min;
  },
  emptyNode: (node) => {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }
};

function showToast(message, isWarning = false) {
  const toastWrapper = DOM.get('toasts');
  if (!toastWrapper) return;
  const toastDiv = document.createElement('div');
  toastDiv.className = 'toast' + (isWarning ? ' warn' : '');
  toastDiv.textContent = message;
  toastWrapper.appendChild(toastDiv);
  setTimeout(() => toastDiv.remove(), 3200);
}

function animateNumber(element, targetValue, durationMs) {
  if (!element) return;
  const start = performance.now();
  const fromValue = parseFloat(element.textContent) || 0;
  const delta = targetValue - fromValue;

  const tick = (now) => {
    const progress = Math.min((now - start) / durationMs, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(fromValue + delta * ease);
    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  };
  requestAnimationFrame(tick);
}

// ══════ CALCULATION ENGINE ══════
/** Pure function to calculate all emissions. */
// ══════ EMISSION CALCULATIONS (MEMOIZED FOR EFFICIENCY) ══════
import { calculateTotalEmissions } from './calculator.js';



function getCalculatorInputs() {
  return {
    elecKwh: Number(DOM.get('elec-kwh').value), gasUse: Number(DOM.get('gas-use').value), renewPct: Number(DOM.get('renew-pct').value),
    carType: DOM.get('car-type').value, carKm: Number(DOM.get('car-km').value), pubTransit: Number(DOM.get('pub-transit').value),
    flightsYr: Number(DOM.get('flights-yr').value), flightType: DOM.get('flight-type').value,
    dietType: DOM.get('diet-type').value, foodWaste: DOM.get('food-waste').value, localFood: Number(DOM.get('local-food').value),
    clothes: Number(DOM.get('clothes').value), electronics: Number(DOM.get('electronics').value),
    shopSpend: Number(DOM.get('shop-spend').value), secondhand: Number(DOM.get('secondhand').value),
    recycleRate: Number(DOM.get('recycle-rate').value), composting: DOM.get('composting').value,
    wasteBags: Number(DOM.get('waste-bags').value),
  };
}

// ══════ RANGE LABEL FORMATTING ══════
const RANGE_FORMATTERS = {
  'elec-kwh': v => `${v} kWh`, 'gas-use': v => `${v} m³`, 'renew-pct': v => `${v}%`,
  'car-km': v => `${v} km`, 'pub-transit': v => `${v} km`, 'flights-yr': v => v,
  'local-food': v => `${v}%`, 'clothes': v => v, 'electronics': v => v,
  'shop-spend': v => `$${v}`, 'secondhand': v => `${v}%`, 'recycle-rate': v => `${v}%`, 'waste-bags': v => v
};

function updateRangeOutput(inputElement) {
  const formatter = RANGE_FORMATTERS[inputElement.id];
  const outputElement = DOM.get('o-' + inputElement.id);
  if (formatter && outputElement) {
    outputElement.textContent = formatter(inputElement.value);
  }
}

function handleCalculatorChange() {
  const inputs = getCalculatorInputs();
  const region = AppState.profile ? AppState.profile.region : 'europe';
  const results = calculateTotalEmissions(inputs, region);
  
  DOM.setText('cs-energy', `${results.energy} kg`);
  DOM.setText('cs-transport', `${results.transport} kg`);
  DOM.setText('cs-food', `${results.food} kg`);
  DOM.setText('cs-shopping', `${results.shopping} kg`);
  DOM.setText('cs-waste', `${results.waste} kg`);
  DOM.setText('calc-total', `${results.total} kg CO₂e / mo`);
  
  return results;
}

// ══════ CANVAS CHARTS ══════
function setupCanvasContext(canvasElement) {
  const ctx = canvasElement.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvasElement.clientWidth || +canvasElement.getAttribute('width') || 200;
  const h = canvasElement.clientHeight || +canvasElement.getAttribute('height') || 120;
  
  canvasElement.width = w * dpr;
  canvasElement.height = h * dpr;
  ctx.scale(dpr, dpr);
  canvasElement.style.width = `${w}px`;
  canvasElement.style.height = `${h}px`;
  
  return { ctx, w, h };
}

function drawGaugeChart(canvasElement, currentValue, maxValue) {
  const { ctx, w, h } = setupCanvasContext(canvasElement);
  ctx.clearRect(0, 0, w, h);
  
  const cx = w / 2, cy = h - 6, r = Math.min(w, h * 2) / 2 - 16;
  
  // Background arc
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI);
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#E8EEE8';
  ctx.lineCap = 'round';
  ctx.stroke();
  
  // Gradient foreground arc
  const fraction = Math.min(1, currentValue / (maxValue || 1000));
  const endAngle = Math.PI + fraction * Math.PI;
  
  const gradient = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
  gradient.addColorStop(0, '#4CAF50');
  gradient.addColorStop(0.5, '#FFC107');
  gradient.addColorStop(1, '#F44336');
  
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, endAngle);
  ctx.lineWidth = 12;
  ctx.strokeStyle = gradient;
  ctx.lineCap = 'round';
  ctx.stroke();
  
  // Needle
  const needleX = cx + (r - 2) * Math.cos(endAngle);
  const needleY = cy + (r - 2) * Math.sin(endAngle);
  
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(needleX, needleY);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.stroke();
  
  // Needle base pivot
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#555';
  ctx.fill();
  
  // Labels
  ctx.fillStyle = '#B0C0B0';
  ctx.font = '9px Inter,sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('0', cx - r - 2, cy + 12);
  ctx.textAlign = 'right';
  ctx.fillText(String(maxValue), cx + r + 2, cy + 12);
}

function drawDonutChart(canvasElement, categoryData) {
  const { ctx, w, h } = setupCanvasContext(canvasElement);
  ctx.clearRect(0, 0, w, h);
  
  const total = Object.values(categoryData).reduce((sum, val) => sum + val, 0);
  if (!total) return;
  
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 16, innerR = r * 0.55;
  let startAngle = -Math.PI / 2;
  
  Object.entries(categoryData).filter(([, val]) => val > 0).forEach(([key, val]) => {
    const sliceAngle = (val / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;
    const midAngle = startAngle + sliceAngle / 2;
    
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = CATEGORY_COLORS[key] || '#ccc';
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r + 2, startAngle, endAngle);
    ctx.closePath();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Slice labels
    if (sliceAngle > 0.25) {
      const labelX = cx + r * 0.76 * Math.cos(midAngle);
      const labelY = cy + r * 0.76 * Math.sin(midAngle);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px Inter,sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round((val / total) * 100)}%`, labelX, labelY);
    }
    startAngle = endAngle;
  });
  
  // Inner cutout
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff';
  ctx.fill();
  
  // Center text
  ctx.fillStyle = '#1A2E1A';
  ctx.font = 'bold 14px Inter,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(total), cx, cy - 7);
  
  ctx.font = '9px Inter,sans-serif';
  ctx.fillStyle = '#9BAA9B';
  ctx.fillText('kg/mo', cx, cy + 8);
}

function drawTrendChart(canvasElement, historyData) {
  const { ctx, w, h } = setupCanvasContext(canvasElement);
  ctx.clearRect(0, 0, w, h);
  
  if (!historyData || historyData.length < 2) {
    ctx.fillStyle = '#B0C0B0';
    ctx.font = '12px Inter,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Save data to see trend', w / 2, h / 2);
    return;
  }
  
  const pad = { t: 14, r: 14, b: 30, l: 36 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;
  
  const values = historyData.map(p => p.kg);
  const maxVal = Math.max(...values, 167) * 1.15;
  
  const toX = (i) => pad.l + i * (cw / (historyData.length - 1));
  const toY = (val) => pad.t + ch - (val / maxVal) * ch;
  
  // Y-axis grid
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (ch / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + cw, y);
    ctx.strokeStyle = '#EEF3EE';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.fillStyle = '#B0C0B0';
    ctx.font = '9px Inter,sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(Math.round(maxVal - (maxVal / 4) * i)), pad.l - 5, y);
  }
  
  // Climate target line
  const targetY = toY(167);
  ctx.beginPath();
  ctx.setLineDash([4, 4]);
  ctx.moveTo(pad.l, targetY);
  ctx.lineTo(pad.l + cw, targetY);
  ctx.strokeStyle = '#4CAF50';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.setLineDash([]);
  
  ctx.fillStyle = 'rgba(76,175,80,.6)';
  ctx.font = '9px Inter,sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Target', pad.l + cw, targetY - 5);
  
  // Area gradient
  const gradient = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
  gradient.addColorStop(0, 'rgba(76,175,80,.2)');
  gradient.addColorStop(1, 'rgba(76,175,80,0)');
  
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(historyData[0].kg));
  for (let i = 1; i < historyData.length; i++) {
    const cpX = (toX(i - 1) + toX(i)) / 2;
    ctx.bezierCurveTo(cpX, toY(historyData[i - 1].kg), cpX, toY(historyData[i].kg), toX(i), toY(historyData[i].kg));
  }
  ctx.lineTo(toX(historyData.length - 1), pad.t + ch);
  ctx.lineTo(toX(0), pad.t + ch);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Line stroke
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(historyData[0].kg));
  for (let i = 1; i < historyData.length; i++) {
    const cpX = (toX(i - 1) + toX(i)) / 2;
    ctx.bezierCurveTo(cpX, toY(historyData[i - 1].kg), cpX, toY(historyData[i].kg), toX(i), toY(historyData[i].kg));
  }
  ctx.strokeStyle = '#2E7D32';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.stroke();
  
  // Points & Labels
  historyData.forEach((pt, i) => {
    ctx.beginPath();
    ctx.arc(toX(i), toY(pt.kg), 4, 0, Math.PI * 2);
    ctx.fillStyle = '#2E7D32';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.fillStyle = '#9BAA9B';
    ctx.font = '9px Inter,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(pt.month, toX(i), pad.t + ch + 4);
  });
}

function drawGoalRingChart(canvasElement, percentage) {
  const { ctx, w, h } = setupCanvasContext(canvasElement);
  ctx.clearRect(0, 0, w, h);
  
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 7;
  
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#E8EEE8';
  ctx.lineWidth = 8;
  ctx.stroke();
  
  if (percentage > 0) {
    const clampedPct = Math.min(1, percentage / 100);
    const endAngle = -Math.PI / 2 + clampedPct * 2 * Math.PI;
    
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, endAngle);
    ctx.strokeStyle = percentage >= 100 ? '#2E7D32' : percentage >= 50 ? '#4CAF50' : '#FFA726';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

function getScoreLabel(kg) {
  if (kg < 100) return { text: 'Exceptional 🌟', cls: 'badge-great' };
  if (kg < 167) return { text: 'On Target ✅', cls: 'badge-great' };
  if (kg < 300) return { text: 'Below Average 👍', cls: 'badge-great' };
  if (kg < 400) return { text: 'Average ⚠️', cls: 'badge-ok' };
  if (kg < 600) return { text: 'Above Average', cls: 'badge-ok' };
  return { text: 'High Impact 🔴', cls: 'badge-high' };
}

// ══════ UI RENDERING ══════
function renderDashboardView() {
  const emissionsData = AppState.emissions;
  const historyData = StorageManager.load('history', []);
  const totalKg = emissionsData ? emissionsData.total : 0;
  
  animateNumber(DOM.get('score-num'), totalKg, 800);
  
  const scoreLabelObj = getScoreLabel(totalKg);
  const badgeElement = DOM.get('score-badge');
  if (badgeElement) {
    badgeElement.textContent = scoreLabelObj.text;
    badgeElement.className = `score-badge ${scoreLabelObj.cls}`;
  }
  
  DOM.setText('stat-annual', `${Math.round(totalKg * 12 / 100) / 10}t`);
  
  const comparisonPct = Math.min(100, (totalKg / 1000) * 100);
  const comparisonBar = DOM.get('cmp-you-bar');
  if (comparisonBar) comparisonBar.style.width = `${comparisonPct}%`;
  
  DOM.setText('cmp-you-v', `${totalKg} kg`);
  
  setTimeout(() => { drawGaugeChart(DOM.get('gauge-cv'), totalKg, 1000); }, 50);
  
  const categoryData = emissionsData ? 
    { energy: emissionsData.energy, transport: emissionsData.transport, food: emissionsData.food, shopping: emissionsData.shopping, waste: emissionsData.waste } : 
    { energy: 0, transport: 0, food: 0, shopping: 0, waste: 0 };
    
  setTimeout(() => { drawDonutChart(DOM.get('donut-cv'), categoryData); }, 50);
  
  // Render Legend Safely
  const legendContainer = DOM.get('donut-leg');
  if (legendContainer) {
    DOM.emptyNode(legendContainer);
    Object.entries(categoryData).filter(([, val]) => val > 0).forEach(([key, val]) => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'leg-item';
      
      const dotSpan = document.createElement('span');
      dotSpan.className = 'leg-dot';
      dotSpan.style.backgroundColor = CATEGORY_COLORS[key];
      
      const textNode = document.createTextNode(` ${CATEGORY_LABELS[key]}: `);
      const boldNode = document.createElement('strong');
      boldNode.textContent = `${val} kg`;
      
      itemDiv.appendChild(dotSpan);
      itemDiv.appendChild(textNode);
      itemDiv.appendChild(boldNode);
      legendContainer.appendChild(itemDiv);
    });
  }
  
  setTimeout(() => { drawTrendChart(DOM.get('trend-cv'), historyData); }, 50);
  
  const trendBadge = DOM.get('trend-badge');
  if (historyData.length >= 2 && trendBadge) {
    const prevVal = historyData[historyData.length - 2].kg;
    const currVal = historyData[historyData.length - 1].kg;
    const diffPct = Math.round((currVal - prevVal) / prevVal * 100);
    
    if (diffPct < -2) {
      trendBadge.className = 'tbadge tb-dn';
      trendBadge.textContent = `↓ ${Math.abs(diffPct)}%`;
    } else if (diffPct > 2) {
      trendBadge.className = 'tbadge tb-up';
      trendBadge.textContent = `↑ ${diffPct}%`;
    } else {
      trendBadge.className = 'tbadge tb-eq';
      trendBadge.textContent = '→ Stable';
    }
  } else if (trendBadge) {
    trendBadge.textContent = '';
  }
  
  renderGoalTracker();
}

function renderGoalTracker() {
  const goalTarget = AppState.goal;
  const totalEmissions = AppState.emissions ? AppState.emissions.total : 0;
  
  if (!goalTarget) {
    DOM.setText('goal-desc', 'Set a reduction target to track progress.');
    DOM.setText('goal-pct', '–');
    setTimeout(() => drawGoalRingChart(DOM.get('goal-cv'), 0), 50);
    return;
  }
  
  const percentage = totalEmissions === 0 ? 100 : Math.round((goalTarget / totalEmissions) * 100);
  const isGoalAchieved = totalEmissions <= goalTarget;
  
  DOM.setText('goal-desc', isGoalAchieved ? `🎉 Goal achieved! ${totalEmissions} kg ≤ ${goalTarget} kg` : `Target: ${goalTarget} kg/mo • Current: ${totalEmissions} kg`);
  DOM.setText('goal-pct', isGoalAchieved ? '✓' : `${Math.min(100, percentage)}%`);
  
  setTimeout(() => drawGoalRingChart(DOM.get('goal-cv'), percentage), 50);
}

function renderInsightsView() {
  const insightsContainer = DOM.get('insights-box');
  const emissionsData = AppState.emissions;
  
  if (!insightsContainer) return;
  DOM.emptyNode(insightsContainer);
  
  if (!emissionsData || emissionsData.total === 0) {
    // Empty state container
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty';
    
    const iconDiv = document.createElement('div');
    iconDiv.className = 'empty-icon';
    iconDiv.textContent = '💡';
    
    const titleH3 = document.createElement('h3');
    titleH3.textContent = 'No data yet';
    
    const descP = document.createElement('p');
    descP.textContent = 'Use the calculator and save your data to get personalised insights.';
    
    const calcBtn = document.createElement('button');
    calcBtn.type = 'button';
    calcBtn.className = 'btn btn-green';
    calcBtn.dataset.goto = 'calculator';
    calcBtn.textContent = 'Open Calculator';
    
    emptyDiv.appendChild(iconDiv);
    emptyDiv.appendChild(titleH3);
    emptyDiv.appendChild(descP);
    emptyDiv.appendChild(calcBtn);
    insightsContainer.appendChild(emptyDiv);
    return;
  }
  
  const inputs = emissionsData.inputs || {};
  const userName = AppState.profile ? AppState.profile.name : 'there';
  const totalMonthlyKg = emissionsData.total;
  const yearlyTonnes = Math.round(totalMonthlyKg * 12 / 100) / 10;
  const isTargetMet = totalMonthlyKg <= 167;
  
  // Render Summary Card safely
  const summaryCard = document.createElement('div');
  summaryCard.className = 'ins-summary-card';
  
  const headlineDiv = document.createElement('div');
  headlineDiv.className = 'is-headline';
  headlineDiv.textContent = isTargetMet ? `Great work, ${userName}! 🌟` : `Hi ${userName}, here's your plan 🌍`;
  
  const textP = document.createElement('p');
  textP.className = 'is-text';
  textP.textContent = isTargetMet ? "You're below the 2°C climate target. Keep it up!" : `Your ${yearlyTonnes}t CO₂e/year is above the climate target. The tips below can help.`;
  
  const bigDiv = document.createElement('div');
  bigDiv.className = 'is-big';
  bigDiv.textContent = `${yearlyTonnes}t CO₂e/yr`;
  
  const smallDiv = document.createElement('div');
  smallDiv.className = 'is-small';
  smallDiv.textContent = 'Your estimated annual footprint';
  
  summaryCard.appendChild(headlineDiv);
  summaryCard.appendChild(textP);
  summaryCard.appendChild(bigDiv);
  summaryCard.appendChild(smallDiv);
  insightsContainer.appendChild(summaryCard);
  
  const orderWeights = { high: 3, medium: 2, low: 1 };
  const matchedRules = INSIGHT_RULES
    .filter(rule => { try { return rule.cond(emissionsData, inputs); } catch (e) { return false; } })
    .map(rule => ({ ...rule, savingValue: rule.save ? Math.max(0, rule.save(emissionsData, inputs)) : 0 }))
    .sort((a, b) => {
      const diff = (orderWeights[b.impact] || 0) - (orderWeights[a.impact] || 0);
      return diff || b.savingValue - a.savingValue;
    })
    .slice(0, 8);
    
  const totalSavings = matchedRules.reduce((sum, rule) => sum + rule.savingValue, 0);
  
  if (totalSavings > 0) {
    const savingsP = document.createElement('p');
    savingsP.style.cssText = 'text-align:center;color:#2E7D32;font-size:.8125rem;font-weight:600;padding:.25rem 0';
    savingsP.textContent = `💡 These tips could save ~${totalSavings} kg CO₂e per month`;
    insightsContainer.appendChild(savingsP);
  }
  
  matchedRules.forEach((rule, index) => {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'ins-card';
    cardDiv.style.animationDelay = `${index * 60}ms`;
    
    const iconDiv = document.createElement('div');
    iconDiv.className = 'ins-icon';
    iconDiv.textContent = rule.icon;
    
    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'ins-body';
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'ins-title';
    titleDiv.textContent = rule.title;
    
    const descP = document.createElement('p');
    descP.className = 'ins-text';
    try { descP.textContent = rule.text(emissionsData, inputs); } catch (e) { descP.textContent = ''; }
    
    const tagSpan = document.createElement('span');
    tagSpan.className = `ins-tag it-${rule.impact.charAt(0)}`;
    tagSpan.textContent = `${rule.impact.charAt(0).toUpperCase()}${rule.impact.slice(1)} impact${rule.savingValue > 0 ? ` · −${rule.savingValue} kg/mo` : ''}`;
    
    bodyDiv.appendChild(titleDiv);
    bodyDiv.appendChild(descP);
    bodyDiv.appendChild(tagSpan);
    
    cardDiv.appendChild(iconDiv);
    cardDiv.appendChild(bodyDiv);
    insightsContainer.appendChild(cardDiv);
  });
}

function renderActionsView() {
  const listContainer = DOM.get('act-list');
  if (!listContainer) return;
  DOM.emptyNode(listContainer);
  
  ACTION_CATALOG.forEach((action, index) => {
    const isCompleted = !!AppState.actions[action.id];
    
    const itemDiv = document.createElement('div');
    itemDiv.className = `act-item${isCompleted ? ' done' : ''}`;
    itemDiv.style.animationDelay = `${index * 35}ms`;
    
    const checkBtn = document.createElement('button');
    checkBtn.type = 'button';
    checkBtn.className = `act-check${isCompleted ? ' done' : ''}`;
    checkBtn.textContent = isCompleted ? '✓' : '';
    checkBtn.dataset.aid = action.id;
    checkBtn.setAttribute('aria-label', (isCompleted ? 'Unmark: ' : 'Complete: ') + action.title);
    
    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'act-body';
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'act-title';
    titleDiv.textContent = `${action.icon} ${action.title}`;
    
    const descDiv = document.createElement('div');
    descDiv.className = 'act-desc';
    descDiv.textContent = action.desc;
    
    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'act-tags';
    
    const tagSaving = document.createElement('span');
    tagSaving.className = 'atag at-s';
    tagSaving.textContent = `−${action.save} kg/mo`;
    
    const tagEffort = document.createElement('span');
    tagEffort.className = 'atag at-e';
    tagEffort.textContent = action.effort;
    
    const tagCategory = document.createElement('span');
    tagCategory.className = 'atag at-c';
    tagCategory.textContent = action.cat;
    
    tagsDiv.appendChild(tagSaving);
    tagsDiv.appendChild(tagEffort);
    tagsDiv.appendChild(tagCategory);
    
    bodyDiv.appendChild(titleDiv);
    bodyDiv.appendChild(descDiv);
    bodyDiv.appendChild(tagsDiv);
    
    itemDiv.appendChild(checkBtn);
    itemDiv.appendChild(bodyDiv);
    listContainer.appendChild(itemDiv);
  });
  
  const completedIds = Object.keys(AppState.actions).filter(key => AppState.actions[key]);
  animateNumber(DOM.get('act-done'), completedIds.length, 400);
  
  const totalSaved = completedIds.reduce((sum, id) => {
    const actionItem = ACTION_CATALOG.find(x => x.id === id);
    return sum + (actionItem ? actionItem.save : 0);
  }, 0);
  animateNumber(DOM.get('act-saved'), totalSaved, 600);
  
  DOM.setText('act-streak', `${AppState.streak.count}🔥`);
}

function toggleUserAction(actionId) {
  AppState.actions[actionId] = !AppState.actions[actionId];
  StorageManager.save('actions', AppState.actions);
  
  AppState.streak = updateDailyStreak();
  renderActionsView();
  
  const matchedAction = ACTION_CATALOG.find(x => x.id === actionId);
  if (AppState.actions[actionId] && matchedAction) {
    showToast(`✅ Pledged! Saves ~${matchedAction.save} kg/mo`);
  }
}

function updateDailyStreak() {
  const streakData = StorageManager.load('streak', { count: 0, lastDate: null });
  const todayString = new Date().toDateString();
  
  if (streakData.lastDate === todayString) return streakData;
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  streakData.count = (streakData.lastDate === yesterday.toDateString()) ? streakData.count + 1 : 1;
  streakData.lastDate = todayString;
  
  StorageManager.save('streak', streakData);
  return streakData;
}

// ══════ NAVIGATION CONTROLS ══════
function switchTabPanel(tabId) {
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  
  const targetPanel = DOM.get('tab-' + tabId);
  if (targetPanel) targetPanel.classList.add('active');
  
  const navButton = document.querySelector(`[data-tab="${tabId}"]`);
  if (navButton) navButton.classList.add('active');
  
  if (tabId === 'dashboard') setTimeout(renderDashboardView, 30);
  if (tabId === 'insights') renderInsightsView();
}

function transitionToApp() {
  const obScreen = DOM.get('screen-ob');
  const appScreen = DOM.get('screen-app');
  
  if (obScreen) obScreen.classList.remove('active');
  if (appScreen) {
    appScreen.classList.add('active');
    appScreen.removeAttribute('aria-hidden');
  }
  
  DOM.setText('hdr-user', `👤 ${AppState.profile.name}`);
  DOM.setText('dash-date', new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
  
  const inputs = getCalculatorInputs();
  const results = calculateTotalEmissions(inputs, AppState.profile.region);
  results.inputs = inputs;
  
  AppState.emissions = results;
  saveHistoryEntry(results.total);
  StorageManager.save('emissions', results);
  
  setTimeout(renderDashboardView, 80);
  renderActionsView();
}

function saveHistoryEntry(kgValue) {
  const historyLog = StorageManager.load('history', []);
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short' });
  
  if (historyLog.length > 0 && historyLog[historyLog.length - 1].month === currentMonth) {
    historyLog[historyLog.length - 1].kg = kgValue;
  } else {
    historyLog.push({ month: currentMonth, kg: kgValue });
  }
  
  StorageManager.save('history', historyLog.slice(-12)); // Keep last 12 months
}

// ══════ APPLICATION INITIALIZATION ══════
function initializeApplication() {
  // 1. Load persisted state
  AppState.profile = StorageManager.load('profile', null);
  AppState.emissions = StorageManager.load('emissions', null);
  AppState.goal = StorageManager.load('goal', null);
  AppState.actions = StorageManager.load('actions', {});
  AppState.streak = StorageManager.load('streak', { count: 0, lastDate: null });

  // 2. Initialize Range UI outputs
  document.querySelectorAll('.fr').forEach(input => updateRangeOutput(input));

  // 3. Conditional routing
  if (AppState.profile) {
    const obScreen = DOM.get('screen-ob');
    const appScreen = DOM.get('screen-app');
    if (obScreen) obScreen.classList.remove('active');
    if (appScreen) {
      appScreen.classList.add('active');
      appScreen.removeAttribute('aria-hidden');
    }
    DOM.setText('hdr-user', `👤 ${AppState.profile.name}`);
    DOM.setText('dash-date', new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
    
    setTimeout(renderDashboardView, 80);
    renderActionsView();
  }

  // 4. Stepper Controls
  const btnDec = DOM.get('hh-dec');
  const btnInc = DOM.get('hh-inc');
  if (btnDec) {
    btnDec.onclick = () => {
      AppState.householdCount = Math.max(1, AppState.householdCount - 1);
      DOM.setText('hh-val', AppState.householdCount);
    };
  }
  if (btnInc) {
    btnInc.onclick = () => {
      AppState.householdCount = Math.min(10, AppState.householdCount + 1);
      DOM.setText('hh-val', AppState.householdCount);
    };
  }

  // 5. Onboarding Submit
  const startBtn = DOM.get('start-btn');
  if (startBtn) {
    startBtn.onclick = function() {
      const nameInput = DOM.get('u-name');
      const regionInput = DOM.get('u-region');
      
      const nameVal = nameInput ? nameInput.value.trim() : '';
      const regionVal = regionInput ? regionInput.value : '';
      
      DOM.setText('u-name-err', '');
      DOM.setText('u-region-err', '');
      if (nameInput) nameInput.classList.remove('err');
      if (regionInput) regionInput.classList.remove('err');
      
      if (!nameVal) {
        DOM.setText('u-name-err', 'Please enter your name');
        if (nameInput) { nameInput.classList.add('err'); nameInput.focus(); }
        return;
      }
      
      if (!regionVal) {
        DOM.setText('u-region-err', 'Please select your region');
        if (regionInput) { regionInput.classList.add('err'); regionInput.focus(); }
        return;
      }
      
      const lifeNodes = document.querySelectorAll('input[name="life"]:checked');
      const lifestyleArr = Array.from(lifeNodes).map(node => node.value);
      
      AppState.profile = {
        name: DOM.sanitize(nameVal, 50),
        region: regionVal,
        household: AppState.householdCount,
        lifestyle: lifestyleArr
      };
      
      StorageManager.save('profile', AppState.profile);
      
      // Auto-configure calculator based on lifestyle tags
      if (lifestyleArr.includes('vegan')) DOM.get('diet-type').value = 'vegan';
      if (lifestyleArr.includes('vegetarian')) DOM.get('diet-type').value = 'vegetarian';
      if (lifestyleArr.includes('car_free')) DOM.get('car-type').value = 'none';
      if (lifestyleArr.includes('renewable_energy')) { 
        const renInput = DOM.get('renew-pct');
        if (renInput) { renInput.value = 80; updateRangeOutput(renInput); }
      }
      if (lifestyleArr.includes('frequent_flyer')) {
        const flightInput = DOM.get('flights-yr');
        if (flightInput) { flightInput.value = 10; updateRangeOutput(flightInput); }
      }
      
      transitionToApp();
      showToast(`Welcome, ${AppState.profile.name}! 🌿`);
    };
  }

  // 6. Interactive Calculator Sliders
  document.querySelectorAll('.fr').forEach(input => {
    input.addEventListener('input', function() {
      updateRangeOutput(this);
      handleCalculatorChange();
    });
  });
  
  document.querySelectorAll('#tab-calculator select').forEach(select => {
    select.addEventListener('change', handleCalculatorChange);
  });

  // 7. Save Calculation Action
  const saveCalcBtn = DOM.get('save-calc-btn');
  if (saveCalcBtn) {
    saveCalcBtn.onclick = function() {
      const inputs = getCalculatorInputs();
      const region = AppState.profile ? AppState.profile.region : 'europe';
      const results = calculateTotalEmissions(inputs, region);
      
      results.inputs = inputs;
      AppState.emissions = results;
      
      StorageManager.save('emissions', results);
      saveHistoryEntry(results.total);
      
      AppState.streak = updateDailyStreak();
      StorageManager.save('streak', AppState.streak);
      
      renderInsightsView();
      switchTabPanel('dashboard');
      showToast('✅ Data saved! Dashboard updated.');
    };
  }

  // 8. Goal Modal Management
  const goalBtn = DOM.get('set-goal-btn');
  const modalCancelBtn = DOM.get('modal-cancel');
  const modalSaveBtn = DOM.get('modal-save');
  const modalBg = DOM.get('goal-modal');
  
  if (goalBtn && modalBg) goalBtn.onclick = () => modalBg.classList.add('open');
  if (modalCancelBtn && modalBg) modalCancelBtn.onclick = () => modalBg.classList.remove('open');
  
  if (modalSaveBtn && modalBg) {
    modalSaveBtn.onclick = function() {
      const goalInput = DOM.get('goal-inp');
      const targetVal = DOM.clampValue(parseInt(goalInput ? goalInput.value : '200') || 200, 50, 5000);
      
      AppState.goal = targetVal;
      StorageManager.save('goal', targetVal);
      modalBg.classList.remove('open');
      
      renderGoalTracker();
      showToast(`🎯 Goal set: ${targetVal} kg/mo`);
    };
  }
  
  if (modalBg) {
    modalBg.addEventListener('click', (e) => {
      if (e.target === modalBg) modalBg.classList.remove('open');
    });
  }
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalBg && modalBg.classList.contains('open')) {
      modalBg.classList.remove('open');
    }
  });

  // 9. Navigation Delegation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      switchTabPanel(this.dataset.tab);
    });
  });

  document.addEventListener('click', (e) => {
    const gotoTarget = e.target.closest('[data-goto]');
    if (gotoTarget) switchTabPanel(gotoTarget.dataset.goto);
  });

  // 10. Action Delegation
  document.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('[data-aid]');
    if (actionBtn) toggleUserAction(actionBtn.dataset.aid);
  });

  // 11. Reset Application State
  const resetBtn = DOM.get('reset-btn');
  if (resetBtn) {
    resetBtn.onclick = function() {
      if (confirm('Reset all your data? This cannot be undone.')) {
        StorageManager.clearAll();
        
        AppState.profile = null;
        AppState.emissions = null;
        AppState.goal = null;
        AppState.actions = {};
        AppState.streak = { count: 0, lastDate: null };
        AppState.householdCount = 1;
        
        const appScreen = DOM.get('screen-app');
        const obScreen = DOM.get('screen-ob');
        
        if (appScreen) {
          appScreen.classList.remove('active');
          appScreen.setAttribute('aria-hidden', 'true');
        }
        if (obScreen) obScreen.classList.add('active');
        
        const nameInput = DOM.get('u-name');
        const regionInput = DOM.get('u-region');
        if (nameInput) nameInput.value = '';
        if (regionInput) regionInput.value = '';
      }
    };
  }
}

document.addEventListener('DOMContentLoaded', initializeApplication);