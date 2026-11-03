import type { CSSProperties, ReactNode } from "react";

export const authInput: CSSProperties = {
  width: "100%",
  padding: "0.5rem",
  border: "1px solid #ccc",
  borderRadius: "4px",
  boxSizing: "border-box",
};

export function authButton(loading: boolean): CSSProperties {
  return {
    width: "100%",
    padding: "0.75rem",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: loading ? "not-allowed" : "pointer",
    fontWeight: "bold",
    opacity: loading ? 0.6 : 1,
  };
}

export const authLabel: CSSProperties = { display: "block", marginBottom: "0.5rem", fontWeight: 500 };

export default function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f3f4f6", padding: "1rem" }}>
      <div className="card" style={{ width: "100%", maxWidth: "400px" }}>
        <h1 className="card-title" style={{ textAlign: "center", marginBottom: "1.5rem" }}>{title}</h1>
        {children}
      </div>
    </div>
  );
}