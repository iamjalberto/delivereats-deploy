const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "order_db",
});

const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,
        client_name VARCHAR(255),
        client_email VARCHAR(255),
        restaurant_id INTEGER NOT NULL,
        restaurant_name VARCHAR(255),
        total DECIMAL(10, 2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'CREADA',
        delivery_address TEXT,
        delivery_person_id INTEGER,
        delivery_person_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        menu_item_id INTEGER,
        name VARCHAR(255),
        quantity INTEGER DEFAULT 1,
        price DECIMAL(10, 2)
      );

      CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        user_name VARCHAR(255),
        entity_type VARCHAR(20) NOT NULL,
        entity_id INTEGER NOT NULL,
        entity_name VARCHAR(255),
        stars INTEGER CHECK (stars >= 1 AND stars <= 5),
        comment TEXT,
        recommended BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(order_id, entity_type, entity_id)
      );

      CREATE INDEX IF NOT EXISTS idx_ratings_entity ON ratings(entity_type, entity_id);
    `);
    console.log("[Order-Service] Database tables initialized");
  } catch (error) {
    console.error("[Order-Service] Error initializing database:", error);
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };
