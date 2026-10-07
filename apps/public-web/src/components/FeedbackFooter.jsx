import { useEffect, useRef, useState } from "react";
import { t, useLocale } from "../i18n/index.js";
import { api } from "../app/api/client";
const question = "Can this application help people in Cameroon?";
const categories = {
  app_problem: "App problem",
  suggestion: "Suggestion",
  application_comment: "Application comment",
  provider_problem: "Provider problem",
};
const seenKey = "oc-usefulness-v1";
function locate() {
  return new Promise((resolve) => {
    if (!navigator.geolocation)
      return resolve({ locationStatus: "unavailable" });
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          locationStatus: "captured",
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
        }),
      (e) =>
        resolve({ locationStatus: e.code === 1 ? "denied" : "unavailable" }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  });
}
export default function FeedbackFooter({ enabled = true }) {
  const language = useLocale(),
    dialog = useRef(),
    footer = useRef(),
    seen = useRef(false),
    id = useRef();
  const [mode, setMode] = useState(""),
    [prompt, setPrompt] = useState(false),
    [useful, setUseful] = useState(null),
    [category, setCategory] = useState("app_problem"),
    [subject, setSubject] = useState(""),
    [description, setDescription] = useState(""),
    [email, setEmail] = useState(""),
    [contact, setContact] = useState(false),
    [gps, setGps] = useState(true),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const dismiss = () => {
    seen.current = true;
    setPrompt(false);
    try {
      localStorage.setItem(seenKey, "seen");
    } catch {}
  };
  useEffect(() => {
    try {
      seen.current = localStorage.getItem(seenKey) === "seen";
    } catch {}
    const onScroll = () => {
      if (!enabled || mode || seen.current || window.scrollY < 24) return;
      if (footer.current?.getBoundingClientRect().top < window.innerHeight) {
        setPrompt(true);
        dismissSeen();
      }
    };
    function dismissSeen() {
      seen.current = true;
      try {
        localStorage.setItem(seenKey, "seen");
      } catch {}
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled, mode]);
  useEffect(() => {
    if (mode && !dialog.current.open) dialog.current.showModal();
  }, [mode]);
  const open = (value, answer = null) => {
    dismiss();
    setUseful(answer);
    setDescription("");
    setSubject("");
    setEmail("");
    setContact(false);
    setGps(true);
    setMessage("");
    id.current = crypto.randomUUID();
    setMode(value);
  };
  const close = () => {
    if (!busy) {
      dialog.current?.close();
      setMode("");
    }
  };
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const location =
        mode === "report" && gps
          ? await locate()
          : { locationStatus: "not_requested" };
      await api.post(
        "/feedback",
        {
          submissionId: id.current,
          kind: mode,
          category,
          subject,
          description,
          email,
          contactConsent: contact,
          useful,
          channel: "web",
          language,
          ...location,
        },
        { timeout: 15000 },
      );
      dialog.current.close();
      setMode("");
      setMessage(
        location.locationStatus === "denied" ||
          location.locationStatus === "unavailable"
          ? "Thank you. Feedback saved without location."
          : "Thank you for your feedback.",
      );
    } catch {
      setMessage("Unable to save feedback. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const field = "block w-full border rounded-lg p-3 mt-1 text-sm";
  return (
    <>
      <footer
        ref={footer}
        className="text-center text-sm text-blue-700 py-6 space-x-5"
      >
        <button onClick={() => open("about")}>{t("About")}</button>
        <button onClick={() => open("report")}>{t("Report issues")}</button>
        <button onClick={() => open("survey")}>{t("Your opinion")}</button>
      </footer>
      {!mode && message && (
        <p role="status" className="text-sm text-center p-3">
          {t(message)}
        </p>
      )}
      {enabled && prompt && !mode && (
        <aside
          aria-label={t("Your opinion")}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:w-96 z-40 bg-white border rounded-2xl shadow-lg p-4"
        >
          <button
            className="float-right text-blue-700 px-2"
            aria-label={t("Close")}
            onClick={dismiss}
          >
            ×
          </button>
          <p className="text-sm font-medium pr-6">{t(question)}</p>
          <div className="flex gap-4 mt-3">
            {[true, false].map((v) => (
              <button
                className="text-blue-700 border rounded-lg px-4 py-2"
                key={String(v)}
                onClick={() => open("survey", v)}
              >
                {t(v ? "Yes" : "No")}
              </button>
            ))}
          </div>
        </aside>
      )}
      <dialog
        ref={dialog}
        aria-labelledby="feedback-title"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        className="m-auto w-[calc(100%_-_2rem)] max-w-lg max-h-[90dvh] rounded-2xl p-5 backdrop:bg-black/40"
      >
        <button
          onClick={close}
          disabled={busy}
          className="float-right text-blue-700 px-2"
          aria-label={t("Close")}
        >
          ×
        </button>
        <h2 id="feedback-title" className="text-base font-medium pr-6 mb-4">
          {t(
            mode === "about"
              ? "About"
              : mode === "report"
                ? "Report a problem or suggestion for improvement"
                : question,
          )}
        </h2>
        {mode === "about" ? (
          <p className="text-sm">
            {t(
              "One Community connects people with local service providers. Our goal is to make useful services easier to find and help communities across Cameroon grow.",
            )}
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4 text-sm">
            {mode === "report" && (
              <>
                <label className="block">
                  {t("Category")}
                  <select
                    className={field}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {Object.entries(categories).map(([k, v]) => (
                      <option key={k} value={k}>
                        {t(v)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  {t("Subject / title")}
                  <input
                    className={field}
                    required
                    minLength={3}
                    maxLength={180}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </label>
              </>
            )}
            <label className="block">
              {t(mode === "report" ? "Description" : "Comment")}
              <textarea
                className={field}
                rows={4}
                required={mode === "report"}
                minLength={mode === "report" ? 10 : undefined}
                maxLength={3000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <fieldset>
              <legend>{t(question)}</legend>
              <div className="flex gap-5 mt-2">
                {[true, false].map((v) => (
                  <label key={String(v)}>
                    <input
                      type="radio"
                      name="useful"
                      required={mode === "survey"}
                      checked={useful === v}
                      onChange={() => setUseful(v)}
                    />{" "}
                    {t(v ? "Yes" : "No")}
                  </label>
                ))}
              </div>
            </fieldset>
            {mode === "report" && (
              <label className="block">
                <input
                  type="checkbox"
                  checked={gps}
                  onChange={(e) => setGps(e.target.checked)}
                />{" "}
                {t("Include GPS location (permission required)")}
              </label>
            )}
            <label className="block">
              <input
                type="checkbox"
                checked={contact}
                onChange={(e) => setContact(e.target.checked)}
              />{" "}
              {t("You may contact me by email about this feedback.")}
            </label>
            {contact && (
              <label className="block">
                {t("Email")}
                <input
                  className={field}
                  type="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            )}
            {message && <p role="alert">{t(message)}</p>}
            <button
              disabled={busy}
              className="w-full rounded-xl p-3 text-white bg-gradient-to-r from-blue-600 to-emerald-500"
            >
              {t(busy ? "Saving…" : "Submit")}
            </button>
          </form>
        )}
      </dialog>
    </>
  );
}
