import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Plane, Home as HomeIcon, Heart, Asterisk, ArrowRight, ShieldCheck, Zap, Sparkles } from 'lucide-react';

export const Home = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeWordIndex, setActiveWordIndex] = useState(0);

  const words = [
    { text: 'on trips.', icon: Plane, color: 'text-teal-500', bg: 'bg-teal-50', graphic: 'plane' },
    { text: 'with housemates.', icon: HomeIcon, color: 'text-purple-500', bg: 'bg-purple-50', graphic: 'house' },
    { text: 'with partners.', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50', graphic: 'heart' },
    { text: 'with anyone.', icon: Asterisk, color: 'text-amber-500', bg: 'bg-amber-50', graphic: 'spark' }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveWordIndex((prev) => (prev + 1) % words.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const ActiveIcon = words[activeWordIndex].icon;
  const activeWord = words[activeWordIndex];

  return (
    <div className="min-h-screen bg-[#F6F6F6] text-gray-800 flex flex-col font-sans">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-white border-b border-gray-100 py-16 md:py-24 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          
          {/* Left Hero content */}
          <div className="space-y-8 animate-fade-in-up">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-tight">
                Less stress when <br />
                sharing expenses <br />
                <span className={`inline-block transition-all duration-500 transform ${activeWord.color}`}>
                  {activeWord.text}
                </span>
              </h1>
              
              {/* Dynamic animating icons switcher row */}
              <div className="flex items-center space-x-6 pt-2">
                {words.map((item, idx) => {
                  const IconComp = item.icon;
                  const isActive = idx === activeWordIndex;
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-full transition-all duration-300 ${
                        isActive 
                          ? `${item.bg} scale-110 shadow-sm border border-gray-100` 
                          : 'bg-transparent text-gray-300'
                      }`}
                    >
                      <IconComp 
                        size={24} 
                        className={`transition-colors duration-300 ${
                          isActive ? item.color : 'text-gray-300'
                        }`} 
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-lg text-gray-500 max-w-md">
              Keep track of your shared expenses and balances with housemates, trips, groups, friends, and family.
            </p>

            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="px-6 py-3 rounded-lg bg-[#1CC29F] hover:bg-[#19B896] text-white font-semibold flex items-center space-x-2 transition-colors hover-lift shadow-sm cursor-pointer"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight size={18} />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="px-6 py-3 rounded-lg bg-[#1CC29F] hover:bg-[#19B896] text-white font-semibold flex items-center space-x-2 transition-colors hover-lift shadow-sm cursor-pointer"
                  >
                    <span>Sign up</span>
                  </Link>
                  <Link
                    to="/login"
                    className="px-6 py-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold transition-colors hover-lift cursor-pointer"
                  >
                    <span>Log in</span>
                  </Link>
                </>
              )}
            </div>
            
            <p className="text-xs text-gray-400">Free for Web, iPhone, and Android.</p>
          </div>

          {/* Right Hero Visual graphic (Morphing shape or stylized SVG representation) */}
          <div className="flex items-center justify-center animate-fade-in-up">
            <div className="relative w-80 h-80 md:w-96 md:h-96 flex items-center justify-center">
              
              {/* Dynamic SVG graphic illustrating airplane, house, heart or spark depending on active index */}
              <div className="w-72 h-72 md:w-80 md:h-80 transition-all duration-700 transform flex items-center justify-center">
                {activeWord.graphic === 'plane' && (
                  <svg className="w-full h-full text-teal-500 animate-float" viewBox="0 0 100 100" fill="currentColor">
                    <path d="M50 15L15 45L40 45L40 85L60 85L60 45L85 45Z" transform="rotate(45 50 50)" opacity="0.85" />
                    <path d="M30 60L5 70L25 75Z" transform="rotate(45 50 50)" opacity="0.5" />
                    <path d="M70 60L95 70L75 75Z" transform="rotate(45 50 50)" opacity="0.5" />
                  </svg>
                )}
                {activeWord.graphic === 'house' && (
                  <svg className="w-full h-full text-purple-500 animate-float" viewBox="0 0 100 100" fill="currentColor">
                    <path d="M50 12L10 46v42h80V46L50 12zm22 66H60V58H40v20H28V48l22-19 22 19v30z" opacity="0.85" />
                  </svg>
                )}
                {activeWord.graphic === 'heart' && (
                  <svg className="w-full h-full text-rose-500 animate-float" viewBox="0 0 100 100" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" transform="scale(3.8) translate(2, 1)" opacity="0.85" />
                  </svg>
                )}
                {activeWord.graphic === 'spark' && (
                  <svg className="w-full h-full text-amber-500 animate-float" viewBox="0 0 100 100" fill="currentColor">
                    <path d="M50 10l5 25 25 5-25 5-5 25-5-25-25-5 25-5z" opacity="0.85" />
                    <circle cx="20" cy="20" r="4" opacity="0.6" />
                    <circle cx="80" cy="25" r="6" opacity="0.6" />
                    <circle cx="75" cy="75" r="5" opacity="0.6" />
                    <circle cx="25" cy="80" r="4" opacity="0.6" />
                  </svg>
                )}
              </div>

              {/* Background abstract polygons mesh */}
              <div className="absolute inset-0 bg-[#EFEFEF]/60 rounded-full filter blur-3xl -z-10"></div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. Feature Columns Row 1 (Track balances vs Organize expenses) */}
      <section className="grid grid-cols-1 md:grid-cols-2">
        {/* Track Balances Column (Dark Charcoal) */}
        <div className="bg-[#484848] text-white py-16 px-8 flex flex-col items-center justify-center text-center space-y-6 border-r border-[#3a3a3a]">
          <div className="max-w-md space-y-3">
            <h3 className="text-2xl font-bold">Track balances</h3>
            <p className="text-gray-300 text-sm">
              Keep track of shared expenses, balances, and who owes who.
            </p>
          </div>
          
          {/* Mockup phone UI - Friends balance list */}
          <div className="w-64 bg-white border border-gray-100 rounded-3xl shadow-lg p-4 text-gray-800 text-left text-xs font-sans hover-lift">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
              <span className="font-bold text-gray-500">Friends</span>
              <span className="text-teal-500 font-semibold">+ Add friend</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Aisha (You)</span>
                <span className="text-teal-600 font-bold">is owed ₹1,550</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Rohan</span>
                <span className="text-red-500">owes ₹850</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Priya</span>
                <span className="text-red-500">owes ₹700</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Sam</span>
                <span className="text-gray-400">settled up</span>
              </div>
            </div>
          </div>
        </div>

        {/* Organize Expenses Column (ExpenseSync Green/Teal) */}
        <div className="bg-[#1CC29F] text-white py-16 px-8 flex flex-col items-center justify-center text-center space-y-6">
          <div className="max-w-md space-y-3">
            <h3 className="text-2xl font-bold">Organize expenses</h3>
            <p className="text-teal-50 text-sm">
              Split expenses with any group: trips, housemates, friends, and family.
            </p>
          </div>

          {/* Mockup phone UI - Transaction Feed */}
          <div className="w-64 bg-white border border-gray-100 rounded-3xl shadow-lg p-4 text-gray-800 text-left text-xs font-sans hover-lift">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
              <span className="font-bold text-gray-500">Flatmates Group</span>
              <span className="bg-[#1CC29F] text-white px-2 py-0.5 rounded text-[10px]">Active</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-gray-700">February rent</div>
                  <div className="text-[10px] text-gray-400">Paid by Aisha</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">₹48,000</div>
                  <div className="text-[10px] text-gray-400">₹12,000 share</div>
                </div>
              </div>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-gray-700">Wifi bill Feb</div>
                  <div className="text-[10px] text-gray-400">Paid by Rohan</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">₹1,199</div>
                  <div className="text-[10px] text-gray-400">₹300 share</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Feature Columns Row 2 (Add expenses easily vs Pay friends back) */}
      <section className="grid grid-cols-1 md:grid-cols-2">
        {/* Add Expenses easily (Warm Coral/Orange) */}
        <div className="bg-[#FF652F] text-white py-16 px-8 flex flex-col items-center justify-center text-center space-y-6">
          <div className="max-w-md space-y-3">
            <h3 className="text-2xl font-bold">Add expenses easily</h3>
            <p className="text-orange-50 text-sm">
              Quickly add expenses on the go before you forget who paid.
            </p>
          </div>

          {/* Mockup phone UI - Add Expense Screen */}
          <div className="w-64 bg-white border border-gray-100 rounded-3xl shadow-lg p-4 text-gray-800 text-left text-xs font-sans hover-lift">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
              <span className="font-bold text-gray-700">Add an expense</span>
              <span className="text-[#FF652F] font-bold">Save</span>
            </div>
            <div className="space-y-3 pt-1">
              <div className="flex items-center space-x-2 border-b border-gray-200 pb-2">
                <span className="text-gray-400 font-medium">Description:</span>
                <span className="font-bold text-gray-700">Taxi to Airport</span>
              </div>
              <div className="flex items-center space-x-2 border-b border-gray-200 pb-2">
                <span className="text-gray-400 font-medium">Amount:</span>
                <span className="font-bold text-[#FF652F] text-sm">₹1,200.00</span>
              </div>
              <div className="text-gray-400 text-[10px] text-center italic">
                Paid by Rohan and split equally
              </div>
            </div>
          </div>
        </div>

        {/* Pay friends back (Dark Gray/Charcoal) */}
        <div className="bg-[#333333] text-white py-16 px-8 flex flex-col items-center justify-center text-center space-y-6">
          <div className="max-w-md space-y-3">
            <h3 className="text-2xl font-bold">Pay friends back</h3>
            <p className="text-gray-300 text-sm">
              Settle up with a friend and record cash or online payments.
            </p>
          </div>

          {/* Mockup phone UI - Settle up screen */}
          <div className="w-64 bg-white border border-gray-100 rounded-3xl shadow-lg p-4 text-gray-800 text-left text-xs font-sans hover-lift">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
              <span className="font-bold text-gray-700">Settle up</span>
              <span className="text-green-500 font-bold">Confirm</span>
            </div>
            <div className="flex flex-col items-center space-y-3 py-2">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center font-bold">R</div>
                <span className="text-gray-400">➔</span>
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-bold">A</div>
              </div>
              <div className="text-center font-bold text-gray-700">
                Rohan paid Aisha
              </div>
              <div className="text-lg font-bold text-[#1CC29F]">
                ₹850.00
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Get even more with PRO (Purple Branding) */}
      <section className="bg-[#8B5CF6] text-white py-20 px-8 flex flex-col items-center justify-center text-center space-y-8 relative overflow-hidden">
        <div className="max-w-md space-y-3 z-10">
          <h3 className="text-3xl font-bold flex items-center justify-center space-x-2">
            <Sparkles className="text-amber-300" />
            <span>Get even more with PRO</span>
          </h3>
          <p className="text-purple-100 text-sm">
            Get even more organized with receipt scanning, charts and graphs, currency conversion, and more!
          </p>
        </div>

        <Link
          to="/register"
          className="px-8 py-3 bg-white hover:bg-gray-50 text-[#8B5CF6] font-bold rounded-lg shadow-md transition-colors hover-lift z-10 cursor-pointer"
        >
          Sign up for free
        </Link>

        {/* Background decorative circles */}
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-white/5 rounded-full filter blur-xl"></div>
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/5 rounded-full filter blur-xl"></div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 px-6 text-center text-xs text-gray-400">
        <p>© 2026 ExpenseSync. All rights reserved.</p>
        <p className="mt-1">Developed as a high-fidelity Clone assignment.</p>
      </footer>
    </div>
  );
};
export default Home;
