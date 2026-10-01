import React from "react";
import { useLocale, setLanguage } from "./index";
export default function LanguageSwitch() {
  const language = useLocale();
  return (
    <div
      className="flex items-center justify-end gap-1 px-4 bg-slate-50 border-b border-slate-200 h-11"
      role="group"
      aria-label="Language / Langue"
    >
      {["en", "fr"].map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-label={code === "en" ? "English" : "Français"}
          aria-pressed={language === code}
          onClick={() => setLanguage(code)}
          className={`min-h-10 min-w-11 rounded-lg text-sm ${language === code ? "bg-blue-700 text-white" : "text-blue-700"}`}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
