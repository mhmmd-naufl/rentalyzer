import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, X, AlertCircle, ShieldCheck } from 'lucide-react';
import { loginAdmin } from '../services/api';

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const res = await loginAdmin(username, password);
    setIsLoading(false);

    if (res.success) {
      onLoginSuccess(res.data);
      onClose();
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="inline-flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 text-xs font-semibold px-2.5 py-1 rounded-md mb-2 border border-indigo-400/20">
            <Lock className="w-3.5 h-3.5" />
            <span>Restricted Access</span>
          </div>
          <h3 className="text-xl font-bold">Login Admin Dashboard</h3>
          <p className="text-slate-300 text-xs mt-1">
            Masuk dengan akun terverifikasi untuk mengelola pesanan & data analitik.
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Username Admin
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-indigo-600 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-indigo-600 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick Credential Hint */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-start gap-2.5 text-xs text-indigo-900">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Akun Default Terpasang:</p>
              <p className="text-slate-600 text-[11px] mt-0.5">
                Username: <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200 font-mono">admin</code> &bull; Password: <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200 font-mono">admin123</code>
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            <span>{isLoading ? 'Memverifikasi...' : 'Masuk ke Dashboard'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
