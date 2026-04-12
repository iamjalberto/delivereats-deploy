const { pool } = require("./db");

// ========== RESTAURANTS ==========

const createRestaurant = async (call, callback) => {
  try {
    const { name, address, phone, schedule, food_type, owner_id } =
      call.request;
    const result = await pool.query(
      "INSERT INTO restaurants (name, address, phone, schedule, food_type, owner_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [name, address, phone, schedule, food_type, owner_id],
    );
    const r = result.rows[0];
    callback(null, {
      success: true,
      message: "Restaurante creado exitosamente",
      restaurant: {
        id: r.id,
        name: r.name,
        address: r.address,
        phone: r.phone,
        schedule: r.schedule,
        food_type: r.food_type,
        owner_id: r.owner_id,
      },
    });
  } catch (error) {
    console.error("[Restaurant-Service] createRestaurant error:", error);
    callback(null, {
      success: false,
      message: "Error al crear restaurante",
      restaurant: null,
    });
  }
};

const getRestaurant = async (call, callback) => {
  try {
    const { id } = call.request;
    const result = await pool.query("SELECT * FROM restaurants WHERE id = $1", [
      id,
    ]);
    if (result.rows.length === 0) {
      return callback(null, {
        success: false,
        message: "Restaurante no encontrado",
        restaurant: null,
      });
    }
    const r = result.rows[0];
    callback(null, {
      success: true,
      message: "OK",
      restaurant: {
        id: r.id,
        name: r.name,
        address: r.address,
        phone: r.phone,
        schedule: r.schedule,
        food_type: r.food_type,
        owner_id: r.owner_id,
      },
    });
  } catch (error) {
    callback(null, {
      success: false,
      message: "Error interno",
      restaurant: null,
    });
  }
};

const updateRestaurant = async (call, callback) => {
  try {
    const { id, name, address, phone, schedule, food_type } = call.request;
    const result = await pool.query(
      "UPDATE restaurants SET name=$1, address=$2, phone=$3, schedule=$4, food_type=$5 WHERE id=$6 RETURNING *",
      [name, address, phone, schedule, food_type, id],
    );
    if (result.rows.length === 0) {
      return callback(null, {
        success: false,
        message: "Restaurante no encontrado",
        restaurant: null,
      });
    }
    const r = result.rows[0];
    callback(null, {
      success: true,
      message: "Restaurante actualizado",
      restaurant: {
        id: r.id,
        name: r.name,
        address: r.address,
        phone: r.phone,
        schedule: r.schedule,
        food_type: r.food_type,
        owner_id: r.owner_id,
      },
    });
  } catch (error) {
    callback(null, {
      success: false,
      message: "Error al actualizar",
      restaurant: null,
    });
  }
};

const deleteRestaurant = async (call, callback) => {
  try {
    const { id } = call.request;
    await pool.query("DELETE FROM restaurants WHERE id = $1", [id]);
    callback(null, { success: true, message: "Restaurante eliminado" });
  } catch (error) {
    callback(null, { success: false, message: "Error al eliminar" });
  }
};

const listRestaurants = async (call, callback) => {
  try {
    const result = await pool.query("SELECT * FROM restaurants ORDER BY id");
    const restaurants = result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      address: r.address,
      phone: r.phone,
      schedule: r.schedule,
      food_type: r.food_type,
      owner_id: r.owner_id,
    }));
    callback(null, { restaurants });
  } catch (error) {
    callback(null, { restaurants: [] });
  }
};

// ========== MENU ITEMS ==========

const createMenuItem = async (call, callback) => {
  try {
    const { restaurant_id, name, description, price, available, category } =
      call.request;
    const result = await pool.query(
      "INSERT INTO menu_items (restaurant_id, name, description, price, available, category) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [restaurant_id, name, description, price, available !== false, category],
    );
    const i = result.rows[0];
    callback(null, {
      success: true,
      message: "Producto creado exitosamente",
      item: {
        id: i.id,
        restaurant_id: i.restaurant_id,
        name: i.name,
        description: i.description,
        price: parseFloat(i.price),
        available: i.available,
        category: i.category,
      },
    });
  } catch (error) {
    console.error("[Restaurant-Service] createMenuItem error:", error);
    callback(null, {
      success: false,
      message: "Error al crear producto",
      item: null,
    });
  }
};

const getMenuItem = async (call, callback) => {
  try {
    const { id } = call.request;
    const result = await pool.query("SELECT * FROM menu_items WHERE id = $1", [
      id,
    ]);
    if (result.rows.length === 0) {
      return callback(null, {
        success: false,
        message: "Producto no encontrado",
        item: null,
      });
    }
    const i = result.rows[0];
    callback(null, {
      success: true,
      message: "OK",
      item: {
        id: i.id,
        restaurant_id: i.restaurant_id,
        name: i.name,
        description: i.description,
        price: parseFloat(i.price),
        available: i.available,
        category: i.category,
      },
    });
  } catch (error) {
    callback(null, { success: false, message: "Error interno", item: null });
  }
};

const updateMenuItem = async (call, callback) => {
  try {
    const { id, name, description, price, available, category } = call.request;
    const result = await pool.query(
      "UPDATE menu_items SET name=$1, description=$2, price=$3, available=$4, category=$5 WHERE id=$6 RETURNING *",
      [name, description, price, available, category, id],
    );
    if (result.rows.length === 0) {
      return callback(null, {
        success: false,
        message: "Producto no encontrado",
        item: null,
      });
    }
    const i = result.rows[0];
    callback(null, {
      success: true,
      message: "Producto actualizado",
      item: {
        id: i.id,
        restaurant_id: i.restaurant_id,
        name: i.name,
        description: i.description,
        price: parseFloat(i.price),
        available: i.available,
        category: i.category,
      },
    });
  } catch (error) {
    callback(null, {
      success: false,
      message: "Error al actualizar",
      item: null,
    });
  }
};

const deleteMenuItem = async (call, callback) => {
  try {
    const { id } = call.request;
    await pool.query("DELETE FROM menu_items WHERE id = $1", [id]);
    callback(null, { success: true, message: "Producto eliminado" });
  } catch (error) {
    callback(null, { success: false, message: "Error al eliminar" });
  }
};

const listMenuItems = async (call, callback) => {
  try {
    const { restaurant_id } = call.request;
    const result = await pool.query(
      "SELECT * FROM menu_items WHERE restaurant_id = $1 ORDER BY id",
      [restaurant_id],
    );
    const items = result.rows.map((i) => ({
      id: i.id,
      restaurant_id: i.restaurant_id,
      name: i.name,
      description: i.description,
      price: parseFloat(i.price),
      available: i.available,
      category: i.category,
    }));
    callback(null, { items });
  } catch (error) {
    callback(null, { items: [] });
  }
};

// ========== PROMOTIONS ==========

const createPromotion = async (call, callback) => {
  try {
    const {
      restaurant_id,
      title,
      description,
      discount_type,
      discount_value,
      starts_at,
      ends_at,
    } = call.request;
    const result = await pool.query(
      `INSERT INTO promotions (restaurant_id, title, description, discount_type, discount_value, starts_at, ends_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        restaurant_id,
        title,
        description,
        discount_type || "PORCENTAJE",
        discount_value,
        starts_at || null,
        ends_at || null,
      ],
    );
    const p = result.rows[0];
    callback(null, {
      success: true,
      message: "Promoción creada exitosamente",
      promotion: {
        id: p.id,
        restaurant_id: p.restaurant_id,
        title: p.title,
        description: p.description,
        discount_type: p.discount_type,
        discount_value: parseFloat(p.discount_value),
        starts_at: p.starts_at ? p.starts_at.toISOString() : "",
        ends_at: p.ends_at ? p.ends_at.toISOString() : "",
        active: p.active,
      },
    });
  } catch (error) {
    console.error("[Restaurant-Service] createPromotion error:", error);
    callback(null, {
      success: false,
      message: "Error al crear promoción",
      promotion: null,
    });
  }
};

const listPromotions = async (call, callback) => {
  try {
    const { restaurant_id } = call.request;
    let query = "SELECT * FROM promotions";
    const params = [];
    if (restaurant_id) {
      query += " WHERE restaurant_id = $1";
      params.push(restaurant_id);
    }
    query += " ORDER BY id DESC";
    const result = await pool.query(query, params);
    const promotions = result.rows.map((p) => ({
      id: p.id,
      restaurant_id: p.restaurant_id,
      title: p.title,
      description: p.description,
      discount_type: p.discount_type,
      discount_value: parseFloat(p.discount_value),
      starts_at: p.starts_at ? p.starts_at.toISOString() : "",
      ends_at: p.ends_at ? p.ends_at.toISOString() : "",
      active: p.active,
    }));
    callback(null, { promotions });
  } catch (error) {
    console.error("[Restaurant-Service] listPromotions error:", error);
    callback(null, { promotions: [] });
  }
};

const deletePromotion = async (call, callback) => {
  try {
    const { id } = call.request;
    await pool.query("DELETE FROM promotions WHERE id = $1", [id]);
    callback(null, { success: true, message: "Promoción eliminada" });
  } catch (error) {
    callback(null, { success: false, message: "Error al eliminar promoción" });
  }
};

// ========== SEARCH & FILTERS ==========

const searchRestaurants = async (call, callback) => {
  try {
    const { query, food_type, filter, has_promotions } = call.request;
    let sql = "SELECT DISTINCT r.* FROM restaurants r";
    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (has_promotions) {
      sql +=
        " INNER JOIN promotions p ON p.restaurant_id = r.id AND p.active = true AND (p.ends_at IS NULL OR p.ends_at > NOW())";
    }

    if (query) {
      conditions.push(
        `(LOWER(r.name) LIKE $${paramIdx} OR LOWER(r.food_type) LIKE $${paramIdx})`,
      );
      params.push(`%${query.toLowerCase()}%`);
      paramIdx++;
    }

    if (food_type) {
      conditions.push(`LOWER(r.food_type) = $${paramIdx}`);
      params.push(food_type.toLowerCase());
      paramIdx++;
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    // Sorting based on filter
    if (filter === "nuevos") {
      sql += " ORDER BY r.id DESC";
    } else if (filter === "destacados") {
      sql += " ORDER BY r.id ASC"; // Could be based on order count in future
    } else {
      sql += " ORDER BY r.id";
    }

    const result = await pool.query(sql, params);
    const restaurants = result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      address: r.address,
      phone: r.phone,
      schedule: r.schedule,
      food_type: r.food_type,
      owner_id: r.owner_id,
    }));
    callback(null, { restaurants });
  } catch (error) {
    console.error("[Restaurant-Service] searchRestaurants error:", error);
    callback(null, { restaurants: [] });
  }
};

module.exports = {
  createRestaurant,
  getRestaurant,
  updateRestaurant,
  deleteRestaurant,
  listRestaurants,
  createMenuItem,
  getMenuItem,
  updateMenuItem,
  deleteMenuItem,
  listMenuItems,
  createPromotion,
  listPromotions,
  deletePromotion,
  searchRestaurants,
};
