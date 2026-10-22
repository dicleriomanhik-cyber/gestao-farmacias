export default function LoadingState({ message = "A carregar…" }: { message?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "3rem", color: "#6b7280" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
        <div
          style={{
            width: "2rem",
            height: "2rem",
            border: "3px solid #e5e7eb",
            borderTopColor: "#2563eb",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <span>{message}</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
