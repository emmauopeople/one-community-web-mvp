import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import appLogo from "../../../assets/images/appLogo.png";

import { skillsApi } from "../../api/skills.api";
import SkillMediaUploader from "../../components/SkillMediaUploader";
import { useAuth } from "../../state/auth.store.jsx";
import { api } from "../../api/client.js";

const CATEGORY_OPTIONS = [
  { label: "Carpentry", value: "carpentry" },
  { label: "Plumbing", value: "plumbing" },
  { label: "Cleaning", value: "cleaning" },
  { label: "Tutor", value: "tutor" },
  { label: "Hair/Beauty", value: "hair-beauty" },
  { label: "Mechanic", value: "mechanic" },
  { label: "Catering", value: "catering" },
  { label: "Painting", value: "painting" },
  { label: "Tailor", value: "tailor" },
  { label: "Trucker", value: "trucker" },
  { label: "Other…", value: "__other__" },
];

const empty = {
  title: "",
  category: "",
  tags: "",
  description: "",
  country: "",
  region: "",
  city: "",
  area: "",
  lat: "",
  lng: "",
};

export default function ProviderSkills() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  // Refs to scroll/focus Create Skill section
  const formRef = useRef(null);
  const titleRef = useRef(null);

  const isMobile = () => {
    try {
      return window.matchMedia("(max-width: 767px)").matches; // Tailwind md starts at 768px :contentReference[oaicite:1]{index=1}
    } catch {
      return window.innerWidth < 768;
    }
  };

  const scrollToForm = () => {
    if (!formRef.current) return;
    // Smooth scroll to Create Skill section :contentReference[oaicite:2]{index=2}
    formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    // Focus title after scroll settles
    setTimeout(() => titleRef.current?.focus?.(), 350);
  };

  const goToFormIfMobile = () => {
    if (isMobile()) scrollToForm();
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  // Notices (error=orange, success=green)
  const [notice, setNotice] = useState({ type: "", text: "" });
  const showError = (text) => setNotice({ type: "error", text });
  const showSuccess = (text) => setNotice({ type: "success", text });
  const clearNotice = () => setNotice({ type: "", text: "" });

  const noticeClass =
    notice.type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : notice.type === "error"
        ? "border-orange-200 bg-orange-50 text-orange-700"
        : "";

  // Category UI
  const [categorySelect, setCategorySelect] = useState("");
  const [categoryOther, setCategoryOther] = useState("");

  const resolvedCategory = useMemo(() => {
    if (categorySelect === "__other__") return categoryOther.trim();
    return categorySelect.trim();
  }, [categorySelect, categoryOther]);

  // Form state
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(empty);

  const [profileLocation, setProfileLocation] = useState(null);
  const [locationReady, setLocationReady] = useState(false);
  useEffect(() => {
    api
      .get("/provider/profile")
      .then(({ data }) => {
        const profile = data.profile;
        const ready = Boolean(
          profile.gps_consent_at &&
          !profile.gps_consent_withdrawn_at &&
          profile.operating_location,
        );
        setLocationReady(ready);
        setProfileLocation(profile.operating_location);
        if (ready)
          setForm((current) => ({ ...current, ...profile.operating_location }));
      })
      .catch(() => showError("Unable to load operating location."));
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await skillsApi.providerList();
      setSkills(data.skills || []);
    } catch (e) {
      showError(
        e?.response?.data?.error || e?.message || "Failed to load skills.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCreate = () => {
    setEditingId(null);
    setForm({
      ...empty,
      ...profileLocation,
    });
    setCategorySelect("");
    setCategoryOther("");
    clearNotice();
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setForm({
      title: s.title || "",
      category: s.category || "",
      tags: s.tags || "",
      description: s.description || "",
      country: s.country || "",
      region: s.region || "",
      city: s.city || "",
      area: s.area || "",
      lat: s.lat != null ? String(s.lat) : "",
      lng: s.lng != null ? String(s.lng) : "",
    });

    const known = CATEGORY_OPTIONS.some((o) => o.value === (s.category || ""));
    if (known) {
      setCategorySelect(s.category || "");
      setCategoryOther("");
    } else {
      setCategorySelect("__other__");
      setCategoryOther(s.category || "");
    }

    clearNotice();
  };

  const save = async () => {
    clearNotice();

    if (!form.title.trim()) return showError("Title is required.");
    if (!resolvedCategory) return showError("Category is required.");
    if (categorySelect === "__other__" && categoryOther.trim().length < 2) {
      return showError("Please enter a category name (at least 2 characters).");
    }
    if (!form.description.trim()) return showError("Description is required.");
    if (!form.country.trim() || !form.region.trim() || !form.city.trim()) {
      return showError("Country, region, and city are required.");
    }

    const latNum = Number(form.lat);
    const lngNum = Number(form.lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return showError(
        "Complete your operating location in provider settings first.",
      );
    }

    try {
      const payload = {
        ...form,
        locationSource: editingId ? form.locationSource : "provider_profile",
        category: resolvedCategory,
        lat: latNum,
        lng: lngNum,
      };

      if (editingId) {
        await skillsApi.providerUpdate(editingId, payload);
        showSuccess("✅ Skill updated.");
      } else {
        const created = await skillsApi.providerCreate(payload);
        const newId = created.skill?.id || null;
        setEditingId(newId);
        showSuccess("✅ Skill created. Now upload up to 3 images below.");
      }

      await load();
    } catch (e) {
      showError(e?.response?.data?.error || e?.message || "Save failed.");
    }
  };

  const remove = async (id) => {
    clearNotice();
    try {
      await skillsApi.providerDelete(id);
      showSuccess("✅ Skill deleted.");
      if (editingId === id) startCreate();
      await load();
    } catch (e) {
      showError(e?.response?.data?.error || e?.message || "Delete failed.");
    }
  };

  const logout = async () => {
    clearNotice();
    try {
      await api.post("/auth/logout");
    } catch {}
    setUser(null);
    setMobileMenuOpen(false);
    navigate("/provider/auth", { replace: true });
  };

  const comingSoon = (label) => {
    setMobileMenuOpen(false);
    showError(`${label} is coming soon (post-MVP).`);
  };

  const menuId = "provider-mobile-menu";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header with hamburger (mobile) and inline nav (md+) */}
      <header className="w-full sticky top-0 z-20 bg-gray-100 border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-10 h-14 flex items-center justify-between gap-3">
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

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs px-3 py-2 rounded-full bg-white border border-slate-200 text-slate-700">
              Skills
            </span>
            <button
              type="button"
              onClick={() => comingSoon("Announcements")}
              className="text-xs px-3 py-2 rounded-full bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200"
            >
              Announcements
            </button>
            <button
              type="button"
              onClick={() => comingSoon("Events")}
              className="text-xs px-3 py-2 rounded-full bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200"
            >
              Events
            </button>
            <button
              type="button"
              onClick={() => comingSoon("Real Estate")}
              className="text-xs px-3 py-2 rounded-full bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200"
            >
              Real Estate
            </button>
            <Link
              to="/provider/requests"
              className="text-xs px-3 py-2 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Requests
            </Link>
            <Link
              to="/provider/profile"
              className="text-xs px-3 py-2 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Profile
            </Link>
            <button
              type="button"
              onClick={logout}
              className="h-10 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-semibold text-sm shadow-sm hover:opacity-95 active:scale-[0.99]"
            >
              Logout
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden h-10 w-10 rounded-xl border border-slate-200 bg-white inline-flex items-center justify-center hover:bg-slate-50 active:scale-[0.99] transition"
            aria-label="Open menu"
            aria-controls={menuId}
            aria-expanded={mobileMenuOpen ? "true" : "false"}
            onClick={() => setMobileMenuOpen((v) => !v)}
          >
            <div className="flex flex-col gap-1">
              <span className="block h-0.5 w-5 bg-slate-700" />
              <span className="block h-0.5 w-5 bg-slate-700" />
              <span className="block h-0.5 w-5 bg-slate-700" />
            </div>
          </button>
        </div>

        {/* Mobile dropdown panel */}
        <div
          id={menuId}
          className={
            mobileMenuOpen
              ? "md:hidden border-t border-slate-200 bg-white"
              : "hidden"
          }
        >
          <div className="px-4 sm:px-6 lg:px-10 py-3 space-y-2">
            <div className="text-xs font-semibold text-slate-500">Menu</div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-semibold text-sm text-left px-3"
            >
              Skills
            </button>

            <button
              type="button"
              onClick={() => comingSoon("Announcements")}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm text-left px-3"
            >
              Announcements (soon)
            </button>

            <button
              type="button"
              onClick={() => comingSoon("Events")}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm text-left px-3"
            >
              Events (soon)
            </button>

            <button
              type="button"
              onClick={() => comingSoon("Real Estate")}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm text-left px-3"
            >
              Real Estate (soon)
            </button>
            <Link
              to="/provider/requests"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full h-11 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm text-left px-3 leading-[44px]"
            >
              Requests
            </Link>
            <Link
              to="/provider/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full h-11 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm text-left px-3 leading-[44px]"
            >
              Profile
            </Link>

            <button
              type="button"
              onClick={logout}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-semibold text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Back-to-search OUTSIDE header */}
      <div className="w-full px-4 sm:px-6 lg:px-10 pt-3">
        <button
          type="button"
          onClick={() => navigate("/search?loc=near")}
          className="text-sm text-blue-700 hover:underline"
        >
          ← Go to search
        </button>
      </div>

      <main className="flex-1 mx-auto max-w-5xl w-full px-4 py-5">
        {notice.text ? (
          <div
            className={`mb-4 rounded-xl border px-3 py-2 text-sm ${noticeClass}`}
          >
            {notice.text}
          </div>
        ) : null}

        <div className="mb-4 rounded-xl border p-3 text-sm bg-white">
          {locationReady
            ? "New skills use your saved operating location. No new GPS capture is needed."
            : "Complete location setup before creating or publishing skills."}{" "}
          <Link className="text-blue-700 underline" to="/provider/location">
            Manage operating location and consent
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: list */}
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            {/* Header row with mobile New skill button */}
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">My skills</div>

              {/* Phone-size new skill button (shown only below md) */}
              <button
                type="button"
                onClick={() => {
                  startCreate();
                  // scroll/focus Create skill section on phones
                  setTimeout(goToFormIfMobile, 0);
                }}
                className="md:hidden h-10 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-semibold text-sm shadow-sm hover:opacity-95 active:scale-[0.99]"
              >
                New skill
              </button>
            </div>

            {loading ? (
              <div className="mt-3 text-sm text-slate-600">Loading…</div>
            ) : (
              <div className="mt-3 space-y-2">
                {skills.length === 0 ? (
                  <div className="text-sm text-slate-600">No skills yet.</div>
                ) : (
                  skills.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-xl border border-slate-100 p-3 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {s.title}
                        </div>
                        <div className="text-xs text-slate-600 truncate">
                          {s.category} • {s.city}
                        </div>

                        {s.indexImageUrl ? (
                          <img
                            alt="index"
                            src={s.indexImageUrl}
                            className="mt-2 h-16 w-24 object-cover rounded-lg border"
                          />
                        ) : (
                          <div className="mt-2 text-xs text-slate-500">
                            No image yet
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            startEdit(s);
                            // on phone: also bring Create/Edit section into view
                            setTimeout(goToFormIfMobile, 0);
                          }}
                          className="h-10 px-3 rounded-xl bg-slate-100 text-sm font-medium hover:bg-slate-200"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(s.id)}
                          className="h-10 px-3 rounded-xl bg-rose-600 text-white text-sm font-medium hover:bg-rose-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Right: form */}
          <div
            ref={formRef}
            className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">
                {editingId ? "Edit skill" : "Create skill"}
              </div>

              {/* Existing New Skill button (desktop + mobile) */}
              <button
                type="button"
                onClick={() => {
                  startCreate();
                  setTimeout(goToFormIfMobile, 0);
                }}
                className="h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-semibold shadow-sm hover:opacity-95"
              >
                New Skill
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <input
                ref={titleRef}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                placeholder="Title"
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
              />

              {/* Category dropdown + Other */}
              <div className="space-y-2">
                <select
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                  value={categorySelect}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCategorySelect(v);
                    if (v !== "__other__") setCategoryOther("");
                    setForm((p) => ({ ...p, category: v }));
                  }}
                >
                  <option value="" disabled>
                    Select category…
                  </option>
                  {CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>

                {categorySelect === "__other__" ? (
                  <input
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                    placeholder="Type category (e.g., electrician)"
                    value={categoryOther}
                    onChange={(e) => setCategoryOther(e.target.value)}
                  />
                ) : null}
              </div>

              <input
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                placeholder="Tags (comma separated)"
                value={form.tags}
                onChange={(e) =>
                  setForm((p) => ({ ...p, tags: e.target.value }))
                }
              />

              <textarea
                className="min-h-[96px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                placeholder="Description"
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
              />

              <div className="rounded-xl bg-slate-50 p-3 text-sm">
                <strong>
                  {editingId
                    ? "Saved listing location"
                    : "Provider operating location"}
                </strong>
                <p>
                  {[form.area, form.city, form.region]
                    .filter(Boolean)
                    .join(", ") || "Complete provider location setup."}
                </p>
                {editingId && (
                  <button
                    type="button"
                    className="text-blue-700 underline p-2"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        ...profileLocation,
                        locationSource: "provider_profile",
                      }))
                    }
                  >
                    Use current profile location for this listing
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={save}
                disabled={!locationReady}
                className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-semibold shadow-sm hover:opacity-95 disabled:opacity-60"
              >
                {editingId ? "Save changes" : "Create skill"}
              </button>
            </div>

            {editingId ? (
              <SkillMediaUploader
                skillId={editingId}
                onUploaded={() => {
                  load();
                  showSuccess("✅ Images uploaded and linked to the skill.");
                }}
                onError={(t) => showError(t)}
              />
            ) : (
              <div className="mt-4 text-xs text-slate-500">
                Create the skill first, then upload images.
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="w-full bg-white border-t border-slate-200">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-4 text-xs text-slate-500">
          © {new Date().getFullYear()} One Community — Provider Portal
        </div>
      </footer>
    </div>
  );
}
