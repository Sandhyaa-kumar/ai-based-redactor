// src/components/RedactionSidebar.jsx
// Sidebar for semi-automatic redaction workflow
// Displays all AI-suggested and manually added redactions for the current PDF
// Each card shows entity type, text snippet, page, status, and action buttons
// Collapsible, responsive, and floats/affixes smartly

import React, { useState } from "react";

/**
 * Props:
 * - redactions: Array of { type, entity, page, status, color, ... }
 * - onAccept(idx): Accept action
 * - onReject(idx): Reject/Delete action
 * - onEdit(idx): Edit/Modify action
 * - onView(idx): View/scroll to PDF box
 */
export default function RedactionSidebar({
  redactions = [],
  onAccept,
  onReject,
  onEdit,
  onView,
}) {
  // Collapsed state for sidebar
  const [collapsed, setCollapsed] = useState(false);

  // Status color codes
  const statusColors = {
    Suggested: "#e0e7ff",
    Accepted: "#bbf7d0",
    Modified: "#fef9c3",
    Rejected: "#fecaca",
  };
  // Type color codes
  const typeColors = {
    Email: "#60a5fa",
    Phone: "#f59e42",
    Name: "#34d399",
    Default: "#d1d5db",
  };

  // Sidebar container styles (affixed/floating)
  const sidebarStyle = {
    position: "fixed",
    top: "64px", // below header
    right: "0",
    width: collapsed ? "48px" : "320px",
    height: "calc(100vh - 64px)",
    background: "#f9fafb",
    boxShadow: "-2px 0 8px rgba(0,0,0,0.06)",
    zIndex: 100,
    transition: "width 0.3s",
    overflowY: "auto",
    borderLeft: "1px solid #e5e7eb",
  };

  // Card layout for each redaction
  function RedactionCard({ r, idx }) {
    return (
      <div
        style={{
          background: statusColors[r.status] || statusColors.Suggested,
          borderRadius: "8px",
          margin: "8px",
          padding: "12px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          display: "flex",
          flexDirection: "column",
          border: `2px solid ${typeColors[r.type] || typeColors.Default}`,
        }}
      >
        {/* Entity type and color */}
        <div
          style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}
        >
          <span
            style={{
              background: typeColors[r.type] || typeColors.Default,
              color: "#fff",
              borderRadius: "4px",
              padding: "2px 8px",
              fontWeight: "bold",
              fontSize: "0.95em",
              marginRight: "8px",
            }}
          >
            {r.type || "Entity"}
          </span>
          <span style={{ fontSize: "0.9em", color: "#6b7280" }}>
            Page {r.page}
          </span>
        </div>
        {/* Text snippet */}
        <div style={{ fontSize: "1em", marginBottom: "6px", color: "#374151" }}>
          {r.entity?.length > 32 ? r.entity.slice(0, 32) + "..." : r.entity}
        </div>
        {/* Status */}
        <div
          style={{ fontSize: "0.85em", color: "#2563eb", marginBottom: "8px" }}
        >
          Status: <b>{r.status || "Suggested"}</b>
        </div>
        {/* Inline action buttons */}
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            style={{
              background: "#22c55e",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              padding: "4px 8px",
              cursor: "pointer",
            }}
            onClick={() => onAccept(idx)}
            title="Accept"
          >
            ✓ Accept
          </button>
          <button
            style={{
              background: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              padding: "4px 8px",
              cursor: "pointer",
            }}
            onClick={() => onReject(idx)}
            title="Reject/Delete"
          >
            ✗ Delete
          </button>
          <button
            style={{
              background: "#f59e42",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              padding: "4px 8px",
              cursor: "pointer",
            }}
            onClick={() => onEdit(idx)}
            title="Edit/Modify"
          >
            ✎ Edit
          </button>
          <button
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              padding: "4px 8px",
              cursor: "pointer",
            }}
            onClick={() => onView(idx)}
            title="View"
          >
            👁 View
          </button>
        </div>
      </div>
    );
  }

  // Collapsible button (animated)
  const collapseBtnStyle = {
    position: "absolute",
    left: "-40px",
    top: "16px",
    background: "#f3f4f6",
    border: "1px solid #e5e7eb",
    borderRadius: "20px",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    transition: "left 0.3s",
    zIndex: 101,
  };

  return (
    <aside style={sidebarStyle}>
      {/* Collapsible Show/Hide button */}
      <button
        style={collapseBtnStyle}
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? "Show Sidebar" : "Hide Sidebar"}
      >
        {/* Arrow icon (animated) */}
        <span
          style={{
            fontSize: "1.5em",
            transition: "transform 0.3s",
            transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          {collapsed ? "→" : "←"}
        </span>
      </button>
      {/* Sidebar content (hidden if collapsed) */}
      {!collapsed && (
        <div style={{ padding: "12px 8px" }}>
          <h2
            style={{
              fontWeight: "bold",
              fontSize: "1.2em",
              marginBottom: "12px",
              color: "#1e293b",
            }}
          >
            Redaction Suggestions
          </h2>
          {/* List of redactions */}
          {redactions.length === 0 ? (
            <div style={{ color: "#6b7280", fontSize: "0.95em" }}>
              No suggestions yet.
            </div>
          ) : (
            redactions.map((r, idx) => (
              <RedactionCard r={r} idx={idx} key={idx} />
            ))
          )}
        </div>
      )}
    </aside>
  );
}
