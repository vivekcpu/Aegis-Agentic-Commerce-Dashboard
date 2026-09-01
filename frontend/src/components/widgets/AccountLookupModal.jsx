import React, { useState, useEffect } from "react";
import { X, Database, RefreshCw } from "lucide-react";
import { ClipPanel } from "../ui/StatusPill";

const TABLES = ["orders", "products", "merchants", "ledger_entries", "audit_log"];

export default function AccountLookupModal({ onClose }) {
  const [selectedTable, setSelectedTable] = useState("orders");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);

  // Lock background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const fetchTableData = async (table) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:4000/api/db/inspect/${table}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to fetch table data");
      setData(json.rows || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = () => {
    setIsSpinning(true);
    fetchTableData(selectedTable).finally(() => {
      setTimeout(() => setIsSpinning(false), 600);
    });
  };

  useEffect(() => {
    fetchTableData(selectedTable);
    const interval = setInterval(() => fetchTableData(selectedTable), 5000);
    return () => clearInterval(interval);
  }, [selectedTable]);

  return (
    <div className="fixed inset-0 z-50 bg-obsidian/90 scan-bg flex items-center justify-center p-4">
      <ClipPanel className="w-full max-w-5xl max-h-[85vh] flex flex-col p-6 bg-panel border-panel-border">
        <div className="flex items-center justify-between pb-4 border-b border-panel-border">
          <div className="flex items-center gap-2">
            <Database className="text-amber" size={20} />
            <h2 className="font-display text-lg font-bold text-amber tracking-wide">Account Postgres DB Lookup</h2>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-amber transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Table Selector Header Wrapper */}
        <div className="flex items-center justify-between gap-4 my-4">
          <div className="flex gap-2 overflow-x-auto pb-1 items-center no-scrollbar flex-1">
            {TABLES.map((tbl) => (
              <button
                key={tbl}
                onClick={() => setSelectedTable(tbl)}
                className={`px-3 py-1.5 text-xs font-display uppercase tracking-wider clip border transition-colors shrink-0 ${
                  selectedTable === tbl ? "bg-amber text-obsidian border-amber font-bold" : "border-panel-border text-stone-400 hover:text-amber"
                }`}
              >
                {tbl}
              </button>
            ))}
          </div>
          <button 
            onClick={handleManualRefresh} 
            disabled={loading}
            className="text-stone-400 hover:text-amber p-1.5 px-3 clip border border-panel-border hover:border-amber bg-obsidian/40 flex items-center gap-1.5 text-xs font-display tracking-wider transition-all active:scale-95 disabled:opacity-50 shrink-0" 
            title="Refresh Table Data"
          >
            <RefreshCw size={14} className={`text-amber transition-transform duration-500 ${isSpinning || loading ? "animate-spin" : "hover:rotate-180"}`} /> 
            <span>Refresh</span>
          </button>
        </div>

        {/* Table View */}
        <div className="flex-1 overflow-auto border border-panel-border rounded-sm bg-obsidian/50 no-scrollbar">
          {error ? (
            <div className="p-6 text-alert text-xs font-mono">Error loading table data: {error}</div>
          ) : loading && data.length === 0 ? (
            <div className="p-6 text-stone-500 text-xs font-mono animate-pulse">Querying database rows...</div>
          ) : data.length === 0 ? (
            <div className="p-6 text-stone-500 text-xs font-mono">No records found in table `{selectedTable}`.</div>
          ) : (
            <table className="w-full text-left border-collapse text-[11px] font-mono">
              <thead>
                <tr className="border-b border-panel-border bg-panel text-amber">
                  {Object.keys(data[0]).map((col) => (
                    <th key={col} className="p-2 font-display uppercase tracking-wider whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx} className="border-b border-panel-border/50 hover:bg-amber-soft/10 transition-colors">
                    {Object.values(row).map((val, i) => (
                      <td key={i} className="p-2 text-stone-300 truncate max-w-xs">
                        {typeof val === "object" ? JSON.stringify(val) : String(val ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </ClipPanel>
    </div>
  );
}