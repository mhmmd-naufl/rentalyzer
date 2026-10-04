import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import Navbar from "./components/Navbar";
import Catalog from "./components/Catalog";
import BookingModal from "./components/BookingModal";
import AdminLoginScreen from "./components/AdminLoginScreen";
import AdminDashboard from "./components/AdminDashboard";
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
  fetchAdminDevices,
  updateDevice,
  uploadDeviceImage,
} from "./services/api";

const BACKEND_DOWN_MESSAGE =
  "Backend server belum aktif. Jalankan: uvicorn main:app --reload --port 8000";

// pushState tidak memunculkan event popstate, jadi navigasi internal
// perlu memancarkan event sendiri agar useSyncExternalStore diperbarui.
const ROUTE_CHANGE_EVENT = "notta_rent:route-change";

export default function App() {
  const [devices, setDevices] = useState([]);
  const [devicesStatus, setDevicesStatus] = useState("pending");
  const [transactions, setTransactions] = useState([]);
  const [selectedDeviceForBooking, setSelectedDeviceForBooking] =
    useState(null);
  const [adminProfile, setAdminProfile] = useState(getStoredAdmin);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [toastVisible, setToastVisible] = useState(false);
  const [apiError, setApiError] = useState("");
  const [editingDevice, setEditingDevice] = useState(null);

  const isLoadingDevices = devicesStatus === "pending";

  // --- Routing: window.location adalah "external store", bukan state ---
  const subscribeToRoute = useCallback((onStoreChange) => {
    window.addEventListener("popstate", onStoreChange);
    window.addEventListener("hashchange", onStoreChange);
    window.addEventListener(ROUTE_CHANGE_EVENT, onStoreChange);
    return () => {
      window.removeEventListener("popstate", onStoreChange);
      window.removeEventListener("hashchange", onStoreChange);
      window.removeEventListener(ROUTE_CHANGE_EVENT, onStoreChange);
    };
  }, []);

  const isAdminRoute = useSyncExternalStore(
    subscribeToRoute,
    () =>
      window.location.pathname.startsWith("/admin") ||
      window.location.hash.startsWith("#admin"),
    () => false,
  );

  // Loader katalog. Semua setState terjadi setelah `await`, jadi tidak pernah
  // menyetel state secara sinkron.
  const loadDevices = useCallback(async () => {
    try {
      const data = adminProfile
        ? await fetchAdminDevices()
        : await fetchDevices();
      setDevices(data);
      setApiError("");
      setDevicesStatus("success");
    } catch {
      setApiError(BACKEND_DOWN_MESSAGE);
      setDevicesStatus("error");
    }
  }, [adminProfile]);

  // Dipakai oleh event handler (butuh indikator loading langsung).
  const refreshDevices = useCallback(async () => {
    setDevicesStatus("pending");
    await loadDevices();
  }, [loadDevices]);

  const loadTransactions = useCallback(async () => {
    if (!adminProfile) return;
    try {
      const data = await fetchAdminTransactions();
      setTransactions(data);
    } catch {
      // Token expired or backend down
    }
  }, [adminProfile]);

  // Catatan: loader dipanggil lewat fungsi lokal di dalam effect. Dengan begitu
  // effect tidak pernah menyetel state secara sinkron, sehingga tidak memicu
  // cascading render. Semua penulisan state terjadi setelah `await`.
  useEffect(() => {
    const syncDevices = async () => {
      await loadDevices();
    };
    syncDevices();
  }, [loadDevices]);

  useEffect(() => {
    const syncTransactions = async () => {
      await loadTransactions();
    };
    syncTransactions();
  }, [loadTransactions]);

  const navigateTo = (path) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT));
  };

  const showNotification = (msg, type = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
      setTimeout(() => setToastMessage(""), 300);
    }, 4000);
  };

  const closeToast = () => {
    setToastVisible(false);
    setTimeout(() => setToastMessage(""), 300);
  };

  const handleBookingSuccess = async (bookingPayload) => {
    try {
      await createBooking(bookingPayload);
      await refreshDevices();
      showNotification(
        `Pesanan atas nama ${bookingPayload.customer_name} berhasil dibuat!`,
      );
      return true;
    } catch (err) {
      showNotification(`Gagal membuat pesanan: ${err.message}`, "error");
      return false;
    }
  };

  const handleUpdateTransactionStatus = async (
    transactionId,
    newStatus,
    penaltyFee = 0,
  ) => {
    try {
      await updateTransactionStatus(transactionId, newStatus, penaltyFee);
      await loadTransactions();
      await refreshDevices();
    } catch (err) {
      showNotification(`Gagal update status: ${err.message}`, "error");
    }
  };

  const handleAddDevice = async (devicePayload) => {
    try {
      await addDevice(devicePayload);
      await refreshDevices();
      showNotification("Unit HP berhasil ditambahkan ke database.");
    } catch (err) {
      showNotification(`Gagal tambah unit: ${err.message}`, "error");
    }
  };

  const handleUpdateDevice = async (deviceId, payload) => {
    try {
      await updateDevice(deviceId, payload);
      await refreshDevices();
      showNotification("Data HP berhasil diperbarui!");
      setEditingDevice(null);
    } catch (err) {
      showNotification(`Gagal update unit: ${err.message}`, "error");
    }
  };

  const handleArchiveDevice = async (deviceId) => {
    try {
      await archiveDevice(deviceId);
      await refreshDevices();
      showNotification("Unit HP berhasil diarsipkan.");
    } catch (err) {
      showNotification(`Gagal arsipkan unit: ${err.message}`, "error");
    }
  };

  const handleRestoreDevice = async (deviceId) => {
    try {
      await restoreDevice(deviceId);
      await refreshDevices();
      showNotification("Unit HP berhasil dipulihkan dari arsip!");
    } catch (err) {
      showNotification(`Gagal memulihkan unit: ${err.message}`, "error");
    }
  };

  const handleExportCSV = async (dateRange = {}) => {
    try {
      await exportCSV(dateRange.startDate || "", dateRange.endDate || "");
      showNotification("Data berhasil diekspor.");
    } catch (err) {
      showNotification(`Export gagal: ${err.message}`, "error");
    }
  };

  const handleLoginSuccess = (authData) => {
    setAdminProfile(authData);
    showNotification(
      `Selamat datang kembali, ${authData.full_name || authData.username}!`,
    );
  };

  const handleLogout = () => {
    clearAuthSession();
    setAdminProfile(null);
    setTransactions([]);
    navigateTo("/");
    showNotification("Sesi admin telah keluar.", "info");
  };

  const handleImageUpload = async (file) => {
    if (!file) return null;
    try {
      const result = await uploadDeviceImage(file);
      return result;
    } catch (err) {
      throw new Error("Gagal upload gambar: " + err.message, { cause: err });
    }
  };

  const pendingCount = transactions.filter(
    (t) => t.status === "Pending",
  ).length;

  const toastIcon = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    error: <AlertCircle className="w-4 h-4 text-rose-400" />,
    info: <AlertCircle className="w-4 h-4 text-blue-400" />,
  };

  const toastBg = {
    success: "bg-emerald-500/20",
    error: "bg-rose-500/20",
    info: "bg-blue-500/20",
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        isAdminRoute={isAdminRoute}
        adminProfile={adminProfile}
        onLogout={handleLogout}
        onNavigateHome={() => navigateTo("/")}
        pendingCount={pendingCount}
      />

      {toastMessage && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-100 transition-all duration-300 ease-out ${
            toastVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
        >
          <div className="bg-slate-900/95 backdrop-blur-md text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700/50 flex items-center gap-3 min-w-75 max-w-md">
            <div
              className={`shrink-0 w-8 h-8 rounded-full ${toastBg[toastType]} flex items-center justify-center`}
            >
              {toastIcon[toastType]}
            </div>
            <p className="text-sm font-medium flex-1 leading-snug">
              {toastMessage}
            </p>
            <button
              onClick={closeToast}
              className="shrink-0 text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
              onRefresh={() => {
                refreshDevices();
                loadTransactions();
              }}
              onUpdateDevice={handleUpdateDevice}
              onImageUpload={handleImageUpload}
              editingDevice={editingDevice}
              setEditingDevice={setEditingDevice}
            />
          ) : (
            <AdminLoginScreen
              onLoginSuccess={handleLoginSuccess}
              onBackToHome={() => navigateTo("/")}
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
        <p>
          Notta Rent &bull; Sistem Operasional & Pipeline Analisis Bisnis Sewa
          Smartphone
        </p>
      </footer>
    </div>
  );
}
