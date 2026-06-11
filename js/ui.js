/**
 * ui.js – DOM helpers, accessibility utilities, and UI component factories.
 * No business logic here — keeps the separation of concerns clean.
 */

// ── Safe DOM Helpers ──────────────────────────────────────────────────────────

/**
 * Set text content safely (never uses innerHTML with user data).
 * @param {string|HTMLElement} selector
 * @param {string} text
 */
export function setText(selector, text) {
  const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (el) el.textContent = String(text);
}

/**
 * Get a cached element reference by ID (with warning if missing).
 * @param {string} id
 * @returns {HTMLElement|null}
 */
export function el(id) {
  const element = document.getElementById(id);
  if (!element) console.warn(`[UI] Element #${id} not found`);
  return element;
}

/**
 * Query selector wrapper with null-check.
 * @param {string} selector
 * @param {HTMLElement|Document} [parent=document]
 * @returns {HTMLElement|null}
 */
export function qs(selector, parent = document) {
  return parent.querySelector(selector);
}

/**
 * Query all elements matching selector.
 * @param {string} selector
 * @param {HTMLElement|Document} [parent=document]
 * @returns {HTMLElement[]}
 */
export function qsa(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}

// ── Visibility Helpers ────────────────────────────────────────────────────────

/**
 * Show a screen or tab panel (manages aria-hidden & display).
 * @param {HTMLElement} element
 */
export function showEl(element) {
  if (!element) return;
  element.style.display = '';
  element.removeAttribute('aria-hidden');
}

/**
 * Hide a screen or tab panel.
 * @param {HTMLElement} element
 */
export function hideEl(element) {
  if (!element) return;
  element.style.display = 'none';
  element.setAttribute('aria-hidden', 'true');
}

// ── Animation Utilities ───────────────────────────────────────────────────────

/**
 * Animate a number counter from current displayed value to target.
 * Respects prefers-reduced-motion.
 * @param {HTMLElement} element
 * @param {number} target
 * @param {number} [duration=800]
 */
export function animateNumber(element, target, duration = 800) {
  if (!element) return;

  // Respect prefers-reduced-motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    element.textContent = Math.round(target);
    return;
  }

  const start    = performance.now();
  const from     = parseFloat(element.textContent) || 0;
  const delta    = target - from;

  function tick(now) {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased    = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(from + delta * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

// ── Toast Notifications ───────────────────────────────────────────────────────

const TOAST_DURATION = 3000; // ms

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'warning'|'info'} [type='success']
 */
export function showToast(message, type = 'success') {
  const container = el('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message; // textContent is safe
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, TOAST_DURATION);
}

// ── Celebration Particles ─────────────────────────────────────────────────────

const CONFETTI_COLORS = ['#00C97F','#F4A30E','#FF5D5D','#60B0FF','#C27BF4','#F9C34A'];
const CONFETTI_COUNT  = 50;

/**
 * Trigger a confetti celebration animation.
 */
export function celebrate() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const container = el('celebration');
  if (!container) return;

  container.innerHTML = '';

  for (let i = 0; i < CONFETTI_COUNT; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.setAttribute('aria-hidden', 'true');
    piece.style.cssText = `
      left: ${Math.random() * 100}%;
      background: ${CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]};
      animation-delay: ${Math.random() * 1.5}s;
      animation-duration: ${2 + Math.random() * 2}s;
      transform: rotate(${Math.random() * 360}deg);
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      width: ${4 + Math.random() * 8}px;
      height: ${4 + Math.random() * 8}px;
    `;
    container.appendChild(piece);
  }

  setTimeout(() => { container.innerHTML = ''; }, 4500);
}

// ── Modal Management ──────────────────────────────────────────────────────────

/**
 * Open a modal dialog with focus trapping.
 * @param {HTMLElement} modal
 */
export function openModal(modal) {
  if (!modal) return;
  modal.classList.add('modal--open');
  modal.removeAttribute('aria-hidden');

  // Focus first focusable element
  const focusable = modal.querySelectorAll('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (focusable.length) {
    setTimeout(() => focusable[0].focus(), 100);
  }

  // Trap focus
  modal._trapFn = (e) => {
    if (e.key !== 'Tab') return;
    const els   = Array.from(modal.querySelectorAll('input, button, select, [tabindex]:not([tabindex="-1"])'));
    const first = els[0];
    const last  = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  modal.addEventListener('keydown', modal._trapFn);

  // Close on Escape
  modal._escapeFn = (e) => { if (e.key === 'Escape') closeModal(modal); };
  document.addEventListener('keydown', modal._escapeFn);
}

/**
 * Close a modal dialog and restore focus.
 * @param {HTMLElement} modal
 */
export function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove('modal--open');
  modal.setAttribute('aria-hidden', 'true');
  if (modal._trapFn)   modal.removeEventListener('keydown', modal._trapFn);
  if (modal._escapeFn) document.removeEventListener('keydown', modal._escapeFn);
}

// ── Form Validation Helpers ───────────────────────────────────────────────────

/**
 * Show a validation error on a form field.
 * @param {string} fieldId
 * @param {string} message
 */
export function showFieldError(fieldId, message) {
  const field = el(fieldId);
  const error = el(`${fieldId}-error`);
  if (field) field.classList.add('form-input--error');
  if (error) error.textContent = message;
}

/**
 * Clear a validation error.
 * @param {string} fieldId
 */
export function clearFieldError(fieldId) {
  const field = el(fieldId);
  const error = el(`${fieldId}-error`);
  if (field) field.classList.remove('form-input--error');
  if (error) error.textContent = '';
}

// ── Debounce ──────────────────────────────────────────────────────────────────

/**
 * Debounce a function call.
 * @param {Function} fn
 * @param {number} [wait=300]
 * @returns {Function}
 */
export function debounce(fn, wait = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

// ── Tab Navigation ────────────────────────────────────────────────────────────

/**
 * Switch the active tab panel.
 * @param {string} tabId - ID of the tab (e.g., 'dashboard')
 */
export function switchTab(tabId) {
  // Deactivate all panels
  qsa('.tab-panel').forEach(panel => {
    panel.classList.remove('tab-panel--active');
    panel.setAttribute('aria-hidden', 'true');
  });

  // Deactivate all nav buttons
  qsa('.nav-btn').forEach(btn => {
    btn.classList.remove('nav-btn--active');
    btn.setAttribute('aria-selected', 'false');
  });

  // Activate target panel
  const panel = el(`tab-${tabId}`);
  if (panel) {
    panel.classList.add('tab-panel--active');
    panel.removeAttribute('aria-hidden');
    // Scroll to top smoothly
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Activate corresponding nav button
  const navBtn = qs(`[data-tab="${tabId}"]`);
  if (navBtn) {
    navBtn.classList.add('nav-btn--active');
    navBtn.setAttribute('aria-selected', 'true');
  }
}

// ── Action Item Builder ───────────────────────────────────────────────────────

const EFFORT_LABELS = { low: 'Easy', medium: 'Moderate', high: 'Effort' };

/**
 * Build an action item element (safe from XSS — uses textContent for user data).
 * @param {object} action - { id, icon, title, desc, saving, effort, category, done }
 * @returns {HTMLElement}
 */
export function buildActionItem(action) {
  const item = document.createElement('div');
  item.className = `action-item${action.done ? ' action-item--done' : ''}`;
  item.setAttribute('role', 'listitem');
  item.dataset.actionId = action.id;

  const checkBtn = document.createElement('button');
  checkBtn.className = `action-check${action.done ? ' action-check--done' : ''}`;
  checkBtn.setAttribute('aria-label', `Mark "${action.title}" as ${action.done ? 'incomplete' : 'complete'}`);
  checkBtn.dataset.actionId = action.id;

  const body = document.createElement('div');
  body.className = 'action-body';

  const title = document.createElement('div');
  title.className = 'action-title';
  title.textContent = `${action.icon} ${action.title}`;

  const desc = document.createElement('div');
  desc.className = 'action-desc';
  desc.textContent = action.desc;

  const meta = document.createElement('div');
  meta.className = 'action-meta';

  if (action.saving > 0) {
    const savingTag = document.createElement('span');
    savingTag.className = 'action-tag action-tag--saving';
    savingTag.textContent = `−${action.saving} kg CO₂/mo`;
    meta.appendChild(savingTag);
  }

  const effortTag = document.createElement('span');
  effortTag.className = 'action-tag action-tag--effort';
  effortTag.textContent = EFFORT_LABELS[action.effort] || action.effort;
  meta.appendChild(effortTag);

  const catTag = document.createElement('span');
  catTag.className = 'action-tag action-tag--category';
  catTag.textContent = action.category;
  meta.appendChild(catTag);

  body.appendChild(title);
  body.appendChild(desc);
  body.appendChild(meta);

  item.appendChild(checkBtn);
  item.appendChild(body);

  return item;
}

// ── Insight Card Builder ──────────────────────────────────────────────────────

/**
 * Build an insight card element.
 * @param {object} insight - { icon, title, text, impact, saving }
 * @param {number} delay - Animation delay in ms
 * @returns {HTMLElement}
 */
export function buildInsightCard(insight, delay = 0) {
  const card = document.createElement('div');
  card.className = 'insight-card';
  card.style.animationDelay = `${delay}ms`;
  card.setAttribute('role', 'article');

  const iconEl = document.createElement('div');
  iconEl.className = 'insight-icon';
  iconEl.setAttribute('aria-hidden', 'true');
  iconEl.textContent = insight.icon;

  const body = document.createElement('div');
  body.className = 'insight-body';

  const titleEl = document.createElement('div');
  titleEl.className = 'insight-title';
  titleEl.textContent = insight.title;

  const textEl = document.createElement('p');
  textEl.className = 'insight-text';
  textEl.textContent = insight.text;

  const impact = document.createElement('span');
  impact.className = `insight-impact impact--${insight.impact}`;
  impact.textContent = `${insight.impact.charAt(0).toUpperCase() + insight.impact.slice(1)} impact`;
  if (insight.saving > 0) {
    impact.textContent += ` · Save ~${insight.saving} kg/mo`;
  }

  body.appendChild(titleEl);
  body.appendChild(textEl);
  body.appendChild(impact);

  card.appendChild(iconEl);
  card.appendChild(body);

  return card;
}
