import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, Smartphone, AlertTriangle, Clock, CheckCircle2, RefreshCw } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { formatRupiah } from "../services/dataService";
import { fetchAnalyticsSummary } from "../services/api";

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];

const formatMonth = (key) => {
  const [year, month] = key.split("-");
  const d = new Date(year, month - 1);
  return d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-xl shadow-xl">
        <p className="font-semibold mb-1">{label}</p>
        <p>{formatRupiah(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    fetchAnalyticsSummary()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
        Memuat data analytics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center text-rose-500 text-sm">{error}</div>
    );
  }

  if (!data) return null;

  const { overview, revenue_chart, device_stats, top_devices } = data;

  return (
    <div className="p-5 space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Revenue", value: formatRupiah(overview.total_revenue), icon: DollarSign, color: "emerald" },
          { label: "Total Transaksi", value: overview.total_transactions, icon: CheckCircle2, color: "indigo" },
          { label: "Sewa Aktif", value: overview.active_rentals, icon: Smartphone, color: "blue" },
          { label: "Pending", value: overview.pending_bookings, icon: Clock, color: "amber" },
          { label: "Overdue", value: overview.overdue_count, icon: AlertTriangle, color: "rose" },
          { label: "Total Unit", value: overview.total_devices, icon: Smartphone, color: "slate" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-center">
            <div className={`inline-flex items-center justify-center w-8 h-8 rounded-xl bg-${color}-100 text-${color}-600 mb-2`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-lg font-bold text-slate-900">{value}</p>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
          Revenue per Bulan
        </h4>
        {revenue_chart.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-8">Belum ada data revenue.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenue_chart.map(d => ({ ...d, month: formatMonth(d.month) }))}
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9" }} />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]} fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top Devices */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
          Top 5 Unit — Revenue Tertinggi
        </h4>
        {top_devices.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-4">Belum ada data.</p>
        ) : (
          <div className="space-y-2">
            {top_devices.map((d, i) => (
              <div key={d.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 w-4 shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs font-semibold text-slate-800 truncate">{d.label}</p>
                    <p className="text-xs font-bold text-indigo-700 ml-2 shrink-0">{formatRupiah(d.total_revenue)}</p>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${top_devices[0].total_revenue > 0 ? (d.total_revenue / top_devices[0].total_revenue) * 100 : 0}%`,
                        backgroundColor: COLORS[i],
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {d.total_transactions}x sewa &middot; ROI {d.roi_percent}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Device Stats Table */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Statistik Per Unit
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-600">
            <thead className="bg-slate-100/75 text-[10px] uppercase tracking-wider text-slate-500 border-y border-slate-200">
              <tr>
                <th className="py-2 px-4">Unit</th>
                <th className="py-2 px-4 text-right">Modal</th>
                <th className="py-2 px-4 text-right">Revenue</th>
                <th className="py-2 px-4 text-right">Hari Disewa</th>
                <th className="py-2 px-4 text-right">Sewa</th>
                <th className="py-2 px-4 text-right">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {device_stats.map((d) => (
                <tr key={d.id} className="hover:bg-white transition-colors">
                  <td className="py-2.5 px-4">
                    <p className="font-semibold text-slate-800">{d.brand} {d.model}</p>
                    <p className="text-[10px] text-slate-400">{d.color}</p>
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-600">{formatRupiah(d.purchase_price)}</td>
                  <td className="py-2.5 px-4 text-right font-semibold text-emerald-700">{formatRupiah(d.total_revenue)}</td>
                  <td className="py-2.5 px-4 text-right">{d.days_rented}h</td>
                  <td className="py-2.5 px-4 text-right">{d.total_transactions}x</td>
                  <td className="py-2.5 px-4 text-right">
                    <span className={`font-bold ${d.roi_percent >= 100 ? "text-amber-600" : "text-slate-700"}`}>
                      {d.roi_percent}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-right">
        <button onClick={load} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer">
          <RefreshCw className="w-3 h-3" />
          Refresh data
        </button>
      </div>
    </div>
  );
}
