# 🌿 CarbonWise – Personal Carbon Footprint Tracker

> *Understand, track, and shrink your carbon footprint — one smart action at a time.*

**Live Demo:** Simply open `index.html` in any modern web browser — no server required!

---

## 🎯 1. Chosen Vertical

**Climate & Environment** — Personal carbon footprint tracking with AI-driven personalized insights and behavior-change action plans. CarbonWise is a smart, dynamic assistant that helps users understand their emissions based on their unique lifestyle context.

---

## 📖 2. Approach & Logic

CarbonWise is built as an extremely efficient, highly secure **single-file web application** using vanilla HTML, CSS, and JavaScript. 

### Why a single file? (Efficiency & Security)
By compiling everything into one lightweight `<100KB` file, the application:
1. **Requires zero dependencies** (no heavy libraries like React or Chart.js).
2. **Has zero server requirements**, eliminating backend security vulnerabilities.
3. **Executes instantly** with native DOM APIs and HTML5 `<canvas>` for charts.
4. **Bypasses CORS and ES6 module restrictions**, meaning it runs perfectly even from a local `file://` protocol.

### Logic: Calculation Engine
Emission factors are calculated using pure JavaScript functions, preventing side-effects. The engine evaluates 5 key categories based on global averages:
1. **🏠 Energy:** `(kWh × regional_grid_factor × (1 - renewable%)) + gas`
2. **🚗 Transport:** `(Weekly km × vehicle_emissions) + flights`
3. **🍔 Food:** `Base_diet_emissions × food_waste_multiplier × local_food_discount`
4. **🛍️ Shopping:** `(New clothes × clothing_factor) + (Budget × secondhand_discount)`
5. **♻️ Waste:** `Bags × bag_factor × recycling_saving × composting_saving`

### Logic: Smart Insight Assistant
The AI insight engine uses a **Contextual Rule-Based System**. It maps the user's specific inputs (e.g., "North America", "Omnivore", "Medium Petrol Car") against 20+ smart rules. 
- It calculates the precise **impact** and **potential monthly savings** for each rule.
- It dynamically ranks and surfaces only the top insights that make logical sense for that specific user.

---

## ⚙️ 3. How the Solution Works

1. **Onboarding Context:** The user inputs their Name, Region, and optional Lifestyle presets (like "Vegan" or "EV Driver"). This context is saved to local browser storage (`localStorage`).
2. **Data Processing:** As the user adjusts sliders in the **Calculator**, the pure calculation functions immediately process the data and update the UI in real-time.
3. **Dynamic Dashboard:** Custom-built HTML5 `<canvas>` charts (Gauge, Donut, Trend Line) render the footprint data at 60fps.
4. **Action & Goal Tracking:** Users can set a monthly CO₂ target and pledge real-world actions (e.g., "Meat-free 3 days a week"). The app tracks their completed actions, current streak, and total estimated CO₂ saved.

---

## 🧠 4. Assumptions Made

To simplify complex real-world carbon calculations for a smooth user experience, the following assumptions were made:
1. **Regional Averages:** Electricity grid factors are averaged by broad regions (e.g., North America = 0.386 kg/kWh, Europe = 0.276 kg/kWh) rather than exact localized postcodes.
2. **Standardised Flight Emissions:** Flights are categorized simply into short, medium, and long-haul brackets using average IPCC flight emissions, ignoring specific aircraft models or passenger loads.
3. **Diet Baselines:** Diets are based on global average dietary emissions (e.g., Vegan = ~53 kg/mo, Heavy Meat = ~225 kg/mo).
4. **Data Privacy:** It is assumed the user wants maximum privacy; therefore, all calculation and tracking state is handled exclusively inside the client's local browser storage. No data is sent to external servers.

---

## ✅ Evaluation Criteria Checklist

- **Code Quality:** Clean, highly readable single-file architecture. Strict separation of pure calculation functions, state management, and UI rendering.
- **Security:** Zero backend surface area. Uses `.textContent` instead of `.innerHTML` to prevent XSS injection. Input clamping prevents boundary attacks.
- **Efficiency:** Loads instantly (<100KB total). Native HTML5 Canvas charts replace bloated charting libraries. Local execution uses minimal CPU/memory.
- **Testing:** Core `calcAll()` logic is decoupled and deterministic, easily testable by passing input objects.
- **Accessibility:** Uses semantic HTML (`<nav>`, `<header>`, `<main>`), ARIA labels (`aria-live`, `aria-hidden`), high-contrast colors, and `@media(prefers-reduced-motion)` for users with vestibular disorders.
