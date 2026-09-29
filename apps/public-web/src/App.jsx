import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LandingPage from "./pages/Landing/LandingPage.jsx";
import ProviderAuth from "./pages/Provider/ProviderAuth.jsx";
import ProviderPortal from "./pages/Provider/ProviderPortal.jsx";
import SearchPage from "./pages/Search/SearchPage.jsx";

import { AuthProvider } from "./app/state/auth.store.jsx";
import ProviderGuard from "./app/guards/ProviderGuard.jsx";
import ProviderProfile from "./pages/Provider/ProviderProfile.jsx";

// keep this import if your file is here
import ProviderSkills from "./app/pages/provider/ProviderSkills.jsx";
import ContactPage from "./pages/Contact/ContactPage.jsx";
import ProviderRequests from "./pages/Provider/ProviderRequests.jsx";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/provider/auth" element={<ProviderAuth />} />

        <Route
          path="/provider/portal"
          element={
            <ProviderGuard>
              <ProviderPortal />
            </ProviderGuard>
          }
        />

        <Route
          path="/provider/skills"
          element={
            <ProviderGuard>
              <ProviderSkills />
            </ProviderGuard>
          }
        />

        <Route
          path="/provider/profile"
          element={
            <ProviderGuard>
              <ProviderProfile />
            </ProviderGuard>
          }
        />
        <Route
          path="/provider/requests"
          element={
            <ProviderGuard>
              <ProviderRequests />
            </ProviderGuard>
          }
        />

        <Route path="/search" element={<SearchPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
