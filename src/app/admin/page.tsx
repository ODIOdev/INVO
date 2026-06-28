import AdminDataBinsPanel from "@/components/admin/AdminDataBinsPanel";
import {
  getBinSummaries,
  getDatabaseStats,
  getRecordsByBin,
  getStorageBackend,
} from "@/lib/storage/internalDatabase";

export const metadata = {
  title: "Admin — Data Bins | Over Drive OS",
  description: "Internal data storage and info bins dashboard",
};

export default async function AdminPage() {
  const [bins, stats, initialRecords] = await Promise.all([
    getBinSummaries(),
    getDatabaseStats(),
    getRecordsByBin("clients"),
  ]);

  return (
    <AdminDataBinsPanel
      initialBins={bins}
      initialStats={stats}
      initialRecords={initialRecords}
      initialBin="clients"
      storageBackend={getStorageBackend()}
    />
  );
}
