import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import api from '../services/api.js';
import { 
  Plus, Database, ArrowUpRight, ArrowDownRight, Layers, 
  ChevronRight, Users, Activity, Sparkles, RefreshCw, UserCheck
} from 'lucide-react';

export const Dashboard = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [switchingUser, setSwitchingUser] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [overallNet, setOverallNet] = useState(0);

  // Stats for the visual ledger graph widget
  const [owesList, setOwesList] = useState([]);

  const fetchDashboardData = async () => {
    try {
      const groupsRes = await api.get('/groups');
      const groupsData = groupsRes.data.groups;
      setGroups(groupsData);

      let totalNet = 0;
      let collectiveDebts = [];

      for (const group of groupsData) {
        const balRes = await api.get(`/groups/${group.id}/balances`);
        const summaries = balRes.data.summaries || [];
        const userSummary = summaries.find(s => s.user_id === user.id);
        if (userSummary) {
          totalNet += parseFloat(userSummary.net_balance);
        }

        // Collect debts involving the active user for the visual widget
        const debts = balRes.data.debts || [];
        debts.forEach(d => {
          if (d.debtor_id === user.id) {
            collectiveDebts.push({ type: 'pay', name: d.creditor_name, amount: d.amount });
          } else if (d.creditor_id === user.id) {
            collectiveDebts.push({ type: 'receive', name: d.debtor_name, amount: d.amount });
          }
        });
      }
      setOverallNet(Math.round(totalNet * 100) / 100);
      setOwesList(collectiveDebts.slice(0, 5)); // Limit to top 5
    } catch (err) {
      console.error('Error fetching dashboard details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  // Fast switch persona functionality
  const handleQuickSwitch = async (persona) => {
    setSwitchingUser(true);
    const demoEmail = `${persona.toLowerCase()}@demo.com`;
    const demoPassword = 'demo123';
    try {
      await login(demoEmail, demoPassword);
    } catch (err) {
      console.error('Failed switching user:', err);
      alert(`Could not switch to ${persona}. Please check seeding.`);
    } finally {
      setSwitchingUser(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setCreateLoading(true);
    try {
      const res = await api.post('/groups', { name: newGroupName });
      setNewGroupName('');
      setShowCreateGroup(false);
      fetchDashboardData();
      navigate(`/groups/${res.data.id}`);
    } catch (err) {
      console.error('Failed to create group:', err);
      alert('Error creating group.');
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading || switchingUser) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center space-y-4 bg-[#F6F6F6]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent border-[#1CC29F]"></div>
        <p className="text-sm font-semibold text-gray-500">
          {switchingUser ? 'Switching profile perspectives...' : 'Syncing accounts ledger...'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#f3f4f6] via-[#fafafa] to-[#e8f5e9]/30 py-8 px-6 space-y-8 max-w-7xl mx-auto animate-fade-in-up">
      
      {/* 1. Header Row (Quick Switcher & Actions) */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="space-y-1 text-center lg:text-left">
          <span className="text-xs uppercase tracking-wider font-bold text-[#1CC29F] flex items-center justify-center lg:justify-start gap-1">
            <Sparkles size={12} />
            <span>Interactive Demo Workspace</span>
          </span>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Hello, <span className="text-[#1CC29F]">{user?.name}</span>
          </h1>
          <p className="text-xs text-gray-400">Viewing your personal ledger overview and group bills.</p>
        </div>

        {/* Quick switch profile buttons wrapper */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center space-x-1.5 text-xs text-gray-500 font-bold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <UserCheck size={14} className="text-[#1CC29F]" />
            <span>Switch View:</span>
            <div className="flex flex-wrap gap-1.5 pl-2">
              {['Aisha', 'Rohan', 'Priya', 'Sam', 'Meera', 'Dev'].map((p) => {
                const isCurrent = user?.name?.toLowerCase() === p.toLowerCase();
                return (
                  <button
                    key={p}
                    onClick={() => handleQuickSwitch(p)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      isCurrent
                        ? 'bg-[#1CC29F] text-white shadow-sm'
                        : 'bg-white hover:bg-gray-100 border border-gray-200 text-gray-600'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowCreateGroup(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-[#1CC29F] hover:bg-[#19b896] text-white rounded-xl font-bold text-xs shadow-sm hover-lift cursor-pointer"
            >
              <Plus size={14} />
              <span>Create Group</span>
            </button>
            <Link
              to="/import"
              className="flex items-center space-x-1.5 px-4 py-2 border border-gray-200 bg-white text-gray-600 rounded-xl font-bold text-xs shadow-sm hover-lift text-center"
            >
              <Database size={14} />
              <span>Import CSV</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Interactive Analytics Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total balance Card */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm relative overflow-hidden flex items-center justify-between hover-lift">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Net Balance</span>
            <div className={`text-3xl font-black ${overallNet >= 0 ? 'text-[#1CC29F]' : 'text-red-500'}`}>
              {overallNet >= 0 ? `+₹${overallNet}` : `-₹${Math.abs(overallNet)}`}
            </div>
            <p className="text-xs text-gray-400">Sum of all receivables and payables</p>
          </div>
          <div className={`p-4 rounded-2xl ${overallNet >= 0 ? 'bg-[#1CC29F]/10 text-[#1CC29F]' : 'bg-red-50 text-red-500'}`}>
            <Layers size={28} />
          </div>
        </div>

        {/* You Are Owed Card */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm relative overflow-hidden flex items-center justify-between hover-lift">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">You Are Owed</span>
            <div className="text-3xl font-black text-[#1CC29F]">
              {overallNet > 0 ? `₹${overallNet}` : '₹0.00'}
            </div>
            <p className="text-xs text-gray-400">Collectable positive balances</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#1CC29F]/10 text-[#1CC29F]">
            <ArrowUpRight size={28} />
          </div>
        </div>

        {/* You Owe Card */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm relative overflow-hidden flex items-center justify-between hover-lift">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">You Owe</span>
            <div className="text-3xl font-black text-red-500">
              {overallNet < 0 ? `₹${Math.abs(overallNet)}` : '₹0.00'}
            </div>
            <p className="text-xs text-gray-400">Outstanding payment obligations</p>
          </div>
          <div className="p-4 rounded-2xl bg-red-50 text-red-500">
            <ArrowDownRight size={28} />
          </div>
        </div>

      </div>

      {/* 3. Main Dashboard Body Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Groups list (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
              <Users className="text-[#1CC29F]" size={20} />
              <span>Active Shared Groups ({groups.length})</span>
            </h2>
          </div>

          {groups.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center space-y-4 shadow-sm">
              <CreditCard className="mx-auto text-gray-400" size={48} />
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-gray-800">No active groups</h3>
                <p className="text-sm text-gray-500">Create a group to start adding and splitting flatmate bills.</p>
              </div>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="px-5 py-2.5 bg-[#1CC29F] hover:bg-[#19b896] text-white font-bold rounded-lg hover-lift cursor-pointer text-xs"
              >
                Create Group
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {groups.map((group, idx) => (
                <Link
                  key={group.id}
                  to={`/groups/${group.id}`}
                  style={{ animationDelay: `${idx * 100}ms` }}
                  className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover-lift flex flex-col justify-between h-44 cursor-pointer relative group animate-fade-in-up"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Group #{idx + 1}</span>
                      <ChevronRight size={18} className="text-gray-400 group-hover:text-[#1CC29F] transition-colors" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#1CC29F] transition-colors line-clamp-1">
                      {group.name}
                    </h3>
                    <p className="text-[10px] text-gray-400">
                      Created: {new Date(group.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  {/* Subtle visual meter bar explaining balance share */}
                  <div className="space-y-1.5 pt-4 border-t border-gray-50">
                    <div className="flex justify-between text-[10px] font-bold text-gray-500">
                      <span>Sync Ledger Status</span>
                      <span className="text-[#1CC29F]">Active</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1CC29F] w-3/4 rounded-full"></div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Ledger Statistics Widget & Mock Timeline Activity */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
            <Activity className="text-[#1CC29F]" size={20} />
            <span>Ledger Insights</span>
          </h2>

          {/* Visual debts comparison bar widget */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Top Owed Breakdown</h3>
            
            {owesList.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No outstanding balance debts to visualize.</p>
            ) : (
              <div className="space-y-4">
                {owesList.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-gray-700">
                      <span>{item.name}</span>
                      <span className={item.type === 'receive' ? 'text-[#1CC29F]' : 'text-red-500'}>
                        {item.type === 'receive' ? `+₹${item.amount}` : `-₹${item.amount}`}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${item.type === 'receive' ? 'bg-[#1CC29F]' : 'bg-red-400'}`} 
                        style={{ width: `${Math.min(100, (item.amount / 5000) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mock Recent Activity Feed timeline */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recent Activity Feed</h3>
            <div className="space-y-4 text-xs">
              <div className="flex items-start space-x-3">
                <div className="p-1 rounded-lg bg-teal-50 text-[#1CC29F] mt-0.5">
                  <ArrowUpRight size={14} />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Rohan paid Aisha</p>
                  <p className="text-[10px] text-gray-400">Feb Settlement • ₹5,000</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-1 rounded-lg bg-purple-50 text-purple-500 mt-0.5">
                  <Layers size={14} />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Aisha added February rent</p>
                  <p className="text-[10px] text-gray-400">Flatmates Group • ₹48,000</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-1 rounded-lg bg-amber-50 text-amber-500 mt-0.5">
                  <Database size={14} />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Imported CSV expenses</p>
                  <p className="text-[10px] text-gray-400">41 rows processed successfully</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Modal: Create Group */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 space-y-5 shadow-2xl border border-gray-100 animate-fade-in-up">
            <h3 className="text-lg font-bold text-gray-800">Create New Group</h3>
            
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Goa Trip 2026"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#1CC29F]"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateGroup(false);
                    setNewGroupName('');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-1.5 rounded-lg bg-[#1CC29F] text-xs font-semibold text-white hover-lift cursor-pointer disabled:opacity-50"
                >
                  {createLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default Dashboard;
