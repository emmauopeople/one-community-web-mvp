import { t, te, useLocale } from "../i18n/index.js";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
export default function ProtectedRoute({ children }) {
  useLocale();
  const { isAuthenticated, authLoading } = useAuth();
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-sm text-gray-600">{t("Loading...")}</p>
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
}
