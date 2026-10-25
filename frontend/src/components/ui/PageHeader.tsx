import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
      <div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ color: "#6b7280", margin: "0.25rem 0 0 0", fontSize: "0.875rem" }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}
