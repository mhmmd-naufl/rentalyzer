// Initial seed data matching schema.md
const INITIAL_DEVICES = [
  {
    id: 1,
    brand: "Apple",
    model: "iPhone 15 Pro Max 256GB",
    imei_serial: "356891234567890",
    purchase_price: 21500000,
    daily_rent_price: 350000,
    status: "Available",
    image:
      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80",
    color: "Natural Titanium",
    created_at: "2024-01-15T08:00:00Z",
  },
  {
    id: 2,
    brand: "Apple",
    model: "iPhone 13 Pro 128GB",
    imei_serial: "352341234567891",
    purchase_price: 13500000,
    daily_rent_price: 200000,
    status: "Booked",
    image:
      "https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=600&auto=format&fit=crop&q=80",
    color: "Sierra Blue",
    created_at: "2024-01-20T09:30:00Z",
  },
  {
    id: 3,
    brand: "Samsung",
    model: "Galaxy S23 Ultra 512GB",
    imei_serial: "354561234567892",
    purchase_price: 17500000,
    daily_rent_price: 300000,
    status: "Available",
    image:
      "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&auto=format&fit=crop&q=80",
    color: "Phantom Black",
    created_at: "2024-02-01T10:15:00Z",
  },
  {
    id: 4,
    brand: "Samsung",
    model: "Galaxy Z Flip 5 256GB",
    imei_serial: "357891234567893",
    purchase_price: 14000000,
    daily_rent_price: 250000,
    status: "Rented",
    image:
      "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80",
    color: "Mint",
    created_at: "2024-02-10T11:00:00Z",
  },
  {
    id: 5,
    brand: "Apple",
    model: "iPhone 14 128GB",
    imei_serial: "359011234567894",
    purchase_price: 12000000,
    daily_rent_price: 180000,
    status: "Available",
    image:
      "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&auto=format&fit=crop&q=80",
    color: "Midnight",
    created_at: "2024-02-15T14:20:00Z",
  },
  {
    id: 6,
    brand: "Google",
    model: "Pixel 8 Pro 256GB",
    imei_serial: "351231234567895",
    purchase_price: 15000000,
    daily_rent_price: 270000,
    status: "Maintenance",
    image:
      "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80",
    color: "Bay Blue",
    created_at: "2024-03-01T08:00:00Z",
  },
];

const INITIAL_TRANSACTIONS = [
  {
    id: 1001,
    device_id: 2,
    customer_name: "Budi Santoso",
    customer_nik: "3201123456780001",
    customer_phone: "6281234567890",
    guarantee_type: "KTP Asli",
    start_date: "2024-03-10",
    end_date_expected: "2024-03-13",
    end_date_actual: null,
    snapshot_rent_price: 200000,
    duration_days: 3,
    total_amount: 600000,
    penalty_fee: 0,
    status: "Pending",
    created_at: "2024-03-09T14:30:00Z",
    updated_at: "2024-03-09T14:30:00Z",
  },
  {
    id: 1002,
    device_id: 4,
    customer_name: "Siti Rahma",
    customer_nik: "3171098765430002",
    customer_phone: "6285678901234",
    guarantee_type: "SIM A + NPWP",
    start_date: "2024-03-05",
    end_date_expected: "2024-03-09",
    end_date_actual: null,
    snapshot_rent_price: 250000,
    duration_days: 4,
    total_amount: 1000000,
    penalty_fee: 0,
    status: "Active",
    created_at: "2024-03-04T10:00:00Z",
    updated_at: "2024-03-05T09:00:00Z",
  },
  {
    id: 1003,
    device_id: 1,
    customer_name: "Ahmad Fauzi",
    customer_nik: "3275123487650003",
    customer_phone: "6289876543210",
    guarantee_type: "KTP Asli",
    start_date: "2024-02-20",
    end_date_expected: "2024-02-23",
    end_date_actual: "2024-02-23",
    snapshot_rent_price: 350000,
    duration_days: 3,
    total_amount: 1050000,
    penalty_fee: 0,
    status: "Completed",
    created_at: "2024-02-19T11:20:00Z",
    updated_at: "2024-02-23T18:00:00Z",
  },
];

export const getStoredDevices = () => {
  const data =
    localStorage.getItem("notta_rent_devices") ??
    localStorage.getItem("rentalyzer_devices");
  if (!data) {
    localStorage.setItem("notta_rent_devices", JSON.stringify(INITIAL_DEVICES));
    return INITIAL_DEVICES;
  }
  return JSON.parse(data);
};

export const saveStoredDevices = (devices) => {
  localStorage.setItem("notta_rent_devices", JSON.stringify(devices));
  localStorage.setItem("rentalyzer_devices", JSON.stringify(devices));
};

export const getStoredTransactions = () => {
  const data =
    localStorage.getItem("notta_rent_transactions") ??
    localStorage.getItem("rentalyzer_transactions");
  if (!data) {
    localStorage.setItem(
      "notta_rent_transactions",
      JSON.stringify(INITIAL_TRANSACTIONS),
    );
    return INITIAL_TRANSACTIONS;
  }
  return JSON.parse(data);
};

export const saveStoredTransactions = (transactions) => {
  localStorage.setItem("notta_rent_transactions", JSON.stringify(transactions));
  localStorage.setItem("rentalyzer_transactions", JSON.stringify(transactions));
};

const normalizeWhatsAppNumber = (value) => {
  const cleaned = String(value || "").replace(/\D/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("62")) return cleaned;
  if (cleaned.startsWith("0")) return `62${cleaned.slice(1)}`;
  return `62${cleaned}`;
};

const getAdminWaNumber = () => {
  if (typeof window !== "undefined") {
    const runtimeOverride =
      window.__ADMIN_WA_NUMBER__ ||
      localStorage.getItem("notta_rent_admin_wa") ||
      localStorage.getItem("rentalyzer_admin_wa");

    if (runtimeOverride) {
      return normalizeWhatsAppNumber(runtimeOverride);
    }
  }

  if (typeof import.meta !== "undefined" && import.meta.env) {
    const envValue = import.meta.env.VITE_ADMIN_WA_NUMBER;
    if (envValue) return normalizeWhatsAppNumber(envValue);
  }

  return "6287729233209";
};

// WhatsApp Admin number default (bisa di-override via runtime atau VITE_ADMIN_WA_NUMBER)
export const ADMIN_WA_NUMBER = getAdminWaNumber();

export const formatRupiah = (number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(number);
};
