import { t, te, useLocale } from "../../i18n/index.js";
export default function AuthLayout({ title, subtitle, children }) {
  useLocale();
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-xl font-semibold text-gray-800 mb-2">{t(title)}</h1>
        {subtitle && <p className="text-sm text-gray-500 mb-6">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
