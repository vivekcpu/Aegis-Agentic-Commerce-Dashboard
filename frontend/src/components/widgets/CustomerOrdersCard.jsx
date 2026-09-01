/**
 * CustomerOrdersCard + CustomerOrdersDetail
 *
 * Summary card sits in the dashboard grid like every other widget.
 * Clicking it expands into a full-screen view listing every order with
 * full buyer/delivery detail (name, address, contact, what was bought,
 * when, payment + delivery status).
 * 
 * Integrated with live backend data fetches from /api/orders and 
 * synchronized via global aegis-data-update events.
 */
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, PackageCheck, Truck, Clock3, MapPin, Mail, Phone } from "lucide-react";
import { ClipPanel } from "../ui/StatusPill";

const DELIVERY_LABEL = {
  processing: { text: "Preparing order", icon: Clock3, color: "text-stone-400" },
  shipped: { text: "On the way", icon: Truck, color: "text-amber" },
  delivered: { text: "Delivered", icon: PackageCheck, color: "text-amber" },
};

export default function CustomerOrdersCard() {
  const [expanded, setExpanded] = useState(false);
  const [orders, setOrders] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all"); // 'all' | 'completed' | 'pending'
  const [activeOrder, setActiveOrder] = useState(null);

  // Lock background scroll when expanded modal view is open
  useEffect(() => {
    if (expanded) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [expanded]);

  // Fetch orders from the backend API (triggered on mount & action events)
  const fetchOrders = useCallback(() => {
    fetch("http://localhost:4000/api/orders")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch orders");
        return res.json();
      })
      .then((data) => {
        const formatted = (data.orders || []).map((o) => ({
          id: o.id,
          buyerAgentId: o.buyer_agent_id,
          customerName: o.customer_name || "Autonomous Agent Buyer",
          product: o.product_title || o.product_id,
          quantity: o.quantity,
          amount: Number(o.total_amount_inr),
          purchasedAt: o.created_at,
          paymentStatus: o.status,
          deliveryStatus: o.delivery_status || "processing",
          contact: {
            email: o.customer_email || "N/A",
            phone: o.customer_phone || "N/A",
          },
          address: typeof o.delivery_address === "string" 
            ? JSON.parse(o.delivery_address || "{}") 
            : (o.delivery_address || {}),
        }));
        setOrders(formatted);
      })
      .catch((err) => console.error("Error loading customer orders:", err));
  }, []);

  useEffect(() => {
    fetchOrders();

    // Listen to global dashboard sync events for zero-reload updates on action triggers
    window.addEventListener("aegis-data-update", fetchOrders);

    return () => {
      window.removeEventListener("aegis-data-update", fetchOrders);
    };
  }, [fetchOrders]);

  // Sort orders by latest first
  const sortedOrders = [...orders].sort((a, b) => new Date(b.purchasedAt) - new Date(a.purchasedAt));
  
  const completedCount = orders.filter(o => o.deliveryStatus === "delivered").length;
  const pendingCount = orders.length - completedCount;
  const totalValue = orders.reduce((sum, o) => sum + o.amount, 0);

  // Ratio for pie/circular indicator
  const completedRatio = orders.length > 0 ? (completedCount / orders.length) * 100 : 0;

  const toggleDeliveryStatus = async (orderId) => {
    const currentOrder = orders.find(o => o.id === orderId);
    if (!currentOrder) return;
    
    const newStatus = currentOrder.deliveryStatus === "delivered" ? "processing" : "delivered";

    try {
      const res = await fetch(`http://localhost:4000/api/orders/${orderId}/delivery-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryStatus: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update delivery status");

      setOrders(prev => prev.map(o => {
        if (o.id === orderId) {
          return { ...o, deliveryStatus: newStatus };
        }
        return o;
      }));

      if (activeOrder && activeOrder.id === orderId) {
        setActiveOrder(prev => ({
          ...prev,
          deliveryStatus: newStatus,
        }));
      }

      // Dispatch global sync so other widgets catch the status change instantly
      window.dispatchEvent(new Event("aegis-data-update"));
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  return (
    <>
      <motion.button
        layoutId="orders-card"
        onClick={() => setExpanded(true)}
        className="clip panel p-4 sm:p-5 text-left w-full stagger-item hover:border-amber/60 transition-colors"
        style={{ animationDelay: "0.25s" }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="font-display text-xs tracking-widest text-amber">
            CUSTOMER ORDERS
          </div>
          {/* Mini Pie / Circular Ratio Indicator */}
          <div className="w-6 h-6 rounded-full relative flex items-center justify-center border border-amber/40" title={`${completedCount} completed / ${pendingCount} pending`}>
            <div 
              className="absolute inset-0 rounded-full bg-amber/30"
              style={{ clipPath: `polygon(0 0, 100% 0, 100% ${completedRatio}%, 0 ${completedRatio}%)` }} 
            />
            <span className="text-[9px] font-mono text-amber font-bold z-10">{orders.length}</span>
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-display font-bold">{orders.length}</div>
        <div className="text-[10px] sm:text-[11px] text-stone-500 mt-1 flex items-center justify-between">
          <span>₹{totalValue.toLocaleString("en-IN")} total</span>
          <span className="text-amber">{completedCount} delivered · {pendingCount} pending</span>
        </div>
      </motion.button>

      <AnimatePresence>
        {expanded && (
          <CustomerOrdersDetail
            orders={sortedOrders}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            onClose={() => {
              setExpanded(false);
              setActiveOrder(null);
            }}
            activeOrder={activeOrder}
            setActiveOrder={setActiveOrder}
            onToggleDelivery={toggleDeliveryStatus}
            completedCount={completedCount}
            pendingCount={pendingCount}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function CustomerOrdersDetail({ orders, activeFilter, setActiveFilter, onClose, activeOrder, setActiveOrder, onToggleDelivery, completedCount, pendingCount }) {
  const filteredOrders = orders.filter(o => {
    if (activeFilter === "completed") return o.deliveryStatus === "delivered";
    if (activeFilter === "pending") return o.deliveryStatus !== "delivered";
    return true;
  });

  const total = orders.length || 1;
  const compPct = (completedCount / total) * 100;

  return (
    <motion.div
      layoutId="orders-card"
      className="fixed inset-0 z-50 bg-obsidian scan-bg overflow-y-auto pt-20 sm:pt-24 px-4 sm:px-8 pb-8 no-scrollbar"
      initial={{ opacity: 0.6 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-lg sm:text-2xl font-bold text-amber tracking-wide">
              Customer Orders & Fulfillment
            </h2>
            <p className="text-[11px] sm:text-xs text-stone-500 mt-1">
              Sorted by latest · Click any block to view AI request details and mark as delivered/pending
            </p>
          </div>
          <button
            onClick={onClose}
            className="clip panel p-2 text-stone-400 hover:text-amber shrink-0"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Dashboard Ratio & Filters Header */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <ClipPanel className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-stone-500 uppercase font-display">Completion Ratio</div>
              <div className="text-xl font-display font-bold text-amber">{compPct.toFixed(0)}% Delivered</div>
            </div>
            <div className="w-12 h-12 rounded-full border-2 border-amber/40 flex items-center justify-center text-xs font-mono text-amber">
              {completedCount}/{orders.length}
            </div>
          </ClipPanel>
          <div className="sm:col-span-2 flex items-center gap-2">
            <button onClick={() => setActiveFilter("all")} className={`flex-1 clip py-3 text-xs font-display uppercase tracking-wider border ${activeFilter === 'all' ? 'bg-amber text-obsidian border-amber font-bold' : 'border-panel-border text-stone-400'}`}>
              All ({orders.length})
            </button>
            <button onClick={() => setActiveFilter("completed")} className={`flex-1 clip py-3 text-xs font-display uppercase tracking-wider border ${activeFilter === 'completed' ? 'bg-amber text-obsidian border-amber font-bold' : 'border-panel-border text-stone-400'}`}>
              Completed ({completedCount})
            </button>
            <button onClick={() => setActiveFilter("pending")} className={`flex-1 clip py-3 text-xs font-display uppercase tracking-wider border ${activeFilter === 'pending' ? 'bg-amber text-obsidian border-amber font-bold' : 'border-panel-border text-stone-400'}`}>
              Pending ({pendingCount})
            </button>
          </div>
        </div>

        {activeOrder ? (
          <OrderDetail order={activeOrder} onBack={() => setActiveOrder(null)} onToggleDelivery={onToggleDelivery} />
        ) : orders.length === 0 ? (
          <ClipPanel className="p-12 text-center">
            <div className="text-sm font-display text-stone-400">No new orders</div>
            <div className="text-[11px] text-stone-600 font-mono mt-1">
              Waiting for incoming autonomous agent purchases...
            </div>
          </ClipPanel>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const isDelivered = order.deliveryStatus === "delivered";
              return (
                <div
                  key={order.id}
                  onClick={() => setActiveOrder(order)}
                  className="clip panel w-full text-left p-4 sm:p-5 hover:border-amber/60 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-sm sm:text-base text-[#f2e6d8]">
                        {order.customerName}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${isDelivered ? 'text-amber border-amber/40 bg-amber-soft' : 'text-alert border-alert/40 bg-alert-soft'}`}>
                        {isDelivered ? 'Delivered' : 'Not Delivered'}
                      </span>
                    </div>
                    <div className="text-[11px] sm:text-xs text-stone-500 truncate mt-0.5">
                      {order.product} · {order.quantity} units · Agent: {order.buyerAgentId}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-sm sm:text-base font-display font-bold text-[#f2e6d8]">
                      ₹{order.amount.toLocaleString("en-IN")}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleDelivery(order.id);
                      }}
                      className={`clip px-3 py-1.5 text-xs font-display border transition-colors ${isDelivered ? 'border-amber text-amber bg-amber-soft hover:bg-amber/20' : 'border-alert text-alert bg-alert-soft hover:bg-alert/20'}`}
                    >
                      {isDelivered ? 'Mark Not Delivered' : 'Mark Delivered'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function OrderDetail({ order, onBack, onToggleDelivery }) {
  const isDelivered = order.deliveryStatus === "delivered";
  const purchasedDate = new Date(order.purchasedAt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <button onClick={onBack} className="text-xs text-stone-500 hover:text-amber mb-4">
        ← Back to all orders
      </button>

      <ClipPanel className="p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="font-display text-lg sm:text-xl font-bold">{order.customerName}</h3>
            <p className="text-[11px] sm:text-xs text-stone-500 mt-1">
              Order {order.id} · placed by AI agent <span className="text-amber font-mono">{order.buyerAgentId}</span>
            </p>
          </div>
          <button
            onClick={() => onToggleDelivery(order.id)}
            className={`clip px-4 py-2 text-xs font-display font-bold border transition-colors ${isDelivered ? 'border-amber text-amber bg-amber-soft' : 'border-alert text-alert bg-alert-soft'}`}
          >
            {isDelivered ? '✓ Status: Delivered (Click to change)' : '⚠ Status: Not Delivered (Click to mark delivered)'}
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 font-mono text-xs">
          <div>
            <div className="text-[10px] sm:text-[11px] text-stone-500 mb-2 tracking-wide uppercase font-display">
              AI Buyer Request Specifications
            </div>
            <div className="text-sm font-bold text-stone-200">{order.product}</div>
            <div className="text-stone-400 mt-1">
              {order.quantity} units requested · ₹{order.amount.toLocaleString("en-IN")} total
            </div>
            <div className="text-stone-500 mt-1">
              Purchased at: {purchasedDate}
            </div>
            <div className="text-amber mt-2">
              Payment Status: {order.paymentStatus === "confirmed" ? "Confirmed by Razorpay Webhook" : "Pending"}
            </div>
          </div>

          <div>
            <div className="text-[10px] sm:text-[11px] text-stone-500 mb-2 tracking-wide uppercase font-display">
              Delivery address & contact
            </div>
            <div className="flex items-start gap-2 text-stone-300 mb-3">
              <MapPin size={14} className="text-amber mt-0.5 shrink-0" />
              <span>
                {order.address.line1}, {order.address.city}, {order.address.region}{" "}
                {order.address.postalCode}, {order.address.country}
              </span>
            </div>

            <div className="flex items-center gap-2 text-stone-300 mb-1.5">
              <Mail size={14} className="text-amber shrink-0" /> {order.contact.email}
            </div>
            <div className="flex items-center gap-2 text-stone-300">
              <Phone size={14} className="text-amber shrink-0" /> {order.contact.phone}
            </div>
          </div>
        </div>
      </ClipPanel>
    </motion.div>
  );
}