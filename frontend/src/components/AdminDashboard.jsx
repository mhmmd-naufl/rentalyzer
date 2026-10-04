import { useState } from "react";
import {
  Plus,
  Search,
  AlertTriangle,
  Smartphone,
  DollarSign,
  Activity,
  FileSpreadsheet,
  Archive,
  RotateCcw,
  RefreshCw,
  Pencil,
  Upload,
  X,
  Trash2,
  History,
  Clock,
  BarChart2,
} from "lucide-react";
import { formatRupiah } from "../services/dataService";
import { resolveImageUrl, DEFAULT_DEVICE_IMAGE } from "../services/api";
import Pagination from "./Pagination";
import DeviceHistoryModal from "./DeviceHistoryModal";
import AnalyticsDashboard from "./AnalyticsDashboard";

const DEFAULT_IMAGE = DEFAULT_DEVICE_IMAGE;

const fmtDateTime = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function AdminDashboard({
  devices = [],
  transactions = [],
  isLoading = false,
  onUpdateStatus,
  onAddDevice,
  onArchiveDevice,
  onRestoreDevice,
  onDeleteDevice,
  onExtendTransaction,
  onExportCSV,
  onRefresh,
  onUpdateDevice,
  onImageUpload,
  editingDevice,
  setEditingDevice,
  onNotify = () => {},
}) {
  const [activeAdminTab, setActiveAdminTab] = useState("transactions");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [transactionDateFrom, setTransactionDateFrom] = useState("");
  const [transactionDateTo, setTransactionDateTo] = useState("");
  const [txSortOrder, setTxSortOrder] = useState("newest"); // "newest" | "oldest"

  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(10);
  const [devPage, setDevPage] = useState(1);
  const [devPageSize, setDevPageSize] = useState(10);
  const [archivePage, setArchivePage] = useState(1);
  const [archivePageSize, setArchivePageSize] = useState(10);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(DEFAULT_IMAGE);
  const [deviceForm, setDeviceForm] = useState({
    brand: "Apple",
    model: "",
    imei_serial: "",
    purchase_price: "",
    color: "Hitam",
    image: DEFAULT_IMAGE,
    price_3h: "",
    price_6h: "",
    price_9h: "",
    price_12h: "",
    price_24h: "",
  });
  const [penaltyModal, setPenaltyModal] = useState({
    isOpen: false,
    transactionId: null,
    targetStatus: "Completed",
    penaltyAmount: 0,
  });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    isOpen: false,
    device: null,
  });
  const [historyDevice, setHistoryDevice] = useState(null);
  const [extendModal, setExtendModal] = useState({
    isOpen: false,
    transaction: null,
    extraHours: 24,
  });

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentMonthRevenue = transactions
    .filter((t) => {
      const txDate = new Date(t.created_at || t.start_date);
      return (
        txDate.getMonth() === currentMonth &&
        txDate.getFullYear() === currentYear &&
        (t.status === "Completed" || t.status === "Active" || t.status === "Overdue")
      );
    })
    .reduce((sum, t) => sum + (t.total_amount || 0) + (t.penalty_fee || 0), 0);

  const activeRentalsCount = devices.filter((d) => d.status === "Rented").length;
  const overdueCount = transactions.filter((t) => t.status === "Overdue").length;
  const activeUnitsCount = devices.filter((d) => d.status !== "Archived").length;
  const archivedCount = devices.filter((d) => d.status === "Archived").length;

  const initiateStatusChange = (transactionId, newStatus) => {
    if (newStatus === "Overdue" || newStatus === "Completed") {
      const tx = transactions.find((t) => t.id === transactionId);
      setPenaltyModal({ isOpen: true, transactionId, targetStatus: newStatus, penaltyAmount: tx?.penalty_fee || 0 });
    } else {
      onUpdateStatus(transactionId, newStatus, 0);
    }
  };

  const confirmPenaltyAndStatus = () => {
    onUpdateStatus(penaltyModal.transactionId, penaltyModal.targetStatus, penaltyModal.penaltyAmount);
    setPenaltyModal({ isOpen: false, transactionId: null, targetStatus: "", penaltyAmount: 0 });
  };

  const openAddModal = () => {
    setEditingDevice(null);
    setDeviceForm({ brand: "Apple", model: "", imei_serial: "", purchase_price: "", color: "Hitam", image: DEFAULT_IMAGE, price_3h: "", price_6h: "", price_9h: "", price_12h: "", price_24h: "" });
    setSelectedFile(null);
    setImagePreview(DEFAULT_IMAGE);
    setShowDeviceModal(true);
  };

  const openEditModal = (device) => {
    setEditingDevice(device);
    setDeviceForm({
      brand: device.brand, model: device.model, imei_serial: device.imei_serial,
      purchase_price: device.purchase_price,
      color: device.color, image: device.image || DEFAULT_IMAGE,
      price_3h: device.price_3h ?? "", price_6h: device.price_6h ?? "",
      price_9h: device.price_9h ?? "", price_12h: device.price_12h ?? "", price_24h: device.price_24h ?? "",
    });
    setSelectedFile(null);
    setImagePreview(resolveImageUrl(device.image) || DEFAULT_IMAGE);
    setShowDeviceModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) { setSelectedFile(file); setImagePreview(URL.createObjectURL(file)); }
  };

  const handleSubmitDevice = async (e) => {
    e.preventDefault();
    // Validasi lokal: cegah 422 dari backend dan tampilkan pesan yang jelas
    const priceModal = parseFloat(deviceForm.purchase_price);
    if (!deviceForm.model || deviceForm.model.trim().length < 2) {
      onNotify("Model minimal 2 karakter.", "error");
      return;
    }
    if (!(priceModal > 0)) {
      onNotify("Harga Modal harus lebih dari 0.", "error");
      return;
    }
    const adaHargaDurasi = ["price_3h", "price_6h", "price_9h", "price_12h", "price_24h"].some(
      (key) => parseFloat(deviceForm[key]) > 0,
    );
    if (!adaHargaDurasi) {
      onNotify("Isi minimal satu harga durasi.", "error");
      return;
    }
    let finalImageUrl = deviceForm.image || DEFAULT_IMAGE;
    if (selectedFile) {
      try {
        const uploaded = await onImageUpload(selectedFile);
        finalImageUrl = uploaded?.url || finalImageUrl;
      } catch (err) {
        onNotify("Gagal upload gambar: " + err.message, "error");
        return;
      }
    }
    const payload = {
      ...deviceForm,
      purchase_price: parseFloat(deviceForm.purchase_price) || 0,
      daily_rent_price: parseFloat(deviceForm.price_24h) || 0,
      price_3h: parseFloat(deviceForm.price_3h) || 0,
      price_6h: parseFloat(deviceForm.price_6h) || 0,
      price_9h: parseFloat(deviceForm.price_9h) || 0,
      price_12h: parseFloat(deviceForm.price_12h) || 0,
      price_24h: parseFloat(deviceForm.price_24h) || 0,
      image: finalImageUrl,
    };
    try {
      if (editingDevice) { await onUpdateDevice(editingDevice.id, payload); }
      else { await onAddDevice(payload); }
      setShowDeviceModal(false);
    } catch (error) {
      onNotify(error.message, "error");
    }
  };

  const handleDeleteClick = (device) => setDeleteConfirmModal({ isOpen: true, device });
  const confirmDelete = () => {
    if (deleteConfirmModal.device) onDeleteDevice(deleteConfirmModal.device.id);
    setDeleteConfirmModal({ isOpen: false, device: null });
  };

  // Filter tanggal berdasarkan PERIODE SEWA (overlap): transaksi tampil jika
  // jadwal sewa (start_date ~ end_date_expected) beririsan dengan rentang From–To
  const rangeStart = transactionDateFrom ? new Date(`${transactionDateFrom}T00:00:00`) : null;
  const rangeEnd = transactionDateTo ? new Date(`${transactionDateTo}T23:59:59`) : null;
  const hasDateFilter = rangeStart !== null || rangeEnd !== null;

  const filteredTransactions = transactions.filter((t) => {
    const matchesStatus = statusFilter === "All" || t.status === statusFilter;
    const matchesSearch =
      (t.customer_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.customer_nik || "").includes(searchQuery) ||
      (t.customer_phone || "").includes(searchQuery);

    if (!hasDateFilter) return matchesStatus && matchesSearch;

    const txStart = new Date(t.start_date);
    const txEnd = new Date(t.end_date_expected);
    if (Number.isNaN(txStart.getTime()) || Number.isNaN(txEnd.getTime())) return false;

    const overlaps =
      (rangeEnd === null || txStart <= rangeEnd) &&
      (rangeStart === null || txEnd >= rangeStart);
    return matchesStatus && matchesSearch && overlaps;
  });

  // Urutkan: terbaru (default) atau terlama berdasarkan waktu transaksi dibuat
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    const ta = new Date(a.created_at || a.start_date || 0).getTime();
    const tb = new Date(b.created_at || b.start_date || 0).getTime();
    return txSortOrder === "newest" ? tb - ta : ta - tb;
  });

  const hasActiveFilter =
    statusFilter !== "All" || searchQuery || transactionDateFrom || transactionDateTo;

  const archivedDevices = devices.filter((d) => d.status === "Archived");
  const activeDevices = devices.filter((d) => d.status !== "Archived");

  const paginatedTransactions = sortedTransactions.slice((txPage - 1) * txPageSize, txPage * txPageSize);
  const paginatedDevices = activeDevices.slice((devPage - 1) * devPageSize, devPage * devPageSize);
  const paginatedArchived = archivedDevices.slice((archivePage - 1) * archivePageSize, archivePage * archivePageSize);

  return (
    <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Omzet Bulan Ini</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><DollarSign className="w-5 h-5" /></div>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{formatRupiah(currentMonthRevenue)}</p>
          <p className="text-xs text-slate-500 mt-1">Total sewa & denda bulan berjalan</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">HP Sedang Keluar</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Activity className="w-5 h-5" /></div>
          </div>
          <p className="text-2xl font-bold text-blue-700 mt-2">{activeRentalsCount} Unit</p>
          <p className="text-xs text-slate-500 mt-1">Status sewa aktif di tangan penyewa</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Unit Overdue</span>
            <div className={`p-2 rounded-xl ${overdueCount > 0 ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-400"}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className={`text-2xl font-bold mt-2 ${overdueCount > 0 ? "text-rose-600" : "text-slate-900"}`}>{overdueCount} Unit</p>
          <p className="text-xs text-slate-500 mt-1">Pesanan melewati batas tenggat kembali</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Aset Aktif</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Smartphone className="w-5 h-5" /></div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{activeUnitsCount} Unit</p>
          <p className="text-xs text-slate-500 mt-1">Inventaris aktif siap beroperasi</p>
        </div>
      </div>

      {/* Main Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        {/* Tab Bar */}
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setActiveAdminTab("transactions")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeAdminTab === "transactions" ? "bg-indigo-600 text-white shadow-xs" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"}`}>
              Kontrol Transaksi ({transactions.length})
            </button>
            <button onClick={() => setActiveAdminTab("devices")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeAdminTab === "devices" ? "bg-indigo-600 text-white shadow-xs" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"}`}>
              Master Data HP ({devices.filter((d) => d.status !== "Archived").length})
            </button>
            <button onClick={() => setActiveAdminTab("archived")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeAdminTab === "archived" ? "bg-indigo-600 text-white shadow-xs" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"}`}>
              Arsip HP ({archivedCount})
            </button>
            <button onClick={() => setActiveAdminTab("analytics")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeAdminTab === "analytics" ? "bg-indigo-600 text-white shadow-xs" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"}`}>
              <span className="flex items-center gap-1.5"><BarChart2 className="w-3.5 h-3.5" />Analytics</span>
            </button>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button onClick={onRefresh} title="Refresh data"
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-slate-200">
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            {activeAdminTab === "transactions" && (
              <button onClick={() => onExportCSV({ startDate: transactionDateFrom, endDate: transactionDateTo })}
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs cursor-pointer">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Report (CSV)</span>
              </button>
            )}
            {activeAdminTab === "devices" && (
              <button onClick={openAddModal}
                className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs cursor-pointer">
                <Plus className="w-4 h-4" />
                <span>Tambah Unit</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab: Transactions */}
        {activeAdminTab === "transactions" && (
          <div>
            <div className="p-4 border-b border-slate-100 bg-white">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                  {["All", "Pending", "Active", "Completed", "Overdue", "Canceled"].map((st) => (
                    <button key={st} onClick={() => { setStatusFilter(st); setTxPage(1); }}
                      className={`px-3 py-2 sm:py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${statusFilter === st ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                      {st}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="relative w-full md:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input type="text" placeholder="Cari nama, NIK, atau WA..." value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setTxPage(1); }}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-indigo-600" />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 items-center ml-auto"
                    title="Filter periode sewa: transaksi tampil jika jadwal sewa (mulai–selesai) beririsan dengan rentang tanggal ini">
                    <label className="flex items-center gap-2 text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                      <span>Urutkan</span>
                      <select
                        value={txSortOrder}
                        onChange={(e) => { setTxSortOrder(e.target.value); setTxPage(1); }}
                        className="border border-slate-200 rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-700 focus:outline-indigo-600 cursor-pointer"
                      >
                        <option value="newest">Terbaru</option>
                        <option value="oldest">Terlama</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                      <span>From</span>
                      <input type="date" value={transactionDateFrom} onChange={(e) => setTransactionDateFrom(e.target.value)}
                        className="border border-slate-200 rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-700 focus:outline-indigo-600" />
                    </label>
                    <label className="flex items-center gap-2 text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                      <span>To</span>
                      <input type="date" value={transactionDateTo} onChange={(e) => setTransactionDateTo(e.target.value)}
                        className="border border-slate-200 rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-700 focus:outline-indigo-600" />
                    </label>
                    {(transactionDateFrom || transactionDateTo) && (
                      <button type="button" onClick={() => { setTransactionDateFrom(""); setTransactionDateTo(""); setTxPage(1); }}
                        className="px-2.5 py-1.5 text-[10px] font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100">
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Menampilkan{" "}
                  <span className="font-semibold text-slate-600">{sortedTransactions.length}</span>{" "}
                  dari{" "}
                  <span className="font-semibold text-slate-600">{transactions.length}</span>{" "}
                  transaksi
                  {hasActiveFilter && (
                    <span className="text-indigo-600 font-medium"> &middot; filter aktif</span>
                  )}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600" id="tx-table">
                <thead className="bg-slate-100/75 text-slate-700 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Penyewa</th>
                    <th className="py-3 px-4">Unit HP</th>
                    <th className="py-3 px-4">Periode</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Denda</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr><td colSpan="8" className="py-8 text-center text-slate-400 text-xs">Memuat data...</td></tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr><td colSpan="8" className="py-8 text-center text-slate-400 text-xs">{hasActiveFilter ? "Tidak ada transaksi yang cocok dengan filter. Coba ubah kata kunci / tanggal / status." : "Tidak ada transaksi."}</td></tr>
                  ) : (
                    paginatedTransactions.map((tx) => {
                      const dev = devices.find((d) => d.id === tx.device_id) || {};
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-slate-900">#{tx.id}</td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900">{tx.customer_name}</p>
                            <p className="text-[11px] text-slate-400">NIK: {tx.customer_nik}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-900">{dev.brand} {dev.model}</p>
                            <p className="text-[11px] text-slate-400 font-mono">IMEI: {dev.imei_serial || "—"}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p>
                              {fmtDateTime(tx.start_date)}{" "}
                              &rarr; {fmtDateTime(tx.end_date_expected)}
                            </p>
                            <p className="text-[11px] text-indigo-600 font-semibold">
                              {tx.duration_hours} Jam
                            </p>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">{formatRupiah(tx.total_amount)}</td>
                          <td className="py-3 px-4">
                            {tx.penalty_fee > 0 ? (
                              <span className="font-bold text-rose-600">+ {formatRupiah(tx.penalty_fee)}</span>
                            ) : (
                              <span className="text-slate-400">Rp 0</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${tx.status === "Active" ? "bg-blue-100 text-blue-800" : tx.status === "Pending" ? "bg-amber-100 text-amber-800" : tx.status === "Completed" ? "bg-emerald-100 text-emerald-800" : tx.status === "Overdue" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-600"}`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end items-center gap-2">
                              <select value={tx.status} onChange={(e) => initiateStatusChange(tx.id, e.target.value)}
                                className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-indigo-600 cursor-pointer">
                                <option value="Pending">Pending</option>
                                <option value="Active">Set Active (Disewa)</option>
                                <option value="Completed">Set Completed (Selesai)</option>
                                <option value="Overdue">Set Overdue (Telat)</option>
                                <option value="Canceled">Batalkan</option>
                              </select>
                              {(tx.status === "Active" || tx.status === "Pending" || tx.status === "Overdue") && (
                                <button
                                  onClick={() => setExtendModal({ isOpen: true, transaction: tx, extraHours: 24 })}
                                  title="Perpanjang sewa"
                                  className="inline-flex items-center gap-1 px-2 py-2 sm:py-1 text-xs font-medium rounded-lg border bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 transition-all cursor-pointer shrink-0">
                                  <Clock className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={txPage} totalItems={filteredTransactions.length} pageSize={txPageSize}
              onPageChange={setTxPage} onPageSizeChange={(size) => { setTxPageSize(size); setTxPage(1); }} />
          </div>
        )}

        {/* Tab: Devices */}
        {activeAdminTab === "devices" && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-100/75 text-slate-700 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Unit HP</th>
                    <th className="py-3 px-4">IMEI / Serial</th>
                    <th className="py-3 px-4">Harga Modal (ROI)</th>
                    <th className="py-3 px-4">Harga Sewa / 24 Jam</th>
                    <th className="py-3 px-4">Status Inventaris</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedDevices.map((device) => (
                    <tr key={device.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 flex items-center gap-3">
                        <img src={resolveImageUrl(device.image) || DEFAULT_IMAGE} alt={device.model}
                          className="w-10 h-10 object-cover rounded-lg border border-slate-200" />
                        <div>
                          <p className="font-semibold text-slate-900">{device.brand} {device.model}</p>
                          <p className="text-[11px] text-slate-400">{device.color}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">{device.imei_serial || "—"}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{formatRupiah(device.purchase_price)}</td>
                      <td className="py-3 px-4 font-bold text-indigo-700">{formatRupiah(device.price_24h || device.daily_rent_price)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${device.status === "Available" ? "bg-emerald-100 text-emerald-800" : device.status === "Booked" ? "bg-amber-100 text-amber-800" : device.status === "Rented" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"}`}>
                          {device.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditModal(device)}
                            className="inline-flex items-center gap-1 px-2.5 py-2 sm:py-1 text-xs font-medium rounded-lg border bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 transition-all cursor-pointer">
                            <Pencil className="w-3.5 h-3.5" /><span>Edit</span>
                          </button>
                          <button onClick={() => setHistoryDevice(device)}
                            className="inline-flex items-center gap-1 px-2.5 py-2 sm:py-1 text-xs font-medium rounded-lg border bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 transition-all cursor-pointer">
                            <History className="w-3.5 h-3.5" /><span>History</span>
                          </button>
                          <button onClick={() => onArchiveDevice(device.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-2 sm:py-1 text-xs font-medium rounded-lg border bg-slate-100 text-slate-600 border-slate-300 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 transition-all cursor-pointer">
                            <Archive className="w-3.5 h-3.5" /><span>Arsip</span>
                          </button>
                          <button onClick={() => handleDeleteClick(device)}
                            className="inline-flex items-center gap-1 px-2.5 py-2 sm:py-1 text-xs font-medium rounded-lg border bg-slate-100 text-slate-600 border-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-all cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" /><span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={devPage} totalItems={activeDevices.length} pageSize={devPageSize}
              onPageChange={setDevPage} onPageSizeChange={(size) => { setDevPageSize(size); setDevPage(1); }} />
          </div>
        )}

        {/* Tab: Archived */}
        {activeAdminTab === "archived" && (
          <div>
            {archivedDevices.length === 0 ? (
              <div className="py-16 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                  <Archive className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-slate-500 text-sm font-medium">Tidak ada unit yang diarsipkan.</p>
                <p className="text-slate-400 text-xs mt-1">Unit yang diarsipkan akan muncul di sini.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-100/75 text-slate-700 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Unit HP</th>
                        <th className="py-3 px-4">IMEI / Serial</th>
                        <th className="py-3 px-4">Harga Modal</th>
                        <th className="py-3 px-4">Harga Sewa / 24 Jam</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedArchived.map((device) => (
                        <tr key={device.id} className="hover:bg-slate-50/80 transition-colors opacity-75">
                          <td className="py-3 px-4 flex items-center gap-3">
                            <img src={resolveImageUrl(device.image) || DEFAULT_IMAGE} alt={device.model}
                              className="w-10 h-10 object-cover rounded-lg border border-slate-200 grayscale" />
                            <div>
                              <p className="font-semibold text-slate-900">{device.brand} {device.model}</p>
                              <p className="text-[11px] text-slate-400">{device.color}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-700">{device.imei_serial || "—"}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{formatRupiah(device.purchase_price)}</td>
                          <td className="py-3 px-4 font-bold text-indigo-700">{formatRupiah(device.price_24h || device.daily_rent_price)}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800">
                              {device.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => onRestoreDevice(device.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-2 sm:py-1 text-xs font-medium rounded-lg border bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 transition-all cursor-pointer">
                                <RotateCcw className="w-3.5 h-3.5" /><span>Pulihkan</span>
                              </button>
                              <button onClick={() => handleDeleteClick(device)}
                                className="inline-flex items-center gap-1 px-2.5 py-2 sm:py-1 text-xs font-medium rounded-lg border bg-slate-100 text-slate-600 border-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-all cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" /><span>Hapus</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination currentPage={archivePage} totalItems={archivedDevices.length} pageSize={archivePageSize}
                  onPageChange={setArchivePage} onPageSizeChange={(size) => { setArchivePageSize(size); setArchivePage(1); }} />
              </>
            )}
          </div>
        )}

        {/* Tab: Analytics */}
        {activeAdminTab === "analytics" && <AnalyticsDashboard />}
      </div>

      {/* Penalty Modal */}
      {penaltyModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-1">Input Denda Keterlambatan</h3>
            <p className="text-xs text-slate-500 mb-4">Masukkan nominal denda jika pesanan telat dikembalikan.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal Denda (Rp)</label>
                <input type="number" min="0" step="10000" value={penaltyModal.penaltyAmount}
                  onChange={(e) => setPenaltyModal({ ...penaltyModal, penaltyAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full text-sm p-2.5 border border-slate-200 rounded-xl focus:outline-indigo-600" />
              </div>
              <div className="flex gap-2 justify-end pt-3">
                <button type="button"
                  onClick={() => { onUpdateStatus(penaltyModal.transactionId, penaltyModal.targetStatus, 0); setPenaltyModal({ isOpen: false, transactionId: null, targetStatus: "", penaltyAmount: 0 }); }}
                  className="px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer">
                  Lewati
                </button>
                <button type="button" onClick={confirmPenaltyAndStatus}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer">
                  Simpan & Ubah Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Device Modal */}
      {showDeviceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">{editingDevice ? "Edit Unit Smartphone" : "Tambah Unit Smartphone Baru"}</h3>
              <button onClick={() => setShowDeviceModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmitDevice} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Foto Unit (Opsional)</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center bg-slate-50 shrink-0">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <label className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors w-full justify-center">
                    <Upload className="w-4 h-4" />
                    <span className="truncate">{selectedFile ? selectedFile.name.substring(0, 20) + "..." : "Pilih Foto"}</span>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Brand</label>
                  <select value={deviceForm.brand} onChange={(e) => setDeviceForm({ ...deviceForm, brand: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-indigo-600 cursor-pointer">
                    <option value="Apple">Apple</option>
                    <option value="Samsung">Samsung</option>
                    <option value="Google">Google</option>
                    <option value="Xiaomi">Xiaomi</option>
                    <option value="Aksesoris">Aksesoris</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Warna</label>
                  <input type="text" required placeholder="Hitam" value={deviceForm.color}
                    onChange={(e) => setDeviceForm({ ...deviceForm, color: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-indigo-600" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Model & Varian</label>
                <input type="text" required placeholder="Contoh: iPhone 14 Pro 128GB" value={deviceForm.model}
                  onChange={(e) => setDeviceForm({ ...deviceForm, model: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-indigo-600" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">IMEI / Nomor Seri (Opsional)</label>
                <input type="text" placeholder="Opsional — contoh: 356789012345678" value={deviceForm.imei_serial}
                  onChange={(e) => setDeviceForm({ ...deviceForm, imei_serial: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-indigo-600" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Modal (Rp)</label>
                <input type="number" required placeholder="15000000" value={deviceForm.purchase_price}
                  onChange={(e) => setDeviceForm({ ...deviceForm, purchase_price: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-indigo-600" />
              </div>
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 mb-2">Harga Sewa Per Durasi</label>
                <div className="grid grid-cols-2 gap-2">
                  {[3, 6, 9, 12, 24].map((hours) => (
                    <div key={hours}>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">{hours} Jam</label>
                      <input type="number" min="0" step="1000" value={deviceForm[`price_${hours}h`] ?? ""}
                        onChange={(e) => setDeviceForm({ ...deviceForm, [`price_${hours}h`]: e.target.value })}
                        placeholder={String(hours * 10000)}
                        className="w-full text-xs p-2 border border-slate-200 rounded-xl focus:outline-indigo-600" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 mt-4">
                <button type="button" onClick={() => setShowDeviceModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">Batal</button>
                <button type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer">
                  {editingDevice ? "Simpan Perubahan" : "Simpan Unit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Extend Modal */}
      {extendModal.isOpen && extendModal.transaction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Perpanjang Sewa</h3>
              <button onClick={() => setExtendModal({ isOpen: false, transaction: null, extraHours: 24 })}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Transaksi <span className="font-semibold text-slate-700">#{extendModal.transaction.id}</span>
              {" — "}{extendModal.transaction.customer_name}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Tambah Durasi</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[3, 6, 9, 12, 24, 48].map((h) => (
                    <button key={h} type="button"
                      onClick={() => setExtendModal({ ...extendModal, extraHours: h })}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${extendModal.extraHours === h ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                      {h < 24 ? `${h} jam` : `${h / 24} hari`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setExtendModal({ isOpen: false, transaction: null, extraHours: 24 })}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">Batal</button>
                <button type="button"
                  onClick={() => { onExtendTransaction(extendModal.transaction.id, extendModal.extraHours); setExtendModal({ isOpen: false, transaction: null, extraHours: 24 }); }}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer">
                  Perpanjang {extendModal.extraHours < 24 ? `${extendModal.extraHours} Jam` : `${extendModal.extraHours / 24} Hari`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Device History Modal */}
      {historyDevice && (
        <DeviceHistoryModal device={historyDevice} onClose={() => setHistoryDevice(null)} />
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmModal.isOpen && deleteConfirmModal.device && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-rose-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-1">Hapus Unit HP?</h3>
            <p className="text-xs text-slate-500 text-center mb-1">
              <span className="font-semibold text-slate-700">{deleteConfirmModal.device.brand} {deleteConfirmModal.device.model}</span>
            </p>
            <p className="text-xs text-slate-400 text-center mb-5">
              Jika unit belum punya transaksi, akan dihapus permanen. Jika sudah ada riwayat transaksi, unit akan diarsipkan otomatis.
            </p>
            <div className="flex gap-2 justify-center">
              <button type="button" onClick={() => setDeleteConfirmModal({ isOpen: false, device: null })}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer border border-slate-200">Batal</button>
              <button type="button" onClick={confirmDelete}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
