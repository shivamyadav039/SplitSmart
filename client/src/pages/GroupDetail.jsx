import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import api from '../services/api.js';
import { ExpenseModal } from '../components/ExpenseModal.jsx';
import { SettlementModal } from '../components/SettlementModal.jsx';
import { AuditTrailModal } from '../components/AuditTrailModal.jsx';
import { 
  PlusCircle, CreditCard, Users, History, Calendar, 
  ArrowLeft, Eye, Filter, RefreshCw, CheckCircle2 
} from 'lucide-react';

export const GroupDetail = () => {
  const { id: groupId } = useParams();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // overview, expenses, balances, settlements, members
  
  // Data lists
  const [expenses, setExpenses] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [payments, setPayments] = useState([]);
  const [debts, setDebts] = useState([]);
  const [memberSummaries, setMemberSummaries] = useState([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);

  // Filters for expenses
  const [filterMember, setFilterMember] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');

  // Modals visibility
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditTarget, setAuditTarget] = useState(null); // { user_id, name }

  // Add/Edit member form
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberJoined, setMemberJoined] = useState(() => new Date().toISOString().split('T')[0]);
  const [memberLeft, setMemberLeft] = useState('');
  const [memberError, setMemberError] = useState('');

  const fetchGroupDetails = async () => {
    try {
      const groupRes = await api.get('/groups');
      const currentGroup = groupRes.data.groups.find(g => g.id === groupId);
      setGroup(currentGroup);

      const memRes = await api.get(`/groups/${groupId}/members`);
      setMembers(memRes.data.members);
    } catch (err) {
      console.error('Error fetching group configurations:', err);
    }
  };

  const fetchExpensesList = async () => {
    setListLoading(true);
    try {
      let query = `?page=${page}&limit=10`;
      if (filterMember) query += `&memberId=${filterMember}`;
      if (filterStart) query += `&startDate=${filterStart}`;
      if (filterEnd) query += `&endDate=${filterEnd}`;

      const res = await api.get(`/groups/${groupId}/expenses${query}`);
      setExpenses(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setListLoading(false);
    }
  };

  const fetchBalancesAndDebts = async () => {
    try {
      const res = await api.get(`/groups/${groupId}/balances`);
      setDebts(res.data.debts || []);
      setMemberSummaries(res.data.summaries || []);
    } catch (err) {
      console.error('Error fetching balances:', err);
    }
  };

  const fetchPaymentsHistory = async () => {
    try {
      const res = await api.get(`/payments/group/${groupId}`);
      setPayments(res.data.history || []);
    } catch (err) {
      console.error('Error fetching payment history:', err);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get(`/groups/${groupId}/expenses/export`, {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${group?.name || 'group'}_expenses_export.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting expenses CSV:', err);
    }
  };


  // Full reload wrapper
  const handleReloadData = async () => {
    await fetchGroupDetails();
    await fetchBalancesAndDebts();
    await fetchExpensesList();
    await fetchPaymentsHistory();
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await handleReloadData();
      setLoading(false);
    };
    init();
  }, [groupId]);

  useEffect(() => {
    fetchExpensesList();
  }, [page, filterMember, filterStart, filterEnd]);

  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    setMemberError('');

    try {
      await api.post(`/groups/${groupId}/members`, {
        name: memberName,
        joined_at: memberJoined,
        left_at: memberLeft || null
      });
      setMemberName('');
      setMemberJoined(new Date().toISOString().split('T')[0]);
      setMemberLeft('');
      setShowAddMember(false);
      handleReloadData(); // Refresh details
    } catch (err) {
      setMemberError(err.response?.data?.error || 'Failed to add member.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent border-[#06B6D4]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Back button & title */}
      <div className="flex items-center space-x-3">
        <Link to="/dashboard" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">{group?.name}</h1>
          <p className="text-xs text-gray-400">Chronological group balance ledger</p>
        </div>
      </div>

      {/* Tabs list navigation */}
      <div className="flex items-center space-x-2 border-b border-white/5 pb-0">
        {[
          { id: 'overview', label: 'Overview', icon: CheckCircle2 },
          { id: 'expenses', label: 'Expenses', icon: PlusCircle },
          { id: 'balances', label: 'Balances', icon: Users },
          { id: 'settlements', label: 'Payments Log', icon: History },
          { id: 'members', label: 'Members', icon: Calendar }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-1.5 px-4 py-2.5 text-sm font-semibold tracking-tight transition-colors border-b-2 -mb-[2px] ${
                activeTab === tab.id
                  ? 'border-[#06B6D4] text-[#06B6D4]'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Debt settlement list */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-white">Outstanding Debts</h3>
            
            {debts.length === 0 ? (
              <div className="glass-card rounded-2xl p-10 text-center text-sm text-gray-400 space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-green-400" />
                <p>All settled up! No outstanding balances in this group.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {debts.map((debt, idx) => (
                  <div key={idx} className="glass-card rounded-xl p-4 flex items-center justify-between border-l-4 border-l-[#8B5CF6]">
                    <div className="text-sm">
                      <span className="font-bold text-white">{debt.debtor_name}</span>
                      <span className="text-gray-400"> owes </span>
                      <span className="font-bold text-white">{debt.creditor_name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-extrabold text-[#EF4444]">₹{debt.amount}</div>
                      <button
                        onClick={() => {
                          setAuditTarget({ user_id: debt.debtor_id, name: debt.debtor_name });
                          // Open Settlement modal with target credentials pre-filled
                          setShowSettlementModal(true);
                        }}
                        className="text-[11px] text-[#06B6D4] hover:underline font-bold"
                      >
                        Settle Up
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats sidebar */}
          <div className="glass-card rounded-2xl p-6 h-fit space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400">Quick Actions</h4>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] text-xs font-bold text-white hover:opacity-90 transition-opacity"
            >
              <PlusCircle size={16} />
              <span>Log Shared Expense</span>
            </button>
            <button
              onClick={() => setShowSettlementModal(true)}
              className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-200 transition-colors"
            >
              <CreditCard size={16} />
              <span>Record Payment</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          {/* Filters area */}
          <div className="glass-card rounded-xl p-4 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center space-x-2 text-gray-400">
              <Filter size={16} />
              <span className="font-bold">Filters:</span>
            </div>

            <select
              value={filterMember}
              onChange={(e) => { setFilterMember(e.target.value); setPage(1); }}
              className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none"
            >
              <option value="" className="bg-[#0f172a]">All Members</option>
              {members.map(m => (
                <option key={m.user_id} value={m.user_id} className="bg-[#0f172a]">{m.name}</option>
              ))}
            </select>

            <div className="flex items-center space-x-1.5 text-xs text-gray-400">
              <span>From:</span>
              <input
                type="date"
                value={filterStart}
                onChange={(e) => { setFilterStart(e.target.value); setPage(1); }}
                className="rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white"
              />
            </div>

            <div className="flex items-center space-x-1.5 text-xs text-gray-400">
              <span>To:</span>
              <input
                type="date"
                value={filterEnd}
                onChange={(e) => { setFilterEnd(e.target.value); setPage(1); }}
                className="rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white"
              />
            </div>

            {(filterMember || filterStart || filterEnd) && (
              <button
                onClick={() => { setFilterMember(''); setFilterStart(''); setFilterEnd(''); setPage(1); }}
                className="text-[11px] text-[#06B6D4] hover:underline mr-4"
              >
                Reset Filters
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3 py-1 rounded bg-[#06B6D4]/10 hover:bg-[#06B6D4]/20 border border-[#06B6D4]/20 text-xs font-semibold text-[#06B6D4] ml-auto transition-colors"
            >
              <span>Export CSV</span>
            </button>
          </div>

          {/* Expenses chronological listing */}
          <div className="space-y-4">
            {listLoading ? (
              <div className="flex h-40 items-center justify-center">
                <RefreshCw className="animate-spin text-[#06B6D4]" size={24} />
              </div>
            ) : expenses.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center text-sm text-gray-400">
                No matching expenses logged.
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="glass-card rounded-xl p-4 flex items-center justify-between hover:bg-white/[0.07] transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-white">{exp.description}</span>
                        {exp.import_status === 'imported' && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-[#F59E0B] text-[9px] font-bold uppercase tracking-wider">
                            CSV Imported
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Date: {new Date(exp.expense_date).toLocaleDateString()} | Paid by: {exp.paid_by_name}
                      </p>
                      {exp.notes && (
                        <p className="text-[11px] text-gray-500 italic">"{exp.notes}"</p>
                      )}
                    </div>

                    <div className="text-right space-y-1">
                      <div className="text-lg font-extrabold text-white">₹{exp.amount_inr}</div>
                      {exp.original_currency !== 'INR' && (
                        <div className="text-[10px] text-gray-500">
                          Original: {exp.original_amount} {exp.original_currency}
                        </div>
                      )}
                      <div className="text-[10px] text-gray-400 capitalize">Split: {exp.split_type}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination footer */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center space-x-3 pt-4">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(prev => prev - 1)}
                  className="px-3 py-1.5 rounded bg-white/5 border border-white/10 text-xs font-semibold text-white disabled:opacity-50 hover:bg-white/10"
                >
                  Prev
                </button>
                <span className="text-xs text-gray-400">
                  Page {page} of {pagination.totalPages}
                </span>
                <button
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage(prev => prev + 1)}
                  className="px-3 py-1.5 rounded bg-white/5 border border-white/10 text-xs font-semibold text-white disabled:opacity-50 hover:bg-white/10"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: BALANCES & ROHAN'S AUDIT */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Member Balances</h3>
            <p className="text-xs text-gray-400">Click a member to open Rohan's transparency audit breakdown.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {memberSummaries.map((summary) => {
              const isPositive = summary.net_balance >= 0;
              const isCurrentUser = summary.user_id === user.id;

              return (
                <button
                  key={summary.user_id}
                  onClick={() => {
                    if (!isCurrentUser) {
                      setAuditTarget({ user_id: summary.user_id, name: summary.name });
                      setShowAuditModal(true);
                    }
                  }}
                  disabled={isCurrentUser}
                  className={`glass-card rounded-2xl p-5 flex items-center justify-between border-l-4 transition-all text-left ${
                    isCurrentUser 
                      ? 'border-l-cyan-500 cursor-default' 
                      : isPositive 
                        ? 'border-l-[#22C55E] hover:scale-[1.01] hover:bg-white/[0.07]' 
                        : 'border-l-[#EF4444] hover:scale-[1.01] hover:bg-white/[0.07]'
                  }`}
                >
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">
                      {summary.name} {isCurrentUser ? '(You)' : ''}
                    </h4>
                    <p className="text-xs text-gray-400">
                      {isCurrentUser ? 'Your overall dynamic balance' : 'Click to inspect contributions audit'}
                    </p>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-lg font-extrabold ${
                        isPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'
                      }`}
                    >
                      {isPositive ? `+₹${summary.net_balance}` : `-₹${Math.abs(summary.net_balance)}`}
                    </div>
                    {!isCurrentUser && (
                      <span className="text-[10px] text-[#06B6D4] font-bold flex items-center justify-end space-x-0.5">
                        <Eye size={10} />
                        <span>Audit</span>
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: PAYMENTS HISTORY */}
      {activeTab === 'settlements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Payments Settlement Log</h3>
            <button
              onClick={() => setShowSettlementModal(true)}
              className="flex items-center space-x-1 px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] text-xs font-semibold text-white hover:opacity-90"
            >
              <PlusCircle size={14} />
              <span>Settle Up</span>
            </button>
          </div>

          {payments.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center text-sm text-gray-400">
              No settlements recorded in this group.
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => (
                <div key={p.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm text-white">
                      <span className="font-bold">{p.paid_by_name}</span>
                      <span className="text-gray-400"> paid </span>
                      <span className="font-bold">{p.paid_to_name}</span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Date: {new Date(p.payment_date).toLocaleDateString()}
                    </p>
                    {p.notes && (
                      <p className="text-[11px] text-gray-500 italic">"{p.notes}"</p>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-extrabold text-[#22C55E]">₹{p.amount}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: MEMBERS TIMELINES */}
      {activeTab === 'members' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Members list */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Group Memberships</h3>
              <button
                onClick={() => setShowAddMember(true)}
                className="flex items-center space-x-1 px-3 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-200"
              >
                <PlusCircle size={12} />
                <span>Add Member</span>
              </button>
            </div>

            <div className="space-y-3">
              {members.map((m) => (
                <div key={m.user_id} className="glass-card rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">{m.name}</h4>
                    <p className="text-[11px] text-gray-400">Email: {m.email}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-xs text-gray-300">
                      Active: {new Date(m.joined_at).toLocaleDateString()} -{' '}
                      {m.left_at ? new Date(m.left_at).toLocaleDateString() : 'Present'}
                    </div>
                    <button
                      onClick={() => {
                        setMemberName(m.name);
                        setMemberJoined(m.joined_at.split('T')[0]);
                        setMemberLeft(m.left_at ? m.left_at.split('T')[0] : '');
                        setShowAddMember(true);
                      }}
                      className="text-[10px] text-[#06B6D4] hover:underline font-bold"
                    >
                      Edit Active Period
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form: Add/Edit member timeline */}
          {showAddMember && (
            <div className="glass-card rounded-2xl p-6 h-fit space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                Register Membership
              </h4>
              
              {memberError && (
                <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-semibold">
                  {memberError}
                </div>
              )}

              <form onSubmit={handleAddMemberSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Name</label>
                  <input
                    type="text"
                    required
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="e.g. Kabir"
                    className="w-full rounded bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Joined Group Date</label>
                  <input
                    type="date"
                    required
                    value={memberJoined}
                    onChange={(e) => setMemberJoined(e.target.value)}
                    className="w-full rounded bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Left Group Date (Optional)</label>
                  <input
                    type="date"
                    value={memberLeft}
                    onChange={(e) => setMemberLeft(e.target.value)}
                    className="w-full rounded bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMember(false);
                      setMemberName('');
                      setMemberJoined(new Date().toISOString().split('T')[0]);
                      setMemberLeft('');
                      setMemberError('');
                    }}
                    className="px-3 py-1 text-xs text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] text-xs font-semibold text-white"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <ExpenseModal
          groupId={groupId}
          members={members}
          currentUser={user}
          onClose={() => setShowExpenseModal(false)}
          onSuccess={handleReloadData}
        />
      )}

      {/* Settlement Modal */}
      {showSettlementModal && (
        <SettlementModal
          groupId={groupId}
          members={members}
          currentUser={user}
          targetUser={auditTarget}
          onClose={() => {
            setShowSettlementModal(false);
            setAuditTarget(null);
          }}
          onSuccess={handleReloadData}
        />
      )}

      {/* Rohan Audit Trail Modal */}
      {showAuditModal && auditTarget && (
        <AuditTrailModal
          groupId={groupId}
          userId={user.id}
          userName={user.name}
          targetUserId={auditTarget.user_id}
          targetUserName={auditTarget.name}
          onClose={() => {
            setShowAuditModal(false);
            setAuditTarget(null);
          }}
        />
      )}
    </div>
  );
};
export default GroupDetail;
