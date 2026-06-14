import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { LogOut, User as UserIcon, PlusCircle, LayoutDashboard, Database } from 'lucide-react';

export const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-gray-200 bg-white shadow-sm">
      <Link to="/" className="flex items-center space-x-2 animate-float">
        <span className="text-2xl font-bold tracking-tight text-[#1CC29F]">
          ExpenseSync
        </span>
      </Link>

      <div className="flex items-center space-x-6">
        {isAuthenticated ? (
          <>
            <Link
              to="/dashboard"
              className={`flex items-center space-x-1.5 text-sm font-medium transition-colors ${
                isActive('/dashboard') ? 'text-[#1CC29F]' : 'text-gray-600 hover:text-[#1CC29F]'
              }`}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/import"
              className={`flex items-center space-x-1.5 text-sm font-medium transition-colors ${
                isActive('/import') ? 'text-[#1CC29F]' : 'text-gray-600 hover:text-[#1CC29F]'
              }`}
            >
              <Database size={16} />
              <span>Import CSV</span>
            </Link>

            <div className="h-4 w-px bg-gray-200" />

            <Link
              to="/profile"
              className={`flex items-center space-x-1.5 text-sm font-medium transition-colors ${
                isActive('/profile') ? 'text-[#1CC29F]' : 'text-gray-600 hover:text-[#1CC29F]'
              }`}
            >
              <UserIcon size={16} />
              <span className="font-semibold">{user?.name}</span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold tracking-wide uppercase transition-colors hover-lift"
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className={`text-sm font-medium transition-colors ${
                isActive('/login') ? 'text-[#1CC29F]' : 'text-gray-600 hover:text-[#1CC29F]'
              }`}
            >
              Login
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 rounded-lg bg-[#1CC29F] hover:bg-[#19B896] text-sm font-semibold tracking-tight text-white transition-colors hover-lift"
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};
export default Navbar;
