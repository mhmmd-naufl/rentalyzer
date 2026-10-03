const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ============================================================
// AUTH SESSION HELPERS
// ============================================================
export const getAuthToken = () => localStorage.getItem('rentalyzer_token');

export const getStoredAdmin = () => {
  const admin = localStorage.getItem('rentalyzer_admin');
  return admin ? JSON.parse(admin) : null;
};

export const saveAuthSession = (token, admin) => {
  localStorage.setItem('rentalyzer_token', token);
  localStorage.setItem('rentalyzer_admin', JSON.stringify(admin));
};

export const clearAuthSession = () => {
  localStorage.removeItem('rentalyzer_token');
  localStorage.removeItem('rentalyzer_admin');
};

// ============================================================
// AUTH: Login Admin
// ============================================================
export const loginAdmin = async (username, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login-json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      const data = await response.json();
      saveAuthSession(data.access_token, {
        username: data.username,
        full_name: data.full_name,
      });
      return { success: true, data };
    } else {
      const err = await response.json();
      return { success: false, message: err.detail || 'Username atau password salah.' };
    }
  } catch {
    return { success: false, message: 'Backend tidak dapat dijangkau. Pastikan server uvicorn aktif di port 8000.' };
  }
};

// ============================================================
// PUBLIC: Fetch Devices dari SQLite (via FastAPI)
// ============================================================
export const fetchDevices = async () => {
  const response = await fetch(`${API_BASE_URL}/api/devices`);
  if (!response.ok) throw new Error('Gagal memuat katalog HP.');
  return response.json();
};

// ============================================================
// PUBLIC: Create Booking Transaction -> Simpan ke SQLite
// ============================================================
export const createBooking = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/api/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Gagal menyimpan pesanan.');
  }
  return response.json();
};

// ============================================================
// ADMIN (Protected): Fetch All Transactions dari SQLite
// ============================================================
export const fetchAdminTransactions = async (statusFilter = 'All') => {
  const token = getAuthToken();
  const url = statusFilter && statusFilter !== 'All'
    ? `${API_BASE_URL}/api/transactions?status_filter=${statusFilter}`
    : `${API_BASE_URL}/api/transactions`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Akses ditolak atau token kedaluwarsa.');
  return response.json();
};

// ============================================================
// ADMIN (Protected): Update Transaction Status (+ Penalty)
// ============================================================
export const updateTransactionStatus = async (transactionId, status, penaltyFee = 0) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/transactions/${transactionId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status, penalty_fee: penaltyFee }),
  });
  if (!response.ok) throw new Error('Gagal mengubah status transaksi.');
  return response.json();
};

// ============================================================
// ADMIN (Protected): Add New Device ke SQLite
// ============================================================
export const addDevice = async (devicePayload) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/devices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(devicePayload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Gagal menambah unit HP.');
  }
  return response.json();
};

// ============================================================
// ADMIN (Protected): Archive/Soft Delete Device
// ============================================================
export const archiveDevice = async (deviceId) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/devices/${deviceId}/archive`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Gagal mengarsipkan unit HP.');
  return response.json();
};

// ============================================================
// ADMIN (Protected): Export CSV (trigger download)
// ============================================================
export const exportCSV = async () => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/export/excel`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Gagal mengekspor data.');

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rentalyzer_export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ============================================================
// ADMIN (Protected): Restore Device
// ============================================================
export const restoreDevice = async (deviceId) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/devices/${deviceId}/restore`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Gagal memulihkan unit HP.');
  return response.json();
};

// ============================================================
// ADMIN (Protected): Fetch Semua Device (Termasuk Arsip)
// ============================================================
export const fetchAdminDevices = async () => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/admin/devices`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Gagal memuat seluruh unit HP.');
  return response.json();
};