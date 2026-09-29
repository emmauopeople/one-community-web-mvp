import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { skillsApi } from "../../app/api/skills.api";
import { contactApi } from "../../app/api/contact.api";
import { eventsApi } from "../../app/api/events.api";

const recentViewEvents = new Map();

function onlyDigitsPhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function isEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function shouldTrackSkillView(skillId) {
  const key = String(skillId);
  const now = Date.now();
  const last = recentViewEvents.get(key) || 0;

  if (now - last < 5000) return false;

  recentViewEvents.set(key, now);

  for (const [k, ts] of recentViewEvents.entries()) {
    if (now - ts > 30000) recentViewEvents.delete(k);
  }

  return true;
}

/* ───────────────────────────────────────────
   Fullscreen Lightbox Viewer
   ─────────────────────────────────────────── */
function Lightbox({ media, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);

  const current = useMemo(() => {
    if (!Array.isArray(media) || media.length === 0) return null;
    const safe = Math.max(0, Math.min(idx, media.length - 1));
    return media[safe];
  }, [media, idx]);

  const next = useCallback(() => {
    setIdx((p) => (media.length ? (p + 1) % media.length : p));
  }, [media.length]);

  const prev = useCallback(() => {
    setIdx((p) => (media.length ? (p - 1 + media.length) % media.length : p));
  }, [media.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, next, prev]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90">
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-xl font-bold text-white backdrop-blur hover:bg-white/30"
        aria-label="Close viewer"
      >
        ✕
      </button>

      {/* Counter */}
      {media.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white backdrop-blur">
          {Math.min(idx + 1, media.length)} / {media.length}
        </div>
      )}

      {/* Image */}
      <div className="flex h-full w-full items-center justify-center p-10 sm:p-16">
        {current?.url ? (
          <img
            src={current.url}
            alt=""
            className="max-h-full max-w-full object-contain select-none"
            draggable={false}
          />
        ) : (
          <div className="text-sm text-white/60">No image</div>
        )}
      </div>

      {/* Prev / Next */}
      {media.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-2xl font-bold text-white backdrop-blur hover:bg-white/30"
            aria-label="Previous image"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-2xl font-bold text-white backdrop-blur hover:bg-white/30"
            aria-label="Next image"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────
   Skill Modal
   ─────────────────────────────────────────── */
export default function SkillModal({ skillId, onClose }) {
  const closeBtnRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [skill, setSkill] = useState(null);
  const [media, setMedia] = useState([]);
  const [idx, setIdx] = useState(0);

  const [lightboxOpen, setLightboxOpen] = useState(false);

  const [fromEmail, setFromEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const noticeClass =
    notice.type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : notice.type === "error"
        ? "border-orange-200 bg-orange-50 text-orange-700"
        : "";

  const current = useMemo(() => {
    if (!Array.isArray(media) || media.length === 0) return null;
    const safe = Math.max(0, Math.min(idx, media.length - 1));
    return media[safe];
  }, [media, idx]);

  useEffect(() => {
    let cancelled = false;

    async function loadSkill() {
      setLoading(true);
      setNotice({ type: "", text: "" });

      try {
        const data = await skillsApi.getSkillDetail(skillId);
        if (cancelled) return;

        setSkill(data?.skill || null);
        setMedia(Array.isArray(data?.media) ? data.media : []);
        setIdx(0);

        if (skillId && shouldTrackSkillView(skillId)) {
          eventsApi.track("skill_view", {
            skillId,
            skill_id: skillId,
          });
        }
      } catch (e) {
        if (cancelled) return;
        setNotice({
          type: "error",
          text:
            e?.response?.data?.error || e?.message || "Failed to load skill.",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (skillId) loadSkill();

    const timer = setTimeout(() => {
      closeBtnRef.current?.focus?.();
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [skillId]);

  useEffect(() => {
    if (lightboxOpen) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowRight") {
        setIdx((p) => (media.length ? (p + 1) % media.length : p));
      }
      if (e.key === "ArrowLeft") {
        setIdx((p) =>
          media.length ? (p - 1 + media.length) % media.length : p,
        );
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, media.length, lightboxOpen]);

  const next = () => {
    setIdx((p) => (media.length ? (p + 1) % media.length : p));
  };

  const prev = () => {
    setIdx((p) => (media.length ? (p - 1 + media.length) % media.length : p));
  };

  const openLightbox = () => {
    if (current?.url) setLightboxOpen(true);
  };

  const onWhatsApp = () => {
    const phoneDigits = onlyDigitsPhone(skill?.provider_phone);
    if (!phoneDigits) {
      setNotice({
        type: "error",
        text: "Provider phone number not available.",
      });
      return;
    }

    eventsApi.track("contact_click_whatsapp", {
      skillId,
      skill_id: skillId,
      channel: "whatsapp",
    });

    const text = encodeURIComponent(
      `Hello, I found your service on One Community: ${skill?.title || ""}`,
    );

    window.open(
      `https://wa.me/${phoneDigits}?text=${text}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const sendEmailInquiry = async () => {
    setNotice({ type: "", text: "" });

    const em = fromEmail.trim();
    const msg = message.trim();

    if (!isEmail(em)) {
      setNotice({ type: "error", text: "Enter a valid email address." });
      return;
    }

    if (msg.length < 10) {
      setNotice({
        type: "error",
        text: "Message must be at least 10 characters.",
      });
      return;
    }

    setSending(true);

    try {
      await contactApi.emailInquiry({
        skillId,
        fromEmail: em,
        message: msg,
      });

      eventsApi.track("contact_click_email", {
        skillId,
        skill_id: skillId,
        channel: "email",
      });

      setNotice({
        type: "success",
        text: "Inquiry sent. The provider will reply to your email.",
      });
      setMessage("");
    } catch (e) {
      setNotice({
        type: "error",
        text:
          e?.response?.data?.error || e?.message || "Failed to send inquiry.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* ── Main Modal ── */}
      <div
        className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute inset-0 bg-black/40"
        />

        <div className="relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-xl sm:max-w-2xl sm:rounded-3xl">
          {/* ── Sticky Header ── */}
          <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white p-4">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold">
                {loading ? "Loading…" : skill?.title || "Skill"}
              </div>
              <div className="truncate text-xs text-slate-600">
                {skill?.category ? `${skill.category} • ` : ""}
                {skill?.city || ""}
              </div>
            </div>

            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              className="h-10 shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto">
            {/* ── Notice ── */}
            {notice.text ? (
              <div
                className={`m-4 rounded-xl border px-3 py-2 text-sm ${noticeClass}`}
              >
                {notice.text}
              </div>
            ) : null}

            {/* ── Media gallery (FIXED: h-full w-full object-contain) ── */}
            <div className="bg-slate-100">
              <div className="relative h-72 w-full overflow-hidden sm:h-96">
                {current?.url ? (
                  <img
                    src={current.url}
                    alt=""
                    onClick={openLightbox}
                    className="h-full w-full cursor-pointer object-contain transition-transform hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
                    No media
                  </div>
                )}

                {/* Tap-to-expand hint */}
                {current?.url && (
                  <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/50 px-2 py-1 text-[10px] text-white backdrop-blur">
                    Tap to enlarge
                  </div>
                )}

                {media.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={prev}
                      className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-lg font-semibold"
                      aria-label="Previous image"
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      onClick={next}
                      className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-lg font-semibold"
                      aria-label="Next image"
                    >
                      ›
                    </button>

                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
                      {Math.min(idx + 1, media.length)} / {media.length}
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            <div className="border-t border-slate-200" />

            {/* ── Description (larger font) ── */}
            <div className="p-4">
              <div className="whitespace-pre-wrap text-base leading-relaxed text-slate-800">
                {skill?.description || "No description provided."}
              </div>
            </div>

            <div className="border-t border-slate-200" />

            {/* ── Contact form ── */}
            <div className="space-y-3 p-4">
              <div className="text-sm font-semibold text-slate-900">
                Send an inquiry
              </div>

              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                placeholder="Your email (so provider can reply)"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                type="email"
                autoComplete="email"
              />

              <textarea
                className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                placeholder="Type your message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />

              <button
                type="button"
                disabled={sending}
                onClick={sendEmailInquiry}
                className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
              >
                {sending ? "Sending…" : "Email inquiry"}
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <div className="text-xs font-semibold text-slate-500">OR</div>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <button
                type="button"
                onClick={onWhatsApp}
                className="h-11 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 font-semibold text-white shadow-sm hover:opacity-95"
              >
                WhatsApp Me
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightboxOpen && (
        <Lightbox
          media={media}
          startIndex={idx}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
