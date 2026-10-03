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
  exportCSV,
} from './services/api';
import { ADMIN_WA_NUMBER, formatRupiah } from './services/dataService';

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState(false);
  const [devices, setDevices] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedDeviceForBooking, setSelectedDeviceForBooking] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [apiError, setApiError] = useState('');

  const checkRoute = () => {
    const isPathAdmin = window.location.pathname.startsWith('/admin');
    const isHashAdmin = window.location.hash.startsWith('#admin');
    setIsAdminRoute(isPathAdmin || isHashAdmin);
  };

  // Load devices from SQLite via FastAPI
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

  // Load transactions from SQLite (admin only)
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

  // Load transactions when admin logs in
  useEffect(() => {
    if (adminProfile) loadTransactions();
  }, [adminProfile]);

  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    checkRoute();
  };

  // Handle customer booking -> POST to FastAPI -> saved to rentalyzer.db
  const handleBookingSuccess = async (bookingPayload) => {
    try {
      await createBooking(bookingPayload);
      // Refresh devices list from DB after booking
      await loadDevices();
      showNotification(`Pesanan atas nama ${bookingPayload.customer_name} berhasil dibuat! Buka WhatsApp untuk verifikasi.`);
    } catch (err) {
      showNotification(`Pesanan dibuat (offline). Peringatan: ${err.message}`);
    }
  };

  // Admin: update transaction status via API
  const handleUpdateTransactionStatus = async (transactionId, newStatus, penaltyFee = 0) => {
    try {
      await updateTransactionStatus(transactionId, newStatus, penaltyFee);
      await loadTransactions();
      await loadDevices();
    } catch (err) {
      showNotification(`Gagal update status: ${err.message}`);
    }
  };

  // Admin: add device via API -> saved to rentalyzer.db
  const handleAddDevice = async (devicePayload) => {
    try {
      await addDevice(devicePayload);
      await loadDevices();
      showNotification('Unit HP berhasil ditambahkan ke database.');
    } catch (err) {
      showNotification(`Gagal tambah unit: ${err.message}`);
    }
  };

  // Admin: archive device (soft delete) via API
  const handleArchiveDevice = async (deviceId) => {
    try {
      await archiveDevice(deviceId);
      await loadDevices();
    } catch (err) {
      showNotification(`Gagal arsipkan unit: ${err.message}`);
    }
  };

  // Admin: export CSV from backend
  const handleExportCSV = async () => {
    try {
      await exportCSV();
    } catch (err) {
      showNotification(`Export gagal: ${err.message}`);
    }
  };

  // Handle Admin Login
  const handleLoginSuccess = (authData) => {
    setAdminProfile(authData);
    showNotification(`Selamat datang kembali, ${authData.full_name || authData.username}!`);
  };

  // Handle Admin Logout
  const handleLogout = () => {
    clearAuthSession();
    setAdminProfile(null);
    setTransactions([]);
    navigateTo('/');
    showNotification('Sesi admin telah keluar.');
  };

  const showNotification = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 5000);
  };

  const pendingCount = transactions.filter((t) => t.status === 'Pending').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        isAdminRoute={isAdminRoute}
        adminProfile={adminProfile}
        onLogout={handleLogout}
        onNavigateHome={() => navigateTo('/')}
        pendingCount={pendingCount}
      />

      {/* Notification Banner */}
      {toastMessage && (
        <div className="bg-slate-900 text-white text-xs sm:text-sm py-2.5 px-4 text-center font-medium shadow-md flex items-center justify-center gap-2 border-b border-indigo-500">
          <span>✨ {toastMessage}</span>
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
              onExportCSV={handleExportCSV}
              onRefresh={() => { loadDevices(); loadTransactions(); }}
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
