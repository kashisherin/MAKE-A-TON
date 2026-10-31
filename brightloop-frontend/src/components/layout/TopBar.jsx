import React, { useState, useRef, useEffect } from 'react';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineBell,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineUser,
  HiOutlineCog6Tooth,
  HiOutlineArrowRightOnRectangle,
  HiOutlineChevronDown,
} from 'react-icons/hi2';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Breadcrumb from './Breadcrumb';

export default function TopBar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notificationCount] = useState(3);
  const menuRef = useRef(null);

  // Determine settings path based on user role
  const rolePrefix = user?.role === 'admin' ? '/admin' : user?.role === 'staff' ? '/staff' : '/customer';

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      {/* Left - Breadcrumb */}
      <div className="flex items-center">
        <Breadcrumb />
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-2">
        {/* Search Button */}
        <button
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          title="Search"
        >
          <HiOutlineMagnifyingGlass className="w-5 h-5" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? (
            <HiOutlineMoon className="w-5 h-5" />
          ) : (
            <HiOutlineSun className="w-5 h-5" />
          )}
        </button>

        {/* Notification Bell */}
        <button
          className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          title="Notifications"
        >
          <HiOutlineBell className="w-5 h-5" />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold ring-2 ring-white">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-slate-200 mx-1" />

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-slate-700 leading-tight">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-slate-400 leading-tight capitalize">
                {user?.role || 'user'}
              </p>
            </div>
            <HiOutlineChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                showUserMenu ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* User Info Header */}
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {user?.email || 'user@example.com'}
                </p>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                <Link
                  to={`${rolePrefix}/settings`}
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <HiOutlineUser className="w-4 h-4 text-slate-400" />
                  My Profile
                </Link>
                <Link
                  to={`${rolePrefix}/settings`}
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <HiOutlineCog6Tooth className="w-4 h-4 text-slate-400" />
                  Settings
                </Link>
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                >
                  <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
