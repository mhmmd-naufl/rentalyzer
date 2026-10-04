import { useState, useEffect } from 'react';
import { fetchAdminDevices, restoreDevice } from '../services/api';

const ArchivedDevices = () => {
    const [archivedDevices, setArchivedDevices] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fungsi untuk menarik dan menyaring data khusus arsip
    const loadArchivedData = async () => {
        setLoading(true);
        try {
            const allDevices = await fetchAdminDevices();
            const filtered = allDevices.filter(device => device.status === 'Archived');
            setArchivedDevices(filtered);
        } catch (error) {
            alert("Gagal memuat data arsip: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let isActive = true;

        const fetchArchivedData = async () => {
            setLoading(true);

            try {
                const allDevices = await fetchAdminDevices();
                const filtered = allDevices.filter(device => device.status === 'Archived');

                if (isActive) {
                    setArchivedDevices(filtered);
                }
            } catch (error) {
                if (isActive) {
                    alert("Gagal memuat data arsip: " + error.message);
                }
            } finally {
                if (isActive) {
                    setLoading(false);
                }
            }
        };

        fetchArchivedData();

        return () => {
            isActive = false;
        };
    }, []);

    // Fungsi eksekusi tombol pulihkan
    const handleRestore = async (id) => {
        if (!window.confirm("Yakin ingin memulihkan HP ini agar tampil lagi di katalog?")) return;

        try {
            await restoreDevice(id);
            alert("Unit HP berhasil dipulihkan!");
            loadArchivedData(); // Otomatis refresh tabel setelah berhasil
        } catch (error) {
            alert("Gagal memulihkan HP: " + error.message);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">📁 Master Data Arsip HP</h2>
            <p className="text-sm text-gray-500 mb-4">
                Daftar unit HP yang sebelumnya dihapus/diarsipkan. Memulihkan data di sini akan membuatnya kembali berstatus <strong>Available</strong> di katalog publik.
            </p>

            {loading ? (
                <p className="text-gray-500">Memuat data arsip...</p>
            ) : archivedDevices.length === 0 ? (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded text-center text-gray-500">
                    Tidak ada data HP yang diarsipkan saat ini.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-100 border-b">
                                <th className="p-3 text-sm font-semibold text-gray-600">ID</th>
                                <th className="p-3 text-sm font-semibold text-gray-600">Tipe HP</th>
                                <th className="p-3 text-sm font-semibold text-gray-600">IMEI/Serial</th>
                                <th className="p-3 text-sm font-semibold text-gray-600">Status</th>
                                <th className="p-3 text-sm font-semibold text-gray-600 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {archivedDevices.map((device) => (
                                <tr key={device.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3 text-sm text-gray-700">{device.id}</td>
                                    <td className="p-3 text-sm font-medium text-gray-900">
                                        {device.brand} {device.model}
                                    </td>
                                    <td className="p-3 text-sm text-gray-500">{device.imei_serial}</td>
                                    <td className="p-3 text-sm">
                                        <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                                            {device.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-sm text-right">
                                        <button
                                            onClick={() => handleRestore(device.id)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm transition"
                                        >
                                            Up / Pulihkan
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ArchivedDevices;