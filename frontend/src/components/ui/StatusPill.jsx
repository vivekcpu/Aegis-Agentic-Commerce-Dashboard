/**
 * Tiny shared primitives so every widget builds its card the same way.
 * If we ever need to change the panel look, it changes here once.
 */
import React from "react";

export function ClipPanel({ children, className = "", as: Tag = "div", ...rest }) {
  return (
    <Tag className={`clip panel ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

const STATUS_STYLES = {
  pass: "text-amber border-amber/40 bg-amber-soft",
  pending: "text-alert border-alert/40 bg-alert-soft",
  info: "text-amber",
  alert: "text-alert font-bold",
};

export function StatusPill({ status, children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] sm:text-[11px] uppercase tracking-wide rounded-sm border ${STATUS_STYLES[status] || ""}`}
    >
      {children}
    </span>
  );
}
