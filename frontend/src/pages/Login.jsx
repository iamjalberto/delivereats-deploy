import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { validateEmail, runValidations } from "../utils/validators";
import FieldError from "../components/FieldError";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const { login } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const result = runValidations({
      email: validateEmail(email),
      password: !password ? "La contraseña es obligatoria" : null,
    });
    setErrors(result.errors);
    return result.valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      const result = await login(email, password);
      if (result.success) {
        toast.success("¡Bienvenido!");
        navigate("/");
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        "Error al iniciar sesión. Verifica tu conexión.";
      toast.error(msg);
    }
  };

  return (
    <div className="auth-page">
      <div className="form-container">
        <h2>🍔 Calificacion</h2>
        <p
          style={{ textAlign: "center", marginBottom: "1.5rem", color: "#666" }}
        >
          Iniciar Sesión
        </p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((prev) => ({ ...prev, email: null }));
              }}
              placeholder="tu@email.com"
              className={errors.email ? "input-error" : ""}
            />
            <FieldError error={errors.email} />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((prev) => ({ ...prev, password: null }));
              }}
              placeholder="••••••••"
              className={errors.password ? "input-error" : ""}
            />
            <FieldError error={errors.password} />
          </div>
          <button type="submit" className="btn btn-primary">
            Iniciar Sesión
          </button>
        </form>
        <div className="auth-toggle">
          <p>
            ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
