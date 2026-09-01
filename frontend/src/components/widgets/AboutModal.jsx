import React from "react";
import { X, ShieldCheck, Zap } from "lucide-react";
import { ClipPanel } from "../ui/StatusPill";

export default function AboutModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-obsidian/90 scan-bg flex items-center justify-center p-4">
      <ClipPanel className="w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 bg-panel border-panel-border">
        <div className="flex items-center justify-between pb-4 border-b border-panel-border mb-4">
          <h2 className="font-display text-lg font-bold text-amber tracking-wide">How Aegis Works & Guide</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-amber"><X size={20} /></button>
        </div>
        <div className="space-y-4 text-xs sm:text-sm text-stone-300 leading-relaxed font-mono">
          <p><strong className="text-amber">Aegis</strong> is a secure agentic commerce gateway designed for merchants interacting with autonomous AI shopping agents.</p>
          <div>
            <h3 className="font-display font-bold text-amber text-sm mb-1">1. Guardrail Verification</h3>
            <p className="text-stone-400">Every agent order request is intercepted to verify prices directly from the server DB, enforce inventory row-locks, and track request velocity limits.</p>
          </div>
          <div>
            <h3 className="font-display font-bold text-amber text-sm mb-1">2. Order Fulfillment & Delivery Status</h3>
            <p className="text-stone-400">Merchants can click any incoming order block to inspect full buyer request payload specifications, delivery addresses, contact info, and toggle order completion status (Delivered vs. Not Delivered).</p>
          </div>
          <div>
            <h3 className="font-display font-bold text-amber text-sm mb-1">3. Live Accounting & Dashboard Tracking</h3>
            <p className="text-stone-400">Confirmed orders instantly sync with ledger entries and update real-time ratio metrics and pie charts on your dashboard overview.</p>
          </div>
        </div>
      </ClipPanel>
    </div>
  );
}