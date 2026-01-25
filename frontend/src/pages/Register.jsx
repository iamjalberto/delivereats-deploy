import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const Register = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "CLIENTE",
  });
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await register(
        form.email,
        form.password,
        form.role,
        form.name,
      );
      if (result.success) {
        toast.success("Registro exitoso. Inicia sesión.");
        navigate("/login");
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Error al registrarse");
    }
  };

  return (
    <div className="auth-page">
      <div className="form-container">
        <h2>🍔 Delivereats</h2>
        <p
          style={{ textAlign: "center", marginBottom: "1.5rem", color: "#666" }}
        >
          Crear Cuenta
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre Completo</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="José Pérez"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="tu@email.com"
            />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
            />
          </div>
          <div className="form-group">
            <label>Tipo de Usuario</label>
            <select name="role" value={form.role} onChange={handleChange}>
              <option value="CLIENTE">Cliente</option>
              <option value="RESTAURANTE">Restaurante</option>
              <option value="REPARTIDOR">Repartidor</option>
              <option value="ADMINISTRADOR">Administrador</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary">
            Registrarse
          </button>
        </form>
        <div className="auth-toggle">
          <p>
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
