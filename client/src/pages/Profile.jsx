import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { LogOut, User as UserIcon, Mail } from 'lucide-react';

export const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="glass-card rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-2 pb-4 border-b border-white/10">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] flex items-center justify-center text-white">
            <UserIcon size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white">{user?.name}</h2>
          <p className="text-sm text-gray-400">Personal Account Profile</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-sm">
            <UserIcon className="text-gray-500" size={18} />
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Full Name</span>
              <span className="font-semibold text-white">{user?.name}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-sm">
            <Mail className="text-gray-500" size={18} />
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Email Address</span>
              <span className="font-semibold text-white">{user?.email}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold text-sm transition-colors border border-red-500/20"
        >
          <LogOut size={16} />
          <span>Sign Out / Log out</span>
        </button>
      </div>
    </div>
  );
};
export default Profile;
