/**
 * TopBar
 * Desktop: full header with merchant id, live status, static timestamp.
 * Mobile: condensed header with hamburger opening a clean full-screen tactical drawer.
 */
import React, { useState } from "react";
import { Menu, X, Radio, Database, Info } from "lucide-react";
import { merchant } from "../../data/mockData";

export default function TopBar({ onOpenLookup, onOpenAbout }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="clip panel border-panel-border px-4 sm:px-6 py-3 flex items-center justify-between relative z-50">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="w-2 h-2 rounded-full bg-amber animate-blink shrink-0" />
          <span className="font-display text-base sm:text-lg font-bold tracking-wider truncate">
            Aegis <span className="text-stone-500 font-normal hidden sm:inline">// Ops Deck</span>
          </span>
        </div>

        {/* Desktop status row & menu items */}
        <div className="hidden md:flex items-center gap-6 text-xs uppercase tracking-wide">
          <button onClick={onOpenAbout} className="text-stone-400 hover:text-amber flex items-center gap-1 transition-colors">
            <Info size={14} /> How it Works
          </button>
          <button onClick={onOpenLookup} className="text-stone-400 hover:text-amber flex items-center gap-1 transition-colors">
            <Database size={14} /> DB Lookup
          </button>
          <span className="text-stone-500">Account: {merchant.name}</span>
          <span className="flex items-center gap-1.5 text-amber font-bold">
            <Radio size={12} /> Live — Test Mode
          </span>
          <Clock />
        </div>

        {/* Mobile hamburger button */}
        <button
          className="md:hidden text-amber p-1 focus:outline-none"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      </header>

      {/* Mobile Fullscreen Tactical Drawer Overlay */}
      {open && (
        <div className="fixed inset-0 z-[999] bg-obsidian/95 scan-bg flex flex-col p-6 md:hidden animate-fade-up">
          <div className="flex items-center justify-between pb-4 border-b border-panel-border mb-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber animate-blink" />
              <span className="font-display text-lg font-bold tracking-wider text-amber">
                Aegis // Navigation
              </span>
            </div>
            <button
              className="text-amber p-2 clip panel border-panel-border"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X size={22} />
            </button>
          </div>

          <div className="flex flex-col gap-4 text-sm uppercase tracking-wide font-mono">
            <button 
              onClick={() => { setOpen(false); onOpenAbout(); }} 
              className="clip panel p-4 text-left text-stone-200 hover:text-amber hover:border-amber flex items-center gap-3 transition-colors bg-panel"
            >
              <Info size={18} className="text-amber" /> 
              <span>How it Works / About</span>
            </button>

            <button 
              onClick={() => { setOpen(false); onOpenLookup(); }} 
              className="clip panel p-4 text-left text-stone-200 hover:text-amber hover:border-amber flex items-center gap-3 transition-colors bg-panel"
            >
              <Database size={18} className="text-amber" /> 
              <span>Account Postgres DB Lookup</span>
            </button>
          </div>

          <div className="mt-auto pt-6 border-t border-panel-border text-xs uppercase tracking-wide text-stone-400 space-y-2 font-mono">
            <div>Account: <span className="text-stone-200">{merchant.name}</span></div>
            <div className="flex items-center gap-1.5 text-amber font-bold">
              <Radio size={12} /> Live — Test Mode
            </div>
            <div className="text-stone-500"><Clock /></div>
          </div>
        </div>
      )}
    </>
  );
}

function Clock() {
  const now = new Date();
  const formattedDate = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const formattedTime = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <span className="font-mono">
      {formattedDate} · {formattedTime}
    </span>
  );
}