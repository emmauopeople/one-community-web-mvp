import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  getAdminLoginMonitoring,
  getProviderLoginMonitoring,
} from "../../api/monitoringApi";
import {
  getAdmins,
  createAdmin,
  getAdminById,
  updateAdmin,
} from "../../api/adminManagementApi";
import { useAuth } from "../../hooks/useAuth";
import CreateAdminPanel from "../../components/system/CreateAdminPanel";
import AdminDetailsPanel from "../../components/system/AdminDetailsPanel";

function MonitoringSection({
  title,
  minutes,
  onMinutesChange,
  summary,
  logs,
  loading,
  error,
  successLabel,
  failureLabel,
  isAdmin = false,
}) {
  const total = Number(summary.total_count || 0);
  const successCount = Number(summary.success_count || 0);
  const failedCount = Number(summary.failed_count || 0);

  const successPercent = total ? (successCount / total) * 100 : 0;
  const failedPercent = total ? (failedCount / total) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>

          <select
            value={minutes}
            onChange={(e) => onMinutesChange(Number(e.target.value))}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={15}>Last 15 minutes</option>
            <option value={60}>Last 60 minutes</option>
            <option value={360}>Last 6 hours</option>
            <option value={1440}>Last 24 hours</option>
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading monitoring...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <>
            <div className="mb-5 space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-gray-600">{successLabel}</span>
                  <span className="font-medium text-green-700">
                    {successCount}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${successPercent}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-gray-600">{failureLabel}</span>
                  <span className="font-medium text-red-700">
                    {failedCount}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-red-500"
                    style={{ width: `${failedPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">{successLabel}</p>
                <h4 className="mt-2 text-2xl font-bold text-green-700">
                  {successCount}
                </h4>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">{failureLabel}</p>
                <h4 className="mt-2 text-2xl font-bold text-red-700">
                  {failedCount}
                </h4>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Total Attempts</p>
                <h4 className="mt-2 text-2xl font-bold text-gray-800">
                  {total}
                </h4>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="mb-4 text-lg font-semibold text-gray-800">
          Recent Activity
        </h3>

        {loading ? (
          <p className="text-sm text-gray-500">Loading recent activity...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-500">No recent activity.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="max-h-[320px] overflow-y-auto rounded-xl border">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-blue-700 text-white">
                  <tr className="text-left">
                    <th className="py-3 pl-3 pr-4 font-semibold">Email</th>
                    <th className="py-3 pr-4 font-semibold">Status</th>
                    {isAdmin && (
                      <th className="py-3 pr-4 font-semibold">Reason</th>
                    )}
                    <th className="py-3 pr-4 font-semibold">IP</th>
                    <th className="py-3 pr-4 font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const success = isAdmin
                      ? log.status === "success"
                      : Boolean(log.success);

                    return (
                      <tr
                        key={log.id}
                        className="border-b last:border-b-0 hover:bg-gray-50"
                      >
                        <td className="py-4 pl-3 pr-4 text-gray-800">
                          {isAdmin ? log.email_attempted : log.email}
                        </td>
                        <td className="py-4 pr-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                              success
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {success ? "success" : "failed"}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="py-4 pr-4 text-gray-600">
                            {log.failure_reason || "-"}
                          </td>
                        )}
                        <td className="py-4 pr-4 text-gray-600">
                          {log.ip_address || log.ip || "-"}
                        </td>
                        <td className="py-4 pr-4 text-gray-600">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminsSection({
  admins,
  loading,
  error,
  onOpenCreatePanel,
  onOpenAdminDetails,
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Admins</h3>

        <button
          type="button"
          onClick={onOpenCreatePanel}
          className="rounded-lg bg-gradient-to-r from-blue-600 to-green-500 px-4 py-2 text-sm font-medium text-white hover:from-blue-700 hover:to-green-600"
        >
          Create Admin
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading admins...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : admins.length === 0 ? (
        <p className="text-sm text-gray-500">No admins found.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="max-h-[500px] overflow-y-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-blue-700 text-white">
                <tr className="text-left">
                  <th className="py-3 pl-3 pr-4 font-semibold">Full Name</th>
                  <th className="py-3 pr-4 font-semibold">Email</th>
                  <th className="py-3 pr-4 font-semibold">Role</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 pr-4 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((adminItem) => (
                  <tr
                    key={adminItem.id}
                    onClick={() => onOpenAdminDetails(adminItem.id)}
                    className="border-b last:border-b-0 cursor-pointer hover:bg-gray-50"
                  >
                    <td className="py-4 pl-3 pr-4 font-medium text-gray-800">
                      {adminItem.full_name}
                    </td>
                    <td className="py-4 pr-4 text-gray-600">
                      {adminItem.email}
                    </td>
                    <td className="py-4 pr-4 text-gray-600">
                      {adminItem.role}
                    </td>
                    <td className="py-4 pr-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          adminItem.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {adminItem.is_active ? "active" : "inactive"}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-gray-600">
                      {new Date(adminItem.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SystemPage() {
  const { admin } = useAuth();
  const isRootAdmin = admin?.role === "root_admin";

  const [activeTab, setActiveTab] = useState("monitoring");

  const [adminMinutes, setAdminMinutes] = useState(15);
  const [providerMinutes, setProviderMinutes] = useState(15);

  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  const [adminSummary, setAdminSummary] = useState({
    success_count: 0,
    failed_count: 0,
    total_count: 0,
  });
  const [providerSummary, setProviderSummary] = useState({
    success_count: 0,
    failed_count: 0,
    total_count: 0,
  });

  const [adminLogs, setAdminLogs] = useState([]);
  const [providerLogs, setProviderLogs] = useState([]);

  const [admins, setAdmins] = useState([]);

  const [adminLoading, setAdminLoading] = useState(true);
  const [providerLoading, setProviderLoading] = useState(true);
  const [adminsLoading, setAdminsLoading] = useState(true);

  const [adminError, setAdminError] = useState("");
  const [providerError, setProviderError] = useState("");
  const [adminsError, setAdminsError] = useState("");

  const [isAdminDetailsOpen, setIsAdminDetailsOpen] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState(null);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [adminDetailsLoading, setAdminDetailsLoading] = useState(false);
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);

  const handleOpenCreatePanel = () => {
    setIsCreatePanelOpen(true);
  };

  const handleCloseCreatePanel = () => {
    setIsCreatePanelOpen(false);
  };

  const handleCreateAdmin = async (payload) => {
    setIsCreatingAdmin(true);
    setAdminsError("");

    try {
      const data = await createAdmin(payload);
      setAdmins((prev) => [data.admin, ...prev]);
      setIsCreatePanelOpen(false);
    } catch (err) {
      setAdminsError(err.response?.data?.message || "Failed to create admin");
    } finally {
      setIsCreatingAdmin(false);
    }
  };
  //open admin detaitls
  const handleOpenAdminDetails = async (adminId) => {
    setIsAdminDetailsOpen(true);
    setSelectedAdminId(adminId);
    setSelectedAdmin(null);
    setAdminDetailsLoading(true);
    setAdminsError("");

    try {
      const data = await getAdminById(adminId);
      setSelectedAdmin(data.admin);
    } catch (err) {
      setAdminsError(
        err.response?.data?.message || "Failed to load admin details",
      );
    } finally {
      setAdminDetailsLoading(false);
    }
  };

  //save details
  const handleSaveAdmin = async (formData) => {
    if (!selectedAdminId) return;

    setIsSavingAdmin(true);
    setAdminsError("");

    try {
      const payload = {
        full_name: formData.full_name,
        email: formData.email,
        role: formData.role,
        is_active: formData.is_active,
        changePassword: formData.changePassword,
        newPassword: formData.changePassword ? formData.newPassword : "",
      };

      const data = await updateAdmin(selectedAdminId, payload);

      setSelectedAdmin(data.admin);

      setAdmins((prev) =>
        prev.map((item) =>
          String(item.id) === String(selectedAdminId)
            ? { ...item, ...data.admin }
            : item,
        ),
      );
    } catch (err) {
      setAdminsError(err.response?.data?.message || "Failed to update admin");
    } finally {
      setIsSavingAdmin(false);
    }
  };

  const handleCloseAdminDetails = () => {
    setIsAdminDetailsOpen(false);
    setSelectedAdminId(null);
    setSelectedAdmin(null);
  };

  useEffect(() => {
    const loadAdminMonitoring = async () => {
      setAdminLoading(true);
      setAdminError("");

      try {
        const data = await getAdminLoginMonitoring(adminMinutes);
        setAdminSummary({
          success_count: Number(data.summary?.success_count || 0),
          failed_count: Number(data.summary?.failed_count || 0),
          total_count: Number(data.summary?.total_count || 0),
        });
        setAdminLogs(data.recent_logs || []);
      } catch (err) {
        setAdminError(
          err.response?.data?.message || "Failed to load admin monitoring",
        );
      } finally {
        setAdminLoading(false);
      }
    };

    loadAdminMonitoring();
  }, [adminMinutes]);

  useEffect(() => {
    const loadProviderMonitoring = async () => {
      setProviderLoading(true);
      setProviderError("");

      try {
        const data = await getProviderLoginMonitoring(providerMinutes);
        setProviderSummary({
          success_count: Number(data.summary?.success_count || 0),
          failed_count: Number(data.summary?.failed_count || 0),
          total_count: Number(data.summary?.total_count || 0),
        });
        setProviderLogs(data.recent_logs || []);
      } catch (err) {
        setProviderError(
          err.response?.data?.message || "Failed to load provider monitoring",
        );
      } finally {
        setProviderLoading(false);
      }
    };

    loadProviderMonitoring();
  }, [providerMinutes]);

  useEffect(() => {
    if (!isRootAdmin) return;

    const loadAdmins = async () => {
      setAdminsLoading(true);
      setAdminsError("");

      try {
        const data = await getAdmins();
        setAdmins(data.admins || []);
      } catch (err) {
        setAdminsError(err.response?.data?.message || "Failed to load admins");
      } finally {
        setAdminsLoading(false);
      }
    };

    loadAdmins();
  }, [isRootAdmin]);

  useEffect(() => {
    if (!isRootAdmin && activeTab === "admins") {
      setActiveTab("monitoring");
    }
  }, [isRootAdmin, activeTab]);

  return (
    <DashboardLayout title="System">
      <div className="mb-4">
        <div className="inline-flex rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("monitoring")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              activeTab === "monitoring"
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-600"
            }`}
          >
            Monitoring
          </button>

          {isRootAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab("admins")}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                activeTab === "admins"
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-600"
              }`}
            >
              Admins
            </button>
          )}

          <button
            type="button"
            disabled
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400"
          >
            Audit Logs
          </button>
        </div>
      </div>

      {activeTab === "monitoring" ? (
        <div className="space-y-6">
          <MonitoringSection
            title="Admin Login Overview"
            minutes={adminMinutes}
            onMinutesChange={setAdminMinutes}
            summary={adminSummary}
            logs={adminLogs}
            loading={adminLoading}
            error={adminError}
            successLabel="Successful Admin Logins"
            failureLabel="Failed Admin Logins"
            isAdmin
          />

          <MonitoringSection
            title="Provider Login Overview"
            minutes={providerMinutes}
            onMinutesChange={setProviderMinutes}
            summary={providerSummary}
            logs={providerLogs}
            loading={providerLoading}
            error={providerError}
            successLabel="Successful Provider Logins"
            failureLabel="Failed Provider Logins"
          />
        </div>
      ) : (
        <AdminsSection
          admins={admins}
          loading={adminsLoading}
          error={adminsError}
          onOpenCreatePanel={handleOpenCreatePanel}
          onOpenAdminDetails={handleOpenAdminDetails}
        />
      )}

      <CreateAdminPanel
        isOpen={isCreatePanelOpen}
        onClose={handleCloseCreatePanel}
        onCreate={handleCreateAdmin}
        isCreating={isCreatingAdmin}
      />
      <AdminDetailsPanel
        isOpen={isAdminDetailsOpen}
        onClose={handleCloseAdminDetails}
        admin={adminDetailsLoading ? null : selectedAdmin}
        onSave={handleSaveAdmin}
        isSaving={isSavingAdmin}
      />
    </DashboardLayout>
  );
}
