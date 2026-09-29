import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboardSummary } from "../../api/dashboardApi";
import DashboardLayout from "../../components/layout/DashboardLayout";

function DashboardCard({ label, value, icon, to, colorClass, description }) {
  return (
    <Link
      to={to}
      className={`block rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${colorClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <h3 className="mt-2 text-3xl font-bold text-gray-900">{value}</h3>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-2xl shadow-sm">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-600">{description}</p>
    </Link>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalProviders: 0,
    activeProviders: 0,
    totalSkills: 0,
    openRequests: 0,
  });

  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const data = await getDashboardSummary();
        setStats(data.stats || {});
        setAdmin(data.admin || null);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, []);

  return (
    <DashboardLayout title="Dashboard">
      {loading ? (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : (
        <div className="space-y-5">
          <section className="rounded-2xl bg-gradient-to-r from-blue-700 to-green-600 p-6 text-white shadow-sm">
            <p className="text-sm font-medium text-white/80">Welcome back</p>

            <h1 className="mt-2 text-2xl font-bold">
              One Community Admin Dashboard
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/90">
              Use this dashboard to manage providers, review skills, respond to
              public and provider requests, monitor platform activity, and track
              user engagement across One Community.
            </p>

            {admin?.email ? (
              <p className="mt-4 text-xs text-white/80">
                Signed in as{" "}
                <span className="font-semibold">{admin.email}</span>
              </p>
            ) : null}
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DashboardCard
              label="Total Providers"
              value={stats.totalProviders}
              icon="👥"
              to="/providers"
              colorClass="border-blue-100 bg-blue-50"
              description="View all registered provider accounts."
            />

            <DashboardCard
              label="Active Providers"
              value={stats.activeProviders}
              icon="✅"
              to="/providers"
              colorClass="border-green-100 bg-green-50"
              description="Review active providers available on the platform."
            />

            <DashboardCard
              label="Total Skills"
              value={stats.totalSkills}
              icon="🛠️"
              to="/skills"
              colorClass="border-purple-100 bg-purple-50"
              description="Manage listed skills and service visibility."
            />

            <DashboardCard
              label="Open Requests"
              value={stats.openRequests}
              icon="📩"
              to="/requests"
              colorClass="border-amber-100 bg-amber-50"
              description="Respond to public messages and provider requests."
            />
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="rounded-2xl bg-white p-5 shadow-sm xl:col-span-2">
              <h2 className="text-lg font-semibold text-gray-800">
                How to use this dashboard
              </h2>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <h3 className="text-sm font-semibold text-gray-800">
                    1. Manage providers
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Use the Providers section to review registered providers,
                    check their status, and activate or deactivate accounts when
                    needed.
                  </p>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <h3 className="text-sm font-semibold text-gray-800">
                    2. Review skills
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Use the Skills section to inspect provider services, review
                    descriptions, and manage skill visibility.
                  </p>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <h3 className="text-sm font-semibold text-gray-800">
                    3. Respond to requests
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Use the Requests section to handle public messages and
                    provider support requests. Public users receive replies by
                    email, while providers can track notes in their portal.
                  </p>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <h3 className="text-sm font-semibold text-gray-800">
                    4. Monitor activity
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Use Analytics and System pages to monitor searches, skill
                    views, contact clicks, login attempts, and system health.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800">
                Quick actions
              </h2>

              <div className="mt-4 space-y-3">
                <Link
                  to="/requests"
                  className="block rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                >
                  Review open requests
                </Link>

                <Link
                  to="/providers"
                  className="block rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 hover:bg-blue-100"
                >
                  Manage providers
                </Link>

                <Link
                  to="/skills"
                  className="block rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-800 hover:bg-purple-100"
                >
                  Review skills
                </Link>

                <Link
                  to="/analytics"
                  className="block rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800 hover:bg-green-100"
                >
                  View analytics
                </Link>

                <Link
                  to="/system"
                  className="block rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-100"
                >
                  System monitoring
                </Link>
              </div>
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
