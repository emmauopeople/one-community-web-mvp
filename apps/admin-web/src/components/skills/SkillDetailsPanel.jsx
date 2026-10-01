import { t, te, useLocale } from "../../i18n/index.js";
import { useState } from "react";
export default function SkillDetailsPanel({
  isOpen,
  onClose,
  skill,
  onSave,
  isSaving = false,
}) {
  useLocale();
  const initialForm = {
    title: skill?.title || "",
    category: skill?.category || "",
    tags: skill?.tags || "",
    description: skill?.description || "",
    city: skill?.city || "",
    status: skill?.status || "active",
  };
  const [formData, setFormData] = useState(initialForm);
  if (!isOpen) return null;
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave?.(formData);
  };
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {t("Skill Details")}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            {t("Close")}
          </button>
        </div>

        <div className="p-6">
          {!skill ? (
            <p className="text-sm text-gray-500">
              {t("Loading skill details...")}
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">
                  {t("Title")}
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">
                  {t("Category")}
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">
                  {t("Tags")}
                </label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">
                  {t("Description")}
                </label>
                <textarea
                  rows="5"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">
                  {t("City")}
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">
                  {t("Status")}
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="active">{t("Active")}</option>
                  <option value="inactive">{t("Inactive")}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">
                  {t("Provider")}
                </label>
                <input
                  type="text"
                  value={skill.provider_name || t("Unknown provider")}
                  disabled
                  className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-2 text-gray-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-gradient-to-r from-blue-600 to-green-500 px-4 py-2 text-sm font-medium text-white hover:from-blue-700 hover:to-green-600 disabled:opacity-70"
              >
                {isSaving ? t("Saving...") : t("Save Updates")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
