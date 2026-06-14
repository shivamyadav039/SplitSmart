import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { User, Mail, Key, UserPlus } from 'lucide-react';

export const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 bg-[#F2F2F2]">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-8 space-y-6 animate-fade-in-up">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-gray-800">
            Sign up
          </h2>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-gray-600">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#1CC29F] focus:ring-1 focus:ring-[#1CC29F] transition-all bg-white"
            />
          </div>

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

          <div className="space-y-1">
            <label className="text-sm text-gray-600">
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              <span>Sign up</span>
            )}
          </button>
        </form>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-[#1CC29F] hover:underline font-semibold">
              Sign In Here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
export default Register;
