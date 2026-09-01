/**
 * SpendVelocityCard
 * Shows how much of today's spending limit has been used with 
 * a smooth count-up number animation and a synchronized progress bar.
 * Listens to global aegis-data-update events for real-time synchronization.
 */
import React, { useState, useEffect, useCallback } from "react";
import { ClipPanel } from "../ui/StatusPill";

export default function SpendVelocityCard() {
  const [summary, setSummary] = useState({ spentToday: 0, dailyCapInr: 500000 });
  const [loading, setLoading] = useState(true);
  const [displaySpent, setDisplaySpent] = useState(0);

  const fetchSpendVelocity = useCallback(() => {
    fetch("http://localhost:4000/api/ledger/summary")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch ledger summary");
        return res.json();
      })
      .then((data) => {
        const targetSpent = data.spentToday || 0;
        setSummary({
          spentToday: targetSpent,
          dailyCapInr: data.dailyCapInr || 500000,
        });
        setLoading(false);

        // Smooth count-up animation without flickering
        let current = 0;
        const duration = 800;
        const steps = 25;
        const increment = targetSpent / steps;
        const stepTime = duration / steps;

        const timer = setInterval(() => {
          current += increment;
          if (current >= targetSpent) {
            setDisplaySpent(targetSpent);
            clearInterval(timer);
          } else {
            setDisplaySpent(Math.round(current));
          }
        }, stepTime);

        return () => clearInterval(timer);
      })
      .catch((err) => {
        console.error("Error fetching spend velocity:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchSpendVelocity();

    // Listen to global dashboard sync events for zero-reload updates on action triggers
    window.addEventListener("aegis-data-update", fetchSpendVelocity);

    return () => {
      window.removeEventListener("aegis-data-update", fetchSpendVelocity);
    };
  }, [fetchSpendVelocity]);

  const cap = summary.dailyCapInr || 500000;
  const pct = Math.min(100, (displaySpent / cap) * 100);
  const remaining = 100 - pct;

  return (
    <ClipPanel className="p-4 sm:p-5 stagger-item" style={{ animationDelay: "0.05s" }}>
      <div className="font-display text-xs tracking-widest text-amber mb-3">
        TODAY&apos;S SPENDING LIMIT
      </div>
      <div className="text-2xl sm:text-3xl font-display font-bold">
        ₹{displaySpent.toLocaleString("en-IN")}
        <span className="text-sm text-stone-500 font-normal">
          {" "}
          / ₹{cap.toLocaleString("en-IN")}
        </span>
      </div>
      {/* Horizontal progress bar in sync with the count-up value */}
      <div className="w-full h-2 bar-track mt-3">
        <div 
          className="bar-fill" 
          style={{ width: `${pct}%`, transition: "width 0.1s linear" }} 
        />
      </div>
      <div className="text-[10px] sm:text-[11px] text-stone-500 mt-2">
        {loading ? "Syncing ledger..." : `${remaining.toFixed(1)}% left before AI agents are paused for today`}
      </div>
    </ClipPanel>
  );
}