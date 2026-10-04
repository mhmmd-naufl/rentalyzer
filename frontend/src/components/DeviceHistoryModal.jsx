import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { formatRupiah } from "../services/dataService";
import { fetchDeviceHistory, resolveImageUrl } from "../services/api";

const STATUS_STYLE = {
  Active: "bg-blue-100 text-blue-800",
  Pending: "bg-amber-100 text-amber-800",
  Completed: "bg-emerald-100 text-emerald-800",
  Overdue: "bg-rose-100 text-rose-800",
  Canceled: "bg-slate-100 text-slate-600",
};

export default function DeviceHistoryModal({ device, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDeviceHistory(device.id)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [device.id]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-3xl px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {device.image && (
              <img
                src={resolveImageUrl(device.image)}
                alt={device.model}
                className="w-10 h-10 rounded-xl object-cover border border-slate-200"
              />
            )}
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {device.brand} {device.model}
              </h3>
              <p className="text-xs text-slate-400">{device.color} &middot; {device.imei_serial || "—"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading && (
            <p className="text-center text-slate-400 text-sm py-8">Memuat riwayat...</p>
          )}
          {error && (
            <p className="text-center text-rose-500 text-sm py-8">{error}</p>
          )}

          {data && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">Total Sewa</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{data.summary.total_transactions}x</p>
                </div>
                <div className="bg-emerald-50 rounded-2xl p-3 text-center border border-emerald-100">
                  <p className="text-[10px] text-emerald-600 uppercase font-semibold tracking-wide">Revenue</p>
                  <p className="text-sm font-bold text-emerald-700 mt-1">{formatRupiah(data.summary.total_revenue)}</p>
                </div>
                <div className="bg-indigo-50 rounded-2xl p-3 text-center border border-indigo-100">
                  <p className="text-[10px] text-indigo-600 uppercase font-semibold tracking-wide">Hari Disewa</p>
                  <p className="text-xl font-bold text-indigo-700 mt-1">{data.summary.total_days_rented}h</p>
                </div>
                <div className={`rounded-2xl p-3 text-center border ${data.summary.roi_percent >= 100 ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-100"}`}>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">ROI</p>
                  <p className={`text-xl font-bold mt-1 ${data.summary.roi_percent >= 100 ? "text-amber-600" : "text-slate-700"}`}>
                    {data.summary.roi_percent}%
                  </p>
                </div>
              </div>

              {/* ROI Progress Bar */}
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Modal: {formatRupiah(data.device.purchase_price)}</span>
                  <span>Revenue: {formatRupiah(data.summary.total_revenue)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${data.summary.roi_percent >= 100 ? "bg-amber-400" : "bg-indigo-500"}`}
                    style={{ width: `${Math.min(data.summary.roi_percent, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 text-right">
                  {data.summary.roi_percent >= 100 ? "BEP sudah tercapai!" : `${data.summary.roi_percent}% menuju BEP`}
                </p>
              </div>

              {/* Transaction History */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Riwayat Transaksi ({data.transactions.length})
                </h4>
                {data.transactions.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-6">Belum ada transaksi.</p>
                ) : (
                  <div className="space-y-2">
                    {data.transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-500">#{tx.id}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_STYLE[tx.status] || "bg-slate-100 text-slate-600"}`}>
                              {tx.status}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{tx.customer_name}</p>
                          <p className="text-[11px] text-slate-400">
                            {new Date(tx.start_date).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            {" "}&rarr;{" "}
                            {new Date(tx.end_date_expected).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            {" · "}{tx.duration_hours ?? tx.duration_days} jam
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-sm font-bold text-slate-900">{formatRupiah(tx.total_amount)}</p>
                          {tx.penalty_fee > 0 && (
                            <p className="text-[11px] text-rose-500 font-medium">+{formatRupiah(tx.penalty_fee)} denda</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
