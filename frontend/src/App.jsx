import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";
import AegisLoader from "./components/loader/AegisLoader";
import DashboardShell from "./components/layout/DashboardShell";

export default function App() {
  const [loading, setLoading] = useState(true);

  return (
    <>
      <AnimatePresence>
        {loading && <AegisLoader onDone={() => setLoading(false)} />}
      </AnimatePresence>
      {!loading && <DashboardShell />}
    </>
  );
}
