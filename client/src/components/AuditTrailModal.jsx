import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { X, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

export const AuditTrailModal = ({ groupId, userId, userName, targetUserId, targetUserName, onClose }) => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [netTotal, setNetTotal] = useState(0);

  useEffect(() => {
    const fetchAuditTrail = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/groups/${groupId}/expenses/audit/${targetUserId}`);
        setAuditLogs(res.data);
        
        // Compute net total
        // positive: targetUser owes user, negative: user owes targetUser
        let sum = 0;
        res.data.forEach(item => {
          const isUserPayer = item.paid_by === userId;
          const share = parseFloat(item.user_share);

          if (item.type === 'expense') {
            if (isUserPayer) {
              // User paid, target owes user the share
              sum += share;
            } else {
              // Target paid, user owes target the share
              sum -= share;
            }
          } else if (item.type === 'payment') {
            if (isUserPayer) {
              // User settled target, reduces what user owes target (effectively +)
              sum += share;
            } else {
              // Target settled user, reduces what target owes user (effectively -)
              sum -= share;
            }
          }
        });
        setNetTotal(Math.round(sum * 100) / 100);
      } catch (err) {
        console.error('Error fetching audit trail:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditTrail();
  }, [groupId, targetUserId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="glass-modal w-full max-w-2xl rounded-2xl p-6 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Audit Trail</h3>
            <p className="text-xs text-gray-400">
              Contributions breakdown between {userName} &amp; {targetUserName}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-6 space-y-4 pr-1">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <RefreshCw className="animate-spin text-[#06B6D4]" size={24} />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No transactions recorded between these users.
            </div>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((item) => {
                const isUserPayer = item.paid_by === userId;
                const isExpense = item.type === 'expense';
                
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between hover:bg-white/10 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isExpense ? 'bg-purple-500/10 text-purple-400' : 'bg-cyan-500/10 text-cyan-400'
                          }`}
                        >
                          {item.type}
                        </span>
                        <h4 className="text-sm font-semibold text-white">{item.description}</h4>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Date: {new Date(item.date).toLocaleDateString()} | Paid by:{' '}
                        {isUserPayer ? 'You' : item.paid_by_name}
                      </p>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="text-xs text-gray-400">Total: {item.original_currency} {item.total_amount}</div>
                      <div
                        className={`text-sm font-bold flex items-center justify-end space-x-1 ${
                          isUserPayer ? 'text-[#22C55E]' : 'text-[#EF4444]'
                        }`}
                      >
                        {isUserPayer ? '+' : '-'}
                        <span>₹{item.user_share}</span>
                        {isUserPayer ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-300">Net Outstanding:</span>
            <div
              className={`text-lg font-bold ${
                netTotal >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
              }`}
            >
              {netTotal >= 0 ? `${targetUserName} owes you ₹${netTotal}` : `You owe ${targetUserName} ₹${Math.abs(netTotal)}`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default AuditTrailModal;
