# Solar Monitor – Phase 2 API Curl Test Guide

Base URL: `http://localhost:4000`

---

## 1. Health Check
Verify the server is running.

```bash
curl -i http://localhost:4000/api/health
```
**Expected Response (200 OK):**
```json
{
  "ok": true,
  "time": "2026-11-23T14:35:00.000Z"
}
```

---

## 2. Authentication

### A. Admin Login (Success)
```bash
curl -i -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin@example.com",
    "password": "change-me-now"
  }'
```
**Expected Response (200 OK):**
```json
{
  "token": "eyJhbGciOi...",
  "user": {
    "id": 1,
    "name": "Admin",
    "role": "admin"
  }
}
```

### B. Viewer Login (Success)
```bash
curl -i -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "viewer@example.com",
    "password": "viewer-password-123"
  }'
```
**Expected Response (200 OK):**
```json
{
  "token": "eyJhbGciOi...",
  "user": {
    "id": 2,
    "name": "Demo Viewer",
    "role": "viewer"
  }
}
```

### C. Wrong Password (401 Unauthorized)
```bash
curl -i -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin@example.com",
    "password": "wrong-password"
  }'
```
**Expected Response (401 Unauthorized):**
```json
{
  "error": "Invalid credentials"
}
```

---

## 3. Current User Profile (/api/me)

```bash
# Export the token received from login
ADMIN_TOKEN="<PASTE_ADMIN_TOKEN>"

curl -i http://localhost:4000/api/me \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
**Expected Response (200 OK):**
```json
{
  "id": 1,
  "name": "Admin",
  "role": "admin"
}
```

**Without Token (401 Unauthorized):**
```bash
curl -i http://localhost:4000/api/me
```
```json
{
  "error": "Unauthorized: Missing or malformed token"
}
```

---

## 4. Plant Access & Permissions

### A. List Plants as Admin (Sees All Active Plants)
```bash
curl -i http://localhost:4000/api/plants \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
**Expected Response (200 OK):**
Returns both Plant 1 ("Demo Rooftop Solar") and Plant 2 ("Private Farm Solar").

### B. List Plants as Viewer (Sees Only Plant 1)
```bash
VIEWER_TOKEN="<PASTE_VIEWER_TOKEN>"

curl -i http://localhost:4000/api/plants \
  -H "Authorization: Bearer $VIEWER_TOKEN"
```
**Expected Response (200 OK):**
Returns array with **only Plant 1**.

### C. Plant Live Data (Allowed)
```bash
curl -i http://localhost:4000/api/plants/1/live \
  -H "Authorization: Bearer $VIEWER_TOKEN"
```
**Expected Response (200 OK):**
```json
{
  "plantId": 1,
  "name": "Demo Rooftop Solar",
  "powerKw": 3.42,
  "todayKwh": 12.8,
  "totalKwh": 4512.8,
  "savingsTodayInr": 89.6,
  "savingsTotalInr": 31589.6,
  "voltage": 231.2,
  "temperature": 41.5,
  "status": "online",
  "lastUpdated": "2026-11-23T09:35:00.000Z",
  "todayCurve": [
    { "t": "2026-11-23T06:30:00.000Z", "kw": 0.1 }
  ]
}
```

### D. Viewer Accessing Unassigned Plant (403 Forbidden)
```bash
curl -i http://localhost:4000/api/plants/2/live \
  -H "Authorization: Bearer $VIEWER_TOKEN"
```
**Expected Response (403 Forbidden):**
```json
{
  "error": "Forbidden: You do not have access to this plant"
}
```

---

## 5. History Graphs

### Day Range (5-minute points)
```bash
curl -i "http://localhost:4000/api/plants/1/history?range=day&date=2026-11-23" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
**Expected Response (200 OK):**
```json
{
  "range": "day",
  "totalKwh": 14.2,
  "savingsInr": 99.4,
  "points": [
    { "t": "2026-11-23T06:30:00.000Z", "kw": 0.1 }
  ]
}
```

### Month Range (Daily bars)
```bash
curl -i "http://localhost:4000/api/plants/1/history?range=month&date=2026-11-23" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
**Expected Response (200 OK):**
```json
{
  "range": "month",
  "totalKwh": 420.5,
  "savingsInr": 2943.5,
  "points": [
    { "date": "2026-11-01", "kwh": 14.1 }
  ]
}
```

### Year Range (Monthly bars)
```bash
curl -i "http://localhost:4000/api/plants/1/history?range=year&date=2026-11-23" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
**Expected Response (200 OK):**
```json
{
  "range": "year",
  "totalKwh": 4820.0,
  "savingsInr": 33740.0,
  "points": [
    { "month": "2026-11", "kwh": 420.5 }
  ]
}
```

---

## 6. Admin Manual Reading Entry

### Success (Admin)
```bash
curl -i -X POST http://localhost:4000/api/plants/1/manual-reading \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-11-23",
    "todayKwh": 15.4,
    "totalKwh": 4535.0
  }'
```
**Expected Response (201 Created):**
```json
{
  "ok": true
}
```

### Forbidden (Viewer)
```bash
curl -i -X POST http://localhost:4000/api/plants/1/manual-reading \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-11-23",
    "todayKwh": 15.4,
    "totalKwh": 4535.0
  }'
```
**Expected Response (403 Forbidden):**
```json
{
  "error": "Forbidden: Admin access required"
}
```

---

## 7. Device Ingest (/api/ingest)

### Valid Device Key (201 Created)
```bash
curl -i -X POST http://localhost:4000/api/ingest \
  -H "X-Device-Key: test-device-key-solar-001" \
  -H "Content-Type: application/json" \
  -d '{
    "plantId": 1,
    "powerKw": 4.12,
    "todayKwh": 16.5,
    "totalKwh": 4536.1,
    "voltage": 234.5,
    "temperature": 42.1,
    "status": "online"
  }'
```
**Expected Response (201 Created):**
```json
{
  "ok": true
}
```

### Invalid Device Key (401 Unauthorized)
```bash
curl -i -X POST http://localhost:4000/api/ingest \
  -H "X-Device-Key: invalid-key-xyz" \
  -H "Content-Type: application/json" \
  -d '{
    "plantId": 1,
    "powerKw": 4.12
  }'
```
**Expected Response (401 Unauthorized):**
```json
{
  "error": "Invalid device key"
}
```
