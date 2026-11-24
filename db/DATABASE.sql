-- Solar Monitor – PostgreSQL schema
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE,
  phone         TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','viewer')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS plants (
  id                   BIGSERIAL PRIMARY KEY,
  name                 TEXT NOT NULL,
  location             TEXT,
  capacity_kw          NUMERIC(8,2),
  unit_rate_inr        NUMERIC(6,2) NOT NULL DEFAULT 7.00,
  source_type          TEXT NOT NULL DEFAULT 'mock'
                       CHECK (source_type IN ('mock','manual','vendor_cloud','official_api','esp32')),
  source_config        JSONB NOT NULL DEFAULT '{}',   -- non-secret settings (brand, station id)
  source_credentials   TEXT,                          -- ENCRYPTED string (AES-256-GCM)
  device_key_hash      TEXT,                          -- for esp32 /ingest
  offline_after_min    INT NOT NULL DEFAULT 20,
  low_gen_percent      INT NOT NULL DEFAULT 50,       -- alert if below X% of recent sunny-day average
  timezone             TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  active               BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plant_access (
  user_id  BIGINT NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  plant_id BIGINT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, plant_id)
);

CREATE TABLE IF NOT EXISTS readings (
  id           BIGSERIAL PRIMARY KEY,
  plant_id     BIGINT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  time         TIMESTAMPTZ NOT NULL,
  power_kw     NUMERIC(8,3),
  today_kwh    NUMERIC(10,3),
  total_kwh    NUMERIC(12,3),
  voltage      NUMERIC(6,1),
  temperature  NUMERIC(5,1),
  status       TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online','offline','fault')),
  fault_code   TEXT,
  UNIQUE (plant_id, time)
);
CREATE INDEX IF NOT EXISTS idx_readings_plant_time ON readings (plant_id, time DESC);

CREATE TABLE IF NOT EXISTS alerts (
  id       BIGSERIAL PRIMARY KEY,
  plant_id BIGINT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  time     TIMESTAMPTZ NOT NULL DEFAULT now(),
  type     TEXT NOT NULL CHECK (type IN ('offline','low_generation','error')),
  message  TEXT NOT NULL,
  seen     BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_alerts_plant_time ON alerts (plant_id, time DESC);

-- Optional (build in Phase 4) so month/year graphs load fast
CREATE TABLE IF NOT EXISTS daily_summary (
  plant_id  BIGINT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  date      DATE   NOT NULL,
  total_kwh NUMERIC(10,3) NOT NULL,
  peak_kw   NUMERIC(8,3),
  PRIMARY KEY (plant_id, date)
);
