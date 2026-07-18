import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./store/auth";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Find from "./pages/Find";
import Offer from "./pages/Offer";
import Trips from "./pages/Trips";
import TripDetail from "./pages/TripDetail";
import Wallet from "./pages/Wallet";
import Vehicles from "./pages/Vehicles";
import Reports from "./pages/Reports";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminEmployees from "./pages/admin/AdminEmployees";
import AdminVehicles from "./pages/admin/AdminVehicles";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = useAuth((s) => s.accessToken);
  return token ? children : <Navigate to="/login" replace />;
}

function RoleHome() {
  const role = useAuth((s) => s.user?.role);
  return role === "COMPANY_ADMIN" ? <Navigate to="/app/admin" replace /> : <Dashboard />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<RoleHome />} />
        <Route path="find" element={<Find />} />
        <Route path="offer" element={<Offer />} />
        <Route path="trips" element={<Trips />} />
        <Route path="trips/:id" element={<TripDetail />} />
        <Route path="wallet" element={<Wallet />} />
        <Route path="vehicles" element={<Vehicles />} />
        <Route path="reports" element={<Reports />} />
        {/* Admin */}
        <Route path="admin" element={<AdminOverview />} />
        <Route path="admin/employees" element={<AdminEmployees />} />
        <Route path="admin/vehicles" element={<AdminVehicles />} />
        <Route path="admin/reports" element={<AdminReports />} />
        <Route path="admin/settings" element={<AdminSettings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
