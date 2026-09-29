import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import appLogo from "../../assets/images/appLogo.png";
import { authApi } from "../../app/api/auth.api";

function getApiError(ex, fallback) {
  return ex?.response?.data?.error || ex?.message || fallback;
}

function isValidPhone(phone) {
  const p = String(phone || "")
    .trim()
    .replace(/\s+/g, "");
  return /^\+?\d{8,15}$/.test(p);
}

function isValidDisplayName(name) {
  const n = String(name || "").trim();
  return n.length >= 2 && n.length <= 60;
}

export default function ProviderProfile() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [profile, setProfile] = useState(null);

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const resetNotices = () => {
    setMsg("");
    setErr("");
  };

  const canSave = useMemo(() => {
    const nameOk = displayName.trim() ? isValidDisplayName(displayName) : true; // optional
    const phoneOk = isValidPhone(phone);
    return nameOk && phoneOk;
  }, [displayName, phone]);

  const load = async () => {
    setLoading(true);
    resetNotices();
    try {
      const data = await authApi.providerProfile();
      setProfile(data.profile);
      setDisplayName(data.profile?.display_name || "");
      setPhone(data.profile?.phone || "");
    } catch (ex) {
      setErr(getApiError(ex, "Failed to load profile"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSave = async (e) => {
    e.preventDefault();
    if (!canSave || busy) return;

    resetNotices();

    if (displayName.trim() && !isValidDisplayName(displayName)) {
      setErr("Display name must be 2–60 characters.");
      return;
    }
    if (!isValidPhone(phone)) {
      setErr("Phone must be digits only (optionally +), 8–15 digits.");
      return;
    }

    setBusy(true);
    try {
      const data = await authApi.updateProviderProfile({
        displayName: displayName.trim() || null,
        phone: phone.trim(),
      });

      if (!data?.ok) throw new Error(data?.error || "Update failed");

      setProfile(data.profile);
      setMsg("✅ Profile updated successfully.");
    } catch (ex) {
      setErr(getApiError(ex, "Failed to update profile"));
    } finally {
      setBusy(false);
    }
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

          <Link
            to="/provider/skills"
            className="h-10 px-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-semibold shadow-sm hover:opacity-95 active:scale-[0.99] transition text-sm"
          >
            Back to Skills
          </Link>
        </div>
      </header>

      {/* Back */}
      <div className="w-full px-4 sm:px-6 lg:px-10 pt-3">
        <Link
          to="/provider/skills"
          className="text-sm text-blue-700 hover:underline"
        >
          ← Back
        </Link>
      </div>

      <main className="flex-1 w-full px-4 sm:px-6 lg:px-10 flex items-start justify-center py-6">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold">Provider Profile</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Update your display name and phone number.
                </p>
              </div>
              <button
                type="button"
                onClick={load}
                disabled={loading || busy}
                className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium hover:bg-slate-100 disabled:opacity-60"
              >
                Refresh
              </button>
            </div>

            {(msg || err) && (
              <div
                className={
                  "mt-3 rounded-xl border px-3 py-2 text-sm " +
                  (err
                    ? "border-orange-200 bg-orange-50 text-orange-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700")
                }
              >
                {err || msg}
              </div>
            )}

            {loading ? (
              <div className="mt-4 text-sm text-slate-600">Loading…</div>
            ) : (
              <form className="mt-4 space-y-3" onSubmit={onSave}>
                <div className="text-xs text-slate-500">
                  Logged in as:{" "}
                  <span className="font-semibold">{profile?.email}</span>
                </div>

                <input
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                  placeholder="Display name (2–60 chars)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={busy}
                />

                <input
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                  placeholder="Phone (e.g., +2376xxxxxxx)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={busy}
                />

                <button
                  type="submit"
                  disabled={!canSave || busy}
                  className={
                    "h-11 w-full rounded-xl text-white font-semibold shadow-sm transition " +
                    (!canSave || busy
                      ? "bg-slate-300 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-600 to-emerald-500 hover:opacity-95 active:scale-[0.99]")
                  }
                >
                  {busy ? "Saving…" : "Save changes"}
                </button>

                <div className="text-xs text-slate-500">
                  Display name will appear in public search results and skill
                  details.
                </div>
              </form>
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
