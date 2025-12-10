// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { loginUser, registerUser } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const isAuthenticated = !!token;

  // Load from localStorage on first render
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("token");
      const storedUserJson = localStorage.getItem("user");
      if (storedToken && storedUserJson) {
        setToken(storedToken);
        setUser(JSON.parse(storedUserJson));
      }
    } catch (e) {
      console.error("Error loading auth from localStorage", e);
    } finally {
      setAuthReady(true);
    }
  }, []);

  function persistAuth(tokenValue, userValue) {
    setToken(tokenValue);
    setUser(userValue);
    localStorage.setItem("token", tokenValue);
    localStorage.setItem("user", JSON.stringify(userValue));
  }

  async function login(email, password) {
    const data = await loginUser(email, password);
    persistAuth(data.token, data.user);
  }

  async function register(email, password) {
    const data = await registerUser(email, password);
    persistAuth(data.token, data.user);
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  const value = {
    token,
    user,
    isAuthenticated,
    authReady,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
