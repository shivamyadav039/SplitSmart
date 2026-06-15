import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api.js';
import { X, Send, RefreshCw, MessageSquare } from 'lucide-react';

export const ExpenseChatModal = ({ expense, currentUser, onClose }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const chatEndRef = useRef(null);

  const fetchComments = async (isPoll = false) => {
    if (!isPoll) setLoading(true);
    try {
      const res = await api.get(`/expenses/${expense.id}/comments`);
      setComments(res.data.comments || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      if (!isPoll) setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
    
    // Set up short polling for real-time updates (every 3 seconds)
    const interval = setInterval(() => {
      fetchComments(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [expense.id]);

  // Scroll to bottom when comments list updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const msgText = newMessage;
    setNewMessage(''); // clear input early for responsive feel

    try {
      const res = await api.post(`/expenses/${expense.id}/comments`, { message: msgText });
      
      // Append new message instantly
      setComments((prev) => [...prev, res.data.comment]);
    } catch (err) {
      console.error('Error sending message:', err);
      // Restore input if sending fails
      setNewMessage(msgText);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="glass-modal w-full max-w-lg rounded-2xl p-6 flex flex-col h-[75vh] max-h-[600px] border border-white/10 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-[#06B6D4]/10 text-[#06B6D4] flex items-center justify-center">
              <MessageSquare size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white truncate max-w-[280px]">
                Chat: {expense.description}
              </h3>
              <p className="text-[10px] text-gray-400">
                Payer: {expense.paid_by_name} | Total: ₹{expense.amount_inr}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Message Feed */}
        <div className="flex-grow overflow-y-auto py-4 space-y-3 pr-1 min-h-0 scrollbar-thin">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <RefreshCw className="animate-spin text-[#06B6D4]" size={20} />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2 text-gray-400">
              <MessageSquare size={24} className="opacity-30" />
              <p className="text-xs">No comments yet. Start the conversation!</p>
            </div>
          ) : (
            comments.map((comment) => {
              const isMe = comment.user_id === currentUser?.id;
              const initials = comment.user_name ? comment.user_name.substring(0, 2).toUpperCase() : '?';
              const time = new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div key={comment.id} className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                  
                  {/* User Profile Avatar */}
                  <div className={`w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 shadow-sm border border-white/5 uppercase ${
                    isMe ? 'bg-[#06B6D4] text-white' : 'bg-white/10 text-gray-300'
                  }`}>
                    {initials}
                  </div>

                  {/* Message Bubble wrapper */}
                  <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                    
                    {/* User name & Time */}
                    {!isMe && (
                      <span className="text-[10px] font-bold text-gray-400 mb-0.5 ml-1">
                        {comment.user_name}
                      </span>
                    )}

                    {/* Actual Bubble */}
                    <div className={`px-3.5 py-2 rounded-2xl text-xs shadow-sm break-words whitespace-pre-wrap ${
                      isMe 
                        ? 'bg-gradient-to-tr from-[#06B6D4] to-[#0891B2] text-white rounded-tr-none' 
                        : 'bg-white/10 text-gray-150 rounded-tl-none border border-white/5'
                    }`}>
                      {comment.message}
                    </div>

                    <span className="text-[8px] text-gray-500 mt-1 px-1">
                      {time}
                    </span>
                  </div>

                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input area */}
        <form onSubmit={handleSendMessage} className="pt-3 border-t border-white/10 flex items-center gap-2 shrink-0">
          <input
            type="text"
            required
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Write a message..."
            className="flex-grow rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#06B6D4] focus:ring-1 focus:ring-[#06B6D4] transition-all"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="p-2.5 rounded-xl bg-[#06B6D4] hover:bg-[#0891B2] text-white transition-colors disabled:opacity-40 shrink-0 cursor-pointer shadow-md hover-lift flex items-center justify-center"
          >
            {sending ? (
              <RefreshCw className="animate-spin" size={14} />
            ) : (
              <Send size={14} />
            )}
          </button>
        </form>

      </div>
    </div>
  );
};

export default ExpenseChatModal;
