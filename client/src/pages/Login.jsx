import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { LogIn, Key, Mail, UserCheck } from 'lucide-react';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if session expired warning is present in search queries
  const queryParams = new URLSearchParams(location.search);
  const sessionExpired = queryParams.get('expired') === 'true';

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to sign in. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Quick demo switcher function
  const handleQuickLogin = async (persona) => {
    setError('');
    setLoading(true);
    const demoEmail = `${persona.toLowerCase()}@demo.com`;
    const demoPassword = 'demo123';

    try {
      await login(demoEmail, demoPassword);
      navigate(from, { replace: true });
    } catch (err) {
      setError(`Failed to log in as ${persona}. Ensure the database is seeded.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 bg-[#F2F2F2]">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-8 space-y-6 animate-fade-in-up">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-gray-800">
            Log in
          </h2>
        </div>

        {sessionExpired && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium text-center">
            Your session has expired. Please log in again.
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-gray-600">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#1CC29F] focus:ring-1 focus:ring-[#1CC29F] transition-all bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-600">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#1CC29F] focus:ring-1 focus:ring-[#1CC29F] transition-all bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-2.5 rounded-lg bg-[#1CC29F] hover:bg-[#19b896] font-semibold text-white transition-colors disabled:opacity-50 cursor-pointer shadow-sm text-sm hover-lift"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent border-white"></div>
            ) : (
              <span>Log in</span>
            )}
          </button>
        </form>

        <div className="text-center">
          <a href="#forgot" className="text-[#1CC29F] hover:underline text-sm font-medium">
            Forgot your password?
          </a>
        </div>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink mx-4 text-xs text-gray-400">or</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <button
          onClick={() => alert('OAuth login is simulated. Please use the persona switcher below.')}
          className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 bg-white font-medium text-sm text-gray-700 transition-colors cursor-pointer"
        >
          {/* Simple Google SVG Icon */}
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.477 0-6.3-2.823-6.3-6.3s2.823-6.3 6.3-6.3c1.63 0 3.106.623 4.22 1.637l3.13-3.13C19.16 2.502 15.89 1.1 12.24 1.1 6.138 1.1 1.1 6.138 1.1 12.24s5.038 11.14 11.14 11.14c6.12 0 11.12-5.02 11.12-11.12 0-.672-.06-1.32-.178-1.975H12.24z"
            />
          </svg>
          <span>Sign in with Google</span>
        </button>

        {/* Quick Demo Login Switcher Panel */}
        <div className="border-t border-gray-200 pt-6 space-y-4">
          <div className="flex items-center justify-center space-x-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            <UserCheck size={14} />
            <span>Quick Demo Login</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {['Aisha', 'Rohan', 'Priya', 'Sam', 'Meera', 'Dev'].map((persona) => (
              <button
                key={persona}
                onClick={() => handleQuickLogin(persona)}
                disabled={loading}
                className="py-2 px-1 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 text-xs font-semibold text-gray-600 transition-all text-center truncate cursor-pointer"
              >
                {persona}
              </button>
            ))}
          </div>
        </div>

        <div className="text-center pt-2">
          <p className="text-xs text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#1CC29F] hover:underline font-semibold">
              Register Here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
export default Login;
