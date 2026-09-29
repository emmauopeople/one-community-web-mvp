//import { Link } from "react-router-dom";
import AuthLayout from "../../components/layout/AuthLayout";
import { useNavigate, Link } from "react-router-dom";

export default function VerifyCodePage() {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate("/reset-password");
  };
  return (
    <AuthLayout
      title="Verify Code"
      subtitle="Enter the verification code sent to your email."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Verification Code
          </label>
          <input
            type="text"
            placeholder="Enter code"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-green-500 text-white py-2 font-medium hover:from-blue-700 hover:to-green-600 transition"
        >
          Verify Code Now
        </button>

        <div className="text-center">
          <Link
            to="/forgot-password"
            className="text-sm text-blue-600 hover:text-green-600 hover:underline"
          >
            Back
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
