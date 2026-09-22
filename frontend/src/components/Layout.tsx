import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  LayoutDashboard,
  FileText,
  MessageSquare,
  Activity,
  LogOut,
  Building2,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/documents', label: 'Documents & Sandbox', icon: FileText },
    { to: '/chat', label: 'Chat & A2UI', icon: MessageSquare },
    { to: '/usage', label: 'Usage & Capacity', icon: Activity },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-800/80 bg-slate-900/90 backdrop-blur-xl transition-transform lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 shadow-lg shadow-indigo-500/25">
              <BrainCircuit className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                DocuMind
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  RAG
                </span>
              </span>
              <p className="text-[11px] text-slate-400">Gemini 2.5 Flash + FastEmbed</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Workspace Pill */}
        <div className="p-3 border-b border-slate-800/50">
          <div className="flex items-center justify-between rounded-xl bg-slate-800/50 p-2.5 border border-slate-700/50">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Building2 className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {user?.workspace_name || 'Workspace'}
                </p>
                <p className="text-[10px] text-slate-400 capitalize">{user?.role || 'member'}</p>
              </div>
            </div>
            <span className="shrink-0 flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <div className="pt-4 mt-4 border-t border-slate-800/60">
            <div className="px-3 py-2 rounded-xl bg-gradient-to-br from-indigo-900/30 to-slate-900/40 border border-indigo-500/20">
              <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-semibold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>A2UI Engine Active</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Generates interactive charts, tables, & Mermaid diagrams on-the-fly.
              </p>
            </div>
          </div>
        </nav>

        {/* User Account / Sign Out */}
        <div className="p-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between rounded-xl bg-slate-800/40 p-2 border border-slate-700/40">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-medium text-slate-200 truncate">{user?.email}</p>
              <p className="text-[10px] text-slate-400">Authenticated Session</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 hover:border hover:border-rose-500/20 transition-all"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Top Header */}
        <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 backdrop-blur lg:hidden">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 font-bold text-sm text-white">
            <BrainCircuit className="h-4 w-4 text-indigo-400" />
            <span>DocuMind</span>
          </div>
          <div className="w-6" />
        </header>

        {/* Child Router Outlet */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
