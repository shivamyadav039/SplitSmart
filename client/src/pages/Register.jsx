import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { User, Mail, Key, UserPlus, CheckCircle2, ShieldCheck, Sparkles, Layers } from 'lucide-react';

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
    <div className="min-h-[calc(100vh-64px)] flex flex-col lg:flex-row bg-[#F2F2F2] font-sans">
      
      {/* ================= LEFT CREATIVE PANEL ================= */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-tr from-[#1CC29F] to-[#06B6D4] text-white flex-col justify-center p-16 space-y-8 relative overflow-hidden border-r border-[#19b896]/30">
        
        {/* Background abstract overlay details */}
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-white/5 rounded-full filter blur-2xl"></div>
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full filter blur-3xl"></div>

        <div className="space-y-4 z-10 max-w-md">
          <div className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-xl bg-white text-[#1CC29F] flex items-center justify-center font-black text-xs shadow-sm">
              S
            </span>
            <span className="font-extrabold text-xl tracking-tight text-white">
              SplitSmart
            </span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight leading-tight text-white">
            Join SplitSmart Today
          </h1>

          <p className="text-teal-50 text-sm leading-relaxed">
            Create an account to start tracking flatmate shares, organizing trip expenses, and settling ledger balances dynamically.
          </p>
        </div>

        {/* Bullet features checklist */}
        <div className="space-y-3 z-10 max-w-sm">
          <div className="flex items-start space-x-3 text-xs font-bold text-white/95">
            <CheckCircle2 size={16} className="text-white shrink-0 mt-0.5" />
            <div>
              <p>Split Bills Equally or Custom Weights</p>
              <p className="text-[10px] text-teal-50 font-normal">Divide by equal shares, percentages, custom amounts, or shares weight.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3 text-xs font-bold text-white/95">
            <ShieldCheck size={16} className="text-white shrink-0 mt-0.5" />
            <div>
              <p>Multi-Currency Snapshot Rates</p>
              <p className="text-[10px] text-teal-50 font-normal">Supports INR and USD expenses, fixed instantly at $1 USD = ₹84 INR.</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 text-xs font-bold text-white/95">
            <Layers size={16} className="text-white shrink-0 mt-0.5" />
            <div>
              <p>Chronological Timeline Invariants</p>
              <p className="text-[10px] text-teal-50 font-normal">Automatically checks that split participants were active on the bill date.</p>
            </div>
          </div>
        </div>

        {/* Onboarding Feed Mockup Card */}
        <div className="w-64 bg-white rounded-3xl shadow-2xl p-5 text-gray-800 space-y-4 mx-auto border border-white/10 hover-lift z-10">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="font-extrabold text-[9px] text-gray-400 uppercase tracking-widest">Shared Rent</span>
            <span className="bg-[#1CC29F]/10 text-[#1CC29F] px-1.5 py-0.5 rounded text-[9px] font-bold">Active</span>
          </div>
          
          <div className="space-y-3 text-xs">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-extrabold text-gray-700">February rent</div>
                <div className="text-[9px] text-gray-400">Paid by Aisha</div>
              </div>
              <div className="text-right">
                <div className="font-black text-gray-800">₹48,000</div>
                <div className="text-[9px] text-gray-400">₹12,000 share</div>
              </div>
            </div>
            
            <div className="flex items-start justify-between">
              <div>
                <div className="font-extrabold text-gray-700">Wifi bill Feb</div>
                <div className="text-[9px] text-gray-400">Paid by Rohan</div>
              </div>
              <div className="text-right">
                <div className="font-black text-gray-800">₹1,199</div>
                <div className="text-[9px] text-gray-400">₹300 share</div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ================= RIGHT FORM PANEL ================= */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md bg-white border border-gray-200/80 rounded-2xl shadow-sm p-8 space-y-6 animate-fade-in-up">
          
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-gray-800">
              Create Account
            </h2>
            <p className="text-xs text-gray-400">Sign up to get started sharing bills.</p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-500 text-xs font-semibold text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#1CC29F] focus:ring-1 focus:ring-[#1CC29F] transition-all bg-white"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#1CC29F] focus:ring-1 focus:ring-[#1CC29F] transition-all bg-white"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Key size={16} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#1CC29F] focus:ring-1 focus:ring-[#1CC29F] transition-all bg-white"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Key size={16} />
                </div>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#1CC29F] focus:ring-1 focus:ring-[#1CC29F] transition-all bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-2.5 rounded-lg bg-[#1CC29F] hover:bg-[#19b896] font-extrabold text-white transition-colors disabled:opacity-50 cursor-pointer shadow-sm text-xs uppercase tracking-wider hover-lift"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent border-white"></div>
              ) : (
                <span className="flex items-center space-x-1.5">
                  <UserPlus size={14} />
                  <span>Sign up</span>
                </span>
              )}
            </button>
          </form>

          <div className="text-center border-t border-gray-100 pt-5">
            <p className="text-xs text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-[#1CC29F] hover:underline font-bold">
                Sign In Here
              </Link>
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};

export default Register;
