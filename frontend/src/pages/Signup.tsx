import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertCircle, CheckCircle2, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Signup: React.FC = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await signup(email, password);
      if (res.session_active) {
        navigate('/');
      } else {
        setSuccessMsg('Workspace created! Please check your email inbox to confirm registration.');
      }
    } catch (err: any) {
      setError(err?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#faf9f5] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-[#e5e3dc] text-[#1c1917] shadow-sm mb-4">
            <BookOpen className="h-6 w-6 text-[#1c1917]" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="stamp-badge font-mono text-[10px]">TENANT INITIALIZATION</span>
          </div>
          <h1 className="font-editorial text-2xl font-semibold tracking-tight text-[#1c1917]">
            Register Workspace
          </h1>
          <p className="text-xs text-[#57534e] mt-1">
            Isolated RAG vault with pgvector semantic retrieval
          </p>
        </div>

        <div className="paper-sheet rounded-xl p-6 sm:p-8 border border-[#e5e3dc] bg-white">
          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-lg bg-[#fef2f2] border border-[#fecaca] p-3 text-xs text-[#991b1b]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 flex items-center gap-2 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] p-3 text-xs text-[#166534]">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#44403c] mb-1.5 font-mono text-[11px]">
                WORK EMAIL
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a8a29e]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@firm.com"
                  className="w-full rounded-lg bg-[#faf9f5] border border-[#d5d2c7] pl-10 pr-4 py-2.5 text-xs text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1c1917] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#44403c] mb-1.5 font-mono text-[11px]">
                CHOOSE PASSWORD
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a8a29e]" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-lg bg-[#faf9f5] border border-[#d5d2c7] pl-10 pr-4 py-2.5 text-xs text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1c1917] focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-[#1c1917] hover:bg-[#292524] text-white font-semibold py-2.5 text-xs shadow-sm transition-all interactive-press disabled:opacity-60"
            >
              {loading ? (
                <span>Provisioning workspace...</span>
              ) : (
                <>
                  <span>Create Workspace</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#e5e3dc] text-center text-xs text-[#78716c]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#1c1917] font-semibold hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
