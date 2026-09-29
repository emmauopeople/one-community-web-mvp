import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../app/state/auth.store";
import { authApi } from "../../app/api/auth.api";
import appLogo from "../../assets/images/appLogo.png";

export default function ProviderPortal() {
  const { user, setUser } = useAuth();

  const onLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.warn("Request failed:", error);
    }
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="w-full sticky top-0 z-10 bg-gray-100 border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-10 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-900 font-semibold"
          >
            <img
              src={appLogo}
              alt="One Community logo"
              className="h-8 w-8 object-contain"
            />
            <span className="text-base sm:text-lg">One Community</span>
          </Link>

          <button
            onClick={onLogout}
            className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold hover:bg-slate-50 active:scale-[0.99] transition text-sm"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-10 py-6">
        <div className="mx-auto w-full max-w-5xl">
          <h1 className="text-xl font-semibold">Provider Portal</h1>

          <p className="mt-1 text-sm text-slate-600">
            Logged in as <span className="font-semibold">{user?.email}</span> (
            {user?.role})
          </p>

          <div className="mt-5 bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="text-sm font-semibold">Provider Actions</div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to="/provider/requests"
                className="h-11 px-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-semibold shadow-sm hover:opacity-95 active:scale-[0.99] transition text-sm"
              >
                My Requests
              </Link>

              <Link
                to="/provider/skills"
                className="h-11 px-4 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold hover:bg-slate-50 active:scale-[0.99] transition text-sm"
              >
                My Skills is
              </Link>

              <Link
                to="/provider/profile"
                className="h-11 px-4 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold hover:bg-slate-50 active:scale-[0.99] transition text-sm"
              >
                My Profile
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-slate-200">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-4 text-xs text-slate-500">
          © {new Date().getFullYear()} One Community — Provider Portal is
          running
        </div>
      </footer>
    </div>
  );
}
