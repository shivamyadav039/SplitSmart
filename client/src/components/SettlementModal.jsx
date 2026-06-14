import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { X, Send, CreditCard } from 'lucide-react';

export const SettlementModal = ({ groupId, members, currentUser, targetUser, onClose, onSuccess }) => {
  const [paidBy, setPaidBy] = useState(currentUser?.id || '');
  const [paidTo, setPaidTo] = useState(targetUser?.user_id || '');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Automatically filter recipient list to exclude the selected payer
  const filteredRecipients = members.filter(m => m.user_id !== paidBy);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
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
        groupId,
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
      <div className="glass-modal w-full max-w-md rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
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
