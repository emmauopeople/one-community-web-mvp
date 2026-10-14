import { useEffect, useMemo, useState } from "react";
import { AuthContext } from "./auth-context";
import { getCurrentAdmin } from "../api/authApi";

export default function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const data = await getCurrentAdmin();
        setIsAuthenticated(true);
        setAdmin(data.admin);
      } catch {
        setIsAuthenticated(false);
        setAdmin(null);
      } finally {
        setAuthLoading(false);
      }
    };

    loadSession();
  }, []);

  const login = (adminData) => {
    setIsAuthenticated(true);
    setAdmin(adminData);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setAdmin(null);
  };

  const value = useMemo(
    () => ({
      isAuthenticated,
      admin,
      authLoading,
      login,
      logout,
    }),
    [isAuthenticated, admin, authLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
