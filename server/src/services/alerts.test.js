const assert = require('assert');

// In-memory mock database for testing alert rules in isolation
let mockAlerts = [];
let mockReadings = [];
let nextAlertId = 1;

const mockDb = {
  reset() {
    mockAlerts = [];
    mockReadings = [];
    nextAlertId = 1;
  },
  async query(sql, params = []) {
    // 1. Check existing open alert
    if (sql.includes('SELECT id FROM alerts WHERE plant_id = $1 AND type = $2 AND resolved_at IS NULL')) {
      const found = mockAlerts.filter(a => a.plant_id === params[0] && a.type === params[1] && a.resolved_at === null);
      return { rows: found };
    }

    // 2. Insert alert
    if (sql.includes('INSERT INTO alerts')) {
      const alert = {
        id: nextAlertId++,
        plant_id: params[0],
        type: params[1],
        message: params[2],
        seen: false,
        time: new Date().toISOString(),
        resolved_at: null
      };
      mockAlerts.push(alert);
      return { rows: [alert] };
    }

    // 3. Resolve open alert
    if (sql.includes('UPDATE alerts') && sql.includes('SET resolved_at = now()')) {
      let count = 0;
      mockAlerts.forEach(a => {
        if (a.plant_id === params[0] && a.type === params[1] && a.resolved_at === null) {
          a.resolved_at = new Date().toISOString();
          count++;
        }
      });
      return { rowCount: count };
    }

    // 4. Query 5-day average for low generation
    if (sql.includes('SELECT AVG(today_kwh)')) {
      return { rows: [{ avg_kwh: '20.0' }] }; // Simulated 20 kWh sunny-day average
    }

    return { rows: [], rowCount: 0 };
  }
};

// Alert evaluator under test
async function evaluateAlertRules(dbClient, plant, latestReading, currentHours = 13.0) {
  const isDaytime = currentHours >= 7 && currentHours <= 18;

  // 1. Offline rule
  if (isDaytime) {
    const diffMin = latestReading
      ? (Date.now() - new Date(latestReading.time).getTime()) / (60 * 1000)
      : 999;
    const threshold = plant.offline_after_min || 20;

    if (diffMin > threshold) {
      // Check if already open
      const existing = await dbClient.query('SELECT id FROM alerts WHERE plant_id = $1 AND type = $2 AND resolved_at IS NULL', [plant.id, 'offline']);
      if (existing.rows.length === 0) {
        await dbClient.query('INSERT INTO alerts (plant_id, type, message) VALUES ($1, $2, $3)', [plant.id, 'offline', `No data received for ${Math.round(diffMin)} minutes`]);
      }
    } else {
      await dbClient.query('UPDATE alerts SET resolved_at = now() WHERE plant_id = $1 AND type = $2 AND resolved_at IS NULL', [plant.id, 'offline']);
    }
  }

  // 2. Error rule
  if (latestReading && (latestReading.status === 'fault' || latestReading.fault_code)) {
    const existing = await dbClient.query('SELECT id FROM alerts WHERE plant_id = $1 AND type = $2 AND resolved_at IS NULL', [plant.id, 'error']);
    if (existing.rows.length === 0) {
      await dbClient.query('INSERT INTO alerts (plant_id, type, message) VALUES ($1, $2, $3)', [plant.id, 'error', `Fault: ${latestReading.fault_code || 'Inverter fault'}`]);
    }
  } else if (latestReading && latestReading.status === 'online') {
    await dbClient.query('UPDATE alerts SET resolved_at = now() WHERE plant_id = $1 AND type = $2 AND resolved_at IS NULL', [plant.id, 'error']);
  }

  // 3. Low generation rule (after midday)
  if (isDaytime && currentHours >= 12.0 && latestReading) {
    const hist = await dbClient.query('SELECT AVG(today_kwh) as avg_kwh FROM readings WHERE plant_id = $1', [plant.id]);
    const avgKwh = parseFloat(hist.rows[0]?.avg_kwh) || 0;
    const currentTodayKwh = parseFloat(latestReading.today_kwh) || 0;
    const lowGenPct = plant.low_gen_percent || 50;

    if (avgKwh > 2.0 && currentTodayKwh < (avgKwh * (lowGenPct / 100))) {
      const existing = await dbClient.query('SELECT id FROM alerts WHERE plant_id = $1 AND type = $2 AND resolved_at IS NULL', [plant.id, 'low_generation']);
      if (existing.rows.length === 0) {
        await dbClient.query('INSERT INTO alerts (plant_id, type, message) VALUES ($1, $2, $3)', [plant.id, 'low_generation', `Low generation: ${currentTodayKwh} kWh vs avg ${avgKwh} kWh`]);
      }
    } else {
      await dbClient.query('UPDATE alerts SET resolved_at = now() WHERE plant_id = $1 AND type = $2 AND resolved_at IS NULL', [plant.id, 'low_generation']);
    }
  }
}

function runTests() {
  console.log('=== Running Alert Rules Unit Tests with Fake Readings ===');
  const demoPlant = { id: 1, name: 'Test Plant', offline_after_min: 20, low_gen_percent: 50 };

  // TEST 1: Offline Alert Trigger & Deduplication
  mockDb.reset();
  const staleReading = {
    plantId: 1,
    time: new Date(Date.now() - 35 * 60 * 1000).toISOString(), // 35 minutes ago
    powerKw: 0,
    todayKwh: 5.0,
    status: 'online'
  };

  evaluateAlertRules(mockDb, demoPlant, staleReading, 11.0);
  assert.strictEqual(mockAlerts.length, 1, 'Should trigger 1 offline alert');
  assert.strictEqual(mockAlerts[0].type, 'offline');
  assert.strictEqual(mockAlerts[0].resolved_at, null, 'Alert should be open');

  // Verify deduplication: second run should NOT insert duplicate
  evaluateAlertRules(mockDb, demoPlant, staleReading, 11.0);
  assert.strictEqual(mockAlerts.length, 1, 'Deduplication: Should not add duplicate open alert');

  // TEST 2: Normal Reading Resolves Offline Alert
  const freshReading = {
    plantId: 1,
    time: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
    powerKw: 3.5,
    todayKwh: 12.0,
    status: 'online'
  };
  evaluateAlertRules(mockDb, demoPlant, freshReading, 11.0);
  assert.notStrictEqual(mockAlerts[0].resolved_at, null, 'Offline alert should be resolved');

  // TEST 3: Inverter Error Alert
  mockDb.reset();
  const faultReading = {
    plantId: 1,
    time: new Date().toISOString(),
    powerKw: 0,
    todayKwh: 4.0,
    status: 'fault',
    fault_code: 'F03_GRID_VOLTAGE_HIGH'
  };
  evaluateAlertRules(mockDb, demoPlant, faultReading, 11.0);
  assert.strictEqual(mockAlerts.length, 1, 'Should trigger 1 error alert');
  assert.strictEqual(mockAlerts[0].type, 'error');

  // Returning to online resolves error alert
  evaluateAlertRules(mockDb, demoPlant, freshReading, 11.0);
  assert.notStrictEqual(mockAlerts[0].resolved_at, null, 'Error alert should be resolved when online');

  // TEST 4: Low Generation Alert (at 13:00 with avg = 20 kWh, actual = 4 kWh < 50%)
  mockDb.reset();
  const lowGenReading = {
    plantId: 1,
    time: new Date().toISOString(),
    powerKw: 0.5,
    todayKwh: 4.0, // 4 kWh is 20% of 20 kWh avg (below 50% threshold)
    status: 'online'
  };
  evaluateAlertRules(mockDb, demoPlant, lowGenReading, 13.0);
  assert.strictEqual(mockAlerts.length, 1, 'Should trigger 1 low_generation alert');
  assert.strictEqual(mockAlerts[0].type, 'low_generation');

  // Normal generation resolves low_generation alert
  const goodGenReading = {
    plantId: 1,
    time: new Date().toISOString(),
    powerKw: 4.2,
    todayKwh: 16.0, // 16 kWh > 50% of 20 kWh
    status: 'online'
  };
  evaluateAlertRules(mockDb, demoPlant, goodGenReading, 13.0);
  assert.notStrictEqual(mockAlerts[0].resolved_at, null, 'Low generation alert should be resolved');

  console.log('PASS: All alert rules (offline, error, low_generation, normal recovery, deduplication) passed successfully!');
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
