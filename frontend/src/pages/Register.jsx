import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import {
  validateEmail,
  validatePassword,
  validateName,
  runValidations,
} from "../utils/validators";
import FieldError from "../components/FieldError";

const Register = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "CLIENTE",
  });
  const [errors, setErrors] = useState({});
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: null });
  };

  const validate = () => {
    const result = runValidations({
      name: validateName(form.name),
      email: validateEmail(form.email),
      password: validatePassword(form.password),
      confirmPassword:
        form.password !== form.confirmPassword
          ? "Las contraseñas no coinciden"
          : null,
    });
    setErrors(result.errors);
    return result.valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
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
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label>Nombre Completo</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="José Pérez"
              className={errors.name ? "input-error" : ""}
            />
            <FieldError error={errors.name} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              className={errors.email ? "input-error" : ""}
            />
            <FieldError error={errors.email} />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Mín. 6 caracteres, 1 mayúscula, 1 número"
              className={errors.password ? "input-error" : ""}
            />
            <FieldError error={errors.password} />
          </div>
          <div className="form-group">
            <label>Confirmar Contraseña</label>
            <input
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Repite tu contraseña"
              className={errors.confirmPassword ? "input-error" : ""}
            />
            <FieldError error={errors.confirmPassword} />
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
