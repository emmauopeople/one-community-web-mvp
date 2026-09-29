import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import appLogo from "../../assets/images/appLogo.png";
import { authApi } from "../../app/api/auth.api";
import { useAuth } from "../../app/state/auth.store";

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

export default function ProviderAuth() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [mode, setMode] = useState("login"); // "login" | "register"

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Registration state
  const [regDisplayName, setRegDisplayName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regCode, setRegCode] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regStarted, setRegStarted] = useState(false);

  // UX
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const canLogin = useMemo(
    () => loginEmail.trim() && loginPassword.trim(),
    [loginEmail, loginPassword],
  );

  const canBeginReg = useMemo(() => {
    const nameOk = isValidDisplayName(regDisplayName);
    const emailOk = regEmail.trim();
    const phoneOk = regPhone.trim() && isValidPhone(regPhone);
    const passOk = regPassword.trim().length >= 8;
    return nameOk && emailOk && phoneOk && passOk;
  }, [regDisplayName, regEmail, regPhone, regPassword]);

  const canCompleteReg = useMemo(() => {
    return regStarted && regEmail.trim() && regCode.trim().length === 6;
  }, [regStarted, regEmail, regCode]);

  const resetNotices = () => {
    setMsg("");
    setErr("");
  };

  const onLogin = async (e) => {
    e.preventDefault();
    if (!canLogin || busy) return;

    resetNotices();
    setBusy(true);
    try {
      const data = await authApi.login({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      if (!data?.ok) throw new Error(data?.error || "Login failed");

      setUser(data.user);
      navigate("/provider/skills", { replace: true });
    } catch (ex) {
      setErr(getApiError(ex, "Login failed"));
    } finally {
      setBusy(false);
    }
  };

  const onBeginRegistration = async (e) => {
    e.preventDefault();
    if (!canBeginReg || busy) return;

    resetNotices();

    if (!isValidDisplayName(regDisplayName)) {
      setErr(
        "Display name must be 2–60 characters (your name or business name).",
      );
      return;
    }

    if (!isValidPhone(regPhone)) {
      setErr(
        "Invalid phone number. Use digits only (optionally +), 8–15 digits.",
      );
      return;
    }

    setBusy(true);
    try {
      const data = await authApi.beginRegistration({
        displayName: regDisplayName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        password: regPassword,
      });

      if (!data?.ok)
        throw new Error(data?.error || "Failed to start registration");

      setRegStarted(true);
      setRegCode("");
      setMsg(
        "Verification code sent. Enter the 6-digit code to complete registration.",
      );
    } catch (ex) {
      setErr(getApiError(ex, "Failed to start registration"));
    } finally {
      setBusy(false);
    }
  };

  const onCompleteRegistration = async (e) => {
    e.preventDefault();
    if (!canCompleteReg || busy) return;

    resetNotices();
    setBusy(true);
    try {
      const data = await authApi.completeRegistration({
        email: regEmail.trim(),
        otp: regCode.trim(),
      });

      if (!data?.ok) throw new Error(data?.error || "Registration failed");

      if (data?.user) setUser(data.user);

      // keep consistent with login
      navigate("/provider/skills", { replace: true });
    } catch (ex) {
      setErr(getApiError(ex, "Registration failed"));
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
            id="nav-logo"
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
            to="/provider/auth"
            id="nav-provider-auth-link"
            className="h-10 px-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-semibold shadow-sm hover:opacity-95 active:scale-[0.99] transition text-sm"
          >
            Provider Portal
          </Link>
        </div>
      </header>

      {/* Back */}
      <div className="w-full px-4 sm:px-6 lg:px-10 pt-3">
        <Link to="/" className="text-sm text-blue-700 hover:underline">
          ← Back
        </Link>
      </div>

      {/* Main */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-10 flex items-center justify-center py-8">
        <div className="w-full max-w-md">
          {/* Mode toggle */}
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                resetNotices();
              }}
              className={
                "h-11 flex-1 rounded-xl border text-sm font-semibold transition " +
                (mode === "login"
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50")
              }
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("register");
                resetNotices();
              }}
              className={
                "h-11 flex-1 rounded-xl border text-sm font-semibold transition " +
                (mode === "register"
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50")
              }
            >
              Create Account
            </button>
          </div>

          {/* Status */}
          {(msg || err) && (
            <div
              className={
                "mb-3 rounded-xl border px-3 py-2 text-sm " +
                (err
                  ? "border-orange-200 bg-orange-50 text-orange-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700")
              }
            >
              {err || msg}
            </div>
          )}

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            {mode === "login" ? (
              <>
                <h1 className="text-xl font-semibold">Provider Login</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Login to manage your skills.
                </p>

                <form className="mt-4 space-y-3" onSubmit={onLogin}>
                  <input
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    placeholder="Email"
                    autoComplete="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    disabled={busy}
                  />

                  <input
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    placeholder="Password"
                    type="password"
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    disabled={busy}
                  />

                  <button
                    type="submit"
                    disabled={!canLogin || busy}
                    className={
                      "h-11 w-full rounded-xl text-white font-semibold shadow-sm transition " +
                      (!canLogin || busy
                        ? "bg-slate-300 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-600 to-emerald-500 hover:opacity-95 active:scale-[0.99]")
                    }
                  >
                    {busy ? "Signing in…" : "Login"}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h1 className="text-xl font-semibold">Provider Registration</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Enter your details, receive a 6-digit code by email, then
                  complete registration.
                </p>

                <form
                  className="mt-4 space-y-3"
                  onSubmit={
                    regStarted ? onCompleteRegistration : onBeginRegistration
                  }
                >
                  <input
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                    placeholder="Display name (your name or business)"
                    value={regDisplayName}
                    onChange={(e) => setRegDisplayName(e.target.value)}
                    disabled={busy || regStarted}
                    autoComplete="name"
                  />

                  <input
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                    placeholder="Email"
                    autoComplete="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    disabled={busy || regStarted}
                  />

                  <input
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                    placeholder="Phone (e.g., +2376xxxxxxx)"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    disabled={busy || regStarted}
                  />

                  {!regStarted ? (
                    <>
                      <input
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                        placeholder="Create password (min 8 chars)"
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        disabled={busy}
                        autoComplete="new-password"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setMsg(
                            "SMS OTP will be added later. MVP supports Email OTP only.",
                          )
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium hover:bg-slate-100 active:scale-[0.99] transition"
                        disabled={busy}
                      >
                        SMS code (later)
                      </button>

                      <button
                        type="submit"
                        disabled={!canBeginReg || busy}
                        className={
                          "h-11 w-full rounded-xl text-white font-semibold shadow-sm transition " +
                          (!canBeginReg || busy
                            ? "bg-slate-300 cursor-not-allowed"
                            : "bg-gradient-to-r from-blue-600 to-emerald-500 hover:opacity-95 active:scale-[0.99]")
                        }
                      >
                        {busy
                          ? "Sending code…"
                          : "Begin Registration (Email OTP)"}
                      </button>

                      <div className="text-xs text-slate-500">
                        Display name: 2–60 chars • Phone: digits only
                        (optionally +), 8–15 digits.
                      </div>
                    </>
                  ) : (
                    <>
                      <input
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                        placeholder="Enter 6-digit code"
                        value={regCode}
                        onChange={(e) =>
                          setRegCode(
                            e.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                        disabled={busy}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                      />

                      <button
                        type="submit"
                        disabled={!canCompleteReg || busy}
                        className={
                          "h-11 w-full rounded-xl text-white font-semibold shadow-sm transition " +
                          (!canCompleteReg || busy
                            ? "bg-slate-300 cursor-not-allowed"
                            : "bg-gradient-to-r from-blue-600 to-emerald-500 hover:opacity-95 active:scale-[0.99]")
                        }
                      >
                        {busy ? "Completing…" : "Complete Registration"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRegStarted(false);
                          setRegCode("");
                          setMsg("Registration reset. Start again.");
                          setErr("");
                        }}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 font-medium hover:bg-slate-100 active:scale-[0.99] transition"
                        disabled={busy}
                      >
                        Start over
                      </button>
                    </>
                  )}
                </form>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-slate-200">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-4 text-xs text-slate-500">
          © {new Date().getFullYear()} One Community — Provider Portal
        </div>
      </footer>
    </div>
  );
}
