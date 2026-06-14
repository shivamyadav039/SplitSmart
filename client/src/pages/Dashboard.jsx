import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import api from '../services/api.js';
import { 
  Plus, Database, ArrowUpRight, ArrowDownRight, Layers, 
  ChevronRight, Users, Activity, Sparkles, UserCheck, 
  UserPlus, Mail, Calendar, FileText, CheckCircle2, 
  Search, ArrowRight, DollarSign, Wallet
} from 'lucide-react';
import { ExpenseModal } from '../components/ExpenseModal.jsx';
import { SettlementModal } from '../components/SettlementModal.jsx';
import { AuditTrailModal } from '../components/AuditTrailModal.jsx';

export const Dashboard = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [switchingUser, setSwitchingUser] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [overallNet, setOverallNet] = useState(0);
  
  // Tab management for dashboard details: 'ledger' | 'groups' | 'activity'
  const [activeTab, setActiveTab] = useState('ledger');

  // Friends invite state
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Modals state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditUser, setAuditUser] = useState(null); // stores { groupId, userId, userName }

  // Stats for the visual ledger comparison widget
  const [owesList, setOwesList] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  const fetchDashboardData = async () => {
    if (!user || !user.id) return;
    try {
      // 1. Fetch groups
      const groupsRes = await api.get('/groups');
      const groupsData = groupsRes.data.groups || [];
      setGroups(groupsData);

      // 2. Fetch friends (users)
      const friendsRes = await api.get('/auth/users');
      setFriends(friendsRes.data.users || []);

      let totalNet = 0;
      let collectiveDebts = [];
      let tempActivities = [];

      // 3. Loop groups to aggregate balances & activity details
      for (const group of groupsData) {
        // Balances
        const balRes = await api.get(`/groups/${group.id}/balances`);
        const summaries = balRes.data.summaries || [];
        const userSummary = summaries.find(s => s.user_id === user.id);
        if (userSummary) {
          totalNet += parseFloat(userSummary.net_balance);
        }

        // Collect debts involving active user for the visual widget
        const debts = balRes.data.debts || [];
        debts.forEach(d => {
          if (d.debtor_id === user.id) {
            collectiveDebts.push({ 
              type: 'pay', 
              name: d.creditor_name, 
              amount: d.amount,
              groupId: group.id,
              userId: d.creditor_id,
              userName: d.creditor_name,
              groupName: group.name
            });
          } else if (d.creditor_id === user.id) {
            collectiveDebts.push({ 
              type: 'receive', 
              name: d.debtor_name, 
              amount: d.amount,
              groupId: group.id,
              userId: d.debtor_id,
              userName: d.debtor_name,
              groupName: group.name
            });
          }
        });

        // Try to fetch recent group expenses/payments for dynamic feed
        try {
          const expRes = await api.get(`/groups/${group.id}/expenses?limit=5`);
          const expenses = expRes.data.data || [];
          expenses.forEach(e => {
            tempActivities.push({
              id: e.id,
              type: 'expense',
              description: e.description,
              amount: e.amount_inr,
              date: e.expense_date,
              groupName: group.name,
              paidByName: e.paid_by_name,
              originalCurrency: e.original_currency,
              originalAmount: e.original_amount
            });
          });
        } catch (err) {
          console.warn(`Failed to fetch activities for group ${group.id}:`, err);
        }
      }

      setOverallNet(Math.round(totalNet * 100) / 100);
      setOwesList(collectiveDebts);
      
      // Sort and limit activities by date descending
      tempActivities.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecentActivity(tempActivities.slice(0, 10));

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
      await fetchDashboardData();
      navigate(`/groups/${res.data.id}`);
    } catch (err) {
      console.error('Failed to create group:', err);
      alert('Error creating group.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleInviteFriend = async (e) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;

    setInviteLoading(true);
    setInviteError('');
    setInviteSuccess(false);

    try {
      await api.post('/auth/users', { name: inviteName, email: inviteEmail });
      setInviteName('');
      setInviteEmail('');
      setInviteSuccess(true);
      
      // Clear success alert after 3 seconds
      setTimeout(() => setInviteSuccess(false), 3000);

      // Re-fetch dashboard data (friends list)
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to invite friend:', err);
      setInviteError(err.response?.data?.error || 'Failed to register friend.');
    } finally {
      setInviteLoading(false);
    }
  };

  // Exclude current user from friends list
  const filteredFriends = friends.filter(f => f.id !== user?.id);

  if (loading || switchingUser) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center space-y-4 bg-[#F2F2F2]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent border-[#1CC29F]"></div>
        <p className="text-sm font-semibold text-gray-600">
          {switchingUser ? 'Switching profile perspectives...' : 'Syncing accounts ledger...'}
        </p>
      </div>
    );
  }

  // Calculate owed summary
  const totalReceivables = owesList
    .filter(item => item.type === 'receive')
    .reduce((sum, item) => sum + parseFloat(item.amount), 0);

  const totalPayables = owesList
    .filter(item => item.type === 'pay')
    .reduce((sum, item) => sum + parseFloat(item.amount), 0);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F2F2F2] flex flex-col md:flex-row">
      
      {/* ================= LEFT SIDEBAR ================= */}
      <div className="w-full md:w-72 bg-white border-r border-gray-200/80 flex flex-col p-5 space-y-6 shrink-0 md:min-h-[calc(100vh-64px)] shadow-sm">
        
        {/* Title Identity */}
        <div className="pb-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1CC29F] to-[#06B6D4] flex items-center justify-center shadow-sm">
              <Wallet size={18} className="text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-[#1cc29f] to-[#06b6d4] bg-clip-text text-transparent">SplitSmart</span>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider -mt-1">ExpenseSync</p>
            </div>
          </div>
        </div>

        {/* Quick Nav Links */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-2 block mb-1">Navigation</span>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
              activeTab === 'ledger' 
                ? 'bg-[#1CC29F]/10 text-[#19B896]' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center space-x-2">
              <Activity size={14} />
              <span>Balances Dashboard</span>
            </span>
            {owesList.length > 0 && (
              <span className="bg-[#1CC29F] text-white px-2 py-0.5 rounded-full text-[9px]">
                {owesList.length}
              </span>
            )}
          </button>
          
          <Link
            to="/import"
            className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center space-x-2"
          >
            <Database size={14} />
            <span>CSV Bulk Importer</span>
          </Link>
        </div>

        {/* Groups List Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pl-2 mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Shared Groups</span>
            <button 
              onClick={() => setShowCreateGroup(true)}
              className="text-[#1CC29F] hover:text-[#19b896] p-0.5 rounded hover:bg-gray-50 transition-all cursor-pointer"
              title="Create group"
            >
              <Plus size={14} />
            </button>
          </div>
          
          <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
            {groups.length === 0 ? (
              <div className="text-[11px] text-gray-400 italic pl-2 py-1">No groups yet.</div>
            ) : (
              groups.map((g, idx) => {
                const colorSchemes = [
                  'from-purple-400 to-indigo-500',
                  'from-teal-400 to-cyan-500',
                  'from-orange-400 to-red-500',
                  'from-pink-400 to-rose-500'
                ];
                const scheme = colorSchemes[idx % colorSchemes.length];
                return (
                  <Link
                    key={g.id}
                    to={`/groups/${g.id}`}
                    className="flex items-center space-x-2.5 px-2.5 py-1.5 rounded-xl hover:bg-gray-50 transition-all cursor-pointer group text-left"
                  >
                    <div className={`w-6 h-6 rounded-lg bg-gradient-to-tr ${scheme} text-white font-extrabold text-[10px] flex items-center justify-center uppercase shadow-sm`}>
                      {g.name.substring(0, 2)}
                    </div>
                    <span className="text-xs font-bold text-gray-700 group-hover:text-[#1CC29F] transition-colors truncate">
                      {g.name}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Friends List Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pl-2 mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Friends / Members</span>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
            {filteredFriends.length === 0 ? (
              <div className="text-[11px] text-gray-400 italic pl-2 py-1">No other users in system.</div>
            ) : (
              filteredFriends.map((friend, idx) => (
                <div key={friend.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-gray-50 transition-all">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-gray-200 border border-white text-gray-600 font-bold text-[10px] flex items-center justify-center uppercase shadow-sm shrink-0">
                      {friend.name.substring(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-700 truncate -mb-0.5">{friend.name}</p>
                      <p className="text-[9px] text-gray-400 truncate">{friend.email}</p>
                    </div>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Online" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Invite Box */}
        <div className="pt-4 border-t border-gray-100 mt-auto">
          <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 space-y-3">
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <UserPlus size={10} className="text-[#1CC29F]" />
                <span>Invite friends</span>
              </span>
              <p className="text-[9px] text-gray-400">Quickly add people to SplitSmart.</p>
            </div>
            
            {inviteSuccess && (
              <div className="text-[10px] bg-emerald-50 text-emerald-600 p-2 rounded-lg border border-emerald-100 font-semibold text-center flex items-center justify-center gap-1">
                <CheckCircle2 size={12} />
                <span>Invited successfully!</span>
              </div>
            )}
            
            {inviteError && (
              <div className="text-[10px] bg-red-50 text-red-500 p-2 rounded-lg border border-red-100 font-semibold text-center">
                {inviteError}
              </div>
            )}

            <form onSubmit={handleInviteFriend} className="space-y-2">
              <input
                type="text"
                required
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                placeholder="Friend's Name"
                className="w-full text-xs rounded-lg px-2.5 py-1.5 border border-gray-200 focus:outline-none focus:border-[#1CC29F] placeholder-gray-400 text-gray-700 bg-white"
              />
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full text-xs rounded-lg px-2.5 py-1.5 border border-gray-200 focus:outline-none focus:border-[#1CC29F] placeholder-gray-400 text-gray-700 bg-white"
              />
              <button
                type="submit"
                disabled={inviteLoading}
                className="w-full text-center px-3 py-1.5 bg-[#1CC29F] hover:bg-[#19b896] text-white rounded-lg font-bold text-[10px] shadow-sm hover-lift flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {inviteLoading ? 'Sending...' : (
                  <>
                    <Mail size={11} />
                    <span>Send Invite</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* ================= MAIN CONTENT AREA ================= */}
      <div className="flex-1 p-6 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
        
        {/* 1. Header Hero Panel */}
        <div className="bg-white border border-gray-200/70 rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-6 animate-fade-in-up">
          <div className="space-y-1.5 text-center lg:text-left">
            <span className="text-xs uppercase tracking-wider font-extrabold text-[#1CC29F] flex items-center justify-center lg:justify-start gap-1">
              <Sparkles size={12} className="animate-pulse" />
              <span>Interactive Persona Workspace</span>
            </span>
            <h2 className="text-2xl font-black text-gray-900 leading-tight">
              Welcome back, <span className="text-[#1CC29F]">{user?.name}</span> 👋
            </h2>
            <p className="text-xs text-gray-500">Track flat expenses, settle balances, and view dynamic ledger calculations.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            
            {/* Quick Switch Switcher */}
            <div className="flex items-center space-x-1.5 text-[10px] text-gray-500 font-extrabold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 shadow-inner">
              <UserCheck size={12} className="text-[#1CC29F]" />
              <span>Switch View:</span>
              <div className="flex flex-wrap gap-1 pl-1">
                {['Aisha', 'Rohan', 'Priya', 'Sam', 'Meera', 'Dev'].map((p) => {
                  const isCurrent = user?.name?.toLowerCase() === p.toLowerCase();
                  return (
                    <button
                      key={p}
                      onClick={() => handleQuickSwitch(p)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
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

            {/* Direct Expense / Settlement CTAs */}
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => setShowExpenseModal(true)}
                className="flex items-center space-x-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl font-bold text-xs shadow-sm hover-lift cursor-pointer"
              >
                <Plus size={14} />
                <span>Add an expense</span>
              </button>
              
              <button
                onClick={() => setShowSettlementModal(true)}
                className="flex items-center space-x-1 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-xl font-bold text-xs shadow-sm hover-lift cursor-pointer"
              >
                <CheckCircle2 size={14} />
                <span>Settle up</span>
              </button>
            </div>

          </div>
        </div>

        {/* 2. Ledger Aggregations Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          
          {/* Net Balance Card */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm relative overflow-hidden flex items-center justify-between hover-lift">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Net Balance</span>
              <div className={`text-2xl font-black tracking-tight ${overallNet >= 0 ? 'text-[#1CC29F]' : 'text-red-500'}`}>
                {overallNet >= 0 ? `+₹${overallNet}` : `-₹${Math.abs(overallNet)}`}
              </div>
              <p className="text-[10px] text-gray-400">Aggregate across all groups</p>
            </div>
            <div className={`p-3 rounded-xl ${overallNet >= 0 ? 'bg-[#1CC29F]/10 text-[#1CC29F]' : 'bg-red-50 text-red-500'}`}>
              <Layers size={22} />
            </div>
          </div>

          {/* You are Owed Card */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm relative overflow-hidden flex items-center justify-between hover-lift">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">You Are Owed</span>
              <div className="text-2xl font-black tracking-tight text-[#1CC29F]">
                ₹{totalReceivables.toFixed(2)}
              </div>
              <p className="text-[10px] text-gray-400">Total positive collectables</p>
            </div>
            <div className="p-3 rounded-xl bg-[#1CC29F]/10 text-[#1CC29F]">
              <ArrowUpRight size={22} />
            </div>
          </div>

          {/* You Owe Card */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm relative overflow-hidden flex items-center justify-between hover-lift">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">You Owe</span>
              <div className="text-2xl font-black tracking-tight text-red-500">
                ₹{totalPayables.toFixed(2)}
              </div>
              <p className="text-[10px] text-gray-400">Outstanding split obligations</p>
            </div>
            <div className="p-3 rounded-xl bg-red-50 text-red-500">
              <ArrowDownRight size={22} />
            </div>
          </div>

        </div>

        {/* 3. Main Dashboard Body Tabs Container */}
        <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          
          {/* Tabs header selector */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('ledger')}
              className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'ledger'
                  ? 'border-[#1CC29F] text-[#19B896]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Activity size={14} />
              <span>Owed Balances Breakdown</span>
            </button>

            <button
              onClick={() => setActiveTab('groups')}
              className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'groups'
                  ? 'border-[#1CC29F] text-[#19B896]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Users size={14} />
              <span>Groups Workspace</span>
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'activity'
                  ? 'border-[#1CC29F] text-[#19B896]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <FileText size={14} />
              <span>Recent Activity Feed</span>
            </button>
          </div>

          {/* Tab Contents */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm min-h-[300px]">
            
            {/* TAB 1: LEDGER BREAKDOWN */}
            {activeTab === 'ledger' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Dynamic Debts Ledger</h3>
                  <p className="text-[11px] text-gray-500">Pairwise debt calculations updated dynamically in PostgreSQL. Click on any user to inspect their audit trail details.</p>
                </div>

                {owesList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-[#1CC29F]/5 flex items-center justify-center text-[#1CC29F]">
                      <CheckCircle2 size={32} className="animate-bounce" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-gray-800">You are all settled up!</p>
                      <p className="text-[10px] text-gray-400">No receivables or payables are currently registered across your groups.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {owesList.map((item, idx) => {
                      const maxBarVal = Math.max(...owesList.map(o => parseFloat(o.amount)), 500);
                      const barPercentage = Math.min(100, (parseFloat(item.amount) / maxBarVal) * 100);
                      
                      return (
                        <div 
                          key={idx}
                          onClick={() => handleOpenAuditModal(item)}
                          className="p-4 rounded-xl border border-gray-100 hover:border-[#1CC29F]/30 bg-gray-50/40 hover:bg-gray-50 transition-all flex flex-col justify-between cursor-pointer group hover-lift"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center space-x-2.5">
                              <div className={`w-7 h-7 rounded-full text-white font-bold text-[10px] flex items-center justify-center uppercase shadow-sm ${
                                item.type === 'receive' ? 'bg-[#1CC29F]' : 'bg-red-400'
                              }`}>
                                {item.userName.substring(0, 2)}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-gray-800 group-hover:text-[#1CC29F] transition-colors">{item.userName}</h4>
                                <p className="text-[9px] text-gray-400 font-bold uppercase">{item.groupName}</p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <span className={`text-xs font-black ${item.type === 'receive' ? 'text-[#1CC29F]' : 'text-red-500'}`}>
                                {item.type === 'receive' ? `+₹${item.amount}` : `-₹${item.amount}`}
                              </span>
                              <p className="text-[9px] text-gray-400 italic">Click to audit</p>
                            </div>
                          </div>

                          {/* Interactive Bar representation */}
                          <div className="space-y-1">
                            <div className="h-1.5 w-full bg-gray-200/70 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  item.type === 'receive' ? 'bg-[#1CC29F]' : 'bg-red-400'
                                }`} 
                                style={{ width: `${barPercentage}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between text-[8px] font-bold text-gray-400">
                              <span>
                                {item.type === 'receive' ? 'Owes You' : 'You Owe'}
                              </span>
                              <span>₹{item.amount}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: GROUPS LIST */}
            {activeTab === 'groups' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Active Shared Spaces</h3>
                    <p className="text-[11px] text-gray-500">Participate in shared bills and flatmate budgets in distinct workspaces.</p>
                  </div>
                  <button 
                    onClick={() => setShowCreateGroup(true)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-[#1CC29F] hover:bg-[#19b896] text-white rounded-lg font-bold text-[10px] shadow-sm hover-lift cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>New Group</span>
                  </button>
                </div>

                {groups.length === 0 ? (
                  <div className="border border-dashed border-gray-200 rounded-2xl p-8 text-center space-y-4 max-w-md mx-auto">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 mx-auto">
                      <Users size={24} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-gray-800">Initialize Your First Group</p>
                      <p className="text-[10px] text-gray-400 leading-relaxed">Create a group workspace for flatmates, room expenses, or trips to start managing splits.</p>
                    </div>
                    <button
                      onClick={() => setShowCreateGroup(true)}
                      className="px-4 py-2 bg-[#1CC29F] text-white font-bold rounded-lg text-xs shadow-sm hover-lift cursor-pointer mx-auto block"
                    >
                      Create Group
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {groups.map((group, idx) => {
                      const colorGradient = [
                        'from-indigo-400/10 to-purple-400/5 border-indigo-100',
                        'from-teal-400/10 to-cyan-400/5 border-teal-100',
                        'from-amber-400/10 to-orange-400/5 border-amber-100'
                      ];
                      const styleClass = colorGradient[idx % colorGradient.length];
                      return (
                        <Link
                          key={group.id}
                          to={`/groups/${group.id}`}
                          className={`p-5 rounded-2xl border ${styleClass} bg-gradient-to-br flex flex-col justify-between h-40 hover-lift group cursor-pointer text-left`}
                        >
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">Workspace</span>
                            <h4 className="text-sm font-extrabold text-gray-900 group-hover:text-[#1CC29F] transition-colors truncate">
                              {group.name}
                            </h4>
                            <p className="text-[10px] text-gray-400">
                              Opened: {new Date(group.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          
                          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[10px] font-bold text-gray-500">
                            <span>Ledger Status</span>
                            <span className="text-[#1CC29F] flex items-center space-x-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#1CC29F] inline-block animate-ping"></span>
                              <span>Synced</span>
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: RECENT ACTIVITY */}
            {activeTab === 'activity' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Ledger Activity Feed</h3>
                  <p className="text-[11px] text-gray-500">Live chronological logs of expenses recorded across your groups.</p>
                </div>

                {recentActivity.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 text-xs italic">
                    No recent activities recorded. Start by adding expenses.
                  </div>
                ) : (
                  <div className="relative border-l border-gray-200/80 ml-3 pl-5 space-y-6 py-2">
                    {recentActivity.map((activity, idx) => {
                      const isCurrentUserPayer = activity.paidByName === user?.name;
                      return (
                        <div key={idx} className="relative group">
                          {/* Dot Badge */}
                          <div className="absolute -left-[26px] top-1 w-3 h-3 rounded-full bg-white border-2 border-[#1CC29F] group-hover:bg-[#1CC29F] transition-all"></div>
                          
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div>
                              <p className="text-xs font-bold text-gray-800">
                                {activity.paidByName} added <span className="text-gray-900 font-extrabold">"{activity.description}"</span>
                              </p>
                              <div className="flex items-center space-x-2 text-[10px] text-gray-400 font-bold mt-0.5">
                                <span className="bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wider text-[9px]">{activity.groupName}</span>
                                <span>•</span>
                                <span>{new Date(activity.date).toLocaleDateString()}</span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-xs font-black text-gray-800">
                                ₹{activity.amount}
                              </span>
                              {activity.originalCurrency === 'USD' && (
                                <p className="text-[9px] text-cyan-500 font-bold">
                                  (${activity.originalAmount} USD)
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </div>

      {/* ================= MODALS ================= */}
      
      {/* 1. Modal: Create Group */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 space-y-5 shadow-2xl border border-gray-100 animate-fade-in-up">
            <h3 className="text-base font-extrabold text-gray-900">Create New Group</h3>
            
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
                  placeholder="e.g. Flat rent, Goa Trip"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#1CC29F] bg-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateGroup(false);
                    setNewGroupName('');
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-1.5 rounded-lg bg-[#1CC29F] text-xs font-bold text-white hover-lift cursor-pointer disabled:opacity-50"
                >
                  {createLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Universal Expense Modal */}
      {showExpenseModal && (
        <ExpenseModal
          currentUser={user}
          onClose={() => setShowExpenseModal(false)}
          onSuccess={fetchDashboardData}
        />
      )}

      {/* 3. Universal Settlement Modal */}
      {showSettlementModal && (
        <SettlementModal
          currentUser={user}
          onClose={() => setShowSettlementModal(false)}
          onSuccess={fetchDashboardData}
        />
      )}

      {/* 4. Audit Trail Modal */}
      {showAuditModal && auditUser && (
        <AuditTrailModal
          groupId={auditUser.groupId}
          userId={user.id}
          userName={user.name}
          targetUserId={auditUser.userId}
          targetUserName={auditUser.userName}
          onClose={() => {
            setShowAuditModal(false);
            setAuditUser(null);
          }}
        />
      )}

    </div>
  );
};

export default Dashboard;
