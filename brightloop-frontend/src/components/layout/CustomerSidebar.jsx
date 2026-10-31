import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  HiOutlineHome,
  HiOutlineSquares2X2,
  HiOutlineClipboardDocumentList,
  HiOutlineBanknotes,
  HiOutlineCreditCard,
  HiOutlineBolt,
  HiOutlineWallet,
  HiOutlineClockIcon,
  HiOutlineClock,
  HiOutlineLightBulb,
  HiOutlineCog6Tooth,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineArrowRightOnRectangle,
} from 'react-icons/hi2';
import { useAuth } from '@/contexts/AuthContext';

const navSections = [
  {
    header: 'MAIN',
    items: [
      { label: 'My Dashboard', icon: HiOutlineHome, path: '/customer/dashboard' },
    ],
  },
  {
    header: 'SUBSCRIPTIONS',
    items: [
      { label: 'My Subscriptions', icon: HiOutlineSquares2X2, path: '/customer/subscriptions' },
      { label: 'Available Plans', icon: HiOutlineClipboardDocumentList, path: '/customer/plans' },
    ],
  },
  {
    header: 'BILLING',
    items: [
      { label: 'My Invoices', icon: HiOutlineBanknotes, path: '/customer/invoices' },
      { label: 'My Payments', icon: HiOutlineCreditCard, path: '/customer/payments' },
    ],
  },
  {
    header: 'FLEXI-BILL',
    items: [
      { label: 'Flexible Access', icon: HiOutlineBolt, path: '/customer/flexi-bill' },
      { label: 'My Wallet', icon: HiOutlineWallet, path: '/customer/wallet' },
      { label: 'Usage History', icon: HiOutlineClock, path: '/customer/usage-history' },
    ],
  },
  {
    header: 'INTELLIGENCE',
    items: [
      { label: 'Savings & Recommendations', icon: HiOutlineLightBulb, path: '/customer/recommendations' },
    ],
  },
  {
    header: 'ACCOUNT',
    items: [
      { label: 'Settings', icon: HiOutlineCog6Tooth, path: '/customer/settings' },
    ],
  },
];

export default function CustomerSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen flex flex-col transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
      style={{ backgroundColor: '#0f172a' }}
    >
      {/* Brand */}
      <div className="flex items-center h-16 px-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
            <HiOutlineBolt className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <span className="text-white font-bold text-lg tracking-wide whitespace-nowrap">
              BRIGHT<span className="text-blue-400">LOOP</span>
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 scrollbar-thin scrollbar-thumb-white/10">
        {navSections.map((section) => (
          <div key={section.header} className="mb-4">
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                {section.header}
              </p>
            )}
            {collapsed && <div className="border-t border-white/5 mx-2 mb-2 mt-1" />}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                          isActive
                            ? 'bg-white/10 text-white shadow-sm'
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                        } ${collapsed ? 'justify-center px-0' : ''}`
                      }
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      {!collapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div className="border-t border-white/10 p-3 shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'C'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.name || 'Customer'}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {user?.email || 'customer@example.com'}
              </p>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            title="Logout"
            className="w-full flex justify-center p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 hover:bg-slate-600 hover:text-white transition-colors shadow-md z-50"
      >
        {collapsed ? (
          <HiOutlineChevronRight className="w-3.5 h-3.5" />
        ) : (
          <HiOutlineChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>
    </aside>
  );
}
