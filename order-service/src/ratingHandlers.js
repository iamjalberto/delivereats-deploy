/**
 * Rating Handlers - Sistema de calificaciones
 * Permite calificar: Restaurante (1-5 estrellas), Repartidor (1-5 estrellas), Producto (recomendado/no)
 */
const { pool } = require("./db");

const mapRating = (r) => ({
  id: r.id,
  order_id: r.order_id,
  user_id: r.user_id,
  user_name: r.user_name || "",
  entity_type: r.entity_type,
  entity_id: r.entity_id,
  entity_name: r.entity_name || "",
  stars: r.stars || 0,
  comment: r.comment || "",
  recommended: r.recommended || false,
  created_at: r.created_at ? r.created_at.toISOString() : "",
});

const createRating = async (call, callback) => {
  try {
    const {
      order_id,
      user_id,
      user_name,
      entity_type,
      entity_id,
      entity_name,
      stars,
      comment,
      recommended,
    } = call.request;

    // Validar entity_type
    if (!["RESTAURANTE", "REPARTIDOR", "PRODUCTO"].includes(entity_type)) {
      return callback(null, {
        success: false,
        message: "entity_type debe ser RESTAURANTE, REPARTIDOR o PRODUCTO",
      });
    }

    // Validar estrellas para restaurante/repartidor
    if (
      (entity_type === "RESTAURANTE" || entity_type === "REPARTIDOR") &&
      (stars < 1 || stars > 5)
    ) {
      return callback(null, {
        success: false,
        message: "Las estrellas deben estar entre 1 y 5",
      });
    }

    const result = await pool.query(
      `INSERT INTO ratings (order_id, user_id, user_name, entity_type, entity_id, entity_name, stars, comment, recommended)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        order_id,
        user_id,
        user_name,
        entity_type,
        entity_id,
        entity_name,
        entity_type === "PRODUCTO" ? 0 : stars,
        comment || "",
        entity_type === "PRODUCTO" ? recommended : false,
      ],
    );

    console.log(
      `⭐ [Order-Service] Rating creado: ${entity_type} #${entity_id} = ${entity_type === "PRODUCTO" ? (recommended ? "Recomendado" : "No recomendado") : stars + " estrellas"}`,
    );

    callback(null, {
      success: true,
      message: "Calificación registrada exitosamente",
      rating: mapRating(result.rows[0]),
    });
  } catch (error) {
    if (
      error.message.includes("unique") ||
      error.message.includes("duplicate")
    ) {
      return callback(null, {
        success: false,
        message: "Ya calificaste esta entidad para esta orden",
      });
    }
    console.error("[Order-Service] createRating error:", error);
    callback(null, {
      success: false,
      message: "Error al crear calificación",
    });
  }
};

const getRatingsByRestaurant = async (call, callback) => {
  try {
    const { entity_id } = call.request;
    const result = await pool.query(
      "SELECT * FROM ratings WHERE entity_type = 'RESTAURANTE' AND entity_id = $1 ORDER BY created_at DESC",
      [entity_id],
    );
    const ratings = result.rows.map(mapRating);
    const avgResult = await pool.query(
      "SELECT AVG(stars)::FLOAT as avg_stars, COUNT(*) as total FROM ratings WHERE entity_type = 'RESTAURANTE' AND entity_id = $1",
      [entity_id],
    );
    callback(null, {
      success: true,
      ratings,
      average_stars: avgResult.rows[0].avg_stars || 0,
      total_ratings: parseInt(avgResult.rows[0].total),
    });
  } catch (error) {
    callback(null, {
      success: false,
      ratings: [],
      average_stars: 0,
      total_ratings: 0,
    });
  }
};

const getRatingsByDelivery = async (call, callback) => {
  try {
    const { entity_id } = call.request;
    const result = await pool.query(
      "SELECT * FROM ratings WHERE entity_type = 'REPARTIDOR' AND entity_id = $1 ORDER BY created_at DESC",
      [entity_id],
    );
    const ratings = result.rows.map(mapRating);
    const avgResult = await pool.query(
      "SELECT AVG(stars)::FLOAT as avg_stars, COUNT(*) as total FROM ratings WHERE entity_type = 'REPARTIDOR' AND entity_id = $1",
      [entity_id],
    );
    callback(null, {
      success: true,
      ratings,
      average_stars: avgResult.rows[0].avg_stars || 0,
      total_ratings: parseInt(avgResult.rows[0].total),
    });
  } catch (error) {
    callback(null, {
      success: false,
      ratings: [],
      average_stars: 0,
      total_ratings: 0,
    });
  }
};

const getRatingsByProduct = async (call, callback) => {
  try {
    const { entity_id } = call.request;
    const result = await pool.query(
      "SELECT * FROM ratings WHERE entity_type = 'PRODUCTO' AND entity_id = $1 ORDER BY created_at DESC",
      [entity_id],
    );
    const ratings = result.rows.map(mapRating);
    const recResult = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE recommended = true) as rec_count,
        COUNT(*) FILTER (WHERE recommended = false) as not_rec_count,
        COUNT(*) as total
       FROM ratings WHERE entity_type = 'PRODUCTO' AND entity_id = $1`,
      [entity_id],
    );
    callback(null, {
      success: true,
      ratings,
      average_stars: 0,
      total_ratings: parseInt(recResult.rows[0].total),
    });
  } catch (error) {
    callback(null, {
      success: false,
      ratings: [],
      average_stars: 0,
      total_ratings: 0,
    });
  }
};

const getAverageRating = async (call, callback) => {
  try {
    const { entity_id } = call.request;
    // Obtener promedio de estrellas para restaurante/repartidor
    const avgResult = await pool.query(
      `SELECT AVG(stars)::FLOAT as avg_stars, COUNT(*) as total 
       FROM ratings WHERE entity_id = $1 AND entity_type IN ('RESTAURANTE', 'REPARTIDOR')`,
      [entity_id],
    );
    // Obtener conteo de recomendaciones para productos
    const recResult = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE recommended = true) as rec_count,
        COUNT(*) FILTER (WHERE recommended = false) as not_rec_count
       FROM ratings WHERE entity_id = $1 AND entity_type = 'PRODUCTO'`,
      [entity_id],
    );
    callback(null, {
      success: true,
      average_stars: avgResult.rows[0].avg_stars || 0,
      total_ratings: parseInt(avgResult.rows[0].total),
      recommended_count: parseInt(recResult.rows[0].rec_count || 0),
      not_recommended_count: parseInt(recResult.rows[0].not_rec_count || 0),
    });
  } catch (error) {
    callback(null, {
      success: false,
      average_stars: 0,
      total_ratings: 0,
      recommended_count: 0,
      not_recommended_count: 0,
    });
  }
};

module.exports = {
  createRating,
  getRatingsByRestaurant,
  getRatingsByDelivery,
  getRatingsByProduct,
  getAverageRating,
};
