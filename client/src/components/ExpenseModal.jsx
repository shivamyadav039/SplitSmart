import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { X, Plus, Info } from 'lucide-react';

export const ExpenseModal = ({ groupId: initialGroupId, members: initialMembers, currentUser, onClose, onSuccess }) => {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId || '');
  const [groupMembers, setGroupMembers] = useState(initialMembers || []);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState(currentUser?.id || '');
  const [splitType, setSplitType] = useState('equal');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Track active members on the selected date
  const [activeMembers, setActiveMembers] = useState([]);
  
  // Track split inputs: maps userId -> { selected: bool, percentage: num, shares: num, customAmount: num }
  const [splitConfig, setSplitConfig] = useState({});

  // Fetch groups if not provided
  useEffect(() => {
    if (!initialGroupId) {
      const fetchGroups = async () => {
        setLoadingGroups(true);
        try {
          const res = await api.get('/groups');
          setGroups(res.data.groups || []);
          if (res.data.groups && res.data.groups.length > 0) {
            setSelectedGroupId(res.data.groups[0].id);
          }
        } catch (err) {
          console.error('Failed to fetch groups:', err);
          setError('Failed to load groups. Please try again.');
        } finally {
          setLoadingGroups(false);
        }
      };
      fetchGroups();
    }
  }, [initialGroupId]);

  // Fetch members when group changes
  useEffect(() => {
    if (selectedGroupId && !initialMembers) {
      const fetchMembers = async () => {
        setLoadingMembers(true);
        try {
          const res = await api.get(`/groups/${selectedGroupId}/members`);
          setGroupMembers(res.data.members || []);
        } catch (err) {
          console.error('Failed to fetch members:', err);
          setError('Failed to load group members.');
        } finally {
          setLoadingMembers(false);
        }
      };
      fetchMembers();
    }
  }, [selectedGroupId, initialMembers]);

  useEffect(() => {
    // Filter members active on selected date
    const selectedDate = new Date(expenseDate);
    const active = groupMembers.filter(m => {
      const joined = new Date(m.joined_at);
      const left = m.left_at ? new Date(m.left_at) : null;
      return joined <= selectedDate && (!left || left >= selectedDate);
    });

    setActiveMembers(active);

    // If current payer is not active on this date, reset paidBy to first active member
    const isPayerActive = active.some(m => m.user_id === paidBy);
    if (!isPayerActive && active.length > 0) {
      setPaidBy(active[0].user_id);
    }

    // Initialize/Update split configurations
    const newConfig = {};
    active.forEach(m => {
      // Preserve existing configuration if available
      const prev = splitConfig[m.user_id];
      newConfig[m.user_id] = {
        selected: prev ? prev.selected : true,
        percentage: prev ? prev.percentage : '',
        shares: prev ? prev.shares : 1,
        customAmount: prev ? prev.customAmount : ''
      };
    });
    setSplitConfig(newConfig);

  }, [expenseDate, groupMembers]);

  const toggleSelectMember = (userId) => {
    setSplitConfig(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        selected: !prev[userId].selected
      }
    }));
  };

  const handleInputChange = (userId, field, val) => {
    setSplitConfig(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: val
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedGroupId) {
      return setError('Please select a group first.');
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return setError('Please enter a valid amount.');
    }

    // 1. Identify selected participants
    const participantsList = activeMembers.filter(m => splitConfig[m.user_id]?.selected);
    if (participantsList.length === 0) {
      return setError('Please select at least one participant to share the expense.');
    }

    // 2. Validate calculations depending on split types
    const participantsData = [];
    
    if (splitType === 'equal') {
      participantsList.forEach(p => {
        participantsData.push({ userId: p.user_id });
      });
    } else if (splitType === 'unequal') {
      let sum = 0;
      for (const p of participantsList) {
        const customAmt = parseFloat(splitConfig[p.user_id]?.customAmount);
        if (isNaN(customAmt) || customAmt < 0) {
          return setError(`Please enter a valid amount for ${p.name}.`);
        }
        sum += customAmt;
        participantsData.push({ userId: p.user_id, customAmount: customAmt });
      }
      if (Math.abs(sum - numericAmount) > 0.01) {
        return setError(`Sum of splits (₹${sum}) must equal the total expense amount (₹${numericAmount}).`);
      }
    } else if (splitType === 'percentage') {
      let sum = 0;
      for (const p of participantsList) {
        const pct = parseFloat(splitConfig[p.user_id]?.percentage);
        if (isNaN(pct) || pct < 0) {
          return setError(`Please enter a valid percentage for ${p.name}.`);
        }
        sum += pct;
        participantsData.push({ userId: p.user_id, percentage: pct });
      }
      if (Math.abs(sum - 100) > 0.01) {
        return setError(`Percentages must sum to exactly 100% (currently ${sum}%).`);
      }
    } else if (splitType === 'share') {
      for (const p of participantsList) {
        const sh = parseInt(splitConfig[p.user_id]?.shares, 10);
        if (isNaN(sh) || sh <= 0) {
          return setError(`Shares for ${p.name} must be positive integers.`);
        }
        participantsData.push({ userId: p.user_id, shares: sh });
      }
    }

    setLoading(true);
    try {
      await api.post('/expenses', {
        groupId: selectedGroupId,
        description,
        amount: numericAmount,
        currency,
        expenseDate,
        paidBy,
        splitType,
        notes,
        participants: participantsData
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create expense.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="glass-modal w-full max-w-lg rounded-2xl p-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Plus className="text-[#8B5CF6]" size={20} />
            <span>Add Shared Expense</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-6 space-y-4 pr-1">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold text-center">
              {error}
            </div>
          )}

          {!initialGroupId && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Select Group</label>
              {loadingGroups ? (
                <div className="text-xs text-gray-400 animate-pulse">Loading groups...</div>
              ) : (
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#06B6D4] transition-colors"
                >
                  <option value="" disabled className="bg-[#0f172a]">Choose a group...</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id} className="bg-[#0f172a]">
                      {g.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Description</label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Groceries at DMart"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#06B6D4] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Date</label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-sm text-white focus:outline-none focus:border-[#06B6D4] transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Payer (Paid By)</label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#06B6D4] transition-colors"
              >
                {activeMembers.map((m) => (
                  <option key={m.user_id} value={m.user_id} className="bg-[#0f172a]">
                    {m.name} {m.user_id === currentUser?.id ? '(You)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Split Method</label>
              <select
                value={splitType}
                onChange={(e) => setSplitType(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#06B6D4] transition-colors"
              >
                <option value="equal" className="bg-[#0f172a]">Equally</option>
                <option value="unequal" className="bg-[#0f172a]">Unequally (Custom Amounts)</option>
                <option value="percentage" className="bg-[#0f172a]">Percentages</option>
                <option value="share" className="bg-[#0f172a]">Shares (Weights)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Amount</label>
              <input
                type="number"
                required
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#06B6D4] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#06B6D4] transition-colors"
              >
                <option value="INR" className="bg-[#0f172a]">INR (₹)</option>
                <option value="USD" className="bg-[#0f172a]">USD ($)</option>
              </select>
            </div>
          </div>

          {currency === 'USD' && (
            <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs flex items-center space-x-2">
              <Info size={16} />
              <span>Converts using fixed rate: $1 USD = ₹{process.env.USD_TO_INR_RATE || 84} INR.</span>
            </div>
          )}

          {/* Split Configurations */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Participants & Splits</h4>

            <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
              {activeMembers.map((m) => {
                const conf = splitConfig[m.user_id] || { selected: false, percentage: '', shares: 1, customAmount: '' };
                return (
                  <div
                    key={m.user_id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                      conf.selected ? 'bg-white/5 border-white/10' : 'bg-transparent border-transparent opacity-40'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={conf.selected}
                        onChange={() => toggleSelectMember(m.user_id)}
                        className="rounded bg-white/5 border-white/15 text-[#06B6D4] focus:ring-[#06B6D4]"
                      />
                      <span className="text-sm font-semibold text-white">{m.name}</span>
                    </div>

                    {/* Conditional input details depending on splits type */}
                    {conf.selected && splitType !== 'equal' && (
                      <div className="w-28 flex items-center space-x-1.5">
                        {splitType === 'unequal' && (
                          <>
                            <span className="text-xs text-gray-400">₹</span>
                            <input
                              type="number"
                              required
                              step="0.01"
                              value={conf.customAmount}
                              onChange={(e) => handleInputChange(m.user_id, 'customAmount', e.target.value)}
                              placeholder="0.00"
                              className="w-full text-right rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-[#06B6D4]"
                            />
                          </>
                        )}

                        {splitType === 'percentage' && (
                          <>
                            <input
                              type="number"
                              required
                              value={conf.percentage}
                              onChange={(e) => handleInputChange(m.user_id, 'percentage', e.target.value)}
                              placeholder="0"
                              className="w-full text-right rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-[#06B6D4]"
                            />
                            <span className="text-xs text-gray-400">%</span>
                          </>
                        )}

                        {splitType === 'share' && (
                          <>
                            <input
                              type="number"
                              required
                              min="1"
                              value={conf.shares}
                              onChange={(e) => handleInputChange(m.user_id, 'shares', e.target.value)}
                              placeholder="1"
                              className="w-full text-right rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-[#06B6D4]"
                            />
                            <span className="text-xs text-gray-400">sh</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. dinner shared during Goa trip"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#06B6D4] transition-colors"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default ExpenseModal;
