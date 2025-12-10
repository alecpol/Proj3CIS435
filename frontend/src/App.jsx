// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import EditorPage from "./pages/EditorPage";
import DeckModePage from "./pages/DeckModePage";
import FriendProfilePage from "./pages/FriendProfilePage";
import { useAuth } from "./context/AuthContext";

function App() {
  const { isAuthenticated, authReady } = useAuth();

  if (!authReady) {
    // Prevent redirect flicker before we know auth state
    return <div style={{ padding: "1rem" }}>Loading...</div>;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        }
      />
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <RegisterPage />
          )
        }
      />
      <Route
        path="/dashboard"
        element={
          isAuthenticated ? <DashboardPage /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/editor/:packId"
        element={
          isAuthenticated ? <EditorPage /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/deck/:packId"
        element={
          isAuthenticated ? <DeckModePage /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/users/:userId"
        element={
          isAuthenticated ? (
            <FriendProfilePage />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
