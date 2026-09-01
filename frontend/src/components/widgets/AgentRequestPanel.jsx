/**
 * AgentRequestPanel
 * Dynamically displays the latest pending AI buyer order with an expandable modal view
 * showing complete agent information, order ID, SKU, agent ID, and address.
 */
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, X, MapPin, Mail, Phone } from "lucide-react";
import { ClipPanel } from "../ui/StatusPill";

export default function AgentRequestPanel() {
  const [latestOrder, setLatestOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [isExpandedModal, setIsExpandedModal] = useState(false);

  const fetchLatestOrder = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:4000/api/orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      const orders = data.orders || [];
      const pending = orders.find(o => o.status === "pending_confirmation");
      setLatestOrder(pending || null);
    } catch (err) {
      console.error("Error loading agent request:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLatestOrder();
    const handleGlobalUpdate = () => fetchLatestOrder();
    window.addEventListener("aegis-data-update", handleGlobalUpdate);
    const interval = setInterval(fetchLatestOrder, 5000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("aegis-data-update", handleGlobalUpdate);
    };
  }, [fetchLatestOrder]);

  const notifyWidgets = () => {
    window.dispatchEvent(new Event("aegis-data-update"));
  };

  async function handleApprove() {
    if (!latestOrder) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`http://localhost:4000/api/orders/${latestOrder.id}`);
      if (!res.ok) throw new Error("Failed to process approval");
      setMessage({ type: "success", text: "✓ Order approved successfully." });
      fetchLatestOrder();
      notifyWidgets();
    } catch (err) {
      setMessage({ type: "error", text: `Approval failed: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDecline() {
    if (!latestOrder) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`http://localhost:4000/api/orders/${latestOrder.id}/simulate-stock-drop`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to decline order");
      setMessage({ type: "success", text: "✓ Order declined. Stock released." });
      fetchLatestOrder();
      notifyWidgets();
    } catch (err) {
      setMessage({ type: "error", text: `Decline failed: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <ClipPanel className="p-5 sm:p-6 stagger-item">
        <div className="font-display text-xs tracking-widest text-amber mb-4">NEW ORDER FROM AN AI SHOPPING AGENT</div>
        <div className="text-xs text-stone-500 font-mono">Syncing agent requests...</div>
      </ClipPanel>
    );
  }

  if (!latestOrder) {
    return (
      <ClipPanel className="p-5 sm:p-6 stagger-item">
        <div className="font-display text-xs tracking-widest text-amber mb-4">NEW ORDER FROM AN AI SHOPPING AGENT</div>
        <div className="py-8 text-center text-stone-500 text-xs font-mono">Waiting for incoming agent purchase intents...</div>
      </ClipPanel>
    );
  }

  const address = typeof latestOrder.delivery_address === "string" 
    ? JSON.parse(latestOrder.delivery_address || "{}") 
    : (latestOrder.delivery_address || {});

  return (
    <>
      {/* Main Dashboard Widget Card (Clickable to Expand) */}
      <ClipPanel 
        onClick={() => setIsExpandedModal(true)}
        className="p-5 sm:p-6 stagger-item cursor-pointer hover:border-amber/60 transition-all group"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="font-display text-xs tracking-widest text-amber group-hover:text-amber/90">
            NEW ORDER FROM AN AI SHOPPING AGENT
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] uppercase font-bold border rounded text-amber border-amber/40 bg-amber-soft">
              {latestOrder.status}
            </span>
            <Maximize2 size={14} className="text-stone-500 group-hover:text-amber transition-colors" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs sm:text-sm font-mono">
          <Field label="Product" value={latestOrder.product_title || latestOrder.product_id} />
          <Field label="Quantity" value={`${latestOrder.quantity} units`} />
          <Field label="Order Total" value={`₹${Number(latestOrder.total_amount_inr).toLocaleString("en-IN")}`} highlight />
          <Field label="Buyer Agent" value={latestOrder.buyer_agent_id} mono />
        </div>
        <div className="mt-3 text-[10px] text-stone-500 font-mono text-right">Click card to view full agent & delivery details →</div>
      </ClipPanel>

      {/* Expanded Detailed Modal Card */}
      {isExpandedModal && (
        <div className="fixed inset-0 z-50 bg-obsidian/90 scan-bg flex items-center justify-center p-4">
          <ClipPanel className="w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 bg-panel border-panel-border font-mono text-xs">
            <div className="flex items-center justify-between pb-4 border-b border-panel-border mb-4">
              <h2 className="font-display text-lg font-bold text-amber tracking-wide">
                Agent Purchase Request Details
              </h2>
              <button onClick={(e) => { e.stopPropagation(); setIsExpandedModal(false); }} className="text-stone-400 hover:text-amber">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-stone-300">
              <div className="grid grid-cols-2 gap-4 p-3 bg-obsidian/50 border border-panel-border rounded">
                <div><span className="text-stone-500">Order ID:</span> <span className="text-amber">{latestOrder.id}</span></div>
                <div><span className="text-stone-500">Product SKU/ID:</span> <span className="text-amber">{latestOrder.product_id}</span></div>
                <div><span className="text-stone-500">Buyer Agent ID:</span> <span className="text-amber">{latestOrder.buyer_agent_id}</span></div>
                <div><span className="text-stone-500">Status:</span> <span className="text-amber">{latestOrder.status}</span></div>
              </div>

              <div>
                <h3 className="font-display font-bold text-amber text-sm mb-1 uppercase tracking-wider">Customer & Contact</h3>
                <p>Name: <strong className="text-stone-200">{latestOrder.customer_name || "Autonomous Agent Buyer"}</strong></p>
                <p className="flex items-center gap-1.5 mt-1 text-stone-400"><Mail size={13} className="text-amber" /> {latestOrder.customer_email || "N/A"}</p>
                <p className="flex items-center gap-1.5 mt-1 text-stone-400"><Phone size={13} className="text-amber" /> {latestOrder.customer_phone || "N/A"}</p>
              </div>

              <div>
                <h3 className="font-display font-bold text-amber text-sm mb-1 uppercase tracking-wider">Delivery Address</h3>
                <div className="flex items-start gap-2 text-stone-400">
                  <MapPin size={14} className="text-amber mt-0.5 shrink-0" />
                  <span>
                    {address.line1 || "N/A"}, {address.city || ""}, {address.region || ""} {address.postal_code || ""}, {address.country || ""}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-panel-border">
                <button 
                  onClick={() => { handleApprove(); setIsExpandedModal(false); }}
                  disabled={actionLoading}
                  className="clip py-2.5 text-xs font-display font-bold border border-amber text-amber bg-amber-soft hover:bg-amber/20 transition-colors"
                >
                  Approve Order
                </button>
                <button 
                  onClick={() => { handleDecline(); setIsExpandedModal(false); }}
                  disabled={actionLoading}
                  className="clip py-2.5 text-xs font-display font-bold border border-alert text-alert bg-alert-soft hover:bg-alert/20 transition-colors"
                >
                  Decline Order
                </button>
              </div>
            </div>
          </ClipPanel>
        </div>
      )}
    </>
  );
}

function Field({ label, value, highlight, mono }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] sm:text-[11px] text-stone-500 mb-0.5">{label}</div>
      <div className={`truncate ${highlight ? "font-display font-bold text-lg text-amber" : ""} ${mono ? "font-mono text-stone-300" : ""}`}>
        {value}
      </div>
    </div>
  );
}