const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "payment_db",
});

const initDB = async () => {
  const client = await pool.connect();
  try {
    // Crear tipos ENUM si no existen
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('PENDIENTE', 'PAGADO', 'RECHAZADO', 'REEMBOLSADO');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE payment_type AS ENUM ('TARJETA_CREDITO', 'TARJETA_DEBITO', 'CARTERA_DIGITAL');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Crear tabla de pagos
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL UNIQUE,
        customer_id INTEGER NOT NULL,
        amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
        currency VARCHAR(3) NOT NULL DEFAULT 'GTQ',
        converted_amount DECIMAL(10, 2),
        converted_currency VARCHAR(3),
        exchange_rate DECIMAL(12, 6),
        payment_type payment_type NOT NULL,
        card_last_four VARCHAR(4),
        card_holder_name VARCHAR(100),
        status payment_status NOT NULL DEFAULT 'PENDIENTE',
        transaction_id VARCHAR(100) UNIQUE,
        refund_approved_by INTEGER,
        refund_approved_at TIMESTAMP,
        refund_reason TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Indexes
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);`,
    );

    // Tabla de cupones
    await client.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        discount_type VARCHAR(20) NOT NULL DEFAULT 'PORCENTAJE',
        discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value > 0),
        min_order_amount DECIMAL(10, 2) DEFAULT 0,
        max_discount DECIMAL(10, 2),
        max_uses INTEGER DEFAULT 1,
        current_uses INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT true,
        expires_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);`,
    );

    // Tabla de carteras digitales (wallet recargable)
    await client.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL UNIQUE,
        balance DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_wallets_customer_id ON wallets(customer_id);
    `);

    // Historial de transacciones de cartera
    await client.query(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id SERIAL PRIMARY KEY,
        wallet_id INTEGER NOT NULL REFERENCES wallets(id),
        type VARCHAR(20) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
        description TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Trigger para updated_at
    await client.query(`
      CREATE OR REPLACE FUNCTION update_payments_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
      $$ language 'plpgsql';
    `);
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_payments_updated_at ON payments;
      CREATE TRIGGER trigger_payments_updated_at
        BEFORE UPDATE ON payments
        FOR EACH ROW EXECUTE FUNCTION update_payments_updated_at();
    `);

    console.log("[Payment-Service] Database tables initialized");
  } catch (error) {
    console.error("[Payment-Service] Error initializing database:", error);
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };
