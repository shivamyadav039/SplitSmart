import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { 
  Plane, Home as HomeIcon, Heart, Asterisk, ArrowRight, 
  ShieldCheck, Zap, Sparkles, CheckCircle2, Layers,
  Compass, CreditCard, RefreshCw, BarChart3, Search, EyeOff, Star
} from 'lucide-react';

// Common Phone Mockup wrapper component representing a 6.2-inch iPhone 17 Pro with Dynamic Island
const PhoneMockup = ({ children, title, headerBg = 'bg-white', textDark = true }) => {
  return (
    <div className="w-[280px] h-[560px] bg-[#1a1a1a] rounded-[48px] p-3 shadow-2xl border-4 border-[#2b2b2b] relative overflow-hidden flex flex-col font-sans hover-lift select-none mx-auto shrink-0">
      
      {/* iPhone 17 Pro Centered Dynamic Island */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-5.5 bg-black rounded-full z-30 flex items-center justify-between px-3 shadow-md">
        {/* Camera aperture lens detail */}
        <div className="w-2.5 h-2.5 rounded-full bg-[#0d0d0d] border border-blue-900/35 relative flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-950/50"></div>
        </div>
        {/* Dynamic green status indicator dot */}
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
      </div>
      
      {/* Screen Area */}
      <div className="flex-grow bg-white rounded-[38px] overflow-hidden flex flex-col relative z-10 border border-gray-150 min-h-0">
        
        {/* Status Bar */}
        <div className="h-7 px-5 pt-1.5 flex justify-between items-center text-[8px] font-bold text-gray-500 bg-transparent select-none z-20">
          <span>9:41</span>
          <div className="flex items-center space-x-1.5">
            <span>LTE</span>
            <div className="w-3.5 h-1.5 border border-gray-400 rounded-xs p-0.5 flex items-center">
              <div className="w-full h-full bg-gray-500 rounded-3xs"></div>
            </div>
          </div>
        </div>
        
        {/* Mockup Screen Header (Pushed down to clear the Dynamic Island) */}
        <div className={`px-4 py-2.5 border-b border-gray-100 flex items-center justify-between pt-1 shrink-0 ${headerBg}`}>
          <span className={`font-black text-xs ${textDark ? 'text-gray-800' : 'text-white'}`}>{title}</span>
          <div className="flex space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
          </div>
        </div>

        {/* Content Children */}
        <div className="flex-grow flex flex-col min-h-0 bg-white relative">
          {children}
        </div>
      </div>
    </div>
  );
};

export const Home = () => {
  const { isAuthenticated } = useAuth();
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
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const activeWord = words[activeWordIndex];

  return (
    <div className="min-h-screen bg-[#F6F6F6] text-gray-800 flex flex-col font-sans relative">
      
      {/* Styles for mockup scrolling and marquee animations */}
      <style>{`
        .mockup-scroll::-webkit-scrollbar {
          width: 3px;
        }
        .mockup-scroll::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 4px;
        }
        .mockup-scroll::-webkit-scrollbar-thumb {
          background: #1CC29F;
          border-radius: 4px;
        }
        
        @keyframes marquee-up-down {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-120px);
          }
        }
        .animate-marquee-scroll {
          animation: marquee-up-down 14s ease-in-out infinite;
        }
        .animate-marquee-scroll:hover {
          animation-play-state: paused;
          transform: none;
        }
      `}</style>

      {/* ================= 1. HERO SECTION ================= */}
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

            <p className="text-lg text-gray-500 max-w-md font-sans">
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

          {/* Right Hero Dynamic Phone Showcase (6.2-inch iPhone 17 Pro) */}
          <div className="flex items-center justify-center animate-fade-in-up">
            <div className="relative">
              <PhoneMockup title="Live Showcase" headerBg="bg-gradient-to-r from-[#1cc29f] to-[#06b6d4]" textDark={false}>
                
                {/* Dynamically changing app screen based on hero rotater */}
                {activeWord.graphic === 'plane' && (
                  <div className="p-4 space-y-3.5 flex-grow flex flex-col min-h-0 bg-[#FAFAFA]">
                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold border-b pb-1.5 border-gray-100">
                      <span>Goa Trip 2026</span>
                      <span className="text-[#1CC29F] font-black">Active</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto mockup-scroll pr-0.5 space-y-2.5">
                      <div className="bg-white p-3 rounded-xl border border-gray-150 shadow-xs flex justify-between items-center hover-lift">
                        <div>
                          <p className="font-extrabold text-[10px] text-gray-800">Villa Booking</p>
                          <p className="text-[8px] text-gray-400">Paid by Aisha</p>
                        </div>
                        <span className="font-black text-[11px] text-emerald-500">₹45,360</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-gray-150 shadow-xs flex justify-between items-center hover-lift">
                        <div>
                          <p className="font-extrabold text-[10px] text-gray-800">Beach Dinner</p>
                          <p className="text-[8px] text-gray-400">Paid by Rohan</p>
                        </div>
                        <span className="font-black text-[11px] text-gray-700">₹4,200</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-gray-150 shadow-xs flex justify-between items-center hover-lift">
                        <div>
                          <p className="font-extrabold text-[10px] text-gray-800">Taxi Ride</p>
                          <p className="text-[8px] text-gray-400">Paid by Dev</p>
                        </div>
                        <span className="font-black text-[11px] text-gray-700">₹1,800</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeWord.graphic === 'house' && (
                  <div className="p-4 space-y-3.5 flex-grow flex flex-col min-h-0 bg-[#FAFAFA]">
                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold border-b pb-1.5 border-gray-100">
                      <span>Flatmates Group</span>
                      <span className="text-[#1CC29F] font-black">Active</span>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto mockup-scroll pr-0.5 space-y-2.5">
                      <div className="bg-white p-3 rounded-xl border border-gray-150 shadow-xs flex justify-between items-center hover-lift">
                        <div>
                          <p className="font-extrabold text-[10px] text-gray-800">Monthly Rent</p>
                          <p className="text-[8px] text-gray-400">Paid by Aisha</p>
                        </div>
                        <span className="font-black text-[11px] text-emerald-500">₹48,000</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-gray-150 shadow-xs flex justify-between items-center hover-lift">
                        <div>
                          <p className="font-extrabold text-[10px] text-gray-800">Wifi Bill</p>
                          <p className="text-[8px] text-gray-400">Paid by Rohan</p>
                        </div>
                        <span className="font-black text-[11px] text-gray-700">₹1,199</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeWord.graphic === 'heart' && (
                  <div className="p-4 space-y-3.5 flex-grow flex flex-col min-h-0 bg-[#FAFAFA]">
                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold border-b pb-1.5 border-gray-100">
                      <span>Date Nights</span>
                      <span className="text-rose-500 font-black">♥ Together</span>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto mockup-scroll pr-0.5 space-y-2.5">
                      <div className="bg-white p-3 rounded-xl border border-gray-150 shadow-xs flex justify-between items-center hover-lift">
                        <div>
                          <p className="font-extrabold text-[10px] text-gray-800">Fine Dining</p>
                          <p className="text-[8px] text-gray-400">Paid by You</p>
                        </div>
                        <span className="font-black text-[11px] text-emerald-500">₹3,400</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-gray-150 shadow-xs flex justify-between items-center hover-lift">
                        <div>
                          <p className="font-extrabold text-[10px] text-gray-800">Movie Tickets</p>
                          <p className="text-[8px] text-gray-400">Paid by Priya</p>
                        </div>
                        <span className="font-black text-[11px] text-gray-700">₹800</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeWord.graphic === 'spark' && (
                  <div className="p-4 space-y-3.5 flex-grow flex flex-col min-h-0 bg-[#FAFAFA]">
                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold border-b pb-1.5 border-gray-100">
                      <span>Quick Bills</span>
                      <span className="text-amber-500 font-black">Splitted</span>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto mockup-scroll pr-0.5 space-y-2.5">
                      <div className="bg-white p-3 rounded-xl border border-gray-150 shadow-xs flex justify-between items-center hover-lift">
                        <div>
                          <p className="font-extrabold text-[10px] text-gray-800">Weekend Lunch</p>
                          <p className="text-[8px] text-gray-400">Paid by Sam</p>
                        </div>
                        <span className="font-black text-[11px] text-emerald-500">₹2,800</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-gray-150 shadow-xs flex justify-between items-center hover-lift">
                        <div>
                          <p className="font-extrabold text-[10px] text-gray-800">Cab Split</p>
                          <p className="text-[8px] text-gray-400">Paid by Rohan</p>
                        </div>
                        <span className="font-black text-[11px] text-gray-700">₹450</span>
                      </div>
                    </div>
                  </div>
                )}

              </PhoneMockup>
              
              {/* Background gradient shadow blobs */}
              <div className="absolute inset-0 bg-[#EFEFEF]/60 rounded-full filter blur-3xl -z-10"></div>
            </div>
          </div>

        </div>
      </section>

      {/* ================= 2. FEATURE COLUMNS ROW 1 ================= */}
      <section className="grid grid-cols-1 md:grid-cols-2">
        
        {/* Track Balances Column (Dark Slate) */}
        <div className="bg-[#333333] text-white py-16 px-6 flex flex-col items-center justify-center text-center space-y-8 border-r border-gray-800">
          <div className="max-w-md space-y-2.5">
            <h3 className="text-2xl font-black tracking-tight">Track balances</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Keep track of shared flat bills, active receivables, and who owes whom.
            </p>
          </div>
          
          {/* Mockup phone UI - Scrollable Friends list (6.2-inch, iPhone 17 Pro style) */}
          <PhoneMockup title="Friends">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between text-[9px] text-gray-400 font-extrabold shrink-0">
              <div className="space-y-0.5 text-left">
                <p>TOTAL LEDGER</p>
                <p className="text-[#1CC29F] text-[11px] font-black">You are owed €1,717.78</p>
              </div>
            </div>
            
            {/* Scrollable list area */}
            <div className="flex-grow overflow-y-auto mockup-scroll px-4 py-4 relative min-h-0 select-text">
              <div className="space-y-3.5 animate-marquee-scroll">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100 shadow-xs hover-lift">
                  <span className="font-bold text-[10px] text-gray-700">Earl E. Phant</span>
                  <span className="text-red-500 text-[10px] font-extrabold">you owe €92.21</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100 shadow-xs hover-lift">
                  <span className="font-bold text-[10px] text-gray-700">Gajah</span>
                  <span className="text-[#1CC29F] text-[10px] font-extrabold">owes you €20.00</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100 shadow-xs hover-lift">
                  <span className="font-bold text-[10px] text-gray-700">Jorge Jirafa</span>
                  <span className="text-gray-400 text-[9px] font-bold">settled up</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100 shadow-xs hover-lift">
                  <span className="font-bold text-[10px] text-gray-700">Oli Fant</span>
                  <span className="text-red-500 text-[10px] font-extrabold">you owe €17.51</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100 shadow-xs hover-lift">
                  <span className="font-bold text-[10px] text-gray-700">Stompy</span>
                  <span className="text-[#1CC29F] text-[10px] font-extrabold">owes you €87.28</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100 shadow-xs hover-lift">
                  <span className="font-bold text-[10px] text-gray-700">Hathi Mere Sathi</span>
                  <span className="text-[#1CC29F] text-[10px] font-extrabold">owes you €1,550.50</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100 shadow-xs hover-lift">
                  <span className="font-bold text-[10px] text-gray-700">Sam</span>
                  <span className="text-gray-400 text-[9px] font-bold">settled up</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100 shadow-xs hover-lift">
                  <span className="font-bold text-[10px] text-gray-700">Dev</span>
                  <span className="text-[#1CC29F] text-[10px] font-extrabold">owes you ₹200.00</span>
                </div>
              </div>
            </div>
          </PhoneMockup>
        </div>

        {/* Organize Expenses Column (Teal) */}
        <div className="bg-[#1CC29F] text-white py-16 px-6 flex flex-col items-center justify-center text-center space-y-8">
          <div className="max-w-md space-y-2.5">
            <h3 className="text-2xl font-black tracking-tight">Organize expenses</h3>
            <p className="text-teal-50 text-sm leading-relaxed">
              Split bills dynamically with roommates, trips, flatmates, and family.
            </p>
          </div>

          {/* Mockup phone UI - Scrollable March Expenses list (6.2-inch, iPhone 17 Pro style) */}
          <PhoneMockup title="March Expenses">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between text-[9px] text-gray-400 font-extrabold shrink-0">
              <span>ACTIVE FEED</span>
              <span className="text-[#1CC29F]">6 Transactions</span>
            </div>

            {/* Scrollable list area */}
            <div className="flex-grow overflow-y-auto mockup-scroll px-4 py-4 relative min-h-0 select-text">
              <div className="space-y-3.5 animate-marquee-scroll">
                <div className="flex justify-between items-start border-b border-gray-100 pb-2.5">
                  <div className="text-left">
                    <h5 className="font-extrabold text-[10px] text-gray-800">Ellie's bakery</h5>
                    <p className="text-[7px] text-gray-400">Paid by Rohan • Mar 18</p>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-[10px] text-gray-800">$102.72</span>
                    <p className="text-[7px] text-red-500 font-bold">you borrowed $51.36</p>
                  </div>
                </div>

                <div className="flex justify-between items-start border-b border-gray-100 pb-2.5">
                  <div className="text-left">
                    <h5 className="font-extrabold text-[10px] text-gray-800">Fuel up</h5>
                    <p className="text-[7px] text-gray-400">Paid by Aisha • Mar 10</p>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-[10px] text-gray-800">$48.06</span>
                    <p className="text-[7px] text-[#1CC29F] font-bold">you lent $24.03</p>
                  </div>
                </div>

                <div className="flex justify-between items-start border-b border-gray-100 pb-2.5">
                  <div className="text-left">
                    <h5 className="font-extrabold text-[10px] text-gray-800">Movie night</h5>
                    <p className="text-[7px] text-gray-400">Paid by Dev • Mar 06</p>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-[10px] text-gray-800">$5.00</span>
                    <p className="text-[7px] text-[#1CC29F] font-bold">you lent $2.50</p>
                  </div>
                </div>

                <div className="flex justify-between items-start border-b border-gray-100 pb-2.5">
                  <div className="text-left">
                    <h5 className="font-extrabold text-[10px] text-gray-800">Date night in</h5>
                    <p className="text-[7px] text-gray-400">Paid by You • Mar 05</p>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-[10px] text-gray-800">$62.80</span>
                    <p className="text-[7px] text-[#1CC29F] font-bold">you lent $31.40</p>
                  </div>
                </div>

                <div className="flex justify-between items-start border-b border-gray-100 pb-2.5">
                  <div className="text-left">
                    <h5 className="font-extrabold text-[10px] text-gray-800">Electricity bill</h5>
                    <p className="text-[7px] text-gray-400">Paid by Priya • Feb 28</p>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-[10px] text-gray-800">$120.00</span>
                    <p className="text-[7px] text-red-500 font-bold">you borrowed $60.00</p>
                  </div>
                </div>
              </div>
            </div>
          </PhoneMockup>
        </div>

      </section>

      {/* ================= 3. FEATURE COLUMNS ROW 2 ================= */}
      <section className="grid grid-cols-1 md:grid-cols-2">
        
        {/* Add Expenses easily (Warm Coral/Orange) */}
        <div className="bg-[#FF652F] text-white py-16 px-6 flex flex-col items-center justify-center text-center space-y-8">
          <div className="max-w-md space-y-2.5">
            <h3 className="text-2xl font-black tracking-tight">Add expenses easily</h3>
            <p className="text-orange-50 text-sm leading-relaxed">
              Quickly record bills and splits on the go with custom participants.
            </p>
          </div>

          {/* Mockup phone UI - Add Expense Screen with scrollable split list */}
          <PhoneMockup title="Add an expense">
            <div className="p-4 space-y-4 flex-grow flex flex-col min-h-0 select-text">
              <div className="space-y-3 shrink-0 text-left">
                <div className="flex items-center space-x-2 border-b border-gray-200 pb-2">
                  <span className="text-[10px] text-gray-400 font-bold w-16 uppercase">Desc:</span>
                  <span className="font-extrabold text-[11px] text-gray-700">Taxi to Airport</span>
                </div>
                <div className="flex items-center space-x-2 border-b border-gray-200 pb-2">
                  <span className="text-[10px] text-gray-400 font-bold w-16 uppercase">Amount:</span>
                  <span className="font-black text-[13px] text-[#FF652F]">₹1,200.00</span>
                </div>
                <p className="text-[8px] text-gray-400 italic text-center">Paid by Rohan and split equally</p>
              </div>

              {/* Scrollable split list area */}
              <div className="flex-grow overflow-y-auto mockup-scroll border-t border-gray-100 pt-3 relative min-h-0 text-left">
                <div className="space-y-2 animate-marquee-scroll">
                  {['Aisha', 'Rohan', 'Priya', 'Sam', 'Meera', 'Dev'].map((name, i) => (
                    <div key={i} className="flex justify-between items-center p-2 rounded-xl bg-gray-50/70 border border-gray-100 text-[10px] font-bold text-gray-700">
                      <div className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1CC29F] shrink-0"></span>
                        <span>{name}</span>
                      </div>
                      <span className="text-gray-400 font-normal">₹200.00</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </PhoneMockup>
        </div>

        {/* Pay friends back (Dark Slate) */}
        <div className="bg-[#333333] text-white py-16 px-6 flex flex-col items-center justify-center text-center space-y-8 border-t border-gray-800 md:border-t-0">
          <div className="max-w-md space-y-2.5">
            <h3 className="text-2xl font-black tracking-tight">Pay friends back</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              Settle outstanding debts and log payment transactions in seconds.
            </p>
          </div>

          {/* Mockup phone UI - Settle up screen with scrollable logs */}
          <PhoneMockup title="Settle up">
            <div className="p-4 space-y-4 flex-grow flex flex-col min-h-0 select-text">
              <div className="flex flex-col items-center space-y-2.5 bg-gray-50 p-3.5 rounded-2xl border border-gray-100 shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-full bg-red-100 text-red-500 flex items-center justify-center font-black text-xs">R</div>
                  <span className="text-gray-400 font-bold">➔</span>
                  <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-black text-xs">A</div>
                </div>
                <div className="text-[10px] font-black text-gray-700">Rohan paid Aisha</div>
                <div className="text-sm font-black text-[#1CC29F]">₹850.00</div>
              </div>

              {/* Scrollable past settlement logs area */}
              <div className="flex-grow overflow-y-auto mockup-scroll border-t border-gray-100 pt-3 relative min-h-0 text-left">
                <div className="space-y-2 animate-marquee-scroll">
                  <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg text-[9px] font-bold text-gray-600">
                    Rohan paid Aisha ₹850.00 (Mar 24)
                  </div>
                  <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg text-[9px] font-bold text-gray-600">
                    Priya paid Aisha ₹700.00 (Mar 22)
                  </div>
                  <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg text-[9px] font-bold text-gray-600">
                    Sam paid Rohan ₹120.00 (Mar 19)
                  </div>
                  <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg text-[9px] font-bold text-gray-600">
                    Aisha paid Dev ₹150.00 (Mar 15)
                  </div>
                </div>
              </div>
            </div>
          </PhoneMockup>
        </div>

      </section>

      {/* ================= 4. GET EVEN MORE WITH PRO ================= */}
      <section className="bg-[#8B5CF6] text-white py-20 px-6 flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden">
        <div className="max-w-md space-y-2.5 z-10">
          <h3 className="text-3xl font-black tracking-tight flex items-center justify-center space-x-2">
            <Sparkles className="text-amber-300 animate-pulse" />
            <span>Get even more with PRO</span>
          </h3>
          <p className="text-purple-100 text-sm leading-relaxed">
            Organize bills with receipt scanning, charts and graphs, currency conversion, and visual balances overview.
          </p>
        </div>

        <Link
          to="/register"
          className="px-6 py-3 bg-white hover:bg-gray-50 text-[#8B5CF6] font-bold rounded-lg shadow-md transition-colors hover-lift z-10 cursor-pointer text-xs"
        >
          Sign up for free
        </Link>

        {/* Background decorative circles */}
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-white/5 rounded-full filter blur-xl"></div>
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/5 rounded-full filter blur-xl"></div>
      </section>

      {/* ================= 5. THE WHOLE NINE YARDS ================= */}
      <section className="bg-white py-20 px-6 border-b border-gray-100">
        <div className="max-w-5xl mx-auto space-y-12">
          
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-gray-900 leading-tight">The whole nine yards</h2>
            <p className="text-sm text-gray-500">Every feature you need to organize group spending and settle up smoothly.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            
            {/* Core Features Column */}
            <div className="space-y-6 bg-gray-50/50 border border-gray-100 rounded-3xl p-8 shadow-xs">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-3">
                <CheckCircle2 className="text-[#1CC29F]" size={20} />
                <span>Core Features</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: 'Add groups and friends', desc: 'Settle up with flatmates or travel companions.' },
                  { title: 'Split expenses, record debts', desc: 'Record bills dynamically in multiple currencies.' },
                  { title: 'Equal or unequal splits', desc: 'Split mathematically by amount, shares, or percentages.' },
                  { title: 'Calculate total balances', desc: 'Real-time balances calculated on-the-fly in DB.' },
                  { title: 'Simplify debts', desc: 'Auto-calculates the absolute minimal number of payments.' },
                  { title: 'Recurring expenses', desc: 'Record flat subscriptions or utility bills easily.' },
                  { title: 'Offline mode', desc: 'Log shared bills without active network connection.' },
                  { title: 'Cloud sync', desc: 'All ledgers sync across devices immediately.' },
                  { title: 'Spending totals', desc: 'Get totals of overall shared spending categories.' },
                  { title: '100+ currencies supported', desc: 'USD fixed at 1 USD = 84 INR snapshot.' },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-[#1CC29F] rounded-full shrink-0"></span>
                      <span>{item.title}</span>
                    </h4>
                    <p className="text-[10px] text-gray-500 pl-3 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pro Features Column */}
            <div className="space-y-6 bg-[#8B5CF6]/5 border border-[#8B5CF6]/15 rounded-3xl p-8 shadow-xs">
              <h3 className="text-lg font-bold text-[#8B5CF6] flex items-center gap-2 border-b border-[#8B5CF6]/15 pb-3">
                <Star className="text-[#8B5CF6]" size={20} />
                <span>Pro Features</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: 'Unlimited expenses', desc: 'Add endless transactions across all flat groups.' },
                  { title: 'Transaction CSV Import', desc: 'Bulk import historical tables and resolve anomalies.' },
                  { title: 'Currency conversion', desc: 'Convert foreign bills using fixed snapshots.' },
                  { title: 'Receipt scanning', desc: 'Scan and automatically extract amounts from receipt snaps.' },
                  { title: 'Expense itemization', desc: 'Settle individual items from a single receipt.' },
                  { title: 'Charts and graphs', desc: 'Interact with spending trend graphs and categories.' },
                  { title: 'Expense search', desc: 'Find past expenses instantly using description query filters.' },
                  { title: 'Save default splits', desc: 'Pre-configure custom participant split allocations.' },
                  { title: 'A totally ad-free experience', desc: 'Clean interface with zero third-party banners.' },
                  { title: 'Early access', desc: 'Beta access to new ledger features and calculators.' },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-[#8B5CF6] rounded-full shrink-0"></span>
                      <span>{item.title}</span>
                    </h4>
                    <p className="text-[10px] text-gray-500 pl-3 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= 6. USER TESTIMONIALS ================= */}
      <section className="bg-gray-50 py-20 px-6 border-b border-gray-150">
        <div className="max-w-5xl mx-auto space-y-12">
          
          <div className="text-center space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#1CC29F]">Testimonials</span>
            <h2 className="text-3xl font-black text-gray-900 leading-tight">What our users say</h2>
            <p className="text-sm text-gray-500">Read reviews from major publications and daily SplitSmart active users.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "“Fundamental” for tracking finances. As good as WhatsApp for containing awkwardness.",
                author: "Financial Times",
                logo: "FT",
                gradient: "from-[#FDF6E2] to-[#FFF9EA] border-[#EADAB9]"
              },
              {
                quote: "Life hack for group trips. Amazing tool to use when traveling with friends! Makes life so easy!!",
                author: "Ahah S, iOS App Store",
                logo: "AS",
                gradient: "from-blue-50 to-indigo-50/30 border-blue-100"
              },
              {
                quote: "Makes it easy to split everything from your dinner bill to rent.",
                author: "NY Times",
                logo: "NYT",
                gradient: "from-gray-50 to-zinc-50 border-gray-200"
              },
              {
                quote: "So amazing to have this app manage balances and help keep money out of relationships. Love it!",
                author: "Reviewer, Web Platform",
                logo: "RP",
                gradient: "from-teal-50/50 to-emerald-50/30 border-teal-100"
              },
              {
                quote: "I never fight with roommates over bills because of this genius expense-splitting app.",
                author: "Reviewer, Android Play Store",
                logo: "RM",
                gradient: "from-amber-50/50 to-orange-50/30 border-amber-100"
              },
              {
                quote: "I use it everyday. I use it for trips, roommates, loans. I love SplitSmart.",
                author: "Reviewer, iOS App Store",
                logo: "UI",
                gradient: "from-purple-50/50 to-rose-50/30 border-purple-100"
              }
            ].map((card, idx) => (
              <div 
                key={idx}
                className={`p-6 rounded-2xl border bg-gradient-to-br flex flex-col justify-between shadow-xs hover-lift ${card.gradient}`}
              >
                <p className="text-xs font-bold text-gray-700 italic leading-relaxed">
                  "{card.quote}"
                </p>
                <div className="pt-4 mt-4 border-t border-black/5 flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-lg bg-black/5 font-extrabold text-[8px] flex items-center justify-center text-gray-600 uppercase">
                    {card.logo}
                  </div>
                  <span className="text-[10px] font-black text-gray-800">{card.author}</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-8 px-6 text-center text-xs text-gray-400">
        <p>© 2026 ExpenseSync. All rights reserved.</p>
        <p className="mt-1">Developed as a high-fidelity Clone assignment.</p>
      </footer>
    </div>
  );
};

export default Home;
