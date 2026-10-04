import { useState } from "react";
import {
  X,
  Send,
  ShieldCheck,
  Calendar,
  User,
  Phone,
  IdCard,
  AlertCircle,
} from "lucide-react";
import { ADMIN_WA_NUMBER, formatRupiah } from "../services/dataService";

export default function BookingModal({
  device,
  transactions = [],
  onClose,
  onBookingSuccess,
}) {
  const pad = (n) => String(n).padStart(2, "0");
  const toLocalInput = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  // Default: waktu sekarang dibulatkan ke atas per 5 menit
  const defaultStart = () => {
    const d = new Date();
    d.setSeconds(0, 0);
    d.setMinutes(Math.ceil((d.getMinutes() + 1) / 5) * 5);
    return toLocalInput(d);
  };
  // Harga per durasi — durasi yang harganya belum diisi admin tidak bisa dipilih
  const getDurationPrice = (hours) => {
    if (hours === 3) return device.price_3h || 0;
    if (hours === 6) return device.price_6h || 0;
    if (hours === 9) return device.price_9h || 0;
    if (hours === 12) return device.price_12h || 0;
    return device.price_24h || device.daily_rent_price || 0;
  };
  const [selectedDuration, setSelectedDuration] = useState(() => {
    const available = [3, 6, 9, 12, 24].filter(
      (hours) => getDurationPrice(hours) > 0,
    );
    return available.includes(24) ? 24 : available[0] ?? 0;
  });
  const getCurrentPrice = () =>
    selectedDuration ? getDurationPrice(selectedDuration) : 0;

  const [formData, setFormData] = useState({
    name: "",
    nik: "",
    phone: "",
    startAt: defaultStart(),
    guaranteeType: "KTP Asli",
  });

  const [error, setError] = useState("");

  // Find active booking dates for this device to prevent conflicts
  const activeBookings = transactions.filter(
    (t) =>
      t.device_id === device.id &&
      (t.status === "Active" || t.status === "Pending"),
  );

  // Waktu selesai dihitung otomatis: jam mulai + durasi yang dipilih
  const getEndAt = () => {
    const d = new Date(formData.startAt);
    d.setHours(d.getHours() + selectedDuration);
    return d;
  };

  const fmtDateTime = (value) =>
    new Date(value).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // Check if chosen range conflicts with existing bookings
  const checkDateConflict = (start, end) => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();

    for (const b of activeBookings) {
      const bStart = new Date(b.start_date).getTime();
      const bEnd = new Date(b.end_date_expected).getTime();
      // Overlap condition
      if (s <= bEnd && e >= bStart) {
        return `Waktu bentrok: unit ini sudah memiliki jadwal sewa aktif pada ${fmtDateTime(b.start_date)} - ${fmtDateTime(b.end_date_expected)}. Silakan pilih waktu lain.`;
      }
    }
    return null;
  };

  const selectedPackagePrice = getCurrentPrice();
  const totalAmount = selectedPackagePrice;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.nik.trim() ||
      !formData.phone.trim()
    ) {
      setError("Mohon lengkapi seluruh formulir data diri.");
      return;
    }

    if (formData.nik.length < 16) {
      setError("NIK KTP harus berjumlah minimal 16 digit.");
      return;
    }

    const startTs = new Date(formData.startAt).getTime();
    if (Math.floor(startTs / 60000) < Math.floor(Date.now() / 60000)) {
      setError("Waktu mulai sewa tidak boleh di masa lalu.");
      return;
    }

    const conflictError = checkDateConflict(formData.startAt, getEndAt());
    if (conflictError) {
      setError(conflictError);
      return;
    }

    if (!(selectedPackagePrice > 0)) {
      setError(
        "Durasi yang dipilih belum memiliki harga. Silakan pilih durasi lain.",
      );
      return;
    }

    const normalizedPhone = formData.phone.replace(/[\s\-()]/g, "").trim();
    const bookingPayload = {
      device_id: device.id,
      customer_name: formData.name.trim(),
      customer_nik: formData.nik.trim(),
      customer_phone: normalizedPhone,
      guarantee_type: formData.guaranteeType,
      start_date: formData.startAt,
      duration_hours: selectedDuration,
      snapshot_rent_price: selectedPackagePrice,
      total_amount: totalAmount,
    };

    const saved = await onBookingSuccess(bookingPayload);
    if (!saved) return;

    if (!ADMIN_WA_NUMBER) {
      setError(
        "Nomor WhatsApp admin belum diatur. Masukkan VITE_ADMIN_WA_NUMBER di environment frontend.",
      );
      return;
    }

    const message = `Halo Admin Notta Rent!
Saya ingin mengonfirmasi booking sewa smartphone:

*Unit:* ${device.brand} ${device.model}
*Durasi:* ${selectedDuration} Jam
*Harga Sewa:* ${formatRupiah(selectedPackagePrice)} / paket
*Mulai:* ${fmtDateTime(formData.startAt)}
*Selesai (otomatis):* ${fmtDateTime(getEndAt())}
*Total Biaya:* ${formatRupiah(totalAmount)}

*Data Penyewa:*
• Nama Lengkap: ${formData.name}
• NIK KTP: ${formData.nik}
• WhatsApp: ${formData.phone}
• Jaminan: ${formData.guaranteeType}

Mohon instruksi pembayaran DP dan verifikasi jadwal pengambilan unit. Terima kasih!`;

    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${ADMIN_WA_NUMBER}?text=${encodedMessage}`;

    window.open(waUrl, "_blank");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="inline-block bg-indigo-500/20 text-indigo-300 text-xs font-semibold px-2.5 py-1 rounded-md mb-2 border border-indigo-400/20">
            Smart Booking Form
          </div>
          <h3 className="text-xl font-bold">
            {device.brand} {device.model}
          </h3>
          {device.imei_serial && (
            <p className="text-slate-300 text-xs mt-1">
              SN/IMEI: {device.imei_serial}
            </p>
          )}
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
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
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
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      nik: e.target.value.replace(/\D/g, ""),
                    })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-indigo-600 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Satu input: tanggal & jam mulai — jam selesai dihitung otomatis dari durasi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Mulai Sewa (Tanggal & Jam)
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="datetime-local"
                required
                min={toLocalInput(new Date())}
                value={formData.startAt}
                onChange={(e) =>
                  setFormData({ ...formData, startAt: e.target.value })
                }
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-indigo-600 transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Waktu selesai otomatis dihitung dari durasi yang dipilih di bawah.
            </p>
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
                onChange={(e) =>
                  setFormData({ ...formData, guaranteeType: e.target.value })
                }
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-indigo-600 transition-all cursor-pointer"
              >
                <option value="KTP Asli">
                  KTP Asli (Wajib ditinggal selama sewa)
                </option>
                <option value="SIM A / C">SIM A / C Asli</option>
                <option value="Deposit Tunai">
                  Deposit Tunai (Jaminan Saldo)
                </option>
              </select>
            </div>
          </div>

          {/* Rental Duration Options */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
              Pilih Durasi Sewa
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[3, 6, 9, 12, 24].map((hours) => {
                const price = getDurationPrice(hours);
                const isAvailable = price > 0;
                const isSelected = isAvailable && selectedDuration === hours;
                return (
                  <button
                    key={hours}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => setSelectedDuration(hours)}
                    className={`rounded-xl border px-2.5 py-2 text-left transition-all ${
                      !isAvailable
                        ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                        : isSelected
                          ? "border-indigo-600 bg-indigo-600 text-white shadow-xs cursor-pointer"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer"
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wide">
                      {hours} Jam
                    </div>
                    <div className="text-[11px] font-semibold mt-0.5">
                      {isAvailable ? formatRupiah(price) : "Tidak tersedia"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Auto-Calculate Summary */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex justify-between items-center gap-3">
            <div>
              <p className="text-xs text-indigo-700 font-medium">
                Estimasi Biaya ({selectedDuration} Jam)
              </p>
              <p className="text-xl font-bold text-indigo-950">
                {formatRupiah(getCurrentPrice())}
              </p>
            </div>
            <div className="text-right text-xs text-slate-500 leading-relaxed">
              <p>
                Mulai:{" "}
                <span className="font-semibold text-slate-700">
                  {fmtDateTime(formData.startAt)}
                </span>
              </p>
              <p>
                Selesai:{" "}
                <span className="font-semibold text-slate-700">
                  {fmtDateTime(getEndAt())}
                </span>
              </p>
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
