import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../state/auth.store";

export default function ProviderGuard({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-sm text-slate-600">Checking session…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/provider/auth" replace />;

  // optional: enforce provider/admin only
  if (user?.role !== "provider" && user?.role !== "admin") {
    return <Navigate to="/provider/auth" replace />;
  }

  return children;
}
