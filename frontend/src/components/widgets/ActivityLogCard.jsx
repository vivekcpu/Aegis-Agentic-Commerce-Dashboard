/**
 * ActivityLogCard
 * Plain-language version of the "Immutable Audit Ledger".
 * Clickable card that opens a full modal view to inspect all audit events.
 * Listens to global aegis-data-update events for real-time synchronization.
 */
import React, { useState, useEffect } from "react";
import { Maximize2, X, History } from "lucide-react";
import { ClipPanel } from "../ui/StatusPill";

export default function ActivityLogCard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpenModal, setIsOpenModal] = useState(false);

  // Lock background scroll when modal view is open
  useEffect(() => {
    if (isOpenModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpenModal]);

  useEffect(() => {
    const fetchLogs = () => {
      fetch("http://localhost:4000/api/audit-log")
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch audit log");
          return res.json();
        })
        .then((data) => {
          setLogs(data.entries || []);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error loading audit log:", err);
          setLoading(false);
        });
    };

    fetchLogs();

    // Listen to global dashboard sync events
    window.addEventListener("aegis-data-update", fetchLogs);
    const interval = setInterval(fetchLogs, 5000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("aegis-data-update", fetchLogs);
    };
  }, []);

  return (
    <>
      {/* Main Dashboard Widget Card (Clickable) */}
      <ClipPanel 
        onClick={() => setIsOpenModal(true)}
        className="p-4 sm:p-5 stagger-item cursor-pointer hover:border-amber/60 transition-all group" 
        style={{ animationDelay: "0.2s" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="font-display text-xs tracking-widest text-amber group-hover:text-amber/90">
            WHAT JUST HAPPENED
          </div>
          <Maximize2 size={12} className="text-stone-500 group-hover:text-amber transition-colors" />
        </div>

        {loading ? (
          <div className="text-[11px] text-stone-500">Loading audit trail...</div>
        ) : logs.length === 0 ? (
          <div className="text-[11px] text-stone-500">No recent audit events recorded.</div>
        ) : (
          <ul className="space-y-2.5 text-[11px] sm:text-xs leading-relaxed no-scrollbar overflow-hidden">
            {logs.slice(0, 4).map((entry, i) => {
              const timeStr = new Date(entry.created_at).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
              const isAlert = entry.event_type && entry.event_type.includes("REJECTED");
              return (
                <li key={i} className="flex gap-2 min-w-0">
                  <span className="text-stone-600 shrink-0">{timeStr}</span>
                  <span className={`truncate ${isAlert ? "text-alert font-bold" : "text-stone-300"}`}>
                    {entry.message}
                  </span>
                </li>
              );
            })}
            {logs.length > 4 && (
              <div className="text-[10px] font-mono text-stone-500 hover:text-amber pt-1 text-center transition-colors">
                + Click to expand & view all {logs.length} events
              </div>
            )}
          </ul>
        )}
      </ClipPanel>

      {/* Expanded Modal View (Like Customer Orders / Safety Checks) */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 bg-obsidian/90 scan-bg flex items-center justify-center p-4">
          <ClipPanel className="w-full max-w-3xl max-h-[85vh] flex flex-col p-6 bg-panel border-panel-border">
            <div className="flex items-center justify-between pb-4 border-b border-panel-border">
              <div className="flex items-center gap-2">
                <History className="text-amber" size={20} />
                <h2 className="font-display text-lg font-bold text-amber tracking-wide">
                  Immutable Audit Ledger — Full Event Trail
                </h2>
              </div>
              <button 
                onClick={() => setIsOpenModal(false)} 
                className="text-stone-400 hover:text-amber transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto my-4 pr-2 space-y-3 font-mono no-scrollbar">
              {logs.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="text-sm font-display text-stone-400">No audit events recorded yet</div>
                  <div className="text-[11px] text-stone-600 font-mono mt-1">
                    System transactions and guardrail verifications will appear here in real time.
                  </div>
                </div>
              ) : (
                logs.map((entry, i) => {
                  const timeStr = new Date(entry.created_at).toLocaleString("en-IN", {
                    dateStyle: "short",
                    timeStyle: "medium",
                  });
                  const isAlert = entry.event_type && entry.event_type.includes("REJECTED");
                  return (
                    <div key={i} className="p-3 border border-panel-border rounded bg-obsidian/40 flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px] text-stone-500">
                        <span>{timeStr}</span>
                        <span className="px-2 py-0.5 uppercase tracking-wider text-[9px] border border-panel-border rounded bg-obsidian text-amber">
                          {entry.event_type || "EVENT"}
                        </span>
                      </div>
                      <div className={`text-xs sm:text-sm whitespace-normal break-words leading-relaxed ${isAlert ? "text-alert font-bold" : "text-stone-200"}`}>
                        {entry.message}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-4 border-t border-panel-border flex justify-end">
              <button
                onClick={() => setIsOpenModal(false)}
                className="px-4 py-2 text-xs font-display tracking-wider clip border border-amber bg-amber text-obsidian font-bold hover:bg-amber/90 transition-colors"
              >
                Close View
              </button>
            </div>
          </ClipPanel>
        </div>
      )}
    </>
  );
}