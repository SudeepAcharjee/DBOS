import React, { useState } from "react";
import { account } from "../appwrite";

const AdminLogin = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryAfter, setRetryAfter] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // Countdown timer for rate limit
  React.useEffect(() => {
    if (retryAfter) {
      const timer = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, retryAfter - now);
        setTimeLeft(Math.ceil(remaining / 1000));

        if (remaining <= 0) {
          setRetryAfter(null);
          setTimeLeft(0);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [retryAfter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Create email session with Appwrite
      await account.createEmailPasswordSession(email, password);

      // Get user details
      const user = await account.get();

      // Check if user is admin (you can customize this logic)
      const isAdmin =
        email.toLowerCase().includes("admin") ||
        email.toLowerCase().includes("administrator") ||
        email.endsWith("@admin.dbos.com") ||
        email.endsWith("@dbos.com") ||
        email === "sudeepacharjeegp@gmail.com";

      if (!isAdmin) {
        await account.deleteSession("current");
        setError("Access denied. Admin privileges required.");
        return;
      }

      // Login successful
      onLogin(user);
    } catch (error) {
      console.error("Login error:", error);

      // Handle specific error types
      if (error.message.includes("Rate limit")) {
        setError(
          "Too many login attempts. Please wait 5-10 minutes before trying again."
        );
        setRetryAfter(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      } else if (error.message.includes("missing scopes")) {
        setError(
          "Authentication configuration error. Please contact administrator."
        );
      } else if (error.message.includes("Invalid credentials")) {
        setError("Invalid email or password. Please check your credentials.");
      } else if (error.message.includes("User not found")) {
        setError("User account not found. Please contact administrator.");
      } else {
        setError(error.message || "Login failed. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-20 w-20 flex items-center justify-center">
            <img
              src="/DBOS-logo-300x300.png"
              alt="DBOS Logo"
              className="h-16 w-16 object-contain"
            />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Admin Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Dihing Board of Open Schooling
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || retryAfter}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Signing in...
                </div>
              ) : retryAfter ? (
                `Try again in ${timeLeft}s`
              ) : (
                "Sign in"
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Only authorized administrators can access this area.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
