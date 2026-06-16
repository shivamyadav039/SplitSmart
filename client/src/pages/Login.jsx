import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { LogIn, Key, Mail, UserCheck, Plane, Home as HomeIcon, Heart, Asterisk, Sparkles } from 'lucide-react';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Rotating showcase text
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const words = [
    { text: 'on trips.', icon: Plane, color: 'text-teal-400', bg: 'bg-teal-500/10', graphic: 'plane' },
    { text: 'with housemates.', icon: HomeIcon, color: 'text-purple-400', bg: 'bg-purple-500/10', graphic: 'house' },
    { text: 'with partners.', icon: Heart, color: 'text-rose-400', bg: 'bg-rose-500/10', graphic: 'heart' },
    { text: 'with anyone.', icon: Asterisk, color: 'text-amber-400', bg: 'bg-amber-500/10', graphic: 'spark' }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveWordIndex((prev) => (prev + 1) % words.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const activeWord = words[activeWordIndex];

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
      let details = err.response?.data?.error || err.response?.data?.details || err.message;
      if (typeof details === 'object' && details !== null) {
        details = details.message || JSON.stringify(details);
      }
      setError(`Failed to log in as ${persona}. Details: ${details}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col lg:flex-row bg-[#F2F2F2] font-sans">
      
      {/* ================= LEFT CREATIVE PANEL ================= */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#333333] text-white flex-col justify-center p-16 space-y-8 relative overflow-hidden border-r border-gray-800">
        
        {/* Animated polygon background */}
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-white/5 rounded-full filter blur-2xl"></div>
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#1CC29F]/10 rounded-full filter blur-3xl"></div>

        <div className="space-y-4 z-10 max-w-md">
          <div className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1CC29F] to-[#06B6D4] flex items-center justify-center font-black text-xs text-white">
              S
            </span>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-[#1cc29f] to-[#06b6d4] bg-clip-text text-transparent">
              SplitSmart
            </span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight leading-tight text-white/95">
            Split the damage, <br />
            keep the vibes <br />
            <span className={`inline-block transition-all duration-500 transform ${activeWord.color}`}>
              {activeWord.text}
            </span>
          </h1>

          <p className="text-gray-400 text-sm leading-relaxed">
            Keep track of shared flat bills, travel groups, housemate expenses, and settle balances dynamically in real-time.
          </p>
        </div>

        {/* Dynamic SVG graphic */}
        <div className="w-48 h-48 flex items-center justify-center bg-white/5 rounded-3xl border border-white/5 shadow-inner p-6 z-10 animate-float mx-auto">
          {activeWord.graphic === 'plane' && (
            <svg className="w-full h-full text-teal-400" viewBox="0 0 100 100" fill="currentColor">
              <path d="M50 15L15 45L40 45L40 85L60 85L60 45L85 45Z" transform="rotate(45 50 50)" opacity="0.85" />
            </svg>
          )}
          {activeWord.graphic === 'house' && (
            <svg className="w-full h-full text-purple-400" viewBox="0 0 100 100" fill="currentColor">
              <path d="M50 12L10 46v42h80V46L50 12zm22 66H60V58H40v20H28V48l22-19 22 19v30z" opacity="0.85" />
            </svg>
          )}
          {activeWord.graphic === 'heart' && (
            <svg className="w-full h-full text-rose-400" viewBox="0 0 100 100" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" transform="scale(3.8) translate(2, 1)" opacity="0.85" />
            </svg>
          )}
          {activeWord.graphic === 'spark' && (
            <svg className="w-full h-full text-amber-400" viewBox="0 0 100 100" fill="currentColor">
              <path d="M50 10l5 25 25 5-25 5-5 25-5-25-25-5 25-5z" opacity="0.85" />
            </svg>
          )}
        </div>

        {/* Ledger mockup card */}
        <div className="w-64 bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-sans hover-lift z-10 mx-auto">
          <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
            <span className="font-bold text-gray-400 uppercase tracking-widest text-[9px]">Live Ledger</span>
            <span className="text-[#1CC29F] font-bold text-[9px]">Synced</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between font-bold text-gray-300">
              <span>Aisha (You)</span>
              <span className="text-[#1CC29F] font-black">is owed ₹1,550</span>
            </div>
            <div className="flex items-center justify-between text-gray-400">
              <span>Rohan</span>
              <span className="text-red-400">owes ₹850</span>
            </div>
            <div className="flex items-center justify-between text-gray-400">
              <span>Priya</span>
              <span className="text-red-400">owes ₹700</span>
            </div>
          </div>
        </div>

      </div>

      {/* ================= RIGHT FORM PANEL ================= */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md bg-white border border-gray-200/80 rounded-2xl shadow-sm p-8 space-y-6 animate-fade-in-up">
          
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-gray-800">
              Welcome back
            </h2>
            <p className="text-xs text-gray-400">Log in to manage your flat shares and bills.</p>
          </div>

          {sessionExpired && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
              <Sparkles size={12} className="text-amber-500 animate-pulse" />
              <span>Your session has expired. Please log in again.</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-500 text-xs font-semibold text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
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
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Password
                </label>
                <a href="#forgot" className="text-[#1CC29F] hover:underline text-[10px] font-bold">
                  Forgot password?
                </a>
              </div>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-2.5 rounded-lg bg-[#1CC29F] hover:bg-[#19b896] font-extrabold text-white transition-colors disabled:opacity-50 cursor-pointer shadow-sm text-xs uppercase tracking-wider hover-lift"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent border-white"></div>
              ) : (
                <span className="flex items-center space-x-1.5">
                  <LogIn size={14} />
                  <span>Log in</span>
                </span>
              )}
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-gray-150"></div>
            <span className="flex-shrink mx-4 text-xs font-bold text-gray-400 uppercase tracking-widest">or</span>
            <div className="flex-grow border-t border-gray-150"></div>
          </div>

          <button
            onClick={() => alert('Google SSO is simulated. Please select a demo user below for instant swappable login.')}
            className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 bg-white font-bold text-xs text-gray-600 transition-all cursor-pointer hover-lift shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.477 0-6.3-2.823-6.3-6.3s2.823-6.3 6.3-6.3c1.63 0 3.106.623 4.22 1.637l3.13-3.13C19.16 2.502 15.89 1.1 12.24 1.1 6.138 1.1 1.1 6.138 1.1 12.24s5.038 11.14 11.14 11.14c6.12 0 11.12-5.02 11.12-11.12 0-.672-.06-1.32-.178-1.975H12.24z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>

          {/* Quick Demo Persona Switcher */}
          <div className="border-t border-gray-100 pt-5 space-y-3.5">
            <div className="flex items-center justify-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              <UserCheck size={12} className="text-[#1CC29F]" />
              <span>Quick Demo Switcher</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {['Aisha', 'Rohan', 'Priya', 'Sam', 'Meera', 'Dev'].map((persona) => (
                <button
                  key={persona}
                  onClick={() => handleQuickLogin(persona)}
                  disabled={loading}
                  className="py-2 px-1 rounded-xl bg-gray-50 hover:bg-[#1CC29F]/10 border border-gray-200/80 text-[10px] font-extrabold text-gray-600 hover:text-[#19B896] transition-all text-center truncate cursor-pointer"
                >
                  {persona}
                </button>
              ))}
            </div>
          </div>

          <div className="text-center border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500">
              New to SplitSmart?{' '}
              <Link to="/register" className="text-[#1CC29F] hover:underline font-bold">
                Register Here
              </Link>
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};

export default Login;
