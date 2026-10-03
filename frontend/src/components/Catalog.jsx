import React, { useState } from 'react';
import { Search, Sparkles, CheckCircle2, Clock, Ban, Wrench, Shield, Check, Calendar } from 'lucide-react';
import { formatRupiah } from '../services/dataService';
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=600&auto=format&fit=crop&q=80';

export default function Catalog({ devices, transactions = [], onSelectDevice }) {
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  // Exclude Archived devices from public catalog
  const publicDevices = devices.filter((d) => d.status !== 'Archived');

  const brands = ['All', ...new Set(publicDevices.map((d) => d.brand))];

  const filteredDevices = publicDevices.filter((device) => {
    const matchesBrand = selectedBrand === 'All' || device.brand === selectedBrand;
    const matchesSearch =
      device.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAvailability = onlyAvailable ? device.status === 'Available' : true;
    return matchesBrand && matchesSearch && matchesAvailability;
  });

  // Find latest active booking end date for a device
  const getBookedUntilDate = (deviceId) => {
    const activeTx = transactions.find(
      (t) => t.device_id === deviceId && (t.status === 'Active' || t.status === 'Pending')
    );
    if (!activeTx || !activeTx.end_date_expected) return null;

    try {
      const d = new Date(activeTx.end_date_expected);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return activeTx.end_date_expected;
    }
  };

  const getStatusBadge = (status, bookedUntil) => {
    switch (status) {
      case 'Available':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Tersedia
          </span>
        );
      case 'Booked':
      case 'Rented':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-100 border border-slate-700 shadow-xs">
            <Clock className="w-3 h-3 text-amber-400" />
            {bookedUntil ? `Booked until ${bookedUntil}` : 'Booked'}
          </span>
        );
      case 'Maintenance':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <Wrench className="w-3 h-3 text-slate-500" />
            Maintenance
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 sm:p-10 text-white mb-10 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium border border-indigo-400/20 mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Katalog Smartphone Premium</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Sewa iPhone & Android Flagship Harian Tanpa Ribet.
          </h1>
          <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
            Unit original terawat untuk konten kreator, acara, liburan, dan pengujian aplikasi. Proses verifikasi instan via WhatsApp.
          </p>

          <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Jaminan Legal & Transparan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Unit Siap Pakai & Bersih Akun</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8">
        {/* Brand Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {brands.map((brand) => (
            <button
              key={brand}
              onClick={() => setSelectedBrand(brand)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 cursor-pointer ${
                selectedBrand === brand
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {brand === 'All' ? 'Semua Brand' : brand}
            </button>
          ))}
        </div>

        {/* Search & Only Available Toggle */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari tipe HP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-indigo-600 shadow-2xs"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl cursor-pointer shadow-2xs hover:bg-slate-50 transition-all select-none shrink-0">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span className="font-medium">Hanya yang Tersedia</span>
          </label>
        </div>
      </div>

      {/* Grid of Devices */}
      {filteredDevices.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-2xs">
          <p className="text-slate-500 text-sm">Tidak ada smartphone yang cocok dengan kriteria pencarian Anda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDevices.map((device) => {
            const isAvailable = device.status === 'Available';
            const isBookedOrRented = device.status === 'Booked' || device.status === 'Rented';
            const bookedUntil = getBookedUntilDate(device.id);

            return (
              <div
                key={device.id}
                className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col group overflow-hidden ${
                  isBookedOrRented
                    ? 'border-slate-300 shadow-2xs bg-slate-50/50'
                    : 'border-slate-200 hover:shadow-md shadow-2xs'
                }`}
              >
                {/* Image & Status Badge (Greyscale Visual Cue for Booked/Rented) */}
                <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
                  <img
                    src={device.image || DEFAULT_IMAGE}
                    alt={device.model}
                    className={`w-full h-full object-cover transition-transform duration-300 ${
                      isBookedOrRented ? 'grayscale opacity-75 contrast-95' : 'group-hover:scale-105'
                    }`}
/>
                  <div className="absolute top-3 right-3">
                    {getStatusBadge(device.status, bookedUntil)}
                  </div>
                  <div className="absolute bottom-3 left-3 bg-slate-900/75 backdrop-blur-xs text-white text-[11px] font-medium px-2.5 py-1 rounded-md">
                    {device.brand} &bull; {device.color}
                  </div>
                </div>

                {/* Device Details */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className={`font-bold text-base leading-snug ${isBookedOrRented ? 'text-slate-600' : 'text-slate-900'}`}>
                      {device.model}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      SN/IMEI: {device.imei_serial}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 uppercase font-semibold">Harga Sewa</span>
                      <p className={`text-lg font-bold ${isBookedOrRented ? 'text-slate-600' : 'text-indigo-700'}`}>
                        {formatRupiah(device.daily_rent_price)}
                        <span className="text-xs text-slate-500 font-normal"> /hari</span>
                      </p>
                    </div>

                    <button
                      onClick={() => onSelectDevice(device)}
                      disabled={!isAvailable}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isAvailable
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300 font-medium'
                      }`}
                    >
                      {isAvailable ? 'Sewa Sekarang' : (bookedUntil ? `Booked s/d ${bookedUntil}` : 'Tidak Tersedia')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
