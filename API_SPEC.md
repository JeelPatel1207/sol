# API Spec (base: /api, JSON, auth: `Authorization: Bearer <jwt>`)

Errors: `{ "error": "message" }` with status 400/401/403/404/500.
Viewers can only access plants listed in `plant_access`. Admin can access all.

## Auth
### POST /api/auth/login
Req: `{ "identifier": "jeel@example.com", "password": "..." }`
Res 200: `{ "token": "jwt...", "user": { "id":1, "name":"Jeel", "role":"admin" } }`
Res 401: `{ "error": "Invalid credentials" }`   (rate limit: 10 tries / 15 min / IP)

### GET /api/me
Res: `{ "id":1, "name":"Jeel", "role":"admin" }`

## Plants
### GET /api/plants
Res:
```json
[{ "id":1, "name":"Home Roof", "capacityKw":5, "powerKw":3.42, "todayKwh":12.8,
   "status":"online", "lastUpdated":"2026-11-23T09:35:00Z" }]
```
### GET /api/plants/:id/live
Res:
```json
{ "plantId":1, "name":"Home Roof", "powerKw":3.42, "todayKwh":12.8, "totalKwh":4521.3,
  "savingsTodayInr":89.6, "savingsTotalInr":31649, "voltage":231.2, "temperature":41.5,
  "status":"online", "lastUpdated":"2026-11-23T09:35:00Z",
  "todayCurve":[{"t":"2026-11-23T06:30:00Z","kw":0.1}, {"t":"2026-11-23T06:35:00Z","kw":0.2}] }
```
`status` = `offline` if no reading for `offline_after_min` during daytime.

### GET /api/plants/:id/history?range=day|month|year&date=2026-11-23
- day: 5-min points `[{ "t":"...", "kw":3.4 }]`
- month: daily bars `[{ "date":"2026-11-01", "kwh":21.4 }]`
- year: monthly bars `[{ "month":"2026-11", "kwh":610.2 }]`
Res: `{ "range":"month", "totalKwh":610.2, "savingsInr":4271, "points":[...] }`

### GET /api/plants/:id/alerts?limit=50
Res: `[{ "id":9, "type":"offline", "message":"No data for 25 min", "time":"...", "seen":false }]`
### POST /api/alerts/:id/seen  → `{ "ok": true }`

## Ingest (ESP32 / manual scripts)
### POST /api/ingest
Header: `X-Device-Key: <plant device key>`
Req: `{ "plantId":1, "time":"2026-11-23T09:35:00Z", "powerKw":3.42, "todayKwh":12.8, "totalKwh":4521.3, "voltage":231.2, "temperature":41.5, "status":"online" }`
Res 201: `{ "ok": true }`. `time` optional (server time used). Duplicate (plant,time) is ignored.

### POST /api/plants/:id/manual-reading   (admin)
Req: `{ "date":"2026-11-23", "todayKwh":14.2, "totalKwh":4523.1 }`

## Admin (role=admin)
- POST /api/plants  `{ name, location, capacityKw, unitRateInr, sourceType, sourceConfig, credentials:{username,password}, offlineAfterMin, lowGenPercent }`
  → creates plant; returns `{ id, deviceKey }` (deviceKey shown ONCE for esp32)
- PATCH /api/plants/:id, DELETE /api/plants/:id
- GET /api/users, POST /api/users `{ name, email|phone, password, role }`, DELETE /api/users/:id
- PUT /api/users/:id/plants `{ "plantIds":[1,2] }`  (sets access)
- POST /api/plants/:id/test-collector → runs collector once, returns the normalized reading or error

## Health
GET /api/health → `{ "ok": true, "time": "..." }`
