import { useSyncExternalStore, useEffect } from "react";
import { subscribe, getLanguage, initializeLanguage } from "./store";
export { t, te, setLanguage, getLanguage } from "./store";
export function useLocale() {
  const value = useSyncExternalStore(subscribe, getLanguage, () => "en");
  useEffect(() => {
    initializeLanguage();
  }, []);
  return value;
}
