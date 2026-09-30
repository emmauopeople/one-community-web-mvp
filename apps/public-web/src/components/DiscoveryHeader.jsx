import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/images/appLogo.png";
const categories = [
  "carpentry",
  "plumbing",
  "cleaning",
  "tutor",
  "hair-beauty",
  "mechanic",
  "catering",
  "painting",
  "tailor",
  "trucker",
];
export default function DiscoveryHeader({
  category,
  onCategory,
  radius,
  onRadius,
}) {
  const menu = useRef(null),
    help = useRef(null),
    trigger = useRef(null);
  useEffect(() => {
    const dismiss = (e) => {
      if (menu.current && !menu.current.contains(e.target))
        menu.current.open = false;
    };
    const escape = (e) => {
      if (e.key === "Escape" && menu.current?.open) {
        menu.current.open = false;
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  return (
    <header className="rounded-3xl border border-blue-200 bg-blue-50 p-4 relative">
      <div className="flex items-center gap-3">
        <img
          src={logo}
          alt=""
          width="40"
          height="40"
          className="h-10 w-10 object-contain"
        />
        <Link to="/" className="min-w-0 flex-1">
          <span className="block font-extrabold text-blue-800 text-base sm:text-xl">
            One Community
          </span>
          <span className="block text-xs font-semibold text-emerald-700">
            Local service network
          </span>
        </Link>
        <details ref={menu} className="relative">
          <summary
            ref={trigger}
            aria-label="Open menu"
            className="list-none [&::-webkit-details-marker]:hidden cursor-pointer h-11 w-11 flex items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-700 text-xl"
          >
            ☰
          </summary>
          <nav
            aria-label="Discovery menu"
            className="absolute right-0 top-12 w-64 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl p-3 z-30"
          >
            <Link
              to="/provider/auth"
              className="block p-3 font-bold text-blue-700"
            >
              Provider →
            </Link>
            <label className="block p-3 text-sm font-semibold">
              Categories
              <select
                aria-label="Categories"
                className="block mt-2 w-full rounded-xl border p-2 bg-white"
                value={category}
                onChange={(e) => {
                  onCategory(e.target.value);
                  menu.current.open = false;
                }}
              >
                <option value="">All</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c.replace("-", " / ")}
                  </option>
                ))}
              </select>
            </label>
            <details className="p-3">
              <summary className="cursor-pointer text-sm font-semibold">
                Distance · {radius} km
              </summary>
              <form
                className="mt-3 space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const value = Number(
                    new FormData(e.currentTarget).get("distance"),
                  );
                  if (Number.isFinite(value) && value >= 1 && value <= 100) {
                    onRadius(value);
                    menu.current.open = false;
                  }
                }}
              >
                <label className="block text-sm" htmlFor="distance">
                  Custom distance (1–100 km)
                </label>
                <input
                  id="distance"
                  name="distance"
                  type="number"
                  min="1"
                  max="100"
                  step="any"
                  required
                  defaultValue={radius}
                  key={radius}
                  className="w-full border p-2 rounded-lg"
                />
                <button className="bg-blue-700 text-white rounded-lg min-h-11 px-4">
                  Apply
                </button>
              </form>
            </details>
            <button
              onClick={() => {
                menu.current.open = false;
                help.current.showModal();
              }}
              className="w-full text-left p-3 font-semibold text-blue-700"
            >
              Get started
            </button>
          </nav>
        </details>
      </div>
      <h1 className="text-2xl sm:text-3xl font-extrabold mt-4">
        Trusted Services
      </h1>
      <dialog
        ref={help}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl p-5 backdrop:bg-slate-900/40 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Get started</h2>
          <button
            onClick={() => help.current.close()}
            className="min-h-11 px-3 text-blue-700 font-semibold"
          >
            Close
          </button>
        </div>
        <div className="space-y-3 text-sm leading-6 mt-3">
          <p>
            Search for a service, town or area. Use Categories in the menu to
            narrow results, or choose All.
          </p>
          <p>
            Turn on Use location for services within 10 km. Change Distance in
            the menu for a radius from 1 to 100 km. Visitors can search without
            location access.
          </p>
          <p>
            Open a service to see details and contact its provider. Open
            Provider to sign in or create an account. Provider registration
            requires GPS consent and a confirmed operating location.
          </p>
          <p>
            Weather starts with Douala. Change its city or enable location to
            see nearby weather. Weather availability never blocks service
            listings.
          </p>
        </div>
      </dialog>
    </header>
  );
}
