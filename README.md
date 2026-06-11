# 🌿 CarbonWise – Personal Carbon Footprint Tracker

> *Understand, track, and shrink your carbon footprint — one smart action at a time.*

**Live Demo:** Open `index.html` directly in any modern browser — no server required.

---

## 🎯 Chosen Vertical

**Climate & Environment** — Personal carbon footprint tracking with AI-driven personalized insights and behavior-change action plans.

---

## 📖 Approach & Logic

CarbonWise is a fully client-side single-page web application built with **vanilla HTML, CSS, and JavaScript** (ES6 modules). It requires no backend, no build step, and no external libraries — maximizing security and accessibility while minimizing attack surface and load time.

### Architecture

```
promptwars2/
├── index.html          # App shell, semantic HTML5, full ARIA
├── css/
│   └── style.css       # Design system tokens + all component styles
├── js/
│   ├── app.js          # Entry point, state management, event handling
│   ├── calculator.js   # Pure carbon calculation engine (IPCC/DEFRA factors)
│   ├── storage.js      # localStorage wrapper with validation & sanitization
│   ├── insights.js     # Rule-based AI insight/recommendation engine
│   ├── charts.js       # Zero-dependency Canvas chart library
│   └── ui.js           # DOM helpers, accessibility, animation utilities
└── README.md
```

### Calculation Engine (`calculator.js`)

Emission factors are sourced from:
- **IPCC AR6 (2022)** – global warming potentials
- **UK DEFRA GHG Conversion Factors (2023)** – vehicle and energy emissions
- **EPA Emission Factors Hub** – waste and food lifecycle data

Five categories are calculated independently using pure functions:

| Category | Key Factors |
|---|---|
| 🏠 Home Energy | kWh × regional grid factor × (1 − renewable%) + gas × 2.02 kg/m³ |
| 🚗 Transport | km × vehicle factor (EV: 0.053, large SUV: 0.270 kg/km) + flights × haul factor |
| 🍔 Food | Diet base (vegan: 53 → heavy meat: 225 kg/mo) × waste × local multipliers |
| 🛍️ Shopping | Clothing × 7.5 kg/item + electronics + spend × secondhand reduction |
| ♻️ Waste | Bags × 4.2 kg × recycling saving × composting multiplier |

### AI Insight Engine (`insights.js`)

A **rule-based decision engine** with 20+ rules evaluates the user's emission profile and selects the most impactful, context-aware recommendations. Each rule has:

- A **condition** function (pure predicate on emissions + inputs)
- A dynamic **text generator** (contextualised to user's actual numbers)
- An **impact level** (high / medium / low)
- A **saving estimate** (kg CO₂e/month)

Rules are sorted by impact × saving to surface the highest-value actions first. This is transparent, auditable AI — no black-box ML required.

### Data Flow

```
User Input → getCalcInputs() → calcAllEmissions() → state.emissions
    → renderDashboard() → Canvas charts + animated score
    → generateInsights() → Personalised insight cards
    → ACTION_CATALOG → Pledge system + streak tracking
```

---

## ✨ Features

### 1. Onboarding & Profile Setup
- Name, region (7 global regions with different grid factors), household size
- Lifestyle pre-sets (vegan, car-free, renewable energy, etc.) auto-configure the calculator

### 2. Carbon Calculator (5 Categories)
- **Interactive sliders** with live per-category emission updates
- Instant total footprint preview before saving
- Collapsible sections with category score badges

### 3. Dashboard
- **Animated gauge** showing your score on a 0–1000 kg scale
- **Donut chart** breaking emissions by category
- **Line chart** showing monthly trend with climate target line
- **Comparison bars** vs global average (400 kg/mo) and 2°C target (167 kg/mo)
- **Goal progress ring** with celebration animation on achievement

### 4. Personalized Insight Engine
- 20+ context-sensitive recommendations
- Ranked by potential CO₂ saving
- Includes both warnings (e.g., high meat intake) and positive reinforcement (e.g., EV kudos)
- Calculates total potential monthly saving across all recommendations

### 5. Action Tracker
- 15 pledge-able actions with effort ratings and CO₂ saving estimates
- Completion tracking with animated stats
- Day streak counter for motivation
- Toast notifications on action completion

### 6. Goal Setting
- Monthly CO₂e reduction target
- Animated progress ring
- Confetti celebration when goal is met

---

## 🔐 Security Practices

| Practice | Implementation |
|---|---|
| Input sanitization | All strings run through `sanitizeString()` — strips HTML tags, control chars |
| XSS prevention | User data is **always** set via `textContent`, never `innerHTML` |
| Content Security Policy | `<meta http-equiv="Content-Security-Policy">` restricts resource origins |
| No eval() | Zero use of `eval()`, `Function()`, or `new Function()` |
| Data validation | All stored values validated against schema before use (`validateProfile()`, `clampNumber()`) |
| No external data leakage | 100% offline — no API calls, no analytics, no data transmitted |
| localStorage versioning | Versioned schema with migration support prevents corruption from old data |

---

## ⚡ Efficiency Practices

- **Debounced inputs** — range sliders debounced at 50ms to prevent excessive recalculation
- **Pure functions** — calculator functions are side-effect free; results are deterministic and cacheable
- **DOM caching** — `el()` wrapper caches by ID; `qsa()` returns arrays for batch operations
- **Canvas DPR scaling** — all charts scale by `devicePixelRatio` for crisp display on retina screens
- **No external dependencies** — zero npm packages, no network requests, instant load
- **requestAnimationFrame** — all animations use rAF for smooth 60fps performance
- **prefers-reduced-motion** — all animations are disabled for users who opt out

---

## ♿ Accessibility

| Feature | Implementation |
|---|---|
| Skip link | "Skip to main content" link is the first focusable element |
| Semantic HTML | `<header>`, `<nav>`, `<main>`, `<section>`, `<details>`, `<summary>`, `<fieldset>`, `<legend>` |
| ARIA labels | All interactive elements have `aria-label`, regions have `aria-label` |
| ARIA live regions | Score display, toasts, and comparison bars use `aria-live="polite"` |
| Focus management | Modal opens focus first focusable element; focus is trapped within modal |
| Keyboard nav | Alt+1/2/3/4 switches tabs; Escape closes modals; full Tab navigation |
| ARIA roles | `role="tabpanel"`, `role="tab"`, `role="dialog"`, `role="progressbar"`, `role="list"`, `role="listitem"`, `role="article"` |
| Contrast | All text meets WCAG AA contrast ratio (≥4.5:1) |
| Screen reader | Gauge, donut, trend canvas elements have `aria-label` and `role="img"` |
| Form accessibility | All inputs have `<label>`, error messages use `role="alert"`, hints use `aria-describedby` |
| Forced colors | CSS supports Windows High Contrast mode via `@media (forced-colors: active)` |
| Print styles | Hides nav/buttons, shows all content for printing |

---

## 🧪 Testing

### Manual Test Checklist

**Onboarding**
- [ ] Submit with empty name → shows error message
- [ ] Submit with empty region → shows error message  
- [ ] Household stepper clamps at 1 (min) and 10 (max)
- [ ] Lifestyle checkboxes pre-configure calculator correctly

**Calculator**
- [ ] All sliders update category score in real-time
- [ ] Category scores sum to total correctly
- [ ] "No car" option hides car km effectively
- [ ] Save button persists values on page reload

**Dashboard**
- [ ] Score animates from 0 to calculated value
- [ ] Gauge needle points to correct position
- [ ] Donut shows correct category proportions
- [ ] Trend chart shows dashed target line at 167 kg

**Insights**
- [ ] Vegan diet shows kudos insight, not meat-reduction insight
- [ ] EV driver shows EV kudos insight
- [ ] High flights (≥4/yr) triggers flight-reduction insight
- [ ] Insights sorted by impact level (high → medium → low)

**Actions**
- [ ] Toggle action → updates completed count and kg saved
- [ ] Streak increments once per day (not multiple times)
- [ ] Action state persists on page reload

**Accessibility**
- [ ] Tab through entire app without mouse
- [ ] Escape closes goal modal
- [ ] Skip link works when tabbing from address bar
- [ ] Screen reader announces score changes

**Security**
- [ ] Name field with `<script>alert('xss')</script>` → displays as literal text, not executed
- [ ] Malformed localStorage data → gracefully falls back to defaults

---

## 💡 Assumptions

1. **Monthly footprint** is the primary metric (more actionable than annual)
2. **Emission factors** use regional averages — individual utility providers may differ
3. **Flight radiative forcing** multiplier of ×1.9 is applied (conservative IPCC estimate)
4. **Household size** is stored but currently used for profile context; per-capita division is intentionally omitted (tracking personal behaviour, not household average)
5. **Streak** counts days on which the user opens the app (any page), not just calculator saves
6. **No authentication** — app is designed for personal use on a single device

---

## 🌍 Climate Context

| Metric | Value |
|---|---|
| Global average footprint | ~4.8t CO₂e/year (400 kg/mo) |
| 2°C Paris Agreement target | ~2t CO₂e/year (167 kg/mo) |
| 1.5°C target | ~0.7t CO₂e/year (~58 kg/mo) |
| Average EV saving vs petrol | ~65% lower lifetime emissions |
| Going vegan saving | ~80 kg CO₂e/month vs omnivore |

---

## 🚀 Running the App

1. Clone or download this repository
2. Open `index.html` in any modern browser (Chrome 90+, Firefox 88+, Edge 90+, Safari 15+)
3. No server, no build step, no internet connection required

```bash
git clone <your-repo-url>
cd promptwars2
# Then simply open index.html in your browser
# Or use VS Code Live Server for hot reloading during development
```

---

## 📄 License

MIT License — free to use, modify, and distribute.
