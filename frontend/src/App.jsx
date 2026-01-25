import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ClientDashboard from "./pages/ClientDashboard";
import RestaurantDashboard from "./pages/RestaurantDashboard";
import DeliveryDashboard from "./pages/DeliveryDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import RestaurantMenu from "./pages/RestaurantMenu";
import CreateOrder from "./pages/CreateOrder";
import MyOrders from "./pages/MyOrders";

function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading">Cargando...</div>;

  const getDashboard = () => {
    if (!user) return <Navigate to="/login" />;
    switch (user.role) {
      case "CLIENTE":
        return <ClientDashboard />;
      case "RESTAURANTE":
        return <RestaurantDashboard />;
      case "REPARTIDOR":
        return <DeliveryDashboard />;
      case "ADMINISTRADOR":
        return <AdminDashboard />;
      default:
        return <Navigate to="/login" />;
    }
  };

  return (
    <div className="app-container">
      <Toaster position="top-right" />
      {user && <Navbar />}
      <div className="main-content">
        <Routes>
          <Route
            path="/login"
            element={!user ? <Login /> : <Navigate to="/" />}
          />
          <Route
            path="/register"
            element={!user ? <Register /> : <Navigate to="/" />}
          />
          <Route path="/" element={getDashboard()} />
          <Route
            path="/restaurant/:id/menu"
            element={user ? <RestaurantMenu /> : <Navigate to="/login" />}
          />
          <Route
            path="/order/:restaurantId"
            element={user ? <CreateOrder /> : <Navigate to="/login" />}
          />
          <Route
            path="/my-orders"
            element={user ? <MyOrders /> : <Navigate to="/login" />}
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
