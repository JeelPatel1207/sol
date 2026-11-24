const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const dotenv = require('dotenv');

// Load environment variables from root or server .env
const rootEnvPath = path.resolve(__dirname, '../../.env');
const localEnvPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  dotenv.config();
}

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('Migration failed: DATABASE_URL is not set in environment or .env');
    process.exit(1);
  }

  const sqlPath = path.resolve(__dirname, '../../db/DATABASE.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error(`Migration failed: SQL schema file not found at ${sqlPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = new Client({ connectionString });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Running migration from db/DATABASE.sql...');
    await client.query(sql);
    console.log('Migration completed successfully.');
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

runMigration();
