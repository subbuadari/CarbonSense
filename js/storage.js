/**
 * storage.js – localStorage wrapper with schema validation & versioning
 * Provides safe, structured data persistence with error handling.
 */

const STORAGE_VERSION = '1.0.0';
const KEY_PREFIX      = 'carbonwise_';

const KEYS = {
  version:    KEY_PREFIX + 'version',
  profile:    KEY_PREFIX + 'profile',
  emissions:  KEY_PREFIX + 'emissions',
  history:    KEY_PREFIX + 'history',
  actions:    KEY_PREFIX + 'actions',
  goal:       KEY_PREFIX + 'goal',
  streak:     KEY_PREFIX + 'streak',
};

// ── Schema Defaults ───────────────────────────────────────────────────────────

const PROFILE_DEFAULTS = {
  name:        '',
  region:      'europe',
  household:   1,
  lifestyle:   [],
};

const EMISSIONS_DEFAULTS = {
  energy:    0,
  transport: 0,
  food:      0,
  shopping:  0,
  waste:     0,
  total:     0,
  inputs:    {},
  savedAt:   null,
};

const STREAK_DEFAULTS = {
  count:     0,
  lastDate:  null,
};

// ── Safe Storage Helpers ──────────────────────────────────────────────────────

/**
 * Safely read a value from localStorage, returning defaultValue on any error.
 * @template T
 * @param {string} key
 * @param {T} defaultValue
 * @returns {T}
 */
function safeGet(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`[Storage] Failed to read key "${key}":`, e.message);
    return defaultValue;
  }
}

/**
 * Safely write a value to localStorage, silently handling quota errors.
 * @param {string} key
 * @param {*} value
 * @returns {boolean} Success
 */
function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn(`[Storage] Failed to write key "${key}":`, e.message);
    return false;
  }
}

// ── Validation Helpers ────────────────────────────────────────────────────────

/**
 * Sanitize a string — only allow safe printable characters, trim whitespace.
 * Prevents XSS from stored data being rendered.
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
export function sanitizeString(str, maxLen = 100) {
  if (typeof str !== 'string') return '';
  // Strip any HTML/script tags and control characters
  return str.replace(/<[^>]*>/g, '').replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '').trim().slice(0, maxLen);
}

/**
 * Clamp a number to a valid range
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clampNumber(val, min, max) {
  const n = Number(val);
  if (!isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/**
 * Validate a profile object against allowed keys and value types.
 * @param {object} profile
 * @returns {object} Validated profile merged with defaults
 */
function validateProfile(profile) {
  const VALID_REGIONS = ['north_america','europe','asia_pacific','south_asia','latin_america','africa','middle_east'];
  const VALID_LIFESTYLE = ['vegan','vegetarian','car_free','renewable_energy','frequent_flyer','minimalist'];

  return {
    name:      sanitizeString(profile?.name ?? '', 50),
    region:    VALID_REGIONS.includes(profile?.region) ? profile.region : 'europe',
    household: clampNumber(profile?.household, 1, 10),
    lifestyle: Array.isArray(profile?.lifestyle)
      ? profile.lifestyle.filter(l => VALID_LIFESTYLE.includes(l))
      : [],
  };
}

// ── Version Migration ─────────────────────────────────────────────────────────

/**
 * Initialize storage — migrate old data if needed, set version.
 */
export function initStorage() {
  const storedVersion = safeGet(KEYS.version, null);
  if (storedVersion !== STORAGE_VERSION) {
    // Future: migrate old schema here
    safeSet(KEYS.version, STORAGE_VERSION);
  }
}

// ── Profile ───────────────────────────────────────────────────────────────────

export function saveProfile(profile) {
  const validated = validateProfile(profile);
  return safeSet(KEYS.profile, validated);
}

export function loadProfile() {
  const raw = safeGet(KEYS.profile, null);
  if (!raw) return null;
  return validateProfile(raw);
}

export function hasProfile() {
  return loadProfile() !== null;
}

// ── Emissions ─────────────────────────────────────────────────────────────────

export function saveEmissions(data) {
  const safe = {
    energy:    clampNumber(data?.energy,    0, 99999),
    transport: clampNumber(data?.transport, 0, 99999),
    food:      clampNumber(data?.food,      0, 99999),
    shopping:  clampNumber(data?.shopping,  0, 99999),
    waste:     clampNumber(data?.waste,     0, 99999),
    total:     clampNumber(data?.total,     0, 99999),
    inputs:    data?.inputs ?? {},
    savedAt:   new Date().toISOString(),
  };
  safeSet(KEYS.emissions, safe);
  appendHistory(safe.total);
  return safe;
}

export function loadEmissions() {
  return safeGet(KEYS.emissions, null);
}

// ── History (trend data) ──────────────────────────────────────────────────────

const MAX_HISTORY = 12;

export function appendHistory(totalKg) {
  const history = safeGet(KEYS.history, []);
  const month   = new Date().toLocaleDateString('en-US', { month: 'short' });

  // Update current month or append
  const lastEntry = history[history.length - 1];
  if (lastEntry && lastEntry.month === month) {
    lastEntry.kg = totalKg;
  } else {
    history.push({ month, kg: totalKg });
  }

  // Keep only last MAX_HISTORY entries
  const trimmed = history.slice(-MAX_HISTORY);
  safeSet(KEYS.history, trimmed);
}

export function loadHistory() {
  return safeGet(KEYS.history, []);
}

// ── Actions ───────────────────────────────────────────────────────────────────

export function saveActions(actions) {
  return safeSet(KEYS.actions, actions);
}

export function loadActions() {
  return safeGet(KEYS.actions, {});
}

// ── Goal ──────────────────────────────────────────────────────────────────────

export function saveGoal(kg) {
  const safe = clampNumber(kg, 50, 5000);
  return safeSet(KEYS.goal, safe);
}

export function loadGoal() {
  return safeGet(KEYS.goal, null);
}

// ── Streak ────────────────────────────────────────────────────────────────────

export function updateStreak() {
  const streak   = safeGet(KEYS.streak, { ...STREAK_DEFAULTS });
  const today    = new Date().toDateString();
  const lastDate = streak.lastDate;

  if (lastDate === today) return streak; // already updated today

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (lastDate === yesterday.toDateString()) {
    streak.count++;
  } else {
    streak.count = 1;
  }
  streak.lastDate = today;
  safeSet(KEYS.streak, streak);
  return streak;
}

export function loadStreak() {
  return safeGet(KEYS.streak, { ...STREAK_DEFAULTS });
}

// ── Full Reset ────────────────────────────────────────────────────────────────

export function clearAllData() {
  Object.values(KEYS).forEach(key => {
    try { localStorage.removeItem(key); } catch (_) { /* silent */ }
  });
}
