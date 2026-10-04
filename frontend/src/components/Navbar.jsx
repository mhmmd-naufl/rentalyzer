import {
  Smartphone,
  ShieldCheck,
  LogOut,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { ADMIN_WA_NUMBER } from "../services/dataService";

export default function Navbar({
  isAdminRoute,
  adminProfile,
  onLogout,
  onNavigateHome,
}) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Tagline */}
          <div
            onClick={onNavigateHome}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-xs flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl tracking-tight text-slate-900">
                  Notta Rent
                </span>
                {isAdminRoute ? (
                  <span className="text-xs bg-slate-900 text-white font-semibold px-2 py-0.5 rounded-full">
                    Admin Portal
                  </span>
                ) : (
                  <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200/60">
                    Sewa HP
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                {isAdminRoute
                  ? "Sistem Manajemen & Kontrol Operasional"
                  : "Sewa Smartphone Premium Harian"}
              </p>
            </div>
          </div>

          {/* Right Navigation Controls */}
          <div className="flex items-center gap-3">
            {isAdminRoute ? (
              // ADMIN ROUTE CONTROLS ONLY
              <div className="flex items-center gap-2">
                {adminProfile && (
                  <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-2.5 py-1.5 rounded-xl font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{adminProfile.username}</span>
                  </div>
                )}

                <button
                  onClick={onNavigateHome}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Web Publik</span>
                </button>

                {adminProfile && (
                  <button
                    onClick={onLogout}
                    title="Keluar dari Akun Admin"
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 border border-rose-200/60 rounded-xl transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar</span>
                  </button>
                )}
              </div>
            ) : (
              // PUBLIC USER CONTROLS ONLY (Zero Admin Mentions)
              <a
                href={`https://wa.me/${ADMIN_WA_NUMBER}?text=Halo%20Admin%2C%20saya%20ingin%20tanya%20seputar%20sewa%20HP`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Bantuan & CS</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
