import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  getProviders,
  updateProviderStatus,
  getProviderById,
  updateProvider,
} from "../../api/providerApi";
import ProviderDetailsPanel from "../../components/providers/ProviderDetailsPanel";

export default function ProvidersPage() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isSavingProvider, setIsSavingProvider] = useState(false);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const data = await getProviders();
        setProviders(data.providers || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load providers");
      } finally {
        setLoading(false);
      }
    };

    loadProviders();
  }, []);

  const filteredProviders = providers.filter((provider) => {
    const term = searchTerm.toLowerCase();

    return (
      (provider.display_name || "").toLowerCase().includes(term) ||
      (provider.email || "").toLowerCase().includes(term) ||
      (provider.phone || "").toLowerCase().includes(term)
    );
  });

  const handleStatusToggle = async (provider, e) => {
    e.stopPropagation();

    const nextStatus = provider.status === "active" ? "inactive" : "active";
    setActionLoadingId(provider.id);
    setError("");
    setSuccessMessage("");

    try {
      await updateProviderStatus(provider.id, nextStatus);

      setProviders((prev) =>
        prev.map((item) =>
          item.id === provider.id ? { ...item, status: nextStatus } : item,
        ),
      );

      if (String(selectedProviderId) === String(provider.id)) {
        setSelectedProvider((prev) =>
          prev ? { ...prev, status: nextStatus } : prev,
        );
      }

      setSuccessMessage("Provider status updated successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to update provider status",
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRowClick = async (providerId) => {
    setIsPanelOpen(true);
    setSelectedProviderId(providerId);
    setSelectedProvider(null);
    setDetailsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const data = await getProviderById(providerId);
      setSelectedProvider(data.provider);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load provider details",
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setSelectedProviderId(null);
    setSelectedProvider(null);
  };

  const handleSaveProvider = async (formData) => {
    if (!selectedProviderId) return;

    setIsSavingProvider(true);
    setError("");
    setSuccessMessage("");

    try {
      const payload = {
        display_name: formData.display_name,
        phone: formData.phone,
        city: formData.city,
        status: formData.status,
        changePassword: formData.changePassword,
        newPassword: formData.changePassword ? formData.newPassword : "",
      };

      const data = await updateProvider(selectedProviderId, payload);

      setSelectedProvider((prev) => ({
        ...prev,
        ...data.provider,
        skills_count: prev?.skills_count ?? 0,
      }));

      setProviders((prev) =>
        prev.map((item) =>
          String(item.id) === String(selectedProviderId)
            ? {
                ...item,
                display_name: data.provider.display_name,
                phone: data.provider.phone,
                city: data.provider.city,
                status: data.provider.status,
              }
            : item,
        ),
      );

      setSuccessMessage("Provider updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update provider");
    } finally {
      setIsSavingProvider(false);
    }
  };

  return (
    <DashboardLayout title="Providers">
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-sm text-gray-500">Loading providers...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="mb-4 rounded-xl bg-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-800">
              Total Providers: {filteredProviders.length}
            </p>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name, email, or phone"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {filteredProviders.length === 0 ? (
            <p className="text-sm text-gray-500">No providers found.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="max-h-[420px] overflow-y-auto rounded-xl border">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-blue-700 text-white">
                    <tr className="text-left">
                      <th className="py-3 pr-4 pl-3 font-semibold">
                        Display Name
                      </th>
                      <th className="py-3 pr-4 font-semibold">Email</th>
                      <th className="py-3 pr-4 font-semibold">Phone Number</th>
                      <th className="py-3 pr-4 font-semibold">City</th>
                      <th className="py-3 pr-4 font-semibold">Status</th>
                      <th className="py-3 pr-4 font-semibold">Listed Skills</th>
                      <th className="py-3 pr-4 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProviders.map((provider) => {
                      const isActive = provider.status === "active";
                      const isUpdating = actionLoadingId === provider.id;

                      return (
                        <tr
                          key={provider.id}
                          onClick={() => handleRowClick(provider.id)}
                          className="border-b last:border-b-0 cursor-pointer hover:bg-gray-50"
                        >
                          <td className="py-4 pr-4 pl-3 font-medium text-gray-800">
                            {provider.display_name || "No name"}
                          </td>
                          <td className="py-4 pr-4 text-gray-600">
                            {provider.email}
                          </td>
                          <td className="py-4 pr-4 text-gray-600">
                            {provider.phone || "No phone"}
                          </td>
                          <td className="py-4 pr-4 text-gray-600">
                            {provider.city || "No city"}
                          </td>
                          <td className="py-4 pr-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                                isActive
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {provider.status}
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-gray-600">
                            {provider.skills_count}
                          </td>
                          <td className="py-4 pr-4">
                            <button
                              type="button"
                              onClick={(e) => handleStatusToggle(provider, e)}
                              disabled={isUpdating}
                              className={`rounded-lg px-4 py-2 text-xs font-medium text-white disabled:opacity-70 ${
                                isActive
                                  ? "bg-red-600 hover:bg-red-700"
                                  : "bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600"
                              }`}
                            >
                              {isUpdating
                                ? "Updating..."
                                : isActive
                                  ? "Deactivate"
                                  : "Activate"}
                            </button>
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
      )}

      <ProviderDetailsPanel
        key={selectedProvider?.id}
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        provider={detailsLoading ? null : selectedProvider}
        onSave={handleSaveProvider}
        isSaving={isSavingProvider}
      />
    </DashboardLayout>
  );
}
