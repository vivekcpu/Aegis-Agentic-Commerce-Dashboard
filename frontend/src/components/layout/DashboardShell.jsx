/**
 * DashboardShell
 * Desktop: 12-col grid mirroring Template B (sidebar cards | center panel | log).
 * Mobile: everything collapses to a single stacked column in a sensible
 * reading order (spending -> incoming order -> safety -> orders -> log),
 * so nothing overflows horizontally or shrinks unreadably.
 */
import React, { useState } from "react";
import TopBar from "./TopBar";
import SpendVelocityCard from "../widgets/SpendVelocityCard";
import SafetyChecksCard from "../widgets/SafetyChecksCard";
import AgentRequestPanel from "../widgets/AgentRequestPanel";
import ActivityLogCard from "../widgets/ActivityLogCard";
import CustomerOrdersCard from "../widgets/CustomerOrdersCard";
import CompletionRatioCard from "../widgets/CompletionRatioCard";
import AccountLookupModal from "../widgets/AccountLookupModal";
import AboutModal from "../widgets/AboutModal";

export default function DashboardShell() {
  const [showLookup, setShowLookup] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  return (
    <div className="min-h-screen scan-bg p-3 sm:p-6 relative">
      <div className="max-w-7xl mx-auto space-y-4">
        <TopBar onOpenLookup={() => setShowLookup(true)} onOpenAbout={() => setShowAbout(true)} />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Left column */}
          <div className="md:col-span-4 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-4">
            <SpendVelocityCard />
            <CustomerOrdersCard />
            <SafetyChecksCard />
          </div>

          {/* Center main order panel */}
          <div className="md:col-span-8 lg:col-span-6">
            <AgentRequestPanel />
          </div>

          {/* Right column: activity log + completion ratio card stacked at bottom */}
          <div className="md:col-span-12 lg:col-span-3 space-y-4">
            <ActivityLogCard />
            <CompletionRatioCard />
          </div>
        </div>
      </div>

      {showLookup && <AccountLookupModal onClose={() => setShowLookup(false)} />}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </div>
  );
}