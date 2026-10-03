import React, { useState } from 'react';
import { X, Send, ShieldCheck, Calendar, User, Phone, IdCard, AlertCircle } from 'lucide-react';
import { ADMIN_WA_NUMBER, formatRupiah } from '../services/dataService';

export default function BookingModal({ device, transactions = [], onClose, onBookingSuccess }) {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    name: '',
    nik: '',
    phone: '',
    startDate: today,
    endDate: tomorrow,
    guaranteeType: 'KTP Asli',
  });

  const [error, setError] = useState('');

  // Find active booking dates for this device to prevent conflicts
  const activeBookings = transactions.filter(
    (t) => t.device_id === device.id && (t.status === 'Active' || t.status === 'Pending')
  );

  // Check if chosen range conflicts with existing bookings
  const checkDateConflict = (start, end) => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();

    for (const b of activeBookings) {
      const bStart = new Date(b.start_date).getTime();
      const bEnd = new Date(b.end_date_expected).getTime();
      // Overlap condition
      if (s <= bEnd && e >= bStart) {
        return `Tanggal bentrok: HP ini telah memiliki jadwal sewa aktif antara ${b.start_date} hingga ${b.end_date_expected}. Silakan pilih tanggal lain.`;
      }
    }
    return null;
  };

  // Calculate rental duration in days
  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 1;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const durationDays = calculateDays();
  const totalAmount = durationDays * device.daily_rent_price;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.nik.trim() || !formData.phone.trim()) {
      setError('Mohon lengkapi seluruh formulir data diri.');
      return;
    }

    if (formData.nik.length < 16) {
      setError('NIK KTP harus berjumlah minimal 16 digit.');
      return;
    }

    if (formData.startDate < today) {
      setError('Tanggal mulai sewa tidak boleh di masa lalu.');
      return;
    }

    if (formData.endDate <= formData.startDate) {
      setError('Tanggal selesai sewa harus lebih lama dari tanggal mulai.');
      return;
    }

    const conflictError = checkDateConflict(formData.startDate, formData.endDate);
    if (conflictError) {
      setError(conflictError);
      return;
    }

    // Build payload matching FastAPI /api/transactions schema
    const bookingPayload = {
      device_id: device.id,
      customer_name: formData.name,
      customer_nik: formData.nik,
      customer_phone: formData.phone,
      guarantee_type: formData.guaranteeType,
      start_date: formData.startDate,
      end_date_expected: formData.endDate,
      snapshot_rent_price: device.daily_rent_price,
      duration_days: durationDays,
      total_amount: totalAmount,
    };

    onBookingSuccess(bookingPayload);

    // Formatted WhatsApp Handoff Message (Checkout)
    const message = `Halo Admin Rentalyzer! 👋
Saya ingin mengonfirmasi booking sewa smartphone:

📱 *Unit:* ${device.brand} ${device.model}
🏷️ *Harga Sewa:* ${formatRupiah(device.daily_rent_price)} / hari
📅 *Periode:* ${formData.startDate} s/d ${formData.endDate} (${durationDays} Hari)
💰 *Total Biaya:* ${formatRupiah(totalAmount)}

👤 *Data Penyewa:*
• Nama Lengkap: ${formData.name}
• NIK KTP: ${formData.nik}
• WhatsApp: ${formData.phone}
• Jaminan: ${formData.guaranteeType}

Mohon instruksi pembayaran DP dan verifikasi jadwal pengambilan unit. Terima kasih!`;

    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${ADMIN_WA_NUMBER}?text=${encodedMessage}`;

    window.open(waUrl, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="inline-block bg-indigo-500/20 text-indigo-300 text-xs font-semibold px-2.5 py-1 rounded-md mb-2 border border-indigo-400/20">
            Smart Booking Form
          </div>
          <h3 className="text-xl font-bold">{device.brand} {device.model}</h3>
          <p className="text-slate-300 text-xs mt-1">
            {formatRupiah(device.daily_rent_price)} / hari &bull; SN/IMEI: {device.imei_serial}
          </p>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Nama Lengkap */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Nama Lengkap (Sesuai KTP)
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                placeholder="Contoh: Budi Santoso"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-indigo-600 transition-all"
              />
            </div>
          </div>

          {/* NIK & WA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                NIK KTP (16 Digit)
              </label>
              <div className="relative">
                <IdCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  maxLength={16}
                  placeholder="3201xxxxxxxxxxxx"
                  value={formData.nik}
                  onChange={(e) => setFormData({ ...formData, nik: e.target.value.replace(/\D/g, '') })}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-indigo-600 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                No. WhatsApp
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  required
                  placeholder="08123456789"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-indigo-600 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Smart Date Picker with Past Date & Conflict Blocking */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Mulai Sewa
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="date"
                  required
                  min={today}
                  value={formData.startDate}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setFormData({
                      ...formData,
                      startDate: newStart,
                      endDate: formData.endDate <= newStart ? newStart : formData.endDate,
                    });
                  }}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-indigo-600 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Selesai Sewa
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="date"
                  required
                  min={formData.startDate || today}
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-indigo-600 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Tipe Jaminan: KTP / SIM / Deposit */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Tipe Jaminan
            </label>
            <div className="relative">
              <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <select
                value={formData.guaranteeType}
                onChange={(e) => setFormData({ ...formData, guaranteeType: e.target.value })}
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-indigo-600 transition-all cursor-pointer"
              >
                <option value="KTP Asli">KTP Asli (Wajib ditinggal selama sewa)</option>
                <option value="SIM A / C">SIM A / C Asli</option>
                <option value="Deposit Tunai">Deposit Tunai (Jaminan Saldo)</option>
              </select>
            </div>
          </div>

          {/* Auto-Calculate Summary */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex justify-between items-center">
            <div>
              <p className="text-xs text-indigo-700 font-medium">Estimasi Biaya ({durationDays} Hari)</p>
              <p className="text-xl font-bold text-indigo-950">{formatRupiah(totalAmount)}</p>
            </div>
            <div className="text-right text-xs text-slate-500">
              {formatRupiah(device.daily_rent_price)} / hari
            </div>
          </div>

          {/* WhatsApp Handoff CTA */}
          <button
            type="submit"
            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Kirim & Konfirmasi ke WhatsApp Admin</span>
          </button>
        </form>
      </div>
    </div>
  );
}
