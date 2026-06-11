/**
 * charts.js – Canvas-based chart rendering (zero external dependencies)
 * Provides gauge, donut, trend line, and goal ring charts.
 * All rendering is accessible with ARIA attributes set by the caller.
 */

// ── Color Palette ─────────────────────────────────────────────────────────────
const COLORS = {
  energy:    '#60B0FF',
  transport: '#FF8E3C',
  food:      '#F4A30E',
  shopping:  '#C27BF4',
  waste:     '#00C97F',
  grid:      'rgba(255,255,255,0.06)',
  text:      'rgba(255,255,255,0.5)',
};

const CATEGORY_LABELS = {
  energy:    '🏠 Energy',
  transport: '🚗 Transport',
  food:      '🍔 Food',
  shopping:  '🛍️ Shopping',
  waste:     '♻️ Waste',
};

// ── Device Pixel Ratio Helper ─────────────────────────────────────────────────
function getCtx(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w   = canvas.offsetWidth  || canvas.width;
  const h   = canvas.offsetHeight || canvas.height;
  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';
  return { ctx, w, h };
}

// ── Gauge Chart ───────────────────────────────────────────────────────────────

/**
 * Draw a half-circle gauge chart.
 * @param {HTMLCanvasElement} canvas
 * @param {number} value    - Current value
 * @param {number} maxValue - Maximum value for gauge
 * @param {string} color    - Fill color
 */
export function drawGauge(canvas, value, maxValue = 1000, color = '#00C97F') {
  const { ctx, w, h } = getCtx(canvas);
  ctx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h - 12;
  const r  = Math.min(w, h * 2) / 2 - 16;
  const startAngle = Math.PI;
  const endAngle   = 2 * Math.PI;

  // Track background
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.lineWidth   = 14;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineCap     = 'round';
  ctx.stroke();

  // Colored fill
  const fraction = Math.min(1, Math.max(0, value / maxValue));
  const fillEnd  = startAngle + fraction * Math.PI;

  // Gradient
  const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
  grad.addColorStop(0,   '#00C97F');
  grad.addColorStop(0.5, '#F4A30E');
  grad.addColorStop(1,   '#FF5D5D');

  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, fillEnd);
  ctx.lineWidth   = 14;
  ctx.strokeStyle = grad;
  ctx.lineCap     = 'round';
  ctx.stroke();

  // Needle
  const needleAngle = startAngle + fraction * Math.PI;
  const nx = cx + (r - 4) * Math.cos(needleAngle);
  const ny = cy + (r - 4) * Math.sin(needleAngle);

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(nx, ny);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 2.5;
  ctx.lineCap     = 'round';
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff';
  ctx.fill();

  // Labels
  ctx.font      = `500 10px Inter, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.textAlign = 'left';
  ctx.fillText('0', cx - r - 4, cy + 14);
  ctx.textAlign = 'right';
  ctx.fillText(maxValue, cx + r + 4, cy + 14);
}

// ── Donut Chart ───────────────────────────────────────────────────────────────

/**
 * Draw a donut chart for emissions by category.
 * @param {HTMLCanvasElement} canvas
 * @param {{ energy, transport, food, shopping, waste }} data
 */
export function drawDonut(canvas, data) {
  const { ctx, w, h } = getCtx(canvas);
  ctx.clearRect(0, 0, w, h);

  const total    = Object.values(data).reduce((s, v) => s + v, 0);
  if (total === 0) return;

  const cx = w / 2;
  const cy = h / 2;
  const r  = Math.min(w, h) / 2 - 20;
  const inner = r * 0.55;

  let startAngle = -Math.PI / 2;

  const segments = Object.entries(data).filter(([, v]) => v > 0);

  segments.forEach(([key, value]) => {
    const slice = (value / total) * 2 * Math.PI;
    const end   = startAngle + slice;
    const mid   = startAngle + slice / 2;

    // Segment
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, end);
    ctx.closePath();
    ctx.fillStyle = COLORS[key] || '#888';
    ctx.fill();

    // Gap
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r + 2, startAngle, end);
    ctx.closePath();
    ctx.fillStyle = '#0D1B0F';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0D1B0F';
    ctx.stroke();

    // Percentage label (if segment is big enough)
    if (slice > 0.25) {
      const lx = cx + (r * 0.77) * Math.cos(mid);
      const ly = cy + (r * 0.77) * Math.sin(mid);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font      = `700 11px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(Math.round((value / total) * 100) + '%', lx, ly);
    }

    startAngle = end;
  });

  // Inner circle (donut hole)
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, 2 * Math.PI);
  ctx.fillStyle = '#0D1B0F';
  ctx.fill();

  // Center label
  ctx.fillStyle   = 'rgba(255,255,255,0.85)';
  ctx.font        = `700 14px Outfit, sans-serif`;
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${total}`, cx, cy - 8);
  ctx.font        = `400 9px Inter, sans-serif`;
  ctx.fillStyle   = 'rgba(255,255,255,0.4)';
  ctx.fillText('kg CO₂e', cx, cy + 8);
}

/**
 * Build HTML legend for the donut chart.
 * @param {{ energy, transport, food, shopping, waste }} data
 * @returns {string} HTML string (uses textContent safe patterns)
 */
export function buildDonutLegend(data) {
  const total = Object.values(data).reduce((s, v) => s + v, 0);
  if (total === 0) return '';

  return Object.entries(data)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => {
      const label = CATEGORY_LABELS[key] || key;
      const color = COLORS[key] || '#888';
      // No user data in innerHTML; all values are computed numbers/strings
      return `<div class="legend-item">
        <span class="legend-dot" style="background:${color}" aria-hidden="true"></span>
        <span>${label}: <strong>${value} kg</strong></span>
      </div>`;
    })
    .join('');
}

// ── Trend Line Chart ──────────────────────────────────────────────────────────

/**
 * Draw a smooth line chart showing monthly trend.
 * @param {HTMLCanvasElement} canvas
 * @param {Array<{month: string, kg: number}>} history
 */
export function drawTrend(canvas, history) {
  const { ctx, w, h } = getCtx(canvas);
  ctx.clearRect(0, 0, w, h);

  if (!history || history.length < 2) {
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font      = '13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Save data monthly to see trend', w / 2, h / 2);
    return;
  }

  const pad   = { top: 16, right: 16, bottom: 32, left: 40 };
  const cw    = w - pad.left - pad.right;
  const ch    = h - pad.top  - pad.bottom;

  const values = history.map(p => p.kg);
  const maxV   = Math.max(...values, 167) * 1.15;
  const minV   = 0;

  const xStep  = cw / Math.max(1, history.length - 1);

  const toX = (i) => pad.left + i * xStep;
  const toY = (v) => pad.top + ch - ((v - minV) / (maxV - minV)) * ch;

  // Grid lines
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = pad.top + (ch / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + cw, y);
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth   = 1;
    ctx.stroke();

    const val = Math.round(maxV - (maxV / gridLines) * i);
    ctx.fillStyle   = COLORS.text;
    ctx.font        = '9px Inter, sans-serif';
    ctx.textAlign   = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(val, pad.left - 6, y);
  }

  // Climate target line
  const targetY = toY(167);
  ctx.beginPath();
  ctx.setLineDash([4, 4]);
  ctx.moveTo(pad.left, targetY);
  ctx.lineTo(pad.left + cw, targetY);
  ctx.strokeStyle = 'rgba(0,201,127,0.5)';
  ctx.lineWidth   = 1.5;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle   = 'rgba(0,201,127,0.7)';
  ctx.font        = '9px Inter, sans-serif';
  ctx.textAlign   = 'right';
  ctx.fillText('Target', pad.left + cw, targetY - 6);

  // Area gradient fill
  const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
  gradient.addColorStop(0,   'rgba(0,201,127,0.3)');
  gradient.addColorStop(1,   'rgba(0,201,127,0)');

  ctx.beginPath();
  ctx.moveTo(toX(0), toY(history[0].kg));
  for (let i = 1; i < history.length; i++) {
    const cpX = (toX(i - 1) + toX(i)) / 2;
    ctx.bezierCurveTo(cpX, toY(history[i-1].kg), cpX, toY(history[i].kg), toX(i), toY(history[i].kg));
  }
  ctx.lineTo(toX(history.length - 1), pad.top + ch);
  ctx.lineTo(toX(0), pad.top + ch);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(history[0].kg));
  for (let i = 1; i < history.length; i++) {
    const cpX = (toX(i - 1) + toX(i)) / 2;
    ctx.bezierCurveTo(cpX, toY(history[i-1].kg), cpX, toY(history[i].kg), toX(i), toY(history[i].kg));
  }
  ctx.strokeStyle = '#00C97F';
  ctx.lineWidth   = 2.5;
  ctx.lineCap     = 'round';
  ctx.stroke();

  // Data points + labels
  history.forEach((pt, i) => {
    const x = toX(i);
    const y = toY(pt.kg);

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fillStyle   = '#00C97F';
    ctx.fill();
    ctx.strokeStyle = '#0D1B0F';
    ctx.lineWidth   = 2;
    ctx.stroke();

    ctx.fillStyle   = COLORS.text;
    ctx.font        = '9px Inter, sans-serif';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(pt.month, x, pad.top + ch + 6);
  });
}

// ── Goal Ring ─────────────────────────────────────────────────────────────────

/**
 * Draw a progress ring for goal tracking.
 * @param {HTMLCanvasElement} canvas
 * @param {number} pct - Percentage 0-100 (can exceed 100)
 */
export function drawGoalRing(canvas, pct) {
  const { ctx, w, h } = getCtx(canvas);
  ctx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const r  = Math.min(w, h) / 2 - 8;

  // Background ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth   = 8;
  ctx.stroke();

  // Progress ring
  const fraction = Math.min(1, pct / 100);
  const startAngle = -Math.PI / 2;
  const endAngle   = startAngle + fraction * 2 * Math.PI;

  const ringColor = pct >= 100 ? '#00E5A0' : pct >= 50 ? '#00C97F' : '#F4A30E';
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.strokeStyle = ringColor;
  ctx.lineWidth   = 8;
  ctx.lineCap     = 'round';
  ctx.stroke();
}
