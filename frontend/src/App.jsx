import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Catalog from './components/Catalog';
import BookingModal from './components/BookingModal';
import AdminLoginScreen from './components/AdminLoginScreen';
import AdminDashboard from './components/AdminDashboard';
import {
  getStoredAdmin,
  clearAuthSession,
  fetchDevices,
  createBooking,
  fetchAdminTransactions,
  updateTransactionStatus,
  addDevice,
  archiveDevice,
  restoreDevice,
  exportCSV,
} from './services/api';
import { ADMIN_WA_NUMBER, formatRupiah } from './services/dataService';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState(false);
  const [devices, setDevices] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedDeviceForBooking, setSelectedDeviceForBooking] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success' | 'error' | 'info'
  const [toastVisible, setToastVisible] = useState(false);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [apiError, setApiError] = useState('');
  const [editingDevice, setEditingDevice] = useState(null);

  const checkRoute = () => {
    const isPathAdmin = window.location.pathname.startsWith('/admin');
    const isHashAdmin = window.location.hash.startsWith('#admin');
    setIsAdminRoute(isPathAdmin || isHashAdmin);
  };

  const loadDevices = useCallback(async () => {
    setIsLoadingDevices(true);
    setApiError('');
    try {
      const data = await fetchDevices();
      setDevices(data);
    } catch (err) {
      setApiError('Backend server belum aktif. Jalankan: uvicorn main:app --reload --port 8000');
    } finally {
      setIsLoadingDevices(false);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    if (!adminProfile) return;
    try {
      const data = await fetchAdminTransactions();
      setTransactions(data);
    } catch {
      // Token expired or backend down
    }
  }, [adminProfile]);

  useEffect(() => {
    checkRoute();
    window.addEventListener('popstate', checkRoute);
    window.addEventListener('hashchange', checkRoute);
    const savedAdmin = getStoredAdmin();
    if (savedAdmin) setAdminProfile(savedAdmin);
    loadDevices();
    return () => {
      window.removeEventListener('popstate', checkRoute);
      window.removeEventListener('hashchange', checkRoute);
    };
  }, []);

  useEffect(() => {
    if (adminProfile) loadTransactions();
  }, [adminProfile]);

  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    checkRoute();
  };

  // ==========================================================
  // MODERN TOAST NOTIFICATION
  // ==========================================================
  const showNotification = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    requestAnimationFrame(() => setToastVisible(true));
    setTimeout(() => {
      setToastVisible(false);
      setTimeout(() => setToastMessage(''), 300);
    }, 4000);
  };

  const closeToast = () => {
    setToastVisible(false);
    setTimeout(() => setToastMessage(''), 300);
  };

  // ==========================================================
  // HANDLERS
  // ==========================================================
  const handleBookingSuccess = async (bookingPayload) => {
    try {
      await createBooking(bookingPayload);
      await loadDevices();
      showNotification(`Pesanan atas nama ${bookingPayload.customer_name} berhasil dibuat!`);
    } catch (err) {
      showNotification(`Gagal membuat pesanan: ${err.message}`, 'error');
    }
  };

  const handleUpdateTransactionStatus = async (transactionId, newStatus, penaltyFee = 0) => {
    try {
      await updateTransactionStatus(transactionId, newStatus, penaltyFee);
      await loadTransactions();
      await loadDevices();
      showNotification(`Status transaksi berhasil diperbarui.`);
    } catch (err) {
      showNotification(`Gagal update status: ${err.message}`, 'error');
    }
  };

  const handleAddDevice = async (devicePayload) => {
    try {
      await addDevice(devicePayload);
      await loadDevices();
      showNotification('Unit HP berhasil ditambahkan ke database.');
    } catch (err) {
      showNotification(`Gagal tambah unit: ${err.message}`, 'error');
    }
  };

  const handleUpdateDevice = async (deviceId, payload) => {
    try {
      const { updateDevice } = await import('./services/api');
      await updateDevice(deviceId, payload);
      await loadDevices();
      showNotification('Data HP berhasil diperbarui!');
      setEditingDevice(null);
    } catch (err) {
      showNotification(`Gagal update unit: ${err.message}`, 'error');
    }
  };

  const handleArchiveDevice = async (deviceId) => {
    try {
      await archiveDevice(deviceId);
      await loadDevices(); // Auto refresh
      showNotification('Unit HP berhasil diarsipkan.');
    } catch (err) {
      showNotification(`Gagal arsipkan unit: ${err.message}`, 'error');
    }
  };

  const handleRestoreDevice = async (deviceId) => {
    try {
      await restoreDevice(deviceId);
      await loadDevices(); // AUTO REFRESH — tidak perlu tekan refresh manual
      showNotification('Unit HP berhasil dipulihkan dari arsip!');
    } catch (err) {
      showNotification(`Gagal memulihkan unit: ${err.message}`, 'error');
    }
  };

  const handleExportCSV = async () => {
    try {
      await exportCSV();
      showNotification('Data berhasil diekspor.');
    } catch (err) {
      showNotification(`Export gagal: ${err.message}`, 'error');
    }
  };

  const handleLoginSuccess = (authData) => {
    setAdminProfile(authData);
    showNotification(`Selamat datang kembali, ${authData.full_name || authData.username}!`);
  };

  const handleLogout = () => {
    clearAuthSession();
    setAdminProfile(null);
    setTransactions([]);
    navigateTo('/');
    showNotification('Sesi admin telah keluar.', 'info');
  };

  const handleImageUpload = async (file) => {
    if (!file) return null;
    try {
      const { uploadDeviceImage } = await import('./services/api');
      const result = await uploadDeviceImage(file);
      return result;
    } catch (err) {
      throw new Error('Gagal upload gambar: ' + err.message);
    }
  };

  const pendingCount = transactions.filter((t) => t.status === 'Pending').length;

  const toastIcon = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    error: <AlertCircle className="w-4 h-4 text-rose-400" />,
    info: <AlertCircle className="w-4 h-4 text-blue-400" />,
  };

  const toastBg = {
    success: 'bg-emerald-500/20',
    error: 'bg-rose-500/20',
    info: 'bg-blue-500/20',
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        isAdminRoute={isAdminRoute}
        adminProfile={adminProfile}
        onLogout={handleLogout}
        onNavigateHome={() => navigateTo('/')}
        pendingCount={pendingCount}
      />

      {/* ========================================================== */}
      {/* MODERN TOAST NOTIFICATION */}
      {/* ========================================================== */}
      {toastMessage && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ease-out ${toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
          <div className="bg-slate-900/95 backdrop-blur-md text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700/50 flex items-center gap-3 min-w-[300px] max-w-md">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full ${toastBg[toastType]} flex items-center justify-center`}>
              {toastIcon[toastType]}
            </div>
            <p className="text-sm font-medium flex-1 leading-snug">{toastMessage}</p>
            <button onClick={closeToast} className="flex-shrink-0 text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700/50">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Backend Offline Banner */}
      {apiError && (
        <div className="bg-amber-50 text-amber-800 text-xs py-2.5 px-4 text-center font-medium border-b border-amber-200 flex items-center justify-center gap-2">
          <span>⚠️ {apiError}</span>
        </div>
      )}

      <main className="flex-1">
        {isAdminRoute ? (
          adminProfile ? (
            <AdminDashboard
              devices={devices}
              transactions={transactions}
              isLoading={isLoadingDevices}
              onUpdateStatus={handleUpdateTransactionStatus}
              onAddDevice={handleAddDevice}
              onArchiveDevice={handleArchiveDevice}
              onRestoreDevice={handleRestoreDevice}
              onExportCSV={handleExportCSV}
              onRefresh={() => { loadDevices(); loadTransactions(); }}
              editingDevice={editingDevice}
              setEditingDevice={setEditingDevice}
              onUpdateDevice={handleUpdateDevice}
              onImageUpload={handleImageUpload}
            />
          ) : (
            <AdminLoginScreen
              onLoginSuccess={handleLoginSuccess}
              onBackToHome={() => navigateTo('/')}
            />
          )
        ) : (
          <Catalog
            devices={devices}
            transactions={transactions}
            isLoading={isLoadingDevices}
            onSelectDevice={(device) => setSelectedDeviceForBooking(device)}
          />
        )}
      </main>

      {!isAdminRoute && selectedDeviceForBooking && (
        <BookingModal
          device={selectedDeviceForBooking}
          transactions={transactions}
          onClose={() => setSelectedDeviceForBooking(null)}
          onBookingSuccess={handleBookingSuccess}
        />
      )}

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <p>Rentalyzer &bull; Sistem Operasional & Pipeline Analisis Bisnis Sewa Smartphone</p>
      </footer>
    </div>
  );
}