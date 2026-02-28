const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "delivery_db",
});

const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS deliveries (
        id SERIAL PRIMARY KEY,
        order_id INTEGER UNIQUE NOT NULL,
        delivery_person_id INTEGER NOT NULL,
        delivery_person_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'EN_CAMINO',
        accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        delivered_at TIMESTAMP
      );
    `);

    // Tabla de evidencia fotográfica (Práctica 5)
    await client.query(`
      CREATE TABLE IF NOT EXISTS delivery_evidence (
        id SERIAL PRIMARY KEY,
        delivery_id INTEGER NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
        order_id INTEGER NOT NULL,
        driver_id INTEGER NOT NULL,
        photo_path VARCHAR(500) NOT NULL,
        photo_original_name VARCHAR(255),
        photo_mime_type VARCHAR(50),
        photo_size_bytes INTEGER,
        notes TEXT,
        uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_evidence_delivery_id ON delivery_evidence(delivery_id);`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_evidence_order_id ON delivery_evidence(order_id);`,
    );

    console.log("[Delivery-Service] Database tables initialized");
  } catch (error) {
    console.error("[Delivery-Service] Error initializing database:", error);
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };
