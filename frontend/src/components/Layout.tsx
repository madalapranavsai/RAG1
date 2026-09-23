import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  FolderArchive,
  MessageSquare,
  BarChart3,
  CheckCircle,
  LogOut,
  Building,
  Menu,
  X,
  FileCheck,
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
    { to: '/', label: 'Workspace Overview', icon: BookOpen, folio: '01' },
    { to: '/documents', label: 'Archival Vault & Sandbox', icon: FolderArchive, folio: '02' },
    { to: '/chat', label: 'Research Transcript', icon: MessageSquare, folio: '03' },
    { to: '/usage', label: 'Capacity & Token Ledger', icon: BarChart3, folio: '04' },
    { to: '/evals', label: 'Quality Certification', icon: CheckCircle, folio: '05' },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#faf9f5] text-[#1c1917]">
      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-stone-900/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Swiss Editorial Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-68 flex-col border-r border-[#e5e3dc] bg-[#f4f3ee] transition-transform lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Masthead */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-[#e5e3dc]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-editorial text-lg font-bold tracking-tight text-[#1c1917]">
                DocuMind
              </span>
              <span className="stamp-badge">ARCHIVE</span>
            </div>
            <p className="font-mono text-[9px] uppercase tracking-wider text-[#78716c] mt-0.5">
              Enterprise Knowledge Base
            </p>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="rounded p-1 text-[#78716c] hover:bg-[#eae8e1] hover:text-[#1c1917] lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Workspace Pill */}
        <div className="p-3 border-b border-[#e5e3dc]">
          <div className="flex items-center justify-between rounded-lg bg-[#ffffff] p-2.5 border border-[#e5e3dc] shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#f5f4ef] text-[#44403c] border border-[#e5e3dc]">
                <Building className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#1c1917] truncate leading-tight">
                  {user?.workspace_name || 'Workspace'}
                </p>
                <p className="font-mono text-[9px] text-[#78716c] uppercase tracking-wider">{user?.role || 'member'}</p>
              </div>
            </div>
            <span className="shrink-0 flex items-center gap-1 font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]">
              <span className="w-1 h-1 rounded-full bg-[#16a34a]" />
              ONLINE
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          <div className="px-2 py-1 text-[9px] font-mono uppercase tracking-widest text-[#78716c]">
            INDEX SECTIONS
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-all interactive-press ${
                    isActive
                      ? 'bg-[#ffffff] text-[#1c1917] font-semibold border border-[#d6d3cd] shadow-xs'
                      : 'text-[#57534e] hover:bg-[#eae8e1] hover:text-[#1c1917]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#1c1917]' : 'text-[#78716c] group-hover:text-[#1c1917]'}`} />
                      <span>{item.label}</span>
                    </div>
                    <span className="font-mono text-[9px] text-[#a8a29e]">{item.folio}</span>
                  </>
                )}
              </NavLink>
            );
          })}

          <div className="pt-4 mt-4 border-t border-[#e5e3dc]">
            <div className="p-3 rounded-lg bg-[#ffffff] border border-[#e5e3dc] shadow-xs">
              <div className="flex items-center gap-1.5 text-[#1c1917] text-xs font-semibold mb-1">
                <FileCheck className="w-3.5 h-3.5 text-[#b45309]" />
                <span className="font-editorial text-xs font-bold">Grounded Specification</span>
              </div>
              <p className="text-[10px] text-[#78716c] leading-relaxed">
                Corrective RAG engine verifying claims against primary archival sources.
              </p>
            </div>
          </div>
        </nav>

        {/* User Account / Sign Out */}
        <div className="p-3 border-t border-[#e5e3dc]">
          <div className="flex items-center justify-between rounded-lg bg-[#ffffff] p-2 border border-[#e5e3dc] shadow-xs">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-semibold text-[#1c1917] truncate">{user?.email}</p>
              <p className="font-mono text-[9px] text-[#78716c]">Verified Tenant</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="flex h-7 w-7 items-center justify-center rounded text-[#78716c] hover:bg-[#fef2f2] hover:text-[#991b1b] border border-transparent hover:border-[#fecaca] transition-all interactive-press"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Top Header */}
        <header className="flex h-14 items-center justify-between border-b border-[#e5e3dc] bg-[#faf9f5] px-4 lg:hidden">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="rounded p-1.5 text-[#57534e] hover:bg-[#eae8e1] hover:text-[#1c1917]"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-editorial text-base font-bold text-[#1c1917]">DocuMind</span>
            <span className="stamp-badge">ARCHIVE</span>
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
