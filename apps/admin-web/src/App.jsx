import LanguageSwitch from "./i18n/LanguageSwitch";
import { BrowserRouter } from "react-router-dom";
import AuthProvider from "./context/AuthProvider";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    <AuthProvider>
      <LanguageSwitch />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
