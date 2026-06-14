import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { X, Send, CreditCard } from 'lucide-react';

export const SettlementModal = ({ groupId: initialGroupId, members: initialMembers, currentUser, targetUser, onClose, onSuccess }) => {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId || '');
  const [groupMembers, setGroupMembers] = useState(initialMembers || []);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [paidBy, setPaidBy] = useState(currentUser?.id || '');
  const [paidTo, setPaidTo] = useState(targetUser?.user_id || '');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
          setError('Failed to load groups.');
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

  // Set paidBy default when groupMembers change
  useEffect(() => {
    if (groupMembers.length > 0) {
      const isCurrentUserInGroup = groupMembers.some(m => m.user_id === currentUser?.id);
      if (isCurrentUserInGroup) {
        setPaidBy(currentUser.id);
      } else {
        setPaidBy(groupMembers[0].user_id);
      }
    }
  }, [groupMembers, currentUser]);

  // Set paidTo default when paidBy or groupMembers change
  useEffect(() => {
    if (groupMembers.length > 0) {
      const remaining = groupMembers.filter(m => m.user_id !== paidBy);
      if (remaining.length > 0) {
        const isTargetInGroup = remaining.some(m => m.user_id === targetUser?.user_id);
        if (isTargetInGroup && paidBy !== targetUser?.user_id) {
          setPaidTo(targetUser.user_id);
        } else {
          setPaidTo(remaining[0].user_id);
        }
      } else {
        setPaidTo('');
      }
    }
  }, [paidBy, groupMembers, targetUser]);

  // Automatically filter recipient list to exclude the selected payer
  const filteredRecipients = groupMembers.filter(m => m.user_id !== paidBy);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedGroupId) {
      return setError('Please select a group.');
    }
    
    if (!paidBy || !paidTo || !amount || !paymentDate) {
      return setError('Please fill in all required fields.');
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return setError('Amount must be a positive number.');
    }

    setLoading(true);
    try {
      await api.post('/payments', {
        groupId: selectedGroupId,
        paidBy,
        paidTo,
        amount: numericAmount,
        paymentDate,
        notes
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record settlement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="glass-modal w-full max-w-md rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <CreditCard className="text-[#06B6D4]" size={20} />
            <span>Settle Debt / Payment</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
          {/* Payer Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Payer (Who Sent Money)
            </label>
            <select
              value={paidBy}
              onChange={(e) => {
                setPaidBy(e.target.value);
                // Reset paidTo if it matches new paidBy
                if (e.target.value === paidTo) {
                  setPaidTo('');
                }
              }}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#06B6D4] transition-colors"
            >
              <option value="" disabled className="bg-[#0f172a]">Select sender...</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id} className="bg-[#0f172a]">
                  {m.name} {m.user_id === currentUser?.id ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Recipient Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Recipient (Who Received Money)
            </label>
            <select
              value={paidTo}
              onChange={(e) => setPaidTo(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#06B6D4] transition-colors"
            >
              <option value="" disabled className="bg-[#0f172a]">Select recipient...</option>
              {filteredRecipients.map((m) => (
                <option key={m.user_id} value={m.user_id} className="bg-[#0f172a]">
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Amount (₹ INR)
            </label>
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

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Date
            </label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#06B6D4] transition-colors"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. UPI transfer reference"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#06B6D4] transition-colors"
            />
          </div>

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
              className="flex items-center space-x-2 px-5 py-2 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent border-white"></div>
              ) : (
                <>
                  <Send size={16} />
                  <span>Settle Up</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default SettlementModal;
