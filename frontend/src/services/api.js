const API_BASE_URL = "https://rentalyzer-production.up.railway.app";
const AUTH_TOKEN_KEY = "notta_rent_token";
const LEGACY_AUTH_TOKEN_KEY = "rentalyzer_token";
const ADMIN_SESSION_KEY = "notta_rent_admin";
const LEGACY_ADMIN_SESSION_KEY = "rentalyzer_admin";

// ============================================================
// AUTH SESSION HELPERS
// ============================================================
export const getAuthToken = () =>
  localStorage.getItem(AUTH_TOKEN_KEY) ??
  localStorage.getItem(LEGACY_AUTH_TOKEN_KEY);

export const getStoredAdmin = () => {
  const admin =
    localStorage.getItem(ADMIN_SESSION_KEY) ??
    localStorage.getItem(LEGACY_ADMIN_SESSION_KEY);
  return admin ? JSON.parse(admin) : null;
};

export const saveAuthSession = (token, admin) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(admin));
  localStorage.setItem(LEGACY_AUTH_TOKEN_KEY, token);
  localStorage.setItem(LEGACY_ADMIN_SESSION_KEY, JSON.stringify(admin));
};

export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(ADMIN_SESSION_KEY);
  localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  localStorage.removeItem(LEGACY_ADMIN_SESSION_KEY);
};

const extractApiErrorMessage = (payload) => {
  if (!payload) return "Terjadi kesalahan server.";
  if (typeof payload === "string") return payload;
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const nested = extractApiErrorMessage(item);
      if (nested && nested !== "Terjadi kesalahan server.") return nested;
    }
    return payload.map((item) => extractApiErrorMessage(item)).join(", ");
  }
  if (typeof payload === "object") {
    if (payload.detail) return extractApiErrorMessage(payload.detail);
    if (payload.msg) return payload.msg;
    if (payload.message) return payload.message;
    const firstValue = Object.values(payload).find(
      (value) => value !== null && value !== undefined,
    );
    if (firstValue) return extractApiErrorMessage(firstValue);
  }
  return "Terjadi kesalahan server.";
};

// ============================================================
// AUTH: Login Admin
// ============================================================
export const loginAdmin = async (username, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login-json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      return {
        success: false,
        message: err.detail || "Username atau password salah.",
      };
    }
  } catch {
    return {
      success: false,
      message:
        "Backend tidak dapat dijangkau. Pastikan server uvicorn aktif di port 8000.",
    };
  }
};

// ============================================================
// PUBLIC: Fetch Devices dari SQLite (via FastAPI)
// ============================================================
export const fetchDevices = async () => {
  const response = await fetch(`${API_BASE_URL}/api/devices`);
  if (!response.ok) throw new Error("Gagal memuat katalog HP.");
  return response.json();
};

// ============================================================
// PUBLIC: Create Booking Transaction -> Simpan ke SQLite
// ============================================================
export const createBooking = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/api/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(extractApiErrorMessage(err) || "Gagal menyimpan pesanan.");
  }
  return response.json();
};

// ============================================================
// ADMIN (Protected): Fetch All Transactions dari SQLite
// ============================================================
export const fetchAdminTransactions = async (
  statusFilter = "All",
  startDate = "",
  endDate = "",
) => {
  const token = getAuthToken();
  const params = new URLSearchParams();

  if (statusFilter && statusFilter !== "All")
    params.set("status_filter", statusFilter);
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);

  const url = `${API_BASE_URL}/api/transactions${params.toString() ? `?${params.toString()}` : ""}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Akses ditolak atau token kedaluwarsa.");
  return response.json();
};

// ============================================================
// ADMIN (Protected): Update Transaction Status (+ Penalty)
// ============================================================
export const updateTransactionStatus = async (
  transactionId,
  status,
  penaltyFee = 0,
) => {
  const token = getAuthToken();
  const response = await fetch(
    `${API_BASE_URL}/api/transactions/${transactionId}/status`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status, penalty_fee: penaltyFee }),
    },
  );
  if (!response.ok) throw new Error("Gagal mengubah status transaksi.");
  return response.json();
};

// ============================================================
// ADMIN (Protected): Add New Device ke SQLite
// ============================================================
export const addDevice = async (devicePayload) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/devices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(devicePayload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Gagal menambah unit HP.");
  }
  return response.json();
};

// ============================================================
// ADMIN (Protected): Archive/Soft Delete Device
// ============================================================
export const archiveDevice = async (deviceId) => {
  const token = getAuthToken();
  const response = await fetch(
    `${API_BASE_URL}/api/devices/${deviceId}/archive`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!response.ok) throw new Error("Gagal mengarsipkan unit HP.");
  return response.json();
};

// ============================================================
// ADMIN (Protected): Export CSV (trigger download)
// ============================================================
export const exportCSV = async (startDate = "", endDate = "") => {
  const token = getAuthToken();
  const params = new URLSearchParams();

  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);

  const response = await fetch(
    `${API_BASE_URL}/api/export/excel${params.toString() ? `?${params.toString()}` : ""}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!response.ok) throw new Error("Gagal mengekspor data.");

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rentalyzer_export_${new Date().toISOString().split("T")[0]}.csv`;
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
  const response = await fetch(
    `${API_BASE_URL}/api/devices/${deviceId}/restore`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!response.ok) throw new Error("Gagal memulihkan unit HP.");
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
  if (!response.ok) throw new Error("Gagal memuat seluruh unit HP.");
  return response.json();
};

// ============================================================
// ADMIN (Protected): Update Device & Upload Image
// ============================================================
export const updateDevice = async (deviceId, payload) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/devices/${deviceId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Gagal memperbarui unit HP.");
  }

  return response.json();
};

export const uploadDeviceImage = async (file) => {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/devices/upload-image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Gagal mengunggah gambar.");
  }

  return response.json();
};
