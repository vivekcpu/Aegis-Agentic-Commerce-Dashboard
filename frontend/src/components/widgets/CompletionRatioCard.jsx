/**
 * CompletionRatioCard
 * A dedicated sci-fi HUD widget showing the completion ratio progress ring,
 * percentage counting animation, and completed/pending breakdown tags.
 * Listens to global aegis-data-update events for real-time synchronization.
 */
import React, { useState, useEffect, useCallback } from "react";
import { ClipPanel } from "../ui/StatusPill";

export default function CompletionRatioCard() {
  const [orders, setOrders] = useState([]);
  const [displayPct, setDisplayPct] = useState(0);

  const fetchCompletionOrders = useCallback(() => {
    fetch("http://localhost:4000/api/orders")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch orders");
        return res.json();
      })
      .then((data) => setOrders(data.orders || []))
      .catch((err) => console.error("Error fetching completion ratio orders:", err));
  }, []);

  useEffect(() => {
    fetchCompletionOrders();

    // Listen to global dashboard sync events for zero-reload updates
    window.addEventListener("aegis-data-update", fetchCompletionOrders);
    const interval = setInterval(fetchCompletionOrders, 5000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("aegis-data-update", fetchCompletionOrders);
    };
  }, [fetchCompletionOrders]);

  const completedCount = orders.filter((o) => 
    o.delivery_status === "delivered" || 
    o.fulfillment_status === "delivered"
  ).length;
  const pendingCount = orders.length - completedCount;
  const targetPercentage = orders.length > 0 ? Math.round((completedCount / orders.length) * 100) : 0;

  // Sci-fi count-up percentage animation hook
  useEffect(() => {
    let start = 0;
    if (targetPercentage === 0) {
      setDisplayPct(0);
      return;
    }
    const duration = 1000;
    const stepTime = Math.max(Math.floor(duration / targetPercentage), 20);
    const timer = setInterval(() => {
      start += 1;
      if (start >= targetPercentage) {
        setDisplayPct(targetPercentage);
        clearInterval(timer);
      } else {
        setDisplayPct(start);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [targetPercentage]);

  // SVG Circle parameters for sci-fi progress ring
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayPct / 100) * circumference;

  return (
    <ClipPanel className="p-4 sm:p-5 stagger-item" style={{ animationDelay: "0.3s" }}>
      <div className="font-display text-xs tracking-widest text-amber mb-3">
        COMPLETION RATIO
      </div>

      <div className="flex items-center gap-4">
        {/* Sci-Fi Circular SVG Progress Loader */}
        <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="28"
              cy="28"
              r={radius}
              stroke="#1f1409"
              strokeWidth="4"
              fill="transparent"
            />
            <circle
              cx="28"
              cy="28"
              r={radius}
              stroke="#f5a524"
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{ transition: "stroke-dashoffset 0.1s ease-out" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-display font-bold text-xs text-amber">
            {displayPct}%
          </div>
        </div>

        {/* Labels & Tags */}
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold text-sm text-[#f2e6d8] tracking-wide">Delivered</div>
          <div className="text-[10px] text-stone-500 uppercase tracking-wider mb-2">Fulfillment Status</div>

          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1 text-stone-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
              <strong className="text-amber">{completedCount}</strong> Completed
            </span>
            <span className="flex items-center gap-1 text-stone-300">
              <span className="w-2 h-2 rounded-full bg-amber inline-block shadow-[0_0_6px_rgba(245,165,36,0.6)]" />
              <strong className="text-amber">{pendingCount}</strong> Pending
            </span>
          </div>
        </div>
      </div>
    </ClipPanel>
  );
}