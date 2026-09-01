/**
 * SafetyChecksCard
 * Clickable card that opens an expanded modal view to see all safety checks in full detail.
 * Listens to global aegis-data-update events for real-time synchronization.
 */
import React, { useState, useEffect, useCallback } from "react";
import { ShieldCheck, Clock3, Maximize2, X } from "lucide-react";
import { ClipPanel, StatusPill } from "../ui/StatusPill";

export default function SafetyChecksCard() {
  const [latestOrder, setLatestOrder] = useState(null);
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

  const fetchSafetyOrder = useCallback(() => {
    fetch("http://localhost:4000/api/orders")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch orders");
        return res.json();
      })
      .then((data) => {
        const orders = data.orders || [];
        setLatestOrder(orders[0] || null);
      })
      .catch((err) => console.error("Error loading safety checks order:", err));
  }, []);

  useEffect(() => {
    fetchSafetyOrder();

    // Listen to global dashboard sync events for zero-reload updates
    window.addEventListener("aegis-data-update", fetchSafetyOrder);
    const interval = setInterval(fetchSafetyOrder, 5000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("aegis-data-update", fetchSafetyOrder);
    };
  }, [fetchSafetyOrder]);

  const hasOrder = !!latestOrder;
  const isConfirmed = latestOrder?.status === "confirmed";
  const isRolledBack = latestOrder?.status === "rolled_back";

  const checks = [
    {
      key: "price",
      label: "Price matches your listing",
      description: "Verifies that the unit price requested by the AI agent matches the active merchant product catalog exactly.",
      status: hasOrder && !isRolledBack ? "pass" : "pending",
    },
    {
      key: "stock",
      label: "Item is reserved, no double-selling",
      description: "Applies a temporary row-lock to inventory items to prevent race conditions and concurrent double-selling.",
      status: hasOrder && !isRolledBack ? "pass" : "pending",
    },
    {
      key: "speed",
      label: "Not too many orders too fast",
      description: "Runs a velocity check against recent transaction timestamps to safeguard against bot scraping spikes.",
      status: hasOrder ? "pass" : "pending",
    },
    {
      key: "payment",
      label: "Payment confirmed by Razorpay",
      description: "Validates incoming webhook cryptographic signatures via HMAC-SHA256 before capturing funds.",
      status: isConfirmed ? "pass" : "pending",
    },
  ];

  return (
    <>
      {/* Main Dashboard Widget Card (Clickable) */}
      <ClipPanel 
        onClick={() => setIsOpenModal(true)}
        className="p-4 sm:p-5 stagger-item cursor-pointer hover:border-amber/60 transition-all group" 
        style={{ animationDelay: "0.15s" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="font-display text-xs tracking-widest text-amber group-hover:text-amber/90">
            SAFETY CHECKS ON THIS ORDER
          </div>
          <Maximize2 size={12} className="text-stone-500 group-hover:text-amber transition-colors" />
        </div>
        
        {!hasOrder ? (
          <div className="py-4 text-center text-stone-500 text-xs font-mono">
            No active order to inspect.
          </div>
        ) : (
          <ul className="space-y-2.5 overflow-hidden">
            {checks.map((check) => (
              <li key={check.key} className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                <span className="flex items-center gap-2 text-stone-400 min-w-0">
                  {check.status === "pass" ? (
                    <ShieldCheck size={14} className="text-amber shrink-0" />
                  ) : (
                    <Clock3 size={14} className="text-alert shrink-0" />
                  )}
                  <span className="truncate">{check.label}</span>
                </span>
                <StatusPill status={check.status}>
                  {check.status === "pass" ? "OK" : "Checking…"}
                </StatusPill>
              </li>
            ))}
          </ul>
        )}
      </ClipPanel>

      {/* Expanded Modal View matching Immutable Audit Ledger structure */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 bg-obsidian/90 scan-bg flex items-center justify-center p-4">
          <ClipPanel className="w-full max-w-3xl max-h-[85vh] flex flex-col p-6 bg-panel border-panel-border">
            <div className="flex items-center justify-between pb-4 border-b border-panel-border">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-amber" size={20} />
                <h2 className="font-display text-lg font-bold text-amber tracking-wide">
                  Detailed Safety Checks Breakdown
                </h2>
              </div>
              <button 
                onClick={() => setIsOpenModal(false)} 
                className="text-stone-400 hover:text-amber transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="my-3 text-xs font-mono text-stone-400">
              Inspecting Order ID: <span className="text-amber">{latestOrder?.id || "N/A"}</span>
            </div>

            {!hasOrder ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <div className="text-sm font-display text-stone-400">No active order found</div>
                <div className="text-[11px] text-stone-600 font-mono mt-1">
                  Safety guardrails will evaluate automatically when a new shopping agent intent arrives.
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto my-2 pr-2 space-y-3 font-mono no-scrollbar">
                {checks.map((check) => (
                  <div key={check.key} className="p-4 border border-panel-border rounded bg-obsidian/40 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-xs sm:text-sm font-bold text-stone-200 flex items-center gap-2">
                        {check.status === "pass" ? (
                          <ShieldCheck size={16} className="text-amber shrink-0" />
                        ) : (
                          <Clock3 size={16} className="text-alert shrink-0" />
                        )}
                        {check.label}
                      </span>
                      <StatusPill status={check.status}>
                        {check.status === "pass" ? "OK" : "Checking…"}
                      </StatusPill>
                    </div>
                    <p className="text-xs sm:text-sm text-stone-400 pl-6 leading-relaxed">
                      {check.description}
                    </p>
                  </div>
                ))}
              </div>
            )}

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