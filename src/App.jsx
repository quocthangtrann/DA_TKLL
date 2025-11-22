// src/App.jsx
import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import SmartWateringDashboard from "./pages/SmartWateringDashboard.jsx";
import Login from "./pages/Login.jsx";
import HistoryPage from "./pages/History.jsx";
import NavTabs from "./components/NavTabs.jsx";
import ConfirmStopPage from "./pages/Confirmstop.jsx";

const LS_AUTH = "smart-watering-auth";

// Route bảo vệ
function ProtectedRoute({ children }) {
  const auth = !!localStorage.getItem(LS_AUTH);
  return auth ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const navigate = useNavigate();

  // Lấy user từ localStorage 
  const [user, setUser] = useState(() => {
    const v = localStorage.getItem(LS_AUTH);
    return v ? JSON.parse(v) : null;
  });

  // Khi chưa login → chuyển về trang login
  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  // Hàm login
  function login(userObj) {
    localStorage.setItem(LS_AUTH, JSON.stringify(userObj));
    setUser(userObj);
    navigate("/");
  }

  // Hàm logout
  function logout() {
    localStorage.removeItem(LS_AUTH);
    setUser(null);
    navigate("/login");
  }

  return (
    <div>
      {/* Hiện thanh menu sau khi đăng nhập */}
      {user && <NavTabs onLogout={logout} username={user.username} />}

      <Routes>
        {/* Trang Login */}
        <Route path="/login" element={<Login onLogin={login} />} />

        {/* Trang Home (Dashboard) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <SmartWateringDashboard />
            </ProtectedRoute>
          }
        />

        {/* Trang History */}
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          }
        />

        {/* Trang confirm stop */}
        <Route
          path="/confirm-stop"
          element={
            <ProtectedRoute>
              <ConfirmStopPage />
            </ProtectedRoute>
          }
        />

        {/* Nếu route không tồn tại → về Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
