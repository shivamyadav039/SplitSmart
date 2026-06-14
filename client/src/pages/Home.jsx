import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { 
  Plane, Home as HomeIcon, Heart, Asterisk, ArrowRight, 
  ShieldCheck, Zap, Sparkles, CheckCircle2, Layers 
} from 'lucide-react';

// Common Phone Mockup wrapper component
const PhoneMockup = ({ children, title, headerBg = 'bg-white', textDark = true }) => {
  return (
    <div className="w-64 h-96 bg-[#1a1a1a] rounded-[36px] p-2.5 shadow-2xl border-4 border-[#2b2b2b] relative overflow-hidden flex flex-col font-sans hover-lift select-none mx-auto">
      {/* Notch */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-[#1a1a1a] rounded-b-xl z-30 flex items-center justify-around px-4">
        <div className="w-1.5 h-1.5 rounded-full bg-white/10"></div>
        <div className="w-8 h-1 bg-white/20 rounded-full"></div>
      </div>
      
      {/* Screen Area */}
      <div className="flex-1 bg-white rounded-[26px] overflow-hidden flex flex-col relative z-10 border border-gray-150">
        {/* Status Bar */}
        <div className="h-6 px-4 pt-1 flex justify-between items-center text-[8px] font-bold text-gray-500 bg-transparent select-none z-20">
          <span>9:41</span>
          <div className="flex items-center space-x-1">
            <span>LTE</span>
            <div className="w-3.5 h-1.5 border border-gray-400 rounded-xs p-0.5 flex items-center">
              <div className="w-full h-full bg-gray-500 rounded-3xs"></div>
            </div>
          </div>
        </div>
        
        {/* Mockup Screen Header */}
        <div className={`px-3 py-2 border-b border-gray-100 flex items-center justify-between ${headerBg}`}>
          <span className={`font-black text-xs ${textDark ? 'text-gray-800' : 'text-white'}`}>{title}</span>
          <div className="flex space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
          </div>
        </div>

        {/* Content Children */}
        <div className="flex-1 flex flex-col min-h-0 bg-white relative">
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
            transform: translateY(-80px);
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

      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-white border-b border-gray-100 py-16 md:py-20 px-6">
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

          {/* Right Hero Dynamic Phone Showcase */}
          <div className="flex items-center justify-center animate-fade-in-up">
            <div className="relative">
              <PhoneMockup title="Live Showcase" headerBg="bg-gradient-to-r from-[#1cc29f] to-[#06b6d4]" textDark={false}>
                
                {/* Dynamically changing app screen based on hero rotater */}
                {activeWord.graphic === 'plane' && (
                  <div className="p-3.5 space-y-3 flex-1 flex flex-col min-h-0 bg-[#FAFAFA]">
                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold border-b pb-1.5 border-gray-100">
                      <span>Goa Trip 2026</span>
                      <span className="text-[#1CC29F]">Active</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto mockup-scroll pr-0.5 space-y-2">
                      <div className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-xs flex justify-between items-center">
                        <div>
                          <p className="font-extrabold text-[10px] text-gray-800">Villa Booking</p>
                          <p className="text-[8px] text-gray-400">Paid by Aisha</p>
                        </div>
                        <span className="font-black text-[10px] text-emerald-500">₹45,360</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-xs flex justify-between items-center">
                        <div>
                          <p className="font-extrabold text-[10px] text-gray-800">Beach Dinner</p>
                          <p className="text-[8px] text-gray-400">Paid by Rohan</p>
                        </div>
                        <span className="font-black text-[10px] text-gray-700">₹4,200</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-xs flex justify-between items-center">
                        <div>
                          <p className="font-extrabold text-[10px] text-gray-800">Taxi Ride</p>
                          <p className="text-[8px] text-gray-400">Paid by Dev</p>
                        </div>
                        <span className="font-black text-[10px] text-gray-700">₹1,800</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeWord.graphic === 'house' && (
                  <div className="p-3.5 space-y-3 flex-1 flex flex-col min-h-0 bg-[#FAFAFA]">
                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold border-b pb-1.5 border-gray-100">
                      <span>Flatmates Group</span>
                      <span className="text-[#1CC29F]">Active</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto mockup-scroll pr-0.5 space-y-2">
                      <div className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-xs flex justify-between items-center">
                        <div>
                          <p className="font-extrabold text-[10px] text-gray-800">Monthly Rent</p>
                          <p className="text-[8px] text-gray-400">Paid by Aisha</p>
                        </div>
                        <span className="font-black text-[10px] text-emerald-500">₹48,000</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-xs flex justify-between items-center">
                        <div>
                          <p className="font-extrabold text-[10px] text-gray-800">Wifi Bill</p>
                          <p className="text-[8px] text-gray-400">Paid by Rohan</p>
                        </div>
                        <span className="font-black text-[10px] text-gray-700">₹1,199</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeWord.graphic === 'heart' && (
                  <div className="p-3.5 space-y-3 flex-1 flex flex-col min-h-0 bg-[#FAFAFA]">
                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold border-b pb-1.5 border-gray-100">
                      <span>Date Nights</span>
                      <span className="text-rose-500 font-bold">♥ Together</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto mockup-scroll pr-0.5 space-y-2">
                      <div className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-xs flex justify-between items-center">
                        <div>
                          <p className="font-extrabold text-[10px] text-gray-800">Fine Dining</p>
                          <p className="text-[8px] text-gray-400">Paid by You</p>
                        </div>
                        <span className="font-black text-[10px] text-emerald-500">₹3,400</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-xs flex justify-between items-center">
                        <div>
                          <p className="font-extrabold text-[10px] text-gray-800">Movie Tickets</p>
                          <p className="text-[8px] text-gray-400">Paid by Priya</p>
                        </div>
                        <span className="font-black text-[10px] text-gray-700">₹800</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeWord.graphic === 'spark' && (
                  <div className="p-3.5 space-y-3 flex-1 flex flex-col min-h-0 bg-[#FAFAFA]">
                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold border-b pb-1.5 border-gray-100">
                      <span>Quick Bills</span>
                      <span className="text-amber-500">Splitted</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto mockup-scroll pr-0.5 space-y-2">
                      <div className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-xs flex justify-between items-center">
                        <div>
                          <p className="font-extrabold text-[10px] text-gray-800">Weekend Lunch</p>
                          <p className="text-[8px] text-gray-400">Paid by Sam</p>
                        </div>
                        <span className="font-black text-[10px] text-emerald-500">₹2,800</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-xs flex justify-between items-center">
                        <div>
                          <p className="font-extrabold text-[10px] text-gray-800">Cab Split</p>
                          <p className="text-[8px] text-gray-400">Paid by Rohan</p>
                        </div>
                        <span className="font-black text-[10px] text-gray-700">₹450</span>
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

      {/* 2. Feature Columns Row 1 (Track balances vs Organize expenses) */}
      <section className="grid grid-cols-1 md:grid-cols-2">
        
        {/* Track Balances Column (Dark Slate) */}
        <div className="bg-[#333333] text-white py-16 px-6 flex flex-col items-center justify-center text-center space-y-8 border-r border-gray-800">
          <div className="max-w-md space-y-2.5">
            <h3 className="text-2xl font-black tracking-tight">Track balances</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Keep track of shared flat bills, active receivables, and who owes whom.
            </p>
          </div>
          
          {/* Mockup phone UI - Scrollable Friends balance list */}
          <PhoneMockup title="Friends">
            <div className="px-3.5 py-2.5 bg-gray-50 border-b border-gray-100 flex justify-between text-[8px] text-gray-400 font-extrabold select-none shrink-0">
              <div className="space-y-0.5">
                <p>TOTAL BALANCE</p>
                <p className="text-[#1CC29F] text-[10px] font-black">You are owed €1,717.78</p>
              </div>
            </div>
            
            {/* Scrollable list wrapper */}
            <div className="flex-grow overflow-y-auto mockup-scroll px-3.5 py-3 relative min-h-0 select-text">
              <div className="space-y-2.5 animate-marquee-scroll">
                <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="font-bold text-[10px] text-gray-700">Earl E. Phant</span>
                  <span className="text-red-500 text-[10px] font-extrabold">you owe €92.21</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="font-bold text-[10px] text-gray-700">Gajah</span>
                  <span className="text-[#1CC29F] text-[10px] font-extrabold">owes you €20.00</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="font-bold text-[10px] text-gray-700">Jorge Jirafa</span>
                  <span className="text-gray-400 text-[9px] font-bold">settled up</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="font-bold text-[10px] text-gray-700">Oli Fant</span>
                  <span className="text-red-500 text-[10px] font-extrabold">you owe €17.51</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="font-bold text-[10px] text-gray-700">Stompy</span>
                  <span className="text-[#1CC29F] text-[10px] font-extrabold">owes you €87.28</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="font-bold text-[10px] text-gray-700">Hathi Mere Sathi</span>
                  <span className="text-[#1CC29F] text-[10px] font-extrabold">owes you €1,550.50</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="font-bold text-[10px] text-gray-700">Sam</span>
                  <span className="text-gray-400 text-[9px] font-bold">settled up</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100">
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

          {/* Mockup phone UI - Scrollable Expense Feed */}
          <PhoneMockup title="March Expenses">
            <div className="px-3.5 py-2.5 bg-gray-50 border-b border-gray-100 flex justify-between text-[8px] text-gray-400 font-extrabold shrink-0">
              <span>ACTIVE FEED</span>
              <span className="text-[#1CC29F]">6 Transactions</span>
            </div>

            {/* Scrollable list wrapper */}
            <div className="flex-grow overflow-y-auto mockup-scroll px-3.5 py-3 relative min-h-0 select-text">
              <div className="space-y-3 animate-marquee-scroll">
                <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                  <div>
                    <h5 className="font-bold text-[10px] text-gray-800">Ellie's bakery</h5>
                    <p className="text-[7px] text-gray-400">Paid by Rohan • Mar 18</p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-[10px] text-gray-800">$102.72</span>
                    <p className="text-[7px] text-red-500 font-bold">you borrowed $51.36</p>
                  </div>
                </div>

                <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                  <div>
                    <h5 className="font-bold text-[10px] text-gray-800">Fuel up</h5>
                    <p className="text-[7px] text-gray-400">Paid by Aisha • Mar 10</p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-[10px] text-gray-800">$48.06</span>
                    <p className="text-[7px] text-[#1CC29F] font-bold">you lent $24.03</p>
                  </div>
                </div>

                <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                  <div>
                    <h5 className="font-bold text-[10px] text-gray-800">Movie night</h5>
                    <p className="text-[7px] text-gray-400">Paid by Dev • Mar 06</p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-[10px] text-gray-800">$5.00</span>
                    <p className="text-[7px] text-[#1CC29F] font-bold">you lent $2.50</p>
                  </div>
                </div>

                <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                  <div>
                    <h5 className="font-bold text-[10px] text-gray-800">Date night in</h5>
                    <p className="text-[7px] text-gray-400">Paid by You • Mar 05</p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-[10px] text-gray-800">$62.80</span>
                    <p className="text-[7px] text-[#1CC29F] font-bold">you lent $31.40</p>
                  </div>
                </div>

                <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                  <div>
                    <h5 className="font-bold text-[10px] text-gray-800">Electricity bill</h5>
                    <p className="text-[7px] text-gray-400">Paid by Priya • Feb 28</p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-[10px] text-gray-800">$120.00</span>
                    <p className="text-[7px] text-red-500 font-bold">you borrowed $60.00</p>
                  </div>
                </div>
              </div>
            </div>
          </PhoneMockup>
        </div>

      </section>

      {/* 3. Feature Columns Row 2 (Add expenses easily vs Pay friends back) */}
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
            <div className="p-3.5 space-y-3 flex-1 flex flex-col min-h-0 select-text">
              <div className="space-y-2 shrink-0">
                <div className="flex items-center space-x-2 border-b border-gray-200 pb-1.5">
                  <span className="text-[10px] text-gray-400 font-bold w-16 uppercase">Desc:</span>
                  <span className="font-extrabold text-[11px] text-gray-700">Taxi to Airport</span>
                </div>
                <div className="flex items-center space-x-2 border-b border-gray-200 pb-1.5">
                  <span className="text-[10px] text-gray-400 font-bold w-16 uppercase">Amount:</span>
                  <span className="font-black text-[12px] text-[#FF652F]">₹1,200.00</span>
                </div>
                <p className="text-[8px] text-gray-400 italic text-center">Paid by Rohan and split equally</p>
              </div>

              {/* Scrollable split list */}
              <div className="flex-grow overflow-y-auto mockup-scroll border-t border-gray-100 pt-2 shrink-0">
                <div className="space-y-1.5 animate-marquee-scroll">
                  {['Aisha', 'Rohan', 'Priya', 'Sam', 'Meera', 'Dev'].map((name, i) => (
                    <div key={i} className="flex justify-between items-center p-1.5 rounded-lg bg-gray-50/50 border border-gray-100 text-[9px] font-bold text-gray-700">
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

        {/* Pay friends back (Dark Gray/Charcoal) */}
        <div className="bg-[#333333] text-white py-16 px-6 flex flex-col items-center justify-center text-center space-y-8">
          <div className="max-w-md space-y-2.5">
            <h3 className="text-2xl font-black tracking-tight">Pay friends back</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              Settle outstanding debts and log payment transactions in seconds.
            </p>
          </div>

          {/* Mockup phone UI - Settle up screen with scrollable logs */}
          <PhoneMockup title="Settle up">
            <div className="p-3.5 space-y-3 flex-grow flex flex-col min-h-0 select-text">
              <div className="flex flex-col items-center space-y-2.5 bg-gray-50 p-3 rounded-2xl border border-gray-100 shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-full bg-red-100 text-red-500 flex items-center justify-center font-black text-xs">R</div>
                  <span className="text-gray-400 font-bold">➔</span>
                  <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-black text-xs">A</div>
                </div>
                <div className="text-[10px] font-black text-gray-700">Rohan paid Aisha</div>
                <div className="text-sm font-black text-[#1CC29F]">₹850.00</div>
              </div>

              {/* Scrollable past settlement logs */}
              <div className="flex-grow overflow-y-auto mockup-scroll border-t border-gray-100 pt-2 shrink-0">
                <div className="space-y-1.5 animate-marquee-scroll">
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

      {/* 4. Get even more with PRO (Purple Branding) */}
      <section className="bg-[#8B5CF6] text-white py-16 px-6 flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden">
        <div className="max-w-md space-y-2.5 z-10">
          <h3 className="text-2xl font-black tracking-tight flex items-center justify-center space-x-2">
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

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 px-6 text-center text-xs text-gray-400">
        <p>© 2026 ExpenseSync. All rights reserved.</p>
        <p className="mt-1">Developed as a high-fidelity Clone assignment.</p>
      </footer>
    </div>
  );
};

export default Home;
