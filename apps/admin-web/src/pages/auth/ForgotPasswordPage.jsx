import { Link } from "react-router-dom";
import AuthLayout from "../../components/layout/AuthLayout";
import { useNavigate } from "react-router-dom";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate("/verify-code");
  };
  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Enter your admin email and we will send a verification code."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            placeholder="admin@example.com"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-green-500 text-white py-2 font-medium hover:from-blue-700 hover:to-green-600 transition"
        >
          Send Code
        </button>

        <div className="text-center">
          <Link
            to="/"
            className="text-sm text-blue-600 hover:text-green-600 hover:underline"
          >
            Back to Login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
