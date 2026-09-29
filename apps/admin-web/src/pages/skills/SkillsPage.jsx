import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { getSkills, getSkillById, updateSkill } from "../../api/skillApi";
import SkillDetailsPanel from "../../components/skills/SkillDetailsPanel";

export default function SkillsPage() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isSavingSkill, setIsSavingSkill] = useState(false);

  useEffect(() => {
    const loadSkills = async () => {
      try {
        const data = await getSkills();
        setSkills(data.skills || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load skills");
      } finally {
        setLoading(false);
      }
    };

    loadSkills();
  }, []);

  const filteredSkills = skills.filter((skill) => {
    const term = searchTerm.toLowerCase();

    return (
      (skill.title || "").toLowerCase().includes(term) ||
      (skill.category || "").toLowerCase().includes(term) ||
      (skill.city || "").toLowerCase().includes(term) ||
      (skill.provider_name || "").toLowerCase().includes(term)
    );
  });

  const handleRowClick = async (skillId) => {
    setIsPanelOpen(true);
    setSelectedSkillId(skillId);
    setSelectedSkill(null);
    setDetailsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const data = await getSkillById(skillId);
      setSelectedSkill(data.skill);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load skill details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setSelectedSkillId(null);
    setSelectedSkill(null);
  };

  const handleSaveSkill = async (formData) => {
    if (!selectedSkillId) return;

    setIsSavingSkill(true);
    setError("");
    setSuccessMessage("");

    try {
      const data = await updateSkill(selectedSkillId, formData);

      setSelectedSkill((prev) => ({
        ...prev,
        ...data.skill,
        provider_name: prev?.provider_name,
        provider_email: prev?.provider_email,
      }));

      setSkills((prev) =>
        prev.map((item) =>
          String(item.id) === String(selectedSkillId)
            ? {
                ...item,
                title: data.skill.title,
                category: data.skill.category,
                city: data.skill.city,
                status: data.skill.status,
              }
            : item,
        ),
      );

      setSuccessMessage("Skill updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update skill");
    } finally {
      setIsSavingSkill(false);
    }
  };

  return (
    <DashboardLayout title="Skills">
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
          <p className="text-sm text-gray-500">Loading skills...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="mb-4 rounded-xl bg-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-800">
              Total Skills: {filteredSkills.length}
            </p>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by title, category, city, or provider"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {filteredSkills.length === 0 ? (
            <p className="text-sm text-gray-500">No skills found.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="max-h-[420px] overflow-y-auto rounded-xl border">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-blue-700 text-white">
                    <tr className="text-left">
                      <th className="py-3 pr-4 pl-3 font-semibold">Title</th>
                      <th className="py-3 pr-4 font-semibold">Category</th>
                      <th className="py-3 pr-4 font-semibold">Provider</th>
                      <th className="py-3 pr-4 font-semibold">City</th>
                      <th className="py-3 pr-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSkills.map((skill) => {
                      const isActive = skill.status === "active";

                      return (
                        <tr
                          key={skill.id}
                          onClick={() => handleRowClick(skill.id)}
                          className="border-b last:border-b-0 cursor-pointer hover:bg-gray-50"
                        >
                          <td className="py-4 pr-4 pl-3 font-medium text-gray-800">
                            {skill.title}
                          </td>
                          <td className="py-4 pr-4 text-gray-600">
                            {skill.category || "No category"}
                          </td>
                          <td className="py-4 pr-4 text-gray-600">
                            {skill.provider_name || "Unknown provider"}
                          </td>
                          <td className="py-4 pr-4 text-gray-600">
                            {skill.city || "No city"}
                          </td>
                          <td className="py-4 pr-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                                isActive
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {skill.status}
                            </span>
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

      <SkillDetailsPanel
        key={selectedSkill?.id}
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        skill={detailsLoading ? null : selectedSkill}
        onSave={handleSaveSkill}
        isSaving={isSavingSkill}
      />
    </DashboardLayout>
  );
}
