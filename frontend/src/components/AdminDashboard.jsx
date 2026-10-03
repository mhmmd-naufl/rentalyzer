import React, { useState } from 'react';
import { 
  Download, Plus, Search, CheckCircle2, Clock, AlertTriangle, 
  XCircle, Smartphone, DollarSign, Activity, FileSpreadsheet, Archive,
  RotateCcw, ShieldAlert, RefreshCw
} from 'lucide-react';
import { formatRupiah } from '../services/dataService';

export default function AdminDashboard({ 
  devices = [], 
  transactions = [],
  isLoading = false,
  onUpdateStatus,
  onAddDevice,
  onArchiveDevice,
  onExportCSV,
  onRefresh,
}) {
  const [activeAdminTab, setActiveAdminTab] = useState('transactions');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Device Form Modal state
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [newDevice, setNewDevice] = useState({
    brand: 'Apple',
    model: '',
    imei_serial: '',
    purchase_price: '',
    daily_rent_price: '',
    color: 'Hitam',
    image: 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=600&auto=format&fit=crop&q=80'
  });

  // Manual Penalty Modal state
  const [penaltyModal, setPenaltyModal] = useState({
    isOpen: false,
    transactionId: null,
    targetStatus: 'Completed',
    penaltyAmount: 0,
  });

  // ==========================================================
  // QUICK STATS (AT A GLANCE - PRD SECTION 3.B)
  // ==========================================================
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentMonthRevenue = transactions
    .filter(t => {
      const txDate = new Date(t.created_at || t.start_date);
      const isThisMonth = txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
      const isEarned = t.status === 'Completed' || t.status === 'Active' || t.status === 'Overdue';
      return isThisMonth && isEarned;
    })
    .reduce((sum, t) => sum + (t.total_amount || 0) + (t.penalty_fee || 0), 0);

  const activeRentalsCount = devices.filter(d => d.status === 'Rented').length;
  const overdueCount = transactions.filter(t => t.status === 'Overdue').length;
  const activeUnitsCount = devices.filter(d => d.status !== 'Archived').length;

  // ==========================================================
  // TRANSACTION STATUS CONTROLS & MANUAL PENALTY (-> API)
  // ==========================================================

  const initiateStatusChange = (transactionId, newStatus) => {
    if (newStatus === 'Overdue' || newStatus === 'Completed') {
      const tx = transactions.find(t => t.id === transactionId);
      setPenaltyModal({
        isOpen: true,
        transactionId,
        targetStatus: newStatus,
        penaltyAmount: tx?.penalty_fee || 0,
      });
    } else {
      onUpdateStatus(transactionId, newStatus, 0);
    }
  };

  const confirmPenaltyAndStatus = () => {
    onUpdateStatus(penaltyModal.transactionId, penaltyModal.targetStatus, penaltyModal.penaltyAmount);
    setPenaltyModal({ isOpen: false, transactionId: null, targetStatus: '', penaltyAmount: 0 });
  };

  // ==========================================================
  // MASTER DATA: ADD DEVICE (-> API -> SQLite)
  // ==========================================================

  const handleAddDevice = async (e) => {
    e.preventDefault();
    if (!newDevice.model || !newDevice.imei_serial) return;

    const devicePayload = {
      ...newDevice,
      purchase_price: parseFloat(newDevice.purchase_price) || 0,
      daily_rent_price: parseFloat(newDevice.daily_rent_price) || 0,
    };

    await onAddDevice(devicePayload);
    setShowAddDeviceModal(false);
    setNewDevice({
      brand: 'Apple',
      model: '',
      imei_serial: '',
      purchase_price: '',
      daily_rent_price: '',
      color: 'Hitam',
      image: 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=600&auto=format&fit=crop&q=80'
    });
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchesSearch = 
      (t.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.customer_nik || '').includes(searchQuery) ||
      (t.customer_phone || '').includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      
      {/* Quick Stats (PRD Section 3.B) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Omzet Bulan Ini</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{formatRupiah(currentMonthRevenue)}</p>
          <p className="text-xs text-slate-500 mt-1">Total sewa & denda bulan berjalan</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">HP Sedang Keluar</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-700 mt-2">{activeRentalsCount} Unit</p>
          <p className="text-xs text-slate-500 mt-1">Status sewa aktif di tangan penyewa</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Unit Overdue</span>
            <div className={`p-2 rounded-xl ${overdueCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className={`text-2xl font-bold mt-2 ${overdueCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {overdueCount} Unit
          </p>
          <p className="text-xs text-slate-500 mt-1">Pesanan melewati batas tenggat kembali</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Aset Aktif</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Smartphone className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{activeUnitsCount} Unit</p>
          <p className="text-xs text-slate-500 mt-1">Inventaris aktif siap beroperasi</p>
        </div>

      </div>

      {/* Main Admin Management Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        
        {/* Toolbar Header */}
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveAdminTab('transactions')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeAdminTab === 'transactions'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Kontrol Transaksi ({transactions.length})
            </button>

            <button
              onClick={() => setActiveAdminTab('devices')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeAdminTab === 'devices'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Master Data HP ({devices.length})
            </button>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              title="Refresh data dari database"
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-slate-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {activeAdminTab === 'transactions' && (
              <button
                onClick={onExportCSV}
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Report (CSV)</span>
              </button>
            )}

            {activeAdminTab === 'devices' && (
              <button
                onClick={() => setShowAddDeviceModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Unit HP</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Transaksi */}
        {activeAdminTab === 'transactions' && (
          <div>
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 justify-between items-center bg-white">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                {['All', 'Pending', 'Active', 'Completed', 'Overdue', 'Canceled'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
                      statusFilter === st
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama, NIK, atau WA..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-indigo-600"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-100/75 text-slate-700 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">ID Transaksi</th>
                    <th className="py-3 px-4">Penyewa</th>
                    <th className="py-3 px-4">Unit HP</th>
                    <th className="py-3 px-4">Periode</th>
                    <th className="py-3 px-4">Total Biaya</th>
                    <th className="py-3 px-4">Denda (Penalty)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ubah Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-400 text-xs">
                        Memuat data dari database...
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-400 text-xs">
                        Tidak ada transaksi ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const dev = devices.find((d) => d.id === tx.device_id) || {};

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-slate-900">
                            #{tx.id}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900">{tx.customer_name}</p>
                            <p className="text-[11px] text-slate-400">NIK: {tx.customer_nik}</p>
                            <p className="text-[11px] text-slate-400">WA: {tx.customer_phone}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-900">{dev.brand} {dev.model}</p>
                            <p className="text-[11px] text-slate-400 font-mono">IMEI: {dev.imei_serial}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p>{tx.start_date} s/d {tx.end_date_expected}</p>
                            <p className="text-[11px] text-indigo-600 font-semibold">{tx.duration_days} Hari</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{formatRupiah(tx.total_amount)}</p>
                            <span className="text-[10px] text-slate-400">({tx.guarantee_type})</span>
                          </td>
                          <td className="py-3 px-4">
                            {tx.penalty_fee > 0 ? (
                              <span className="font-bold text-rose-600">
                                + {formatRupiah(tx.penalty_fee)}
                              </span>
                            ) : (
                              <span className="text-slate-400">Rp 0</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tx.status === 'Active' ? 'bg-blue-100 text-blue-800' :
                              tx.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                              tx.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                              tx.status === 'Overdue' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <select
                              value={tx.status}
                              onChange={(e) => initiateStatusChange(tx.id, e.target.value)}
                              className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-indigo-600 cursor-pointer"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Active">Set Active (Disewa)</option>
                              <option value="Completed">Set Completed (Selesai)</option>
                              <option value="Overdue">Set Overdue (Telat)</option>
                              <option value="Canceled">Batalkan</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Master Data HP */}
        {activeAdminTab === 'devices' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/75 text-slate-700 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Unit HP</th>
                  <th className="py-3 px-4">IMEI / Serial</th>
                  <th className="py-3 px-4">Harga Modal (ROI)</th>
                  <th className="py-3 px-4">Harga Sewa / Hari</th>
                  <th className="py-3 px-4">Status Inventaris</th>
                  <th className="py-3 px-4 text-right">Aksi Arsip (Soft Delete)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {devices.map((device) => {
                  const isArchived = device.status === 'Archived';

                  return (
                    <tr key={device.id} className={`hover:bg-slate-50/80 transition-colors ${isArchived ? 'opacity-60 bg-slate-50' : ''}`}>
                      <td className="py-3 px-4 flex items-center gap-3">
                        <img
                          src={device.image}
                          alt={device.model}
                          className={`w-10 h-10 object-cover rounded-lg border border-slate-200 ${isArchived ? 'grayscale' : ''}`}
                        />
                        <div>
                          <p className="font-semibold text-slate-900">{device.brand} {device.model}</p>
                          <p className="text-[11px] text-slate-400">{device.color}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {device.imei_serial}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {formatRupiah(device.purchase_price)}
                      </td>
                      <td className="py-3 px-4 font-bold text-indigo-700">
                        {formatRupiah(device.daily_rent_price)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          device.status === 'Available' ? 'bg-emerald-100 text-emerald-800' :
                          device.status === 'Booked' ? 'bg-amber-100 text-amber-800' :
                          device.status === 'Rented' ? 'bg-blue-100 text-blue-800' :
                          device.status === 'Archived' ? 'bg-slate-200 text-slate-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {device.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onArchiveDevice(device.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                            isArchived
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                              : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                          }`}
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>{isArchived ? 'Pulihkan' : 'Arsipkan'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Penalty Modal */}
      {penaltyModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Input Denda Keterlambatan
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Masukkan nominal denda (penalty fee) manual jika pesanan telat dikembalikan atau unit bermasalah.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal Denda (Rp)</label>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={penaltyModal.penaltyAmount}
                  onChange={(e) => setPenaltyModal({ ...penaltyModal, penaltyAmount: parseFloat(e.target.value) || 0 })}
                  placeholder="Contoh: 50000"
                  className="w-full text-sm p-2.5 border border-slate-200 rounded-xl focus:outline-indigo-600"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateStatus(penaltyModal.transactionId, penaltyModal.targetStatus, 0);
                    setPenaltyModal({ isOpen: false, transactionId: null, targetStatus: '', penaltyAmount: 0 });
                  }}
                  className="px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Lewati Tanpa Denda
                </button>
                <button
                  type="button"
                  onClick={confirmPenaltyAndStatus}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan & Ubah Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah HP */}
      {showAddDeviceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Tambah Unit Smartphone Baru</h3>
            <form onSubmit={handleAddDevice} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Brand</label>
                <select
                  value={newDevice.brand}
                  onChange={(e) => setNewDevice({ ...newDevice, brand: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-indigo-600 cursor-pointer"
                >
                  <option value="Apple">Apple</option>
                  <option value="Samsung">Samsung</option>
                  <option value="Google">Google</option>
                  <option value="Xiaomi">Xiaomi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Model & Varian</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: iPhone 14 Pro 128GB"
                  value={newDevice.model}
                  onChange={(e) => setNewDevice({ ...newDevice, model: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">IMEI / Nomor Seri</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 356789012345678"
                  value={newDevice.imei_serial}
                  onChange={(e) => setNewDevice({ ...newDevice, imei_serial: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Beli Modal (Rp)</label>
                  <input
                    type="number"
                    required
                    placeholder="15000000"
                    value={newDevice.purchase_price}
                    onChange={(e) => setNewDevice({ ...newDevice, purchase_price: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Sewa / Hari (Rp)</label>
                  <input
                    type="number"
                    required
                    placeholder="250000"
                    value={newDevice.daily_rent_price}
                    onChange={(e) => setNewDevice({ ...newDevice, daily_rent_price: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-indigo-600"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddDeviceModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Unit ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
