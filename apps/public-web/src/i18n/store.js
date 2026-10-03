import en from "./en.json";
import fr from "./fr.json";
import storage from "./storage";
let language = "en",
  initialized = false,
  changed = false,
  writing = Promise.resolve();
const listeners = new Set();
export const getLanguage = () => language;
export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const emit = () => {
  if (typeof document !== "undefined") document.documentElement.lang = language;
  listeners.forEach((fn) => fn());
};
export async function initializeLanguage() {
  if (initialized) return;
  initialized = true;
  const saved = await storage.read();
  if (!changed && (saved === "en" || saved === "fr")) {
    language = saved;
    emit();
  }
}
export function setLanguage(next) {
  if (next !== "en" && next !== "fr") return;
  changed = true;
  language = next;
  emit();
  writing = writing.then(() => storage.write(next)).catch(() => {});
}
export function t(key, values = {}) {
  if (typeof key !== "string") return key;
  const catalog = language === "fr" ? fr : en;
  const text = Object.hasOwn(catalog, key) ? catalog[key] : key;
  return text.replace(/\{(\w+)\}/g, (match, name) =>
    Object.hasOwn(values, name) ? String(values[name]) : match,
  );
}
// Only apply to system errors, never user-authored messages or reviews.
export function te(key) {
  if (!key) return key;
  return language === "fr" && !Object.hasOwn(fr, key)
    ? fr["Something went wrong. Please try again."]
    : t(key);
}
