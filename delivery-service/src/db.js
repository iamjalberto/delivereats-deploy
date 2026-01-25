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
    console.log("[Delivery-Service] Database tables initialized");
  } catch (error) {
    console.error("[Delivery-Service] Error initializing database:", error);
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };
