/**
 * Restaurant Catalog Service - Unit Tests
 * Tests para CRUD de restaurantes y productos del menú
 */

// Mock de pg
const mockQuery = jest.fn();
jest.mock("../src/db", () => ({
  pool: { query: mockQuery },
}));

const handlers = require("../src/handlers");

describe("Restaurant Catalog Service Handlers", () => {
  let mockCallback;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCallback = jest.fn();
  });

  // ========== CREATE RESTAURANT ==========
  describe("createRestaurant", () => {
    it("debe crear un restaurante exitosamente", async () => {
      const restaurant = {
        id: 1,
        name: "Pollo Campero",
        address: "Zona 1",
        phone: "22334455",
        schedule: "8:00-20:00",
        food_type: "Pollo",
        owner_id: 10,
      };

      mockQuery.mockResolvedValueOnce({ rows: [restaurant] });

      await handlers.createRestaurant(
        {
          request: {
            name: "Pollo Campero",
            address: "Zona 1",
            phone: "22334455",
            schedule: "8:00-20:00",
            food_type: "Pollo",
            owner_id: 10,
          },
        },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: true,
          message: "Restaurante creado exitosamente",
          restaurant: expect.objectContaining({
            id: 1,
            name: "Pollo Campero",
          }),
        }),
      );
    });

    it("debe manejar errores de base de datos", async () => {
      mockQuery.mockRejectedValueOnce(new Error("DB error"));

      await handlers.createRestaurant(
        {
          request: {
            name: "Test",
            address: "Z1",
            phone: "123",
            schedule: "9-5",
            food_type: "Mix",
            owner_id: 1,
          },
        },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: false,
          message: "Error al crear restaurante",
        }),
      );
    });
  });

  // ========== GET RESTAURANT ==========
  describe("getRestaurant", () => {
    it("debe obtener un restaurante existente", async () => {
      const restaurant = {
        id: 1,
        name: "Pollo Campero",
        address: "Zona 1",
        phone: "22334455",
        schedule: "8:00-20:00",
        food_type: "Pollo",
        owner_id: 10,
      };

      mockQuery.mockResolvedValueOnce({ rows: [restaurant] });

      await handlers.getRestaurant({ request: { id: 1 } }, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: true,
          message: "OK",
          restaurant: expect.objectContaining({ id: 1 }),
        }),
      );
    });

    it("debe retornar error si no existe", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await handlers.getRestaurant({ request: { id: 999 } }, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: false,
          message: "Restaurante no encontrado",
        }),
      );
    });

    it("debe manejar errores internos", async () => {
      mockQuery.mockRejectedValueOnce(new Error("DB error"));

      await handlers.getRestaurant({ request: { id: 1 } }, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: false,
          message: "Error interno",
        }),
      );
    });
  });

  // ========== UPDATE RESTAURANT ==========
  describe("updateRestaurant", () => {
    it("debe actualizar un restaurante exitosamente", async () => {
      const restaurant = {
        id: 1,
        name: "Campero Actualizado",
        address: "Zona 10",
        phone: "55667788",
        schedule: "9:00-21:00",
        food_type: "Pollo y más",
        owner_id: 10,
      };

      mockQuery.mockResolvedValueOnce({ rows: [restaurant] });

      await handlers.updateRestaurant(
        {
          request: {
            id: 1,
            name: "Campero Actualizado",
            address: "Zona 10",
            phone: "55667788",
            schedule: "9:00-21:00",
            food_type: "Pollo y más",
          },
        },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: true,
          message: "Restaurante actualizado",
          restaurant: expect.objectContaining({ name: "Campero Actualizado" }),
        }),
      );
    });

    it("debe retornar error si no se encuentra", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await handlers.updateRestaurant(
        {
          request: {
            id: 999,
            name: "X",
            address: "X",
            phone: "X",
            schedule: "X",
            food_type: "X",
          },
        },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: false,
          message: "Restaurante no encontrado",
        }),
      );
    });

    it("debe manejar errores de base de datos", async () => {
      mockQuery.mockRejectedValueOnce(new Error("DB error"));

      await handlers.updateRestaurant(
        {
          request: {
            id: 1,
            name: "X",
            address: "X",
            phone: "X",
            schedule: "X",
            food_type: "X",
          },
        },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: false,
          message: "Error al actualizar",
        }),
      );
    });
  });

  // ========== DELETE RESTAURANT ==========
  describe("deleteRestaurant", () => {
    it("debe eliminar un restaurante", async () => {
      mockQuery.mockResolvedValueOnce(null);

      await handlers.deleteRestaurant({ request: { id: 1 } }, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: true,
          message: "Restaurante eliminado",
        }),
      );
    });

    it("debe manejar errores", async () => {
      mockQuery.mockRejectedValueOnce(new Error("DB error"));

      await handlers.deleteRestaurant({ request: { id: 1 } }, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: false,
          message: "Error al eliminar",
        }),
      );
    });
  });

  // ========== LIST RESTAURANTS ==========
  describe("listRestaurants", () => {
    it("debe listar todos los restaurantes", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: "Pollo Campero",
            address: "Z1",
            phone: "123",
            schedule: "9-5",
            food_type: "Pollo",
            owner_id: 10,
          },
          {
            id: 2,
            name: "McDonalds",
            address: "Z10",
            phone: "456",
            schedule: "24h",
            food_type: "Fast Food",
            owner_id: 20,
          },
        ],
      });

      await handlers.listRestaurants({ request: {} }, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        restaurants: expect.arrayContaining([
          expect.objectContaining({ id: 1, name: "Pollo Campero" }),
          expect.objectContaining({ id: 2, name: "McDonalds" }),
        ]),
      });
    });

    it("debe retornar lista vacía si no hay restaurantes", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await handlers.listRestaurants({ request: {} }, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, { restaurants: [] });
    });
  });

  // ========== CREATE MENU ITEM ==========
  describe("createMenuItem", () => {
    it("debe crear un producto del menú exitosamente", async () => {
      const item = {
        id: 1,
        restaurant_id: 1,
        name: "Pollo Frito",
        description: "Delicioso pollo",
        price: "75.00",
        available: true,
        category: "Platos fuertes",
      };

      mockQuery.mockResolvedValueOnce({ rows: [item] });

      await handlers.createMenuItem(
        {
          request: {
            restaurant_id: 1,
            name: "Pollo Frito",
            description: "Delicioso pollo",
            price: 75.0,
            available: true,
            category: "Platos fuertes",
          },
        },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: true,
          message: "Producto creado exitosamente",
          item: expect.objectContaining({
            name: "Pollo Frito",
            price: 75.0,
          }),
        }),
      );
    });

    it("debe manejar errores al crear producto", async () => {
      mockQuery.mockRejectedValueOnce(new Error("DB error"));

      await handlers.createMenuItem(
        {
          request: {
            restaurant_id: 1,
            name: "Test",
            description: "T",
            price: 10,
            available: true,
            category: "Test",
          },
        },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: false,
          message: "Error al crear producto",
        }),
      );
    });
  });

  // ========== GET MENU ITEM ==========
  describe("getMenuItem", () => {
    it("debe obtener un producto existente", async () => {
      const item = {
        id: 1,
        restaurant_id: 1,
        name: "Pollo Frito",
        description: "Delicioso",
        price: "75.00",
        available: true,
        category: "Platos fuertes",
      };

      mockQuery.mockResolvedValueOnce({ rows: [item] });

      await handlers.getMenuItem({ request: { id: 1 } }, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: true,
          item: expect.objectContaining({ id: 1 }),
        }),
      );
    });

    it("debe retornar error si no existe", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await handlers.getMenuItem({ request: { id: 999 } }, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: false,
          message: "Producto no encontrado",
        }),
      );
    });
  });

  // ========== UPDATE MENU ITEM ==========
  describe("updateMenuItem", () => {
    it("debe actualizar un producto exitosamente", async () => {
      const item = {
        id: 1,
        restaurant_id: 1,
        name: "Pollo Actualizado",
        description: "Nuevo sabor",
        price: "85.00",
        available: true,
        category: "Platos fuertes",
      };

      mockQuery.mockResolvedValueOnce({ rows: [item] });

      await handlers.updateMenuItem(
        {
          request: {
            id: 1,
            name: "Pollo Actualizado",
            description: "Nuevo sabor",
            price: 85.0,
            available: true,
            category: "Platos fuertes",
          },
        },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: true,
          message: "Producto actualizado",
        }),
      );
    });

    it("debe retornar error si no existe", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await handlers.updateMenuItem(
        {
          request: {
            id: 999,
            name: "X",
            description: "X",
            price: 10,
            available: true,
            category: "X",
          },
        },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: false,
          message: "Producto no encontrado",
        }),
      );
    });
  });

  // ========== DELETE MENU ITEM ==========
  describe("deleteMenuItem", () => {
    it("debe eliminar un producto", async () => {
      mockQuery.mockResolvedValueOnce(null);

      await handlers.deleteMenuItem({ request: { id: 1 } }, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: true,
          message: "Producto eliminado",
        }),
      );
    });

    it("debe manejar errores", async () => {
      mockQuery.mockRejectedValueOnce(new Error("DB error"));

      await handlers.deleteMenuItem({ request: { id: 1 } }, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: false,
          message: "Error al eliminar",
        }),
      );
    });
  });

  // ========== LIST MENU ITEMS ==========
  describe("listMenuItems", () => {
    it("debe listar productos del restaurante", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            restaurant_id: 1,
            name: "Pollo Frito",
            description: "D",
            price: "75.00",
            available: true,
            category: "Platos fuertes",
          },
          {
            id: 2,
            restaurant_id: 1,
            name: "Papas",
            description: "C",
            price: "25.00",
            available: true,
            category: "Acompañamientos",
          },
        ],
      });

      await handlers.listMenuItems(
        { request: { restaurant_id: 1 } },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(null, {
        items: expect.arrayContaining([
          expect.objectContaining({ id: 1, name: "Pollo Frito", price: 75.0 }),
          expect.objectContaining({ id: 2, name: "Papas", price: 25.0 }),
        ]),
      });
    });

    it("debe retornar lista vacía si no hay productos", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await handlers.listMenuItems(
        { request: { restaurant_id: 99 } },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(null, { items: [] });
    });
  });
});
