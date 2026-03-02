import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <h1 onClick={() => navigate("/")}>🍔 Delivereats</h1>
      <div className="navbar-links">
        <span className="navbar-user">
          {user?.name} ({user?.role})
        </span>
        {user?.role === "CLIENTE" && (
          <>
            <Link to="/">Restaurantes</Link>
            <Link to="/my-orders">Mis Órdenes</Link>
          </>
        )}
        {user?.role === "RESTAURANTE" && <Link to="/">Mi Panel</Link>}
        {user?.role === "REPARTIDOR" && (
          <>
            <Link to="/">Entregas</Link>
            <Link to="/delivery-evidence">📸 Evidencia</Link>
          </>
        )}
        {user?.role === "ADMINISTRADOR" && (
          <>
            <Link to="/">Admin</Link>
            <Link to="/admin/payments">💰 Pagos</Link>
          </>
        )}
        <button onClick={handleLogout}>Cerrar Sesión</button>
      </div>
    </nav>
  );
};

export default Navbar;
