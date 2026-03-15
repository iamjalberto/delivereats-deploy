/**
 * Auth Service - Unit Tests
 * Tests para registro, login, validación de token y listado de usuarios
 */

// Mock de pg
const mockQuery = jest.fn();
const mockConnect = jest.fn();
const mockRelease = jest.fn();
jest.mock("pg", () => ({
  Pool: jest.fn(() => ({
    query: mockQuery,
    connect: mockConnect,
  })),
}));

// Mock de bcryptjs
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("$2a$10$hashedpassword"),
  compare: jest.fn(),
}));

// Mock de jsonwebtoken
jest.mock("jsonwebtoken", () => ({
  sign: jest.fn().mockReturnValue("mock.jwt.token"),
  verify: jest.fn(),
}));

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  register,
  login,
  validateToken,
  listUsers,
} = require("../src/handlers");

describe("Auth Service Handlers", () => {
  let mockCallback;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCallback = jest.fn();
  });

  // ========== REGISTER ==========
  describe("register", () => {
    it("debe registrar un usuario nuevo exitosamente", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // email no existe
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // insert

      await register(
        {
          request: {
            email: "test@test.com",
            password: "123456",
            role: "CLIENTE",
            name: "Test",
          },
        },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: true,
          message: "Usuario registrado exitosamente",
          user_id: 1,
        }),
      );
    });

    it("debe rechazar email duplicado", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // email ya existe

      await register(
        {
          request: {
            email: "existing@test.com",
            password: "123456",
            role: "CLIENTE",
            name: "Existing",
          },
        },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: false,
          message: "El email ya está registrado",
        }),
      );
    });

    it("debe encriptar la contraseña antes de guardar", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await register(
        {
          request: {
            email: "new@test.com",
            password: "mypassword",
            role: "CLIENTE",
            name: "New",
          },
        },
        mockCallback,
      );

      expect(bcrypt.hash).toHaveBeenCalledWith("mypassword", 10);
    });

    it("debe manejar errores de base de datos", async () => {
      mockQuery.mockRejectedValueOnce(new Error("DB error"));

      await register(
        {
          request: {
            email: "test@test.com",
            password: "123",
            role: "CLIENTE",
            name: "Test",
          },
        },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: false,
        }),
      );
    });
  });

  // ========== LOGIN ==========
  describe("login", () => {
    it("debe hacer login exitoso con credenciales válidas", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            email: "test@test.com",
            password: "$2a$10$hash",
            role: "CLIENTE",
            name: "Test",
          },
        ],
      });
      bcrypt.compare.mockResolvedValueOnce(true);

      await login(
        { request: { email: "test@test.com", password: "123456" } },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: true,
          token: "mock.jwt.token",
          message: "Login exitoso",
        }),
      );
    });

    it("debe rechazar email no encontrado", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await login(
        { request: { email: "nope@test.com", password: "123456" } },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: false,
          message: "Credenciales inválidas",
        }),
      );
    });

    it("debe rechazar contraseña incorrecta", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            email: "test@test.com",
            password: "$2a$10$hash",
            role: "CLIENTE",
            name: "Test",
          },
        ],
      });
      bcrypt.compare.mockResolvedValueOnce(false);

      await login(
        { request: { email: "test@test.com", password: "wrong" } },
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          success: false,
          message: "Credenciales inválidas",
        }),
      );
    });

    it("debe generar JWT con datos del usuario", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 5,
            email: "user@test.com",
            password: "$2a$10$hash",
            role: "RESTAURANTE",
            name: "Restaurant",
          },
        ],
      });
      bcrypt.compare.mockResolvedValueOnce(true);

      await login(
        { request: { email: "user@test.com", password: "123456" } },
        mockCallback,
      );

      expect(jwt.sign).toHaveBeenCalledWith(
        {
          id: 5,
          email: "user@test.com",
          role: "RESTAURANTE",
          name: "Restaurant",
        },
        expect.any(String),
        { expiresIn: "24h" },
      );
    });
  });

  // ========== VALIDATE TOKEN ==========
  describe("validateToken", () => {
    it("debe validar un token válido", async () => {
      jwt.verify.mockReturnValueOnce({
        id: 1,
        email: "test@test.com",
        role: "CLIENTE",
        name: "Test",
      });

      await validateToken({ request: { token: "valid.token" } }, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          valid: true,
          user_id: 1,
          role: "CLIENTE",
        }),
      );
    });

    it("debe rechazar un token inválido", async () => {
      jwt.verify.mockImplementationOnce(() => {
        throw new Error("invalid");
      });

      await validateToken({ request: { token: "bad.token" } }, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          valid: false,
        }),
      );
    });
  });

  // ========== LIST USERS ==========
  describe("listUsers", () => {
    it("debe listar todos los usuarios", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            email: "a@test.com",
            name: "A",
            role: "CLIENTE",
            created_at: new Date("2026-01-01"),
          },
          {
            id: 2,
            email: "b@test.com",
            name: "B",
            role: "RESTAURANTE",
            created_at: new Date("2026-01-02"),
          },
        ],
      });

      await listUsers({ request: {} }, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        users: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            email: "a@test.com",
            role: "CLIENTE",
          }),
          expect.objectContaining({
            id: 2,
            email: "b@test.com",
            role: "RESTAURANTE",
          }),
        ]),
      });
    });

    it("debe devolver lista vacía si no hay usuarios", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await listUsers({ request: {} }, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, { users: [] });
    });
  });
});
