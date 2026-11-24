# Collectors

A collector is a function that gets data for ONE plant and returns the normalized reading
(see ARCHITECTURE.md). The scheduler calls it every 5 minutes. Everything else is brand independent.

```js
// server/src/collectors/<name>.collector.js
module.exports = {
  name: 'vendor_cloud',
  async fetch(plant, credentials) { /* return normalized reading */ },
};
```
`collectors/index.js` picks the collector from `plant.source_type`.

## Common rules
- Timeout 20 s, 1 retry after 5 s. Never crash the scheduler: catch errors per plant.
- On failure: log (without secrets), do NOT insert fake zeros. Alert job decides "offline".
- Convert units: W→kW, Wh→kWh. Missing fields = null.
- Use only your own account/plants. Follow the vendor's terms of service.
- Cache the vendor login token and re-login only when it expires (avoid being blocked).
- Insert with `ON CONFLICT (plant_id, time) DO NOTHING`.

## A. mock.collector.js  (build first)
Generates a realistic bell-curve power between 6:30 and 18:30, zero at night. Lets you build and test
all API and screens before the real inverter is known.

## B. vendor_cloud.collector.js  (SmartClient / Eybond style)
Vendor APIs are usually unofficial, so first do **discovery**:
1. Open the vendor web portal (or app) in desktop Chrome → DevTools → Network tab.
2. Log in, open your plant. Note the requests: login URL, token/cookie, "plant list", "device data".
3. Copy request URL, method, headers, body shape, and one sample JSON response.
4. Give those to the AI tool (hide your password and tokens) with this prompt:
   "Write vendorCloud.collector.js that logs in with these credentials from env, calls the data
   endpoint, and maps this sample response to the normalized reading. Add a unit test using the sample."
5. Map fields: power → `powerKw`, today energy → `todayKwh`, total energy → `totalKwh`,
   status/fault → `status`, `faultCode`.
Risk: vendor can change or block the API. Keep the mapping in one file so it is easy to fix.

## C. official_api.collector.js
Brands with a developer API (Growatt, Solis, Huawei FusionSolar, Sungrow iSolarCloud, Deye, etc.):
1. Create a developer account and request API key/approval from the brand.
2. Store key + station id in `source_credentials` (encrypted) / `source_config`.
3. Call the plant-overview endpoint. Respect the rate limit (many allow ~1 call per 5 min).

## D. esp32 / Raspberry Pi (local Modbus)  – later option
Hardware: ESP32 + RS485-to-TTL module (~₹500-1500) connected to the inverter's RS485 port.
Steps:
1. Get the inverter's **Modbus register list** (PDF from the brand) and slave address / baud rate.
2. Firmware (Arduino/ESPHome/MicroPython): read registers every 5 min → build JSON →
   `POST https://your-domain/api/ingest` with header `X-Device-Key`.
3. Server needs no change: `/ingest` already accepts the normalized reading.
Register map template (fill from the manual):
| Value | Register | Type | Scale | Unit |
|---|---|---|---|---|
| Power now | ? | U32 | 0.1 | W |
| Today energy | ? | U32 | 0.1 | kWh |
| Total energy | ? | U32 | 0.1 | kWh |
| Voltage | ? | U16 | 0.1 | V |
| Temperature | ? | I16 | 0.1 | °C |
| Fault code | ? | U16 | 1 | - |

## E. manual.collector.js
No fetching. Admin enters daily kWh (and optional meter reading). Stored as one reading at 18:00 local.
Charts show daily bars only, no live power.

## Test checklist per collector
- [ ] Returns all fields with correct units
- [ ] Handles wrong password, timeout, empty response without crashing
- [ ] Night time (power 0) is saved as `online` with 0 kW, not as error
- [ ] Two runs in the same minute do not create duplicate rows
