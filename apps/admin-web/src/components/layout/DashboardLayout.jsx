import { useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { logoutAdmin } from "../../api/authApi";

export default function DashboardLayout({ children, title = "Dashboard" }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logoutAdmin();
    } catch {
      // ignore for now
    } finally {
      logout();
      navigate("/");
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-gray-100 flex flex-col md:flex-row">
      <aside className="hidden md:flex md:w-64 md:h-screen md:sticky md:top-0 md:flex-col md:bg-gradient-to-b md:from-blue-700 md:to-green-600 md:shadow-md">
        <div className="px-6 py-5 border-b border-white/20">
          <h1 className="text-lg font-bold text-white">One Community Admin</h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `block rounded-lg px-4 py-2 text-sm font-medium ${
                isActive
                  ? "bg-white/20 text-white"
                  : "text-white hover:bg-white/15"
              }`
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/providers"
            className={({ isActive }) =>
              `block rounded-lg px-4 py-2 text-sm font-medium ${
                isActive
                  ? "bg-white/20 text-white"
                  : "text-white hover:bg-white/15"
              }`
            }
          >
            Providers
          </NavLink>

          <NavLink
            to="/requests"
            className={({ isActive }) =>
              `block rounded-lg px-4 py-2 text-sm font-medium ${
                isActive
                  ? "bg-white/20 text-white"
                  : "text-white hover:bg-white/15"
              }`
            }
          >
            Requests
          </NavLink>

          <NavLink
            to="/skills"
            className={({ isActive }) =>
              `block rounded-lg px-4 py-2 text-sm font-medium ${
                isActive
                  ? "bg-white/20 text-white"
                  : "text-white hover:bg-white/15"
              }`
            }
          >
            Skills
          </NavLink>

          <NavLink
            to="/analytics"
            className={({ isActive }) =>
              `block rounded-lg px-4 py-2 text-sm font-medium ${
                isActive
                  ? "bg-white/20 text-white"
                  : "text-white hover:bg-white/15"
              }`
            }
          >
            Analytics
          </NavLink>

          <NavLink
            to="/system"
            className={({ isActive }) =>
              `block rounded-lg px-4 py-2 text-sm font-medium ${
                isActive
                  ? "bg-white/20 text-white"
                  : "text-white hover:bg-white/15"
              }`
            }
          >
            System
          </NavLink>
        </nav>
      </aside>

      <main className="flex-1 h-screen overflow-hidden flex flex-col pb-28 md:pb-0">
        <header className="sticky top-0 z-20 bg-gray-200 border-b border-black-600 px-4 py-4 md:px-6">
          <div className="flex w-full items-center justify-between">
            <h2 className="text-lg md:text-xl font-semibold text-gray-800">
              {title}
            </h2>

            <button
              onClick={handleLogout}
              className="ml-auto rounded-lg bg-gradient-to-r from-blue-600 to-green-500 px-4 py-2 text-sm font-medium text-white hover:from-blue-700 hover:to-green-600"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-700 to-green-600 border-t border-white/20 md:hidden">
        <div className="grid grid-cols-3 text-center text-xs">
          <NavLink to="/dashboard" className="px-2 py-3 text-white">
            Dashboard
          </NavLink>
          <NavLink to="/providers" className="px-2 py-3 text-white">
            Providers
          </NavLink>
          <NavLink to="/requests" className="px-2 py-3 text-white">
            Requests
          </NavLink>
          <NavLink to="/skills" className="px-2 py-3 text-white">
            Skills
          </NavLink>
          <NavLink to="/analytics" className="px-2 py-3 text-white">
            Analytics
          </NavLink>
          <NavLink to="/system" className="px-2 py-3 text-white">
            System
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
