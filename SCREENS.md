# Screens (mobile first, light + dark mode, big numbers, "Last updated" on every screen)

Bottom nav: Plants · Alerts (badge) · Admin (admin only) · Logout.

## 1. Login
Fields: email or phone, password. Button: Login. Error text under field. No sign-up link.

## 2. Plant list  (GET /plants)
Card per plant: name, **power now (kW)**, today kWh, status dot (green online / grey offline / red fault),
"Updated 2 min ago". Tap card → dashboard. Pull to refresh. Auto-refresh every 60 s.

## 3. Plant dashboard  (GET /plants/:id/live)
- Header: plant name + status dot + last updated.
- Big number: power now (kW) with capacity % ring.
- Row of 3 tiles: Today kWh · Total kWh · Savings today ₹ (total savings below).
- Line/area chart: today's power curve (x = time, y = kW).
- Small info: voltage, temperature.
- Button: "History".
- Offline state: grey banner "Offline since 10:15 – showing last data".

## 4. History  (GET /plants/:id/history)
Tabs: Day | Month | Year. Bar chart of energy (kWh). Arrows to move previous/next period.
Summary below chart: total kWh, savings ₹, best day.

## 5. Alerts  (GET /plants/:id/alerts or all)
List newest first: icon by type, message, time. Unseen items bold. Tap = mark seen.

## 6. Admin (admin only)
- Plants: add/edit/delete; fields name, location, capacity, unit rate ₹, source type, credentials, thresholds; "Test collector" button.
- Users: add/remove, role, tick which plants they can see.

## Components
Layout, PowerCard, StatusDot, EnergyChart, LastUpdated, EmptyState, ErrorBanner, Loading skeleton.

## Design rules
Font ≥16px, numbers ≥40px on dashboard, tap targets ≥44px, ₹ with Indian grouping (1,23,456),
sun-yellow accent, works at 360px width, offline: show cached last data (service worker).
All text from `i18n.js` (English now; Gujarati/Hindi later).
