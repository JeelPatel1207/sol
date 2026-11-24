const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({
  connectionString: config.DATABASE_URL
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

async function query(text, params = []) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (config.NODE_ENV === 'development' && duration > 200) {
    console.warn(`Slow query (${duration}ms): ${text}`);
  }
  return res;
}

async function close() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  close
};
