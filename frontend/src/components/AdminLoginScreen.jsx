import { useState } from "react";
import {
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import { loginAdmin, forgotPassword, resetPassword } from "../services/api";

export default function AdminLoginScreen({ onLoginSuccess, onBackToHome }) {
  const [mode, setMode] = useState("login"); // "login" | "forgot"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Lupa password state
  const [codeRequested, setCodeRequested] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const res = await loginAdmin(username, password);
    setIsLoading(false);

    if (res.success) {
      onLoginSuccess(res.data);
    } else {
      setError(res.message);
    }
  };

  const handleRequestCode = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Masukkan username terlebih dahulu.");
      return;
    }
    setIsLoading(true);
    setError("");

    const res = await forgotPassword(username.trim());
    setIsLoading(false);

    if (res.success) {
      setInfo(res.data.message);
      setCodeRequested(true);
    } else {
      setError(res.message);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak sama.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password baru minimal 8 karakter.");
      return;
    }

    setIsLoading(true);
    const res = await resetPassword(username.trim(), resetCode.trim(), newPassword);
    setIsLoading(false);

    if (res.success) {
      setMode("login");
      setCodeRequested(false);
      setResetCode("");
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setInfo(res.data.message);
    } else {
      setError(res.message);
    }
  };

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setInfo("");
    if (next === "forgot") {
      setCodeRequested(false);
      setResetCode("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const inputClass =
    "w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-indigo-600 transition-all";

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-8 text-center relative">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/10">
            <Lock className="w-6 h-6 text-indigo-400" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            Portal Khusus Internal
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Notta Rent System & Analytics Management
          </p>
        </div>

        {mode === "login" ? (
          /* ---------------- LOGIN ---------------- */
          <form
            onSubmit={handleSubmit}
            className="p-8 space-y-4"
            autoComplete="off"
            data-1p-ignore="true"
            data-lpignore="true"
          >
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {info && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{info}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck="false"
                  name="notta-admin-username"
                  className={inputClass}
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
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  autoComplete="off"
                  name="notta-admin-password"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-indigo-600 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="text-right mt-2">
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Lupa password?</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isLoading ? "Memverifikasi..." : "Masuk ke Dashboard"}
            </button>

            <button
              type="button"
              onClick={onBackToHome}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Halaman Utama</span>
            </button>
          </form>
        ) : (
          /* ---------------- LUPA PASSWORD ---------------- */
          <form
            onSubmit={codeRequested ? handleResetPassword : handleRequestCode}
            className="p-8 space-y-4"
            autoComplete="off"
            data-1p-ignore="true"
            data-lpignore="true"
          >
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Reset Password</h3>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {info && (
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 leading-relaxed">
                {info}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck="false"
                  name="notta-forgot-username"
                  className={inputClass}
                />
              </div>
            </div>

            {codeRequested && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Kode Reset
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.toUpperCase())}
                      placeholder="Contoh: A3F9C21B"
                      autoComplete="off"
                      name="notta-reset-code"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Password Baru (min. 8 karakter)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Masukkan password baru"
                      autoComplete="new-password"
                      name="notta-new-password"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Ulangi Password Baru
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi password baru"
                      autoComplete="new-password"
                      name="notta-confirm-password"
                      className={inputClass}
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isLoading
                ? "Memproses..."
                : codeRequested
                  ? "Reset Password"
                  : "Minta Kode Reset"}
            </button>

            <button
              type="button"
              onClick={() => switchMode("login")}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Login</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
