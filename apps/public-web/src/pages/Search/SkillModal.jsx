import LanguageSwitch from "../../i18n/LanguageSwitch";
import { t, te, useLocale } from "../../i18n/index.js";
import React, { useEffect, useRef, useState } from "react";
import ReviewsPanel from "../../components/ReviewsPanel";
import { api } from "../../app/api/client";
import { contactApi } from "../../app/api/contact.api";
import { eventsApi } from "../../app/api/events.api";
const primary =
  "w-full rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-bold py-4 px-3 disabled:opacity-50";
const secondary =
  "min-h-11 rounded-full border border-slate-200 bg-white px-4 text-blue-700 font-bold disabled:opacity-50";
const card = "rounded-3xl border border-slate-200 bg-white p-5 space-y-4";
const locality = (s) =>
  [s?.area, s?.city, s?.region].filter(Boolean).join(", ");
const failure = (e) =>
  e?.response?.data?.error || "Unable to load this content. Please retry.";
function Notice({ children, onRetry }) {
  useLocale();
  return (
    <div
      role="alert"
      className="rounded-xl bg-amber-50 text-amber-900 p-3 text-sm"
    >
      {children}
      {onRetry && (
        <button
          className="block min-h-11 text-blue-700 font-semibold"
          onClick={onRetry}
        >
          {t("Retry")}
        </button>
      )}
    </div>
  );
}
function ListingGrid({ items, onOpen }) {
  useLocale();
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onOpen(item.id)}
          className="text-left rounded-2xl border border-slate-200 overflow-hidden bg-white min-w-0"
        >
          {item.indexImageUrl ? (
            <img
              src={item.indexImageUrl}
              alt=""
              loading="lazy"
              width="320"
              height="220"
              className="w-full h-28 sm:h-40 object-cover"
            />
          ) : (
            <div className="h-28 sm:h-40 bg-blue-50 flex items-center justify-center text-sm text-slate-500">
              {t("Local service")}
            </div>
          )}
          <div className="p-3">
            <h3 className="font-semibold break-words">{item.title}</h3>
            <p className="text-sm text-slate-500">
              {[item.area, item.city].filter(Boolean).join(", ")}
            </p>
            <p className="text-xs text-emerald-700 mt-1">{t(item.category)}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
function Gallery({ media, title, onEnlarge }) {
  useLocale();
  const [index, setIndex] = useState(0),
    touch = useRef(null);
  const photos = media.filter(
    (m) => m.url && (!m.mimeType || m.mimeType.startsWith("image/")),
  );
  const move = (n) => setIndex((i) => (i + n + photos.length) % photos.length);
  return (
    <>
      <div
        className="relative rounded-3xl overflow-hidden bg-blue-50"
        onTouchStart={(e) => (touch.current = e.changedTouches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current !== null && photos.length > 1) {
            const delta = e.changedTouches[0].clientX - touch.current;
            if (Math.abs(delta) > 45) move(delta < 0 ? 1 : -1);
          }
          touch.current = null;
        }}
      >
        {photos[index] ? (
          <button
            aria-label={t("Enlarge service image")}
            className="block w-full"
            onClick={() => onEnlarge(photos, index)}
          >
            <img
              src={photos[index].url}
              alt={`${title}, image ${index + 1}`}
              className="w-full h-64 sm:h-96 object-cover"
            />
          </button>
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-500">
            {t("No photos yet")}
          </div>
        )}
        {photos.length > 1 && (
          <>
            <button
              aria-label={t("Previous image")}
              onClick={() => move(-1)}
              className="absolute top-1/2 left-3 -translate-y-1/2 h-11 w-11 rounded-full bg-slate-900/60 text-white text-3xl"
            >
              ‹
            </button>
            <button
              aria-label={t("Next image")}
              onClick={() => move(1)}
              className="absolute top-1/2 right-3 -translate-y-1/2 h-11 w-11 rounded-full bg-slate-900/60 text-white text-3xl"
            >
              ›
            </button>
            <span
              aria-live="polite"
              className="absolute right-3 bottom-3 bg-slate-900/70 text-white text-sm rounded-full px-3 py-1"
            >
              {index + 1} / {photos.length}
            </span>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div
          aria-label={t("Service thumbnails")}
          className="flex gap-2 overflow-x-auto py-1"
        >
          {photos.map((image, i) => (
            <button
              aria-label={`Show image ${i + 1}`}
              aria-pressed={i === index}
              key={image.url + i}
              onClick={() => setIndex(i)}
              className={`shrink-0 rounded-xl border-2 overflow-hidden ${index === i ? "border-blue-600" : "border-slate-200"}`}
            >
              <img
                src={image.thumbnailUrl || image.url}
                alt=""
                loading="lazy"
                className="w-16 h-12 object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
function Detail({ id, onNavigate, onEnlarge }) {
  useLocale();
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [similar, setSimilar] = useState(null),
    [relatedError, setRelatedError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    setSimilar(null);
    setRelatedError("");
    api
      .get(`/skills/${id}`, {
        signal: controller.signal,
      })
      .then(({ data: value }) => {
        if (controller.signal.aborted) return;
        if (!value.skill) throw Error();
        setData(value);
        // The detail endpoint owns skill_view analytics; do not post a second event.
        api
          .get("/skills/search", {
            params: {
              category: value.skill.category,
            },
            signal: controller.signal,
          })
          .then(({ data: related }) => {
            if (!controller.signal.aborted)
              setSimilar(
                (related.results || [])
                  .filter((s) => String(s.id) !== String(id))
                  .slice(0, 4),
              );
          })
          .catch(() => {
            if (!controller.signal.aborted)
              setRelatedError("Similar listings are unavailable.");
          });
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(failure(e));
      });
    return () => controller.abort();
  }, [id, retry]);
  if (error)
    return <Notice onRetry={() => setRetry((n) => n + 1)}>{te(error)}</Notice>;
  if (!data) return <p role="status">{t("Loading service\u2026")}</p>;
  const { skill, media = [] } = data;
  function whatsapp() {
    const digits = String(skill.provider_phone || "").replace(/\D/g, "");
    if (!digits) {
      setRelatedError("Provider phone number not available.");
      return;
    }
    eventsApi.track("contact_click_whatsapp", {
      skillId: skill.id,
      channel: "whatsapp",
    });
    window.open(
      `https://wa.me/${digits}?text=${encodeURIComponent(t("Hello, I found your service on One Community: {title}",{title:skill.title}))}`,
      "_blank",
      "noopener,noreferrer",
    );
  }
  return (
    <>
      <Gallery
        key={id}
        media={media}
        title={skill.title}
        onEnlarge={onEnlarge}
      />
      <section className={card}>
        <h2 className="text-xl font-semibold break-words">{skill.title}</h2>
        <p className="font-semibold text-slate-500">{locality(skill)}</p>
        <span className="inline-block rounded-full bg-blue-100 text-blue-700 text-xs font-bold px-3 py-2">
          {t("Provider account")}
        </span>
        <p className="text-slate-700 leading-7 whitespace-pre-wrap">
          {skill.description}
        </p>
        <button
          onClick={() =>
            onNavigate({
              kind: "provider",
              id: skill.provider_id,
            })
          }
          className="w-full text-left rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <span className="block text-sm font-bold text-slate-500">
            {t("Provider Profile")}
          </span>
          <span className="block text-base font-semibold mt-1">
            {skill.display_name || t("Provider")}
          </span>
          <span className="block font-bold text-blue-700 mt-3">
            {t("View all provider listings")}
          </span>
        </button>
        <button className={primary} onClick={whatsapp}>
          {t("Contact by WhatsApp")}
        </button>
        <button
          className="w-full min-h-12 rounded-2xl bg-blue-50 text-blue-700 font-bold p-3"
          onClick={() =>
            onNavigate({
              kind: "inquiry",
              skill,
            })
          }
        >
          {t("Send email inquiry")}
        </button>
      </section>
      <ReviewsPanel
        key={`${skill.provider_id}:${skill.id}`}
        providerId={skill.provider_id}
        skillId={skill.id}
      />
      <section aria-label={t("Similar listings")}>
        <h2 className="text-xl font-semibold mb-3">{t("Similar listings")}</h2>
        {relatedError ? (
          <Notice onRetry={() => setRetry((n) => n + 1)}>
            {te(relatedError)}
          </Notice>
        ) : similar === null ? (
          <p role="status">{t("Loading similar listings\u2026")}</p>
        ) : similar.length ? (
          <ListingGrid
            items={similar}
            onOpen={(next) =>
              onNavigate({
                kind: "detail",
                id: next,
              })
            }
          />
        ) : (
          <p className="text-slate-500">{t("No similar listings yet.")}</p>
        )}
      </section>
    </>
  );
}
function Provider({ id, onNavigate }) {
  useLocale();
  const [profile, setProfile] = useState(null),
    [items, setItems] = useState([]),
    [page, setPage] = useState(0),
    [more, setMore] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    const controller = new AbortController();
    setError("");
    setProfile(null);
    setItems([]);
    setBusy(true);
    Promise.all([
      api.get(`/providers/${id}/public`, {
        signal: controller.signal,
      }),
      api.get("/skills/search", {
        params: {
          provider_id: id,
        },
        signal: controller.signal,
      }),
    ])
      .then(([p, s]) => {
        if (controller.signal.aborted) return;
        setProfile(p.data.provider);
        setItems(s.data.results || []);
        setPage(1);
        setMore(s.data.hasMore);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(failure(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => {
      live.current = false;
      controller.abort();
    };
  }, [id, retry]);
  async function loadMore() {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.get("/skills/search", {
        params: {
          provider_id: id,
          page: page + 1,
        },
      });
      if (!live.current) return;
      setItems((old) => [...old, ...data.results]);
      setPage((n) => n + 1);
      setMore(data.hasMore);
    } catch (e) {
      if (live.current) setError(failure(e));
    } finally {
      if (live.current) setBusy(false);
    }
  }
  return (
    <>
      {error && (
        <Notice onRetry={profile ? loadMore : () => setRetry((n) => n + 1)}>
          {te(error)}
        </Notice>
      )}
      {!profile ? (
        busy && <p role="status">{t("Loading provider\u2026")}</p>
      ) : (
        <>
          <section className={card}>
            <h2 className="text-xl font-semibold">
              {profile.display_name || t("Provider")}
            </h2>
            {locality(profile) && (
              <p className="text-slate-500">{locality(profile)}</p>
            )}
            <span className="inline-block rounded-full bg-blue-100 text-blue-700 text-xs font-bold px-3 py-2">
              {t("Provider account")}
            </span>
            {profile.bio && <p>{profile.bio}</p>}
          </section>
          <div className="flex justify-between gap-3">
            <h2 className="text-xl font-semibold">{t("Provider listings")}</h2>
            <span className="text-sm text-slate-500">
              {items.length}
              {t("skills")}
            </span>
          </div>
          {items.length ? (
            <ListingGrid
              items={items}
              onOpen={(next) =>
                onNavigate({
                  kind: "detail",
                  id: next,
                })
              }
            />
          ) : (
            <p>{t("No listings available.")}</p>
          )}
          {more && (
            <button disabled={busy} onClick={loadMore} className={secondary}>
              {busy ? t("Loading…") : t("Load more listings")}
            </button>
          )}
          <ReviewsPanel key={id} providerId={id} />
        </>
      )}
    </>
  );
}
function Inquiry({ skill }) {
  useLocale();
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [message, setMessage] = useState(
      t("Hello, I am interested in {title}. Please contact me with more details.",{title:skill.title}),
    ),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  async function submit(e) {
    e.preventDefault();
    const text = message.trim() + "\n\nSender name: " + name.trim();
    if (!name.trim() || message.trim().length < 10 || text.length > 2000) {
      setNotice(
        "Enter your name and a message of at least 10 characters (up to 2,000 including your name).",
      );
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      await contactApi.emailInquiry({
        skillId: skill.id,
        fromEmail: email.trim(),
        message: text,
      });
      eventsApi.track("contact_click_email", {
        skillId: skill.id,
        channel: "email",
      });
      if (live.current) {
        setNotice("Inquiry sent. The provider will reply to your email.");
        setMessage("");
      }
    } catch (e) {
      if (live.current)
        setNotice(
          e?.response?.data?.error || "Unable to send inquiry. Please retry.",
        );
    } finally {
      if (live.current) setBusy(false);
    }
  }
  const input =
    "block mt-1 w-full rounded-xl border border-slate-200 bg-white p-3";
  return (
    <form onSubmit={submit} className={card}>
      <h2 className="text-xl font-semibold">{t("Send email inquiry")}</h2>
      <p className="text-slate-600">
        {t("Enter your email address and a clear message for the provider.")}
      </p>
      <label className="block">
        {t("Your name")}
        <input
          autoComplete="name"
          required
          maxLength={100}
          disabled={busy}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={input}
        />
      </label>
      <label className="block">
        {t("Your email address")}
        <input
          type="email"
          autoComplete="email"
          required
          disabled={busy}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={input}
        />
      </label>
      <label className="block">
        {t("Message")}
        <textarea
          required
          minLength={10}
          maxLength={1800}
          rows={5}
          disabled={busy}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={input}
        />
      </label>
      {notice && (
        <p role="status" className="text-sm">
          {t(notice)}
        </p>
      )}
      <button disabled={busy} className={primary}>
        {busy ? t("Sending…") : t("Submit inquiry")}
      </button>
    </form>
  );
}
export default function SkillModal({ skillId, onClose }) {
  useLocale();
  const dialog = useRef(null),
    body = useRef(null),
    backButton = useRef(null),
    scrolls = useRef([]);
  const [stack, setStack] = useState([
      {
        kind: "detail",
        id: skillId,
      },
    ]),
    [viewer, setViewer] = useState(null);
  const view = stack.at(-1);
  useEffect(() => {
    const trigger = document.activeElement,
      overflow = document.body.style.overflow;
    dialog.current.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.current?.close();
      document.body.style.overflow = overflow;
      trigger?.focus?.();
    };
  }, []);
  function navigate(next) {
    scrolls.current.push(body.current?.scrollTop || 0);
    setStack((old) => [...old, next]);
    body.current?.scrollTo(0, 0);
    backButton.current?.focus();
  }
  function back() {
    if (viewer) {
      setViewer(null);
      return;
    }
    if (stack.length === 1) {
      onClose();
      return;
    }
    const y = scrolls.current.pop() || 0;
    setStack((old) => old.slice(0, -1));
    requestAnimationFrame(() => body.current?.scrollTo(0, y));
  }
  const title = viewer
    ? "Photo"
    : view.kind === "provider"
      ? "Provider Profile"
      : view.kind === "inquiry"
        ? "Email inquiry"
        : "Service Details";
  return (
    <dialog
      ref={dialog}
      aria-label={t(title)}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const controls = [
          ...dialog.current.querySelectorAll(
            "button,a[href],input,textarea,select,[tabindex]",
          ),
        ].filter(
          (el) =>
            !el.disabled && el.tabIndex >= 0 && el.getClientRects().length > 0,
        );
        const first = controls[0],
          last = controls.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        back();
      }}
      className="m-auto p-0 w-full max-w-2xl h-[100dvh] max-h-[100dvh] sm:h-[92dvh] sm:rounded-3xl bg-slate-50 text-slate-900 backdrop:bg-slate-900/50"
    >
      <div className="h-full flex flex-col">
        <LanguageSwitch />
        <header className="flex items-center gap-2 p-3 border-b border-slate-200 bg-slate-50">
          <button ref={backButton} className={secondary} onClick={back}>
            {t("\u2039 Back")}
          </button>
          <h1 className="flex-1 text-center font-semibold text-base">
            {t(title)}
          </h1>
          <button className={secondary} onClick={onClose}>
            {t("Close")}
          </button>
        </header>
        <div ref={body} className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
          {viewer ? (
            <>
              <img
                src={viewer.photos[viewer.index].url}
                alt={`Service image ${viewer.index + 1}`}
                className="w-full h-[65dvh] object-contain"
              />
              <div className="flex justify-between items-center gap-3">
                <button
                  className={secondary}
                  aria-label={t("Previous enlarged image")}
                  onClick={() =>
                    setViewer((v) => ({
                      ...v,
                      index: (v.index - 1 + v.photos.length) % v.photos.length,
                    }))
                  }
                >
                  ‹
                </button>
                <span>
                  {viewer.index + 1} / {viewer.photos.length}
                </span>
                <button
                  className={secondary}
                  aria-label={t("Next enlarged image")}
                  onClick={() =>
                    setViewer((v) => ({
                      ...v,
                      index: (v.index + 1) % v.photos.length,
                    }))
                  }
                >
                  ›
                </button>
              </div>
            </>
          ) : null}
          <div hidden={Boolean(viewer)} className="space-y-4">
            {stack.map((entry, index) => (
              <div
                key={
                  index + ":" + entry.kind + ":" + (entry.id || entry.skill?.id)
                }
                hidden={index !== stack.length - 1}
                className="space-y-4"
              >
                {entry.kind === "detail" ? (
                  <Detail
                    id={entry.id}
                    onNavigate={navigate}
                    onEnlarge={(photos, index) =>
                      setViewer({
                        photos,
                        index,
                      })
                    }
                  />
                ) : entry.kind === "provider" ? (
                  <Provider id={entry.id} onNavigate={navigate} />
                ) : (
                  <Inquiry skill={entry.skill} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </dialog>
  );
}
