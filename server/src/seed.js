const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');

const rootEnv = path.resolve(__dirname, '../../.env');
const serverEnv = path.resolve(__dirname, '../.env');

if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else if (fs.existsSync(serverEnv)) {
  dotenv.config({ path: serverEnv });
} else {
  dotenv.config();
}

const config = require('./config');
const db = require('./db');

async function seed() {
  console.log('=== Seeding Database (Phase 2) ===');

  try {
    const rounds = Number(config.BCRYPT_ROUNDS) || 12;

    // 1. Seed Admin User
    const adminPasswordHash = await bcrypt.hash(config.ADMIN_PASSWORD || 'change-me-now', rounds);
    const adminEmail = config.ADMIN_EMAIL || 'admin@example.com';
    const adminName = config.ADMIN_NAME || 'Admin';

    let adminRes = await db.query('SELECT id, name, email, role FROM users WHERE email = $1', [adminEmail]);
    let adminId;
    if (adminRes.rows.length === 0) {
      const insertedAdmin = await db.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'admin')
         RETURNING id, name, email, role`,
        [adminName, adminEmail, adminPasswordHash]
      );
      adminId = insertedAdmin.rows[0].id;
      console.log(`[Seed] Created Admin: ${adminName} (${adminEmail}) ID: ${adminId}`);
    } else {
      adminId = adminRes.rows[0].id;
      console.log(`[Seed] Admin already exists: ${adminEmail} (ID: ${adminId})`);
    }

    // 2. Seed Demo Viewer User (for testing viewer permissions and 403 checks)
    const viewerEmail = 'viewer@example.com';
    const viewerPassword = 'viewer-password-123';
    const viewerPasswordHash = await bcrypt.hash(viewerPassword, rounds);

    let viewerRes = await db.query('SELECT id, name, email, role FROM users WHERE email = $1', [viewerEmail]);
    let viewerId;
    if (viewerRes.rows.length === 0) {
      const insertedViewer = await db.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'viewer')
         RETURNING id, name, email, role`,
        ['Demo Viewer', viewerEmail, viewerPasswordHash]
      );
      viewerId = insertedViewer.rows[0].id;
      console.log(`[Seed] Created Demo Viewer: ${viewerEmail} (ID: ${viewerId})`);
    } else {
      viewerId = viewerRes.rows[0].id;
      console.log(`[Seed] Demo Viewer already exists: ${viewerEmail} (ID: ${viewerId})`);
    }

    // 3. Seed Demo Plant 1 (Accessible to Viewer & Admin, configured with ingest device key)
    const demoDeviceKey = 'test-device-key-solar-001';
    const demoDeviceKeyHash = await bcrypt.hash(demoDeviceKey, 10);

    let plant1Res = await db.query('SELECT id, name FROM plants WHERE name = $1', ['Demo Rooftop Solar']);
    let plant1Id;
    if (plant1Res.rows.length === 0) {
      const insertedPlant1 = await db.query(
        `INSERT INTO plants (
           name, location, capacity_kw, unit_rate_inr, source_type,
           source_config, device_key_hash, timezone, active, offline_after_min
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, name`,
        [
          'Demo Rooftop Solar',
          'Surat, Gujarat',
          5.00,
          7.00,
          'mock',
          JSON.stringify({ brand: 'MockBrand', simulated: true }),
          demoDeviceKeyHash,
          'Asia/Kolkata',
          true,
          20
        ]
      );
      plant1Id = insertedPlant1.rows[0].id;
      console.log(`[Seed] Created Plant 1: "Demo Rooftop Solar" (ID: ${plant1Id})`);
    } else {
      plant1Id = plant1Res.rows[0].id;
      await db.query('UPDATE plants SET device_key_hash = $1 WHERE id = $2', [demoDeviceKeyHash, plant1Id]);
      console.log(`[Seed] Plant 1 already exists: "Demo Rooftop Solar" (ID: ${plant1Id})`);
    }

    // 4. Seed Demo Plant 2 (Private Farm Solar - Admin only, viewer has NO access)
    let plant2Res = await db.query('SELECT id, name FROM plants WHERE name = $1', ['Private Farm Solar']);
    let plant2Id;
    if (plant2Res.rows.length === 0) {
      const insertedPlant2 = await db.query(
        `INSERT INTO plants (
           name, location, capacity_kw, unit_rate_inr, source_type,
           source_config, timezone, active, offline_after_min
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, name`,
        [
          'Private Farm Solar',
          'Navsari, Gujarat',
          10.00,
          7.50,
          'mock',
          JSON.stringify({ brand: 'FarmMock', simulated: true }),
          'Asia/Kolkata',
          true,
          20
        ]
      );
      plant2Id = insertedPlant2.rows[0].id;
      console.log(`[Seed] Created Plant 2: "Private Farm Solar" (ID: ${plant2Id})`);
    } else {
      plant2Id = plant2Res.rows[0].id;
      console.log(`[Seed] Plant 2 already exists: "Private Farm Solar" (ID: ${plant2Id})`);
    }

    // 5. Grant Viewer access ONLY to Plant 1 (Viewer should get 403 on Plant 2)
    await db.query(
      `INSERT INTO plant_access (user_id, plant_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, plant_id) DO NOTHING`,
      [viewerId, plant1Id]
    );

    console.log(`[Seed] Access configured: Viewer (ID: ${viewerId}) -> Plant 1 only.`);
    console.log(`[Seed] Ingest key for Plant 1 is: "${demoDeviceKey}"`);
    console.log('=== Seed Completed Successfully ===');

    await db.close();
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]:', err.message);
    await db.close().catch(() => {});
    process.exit(1);
  }
}

seed();
