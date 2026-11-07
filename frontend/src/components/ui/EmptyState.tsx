import { Link } from "react-router-dom";

interface EmptyStateProps {
  message: string;
  actionLabel?: string;
  actionLink?: string;
}

export default function EmptyState({ message, actionLabel, actionLink }: EmptyStateProps) {
  return (
    <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
      <p style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>{message}</p>
      {actionLabel && actionLink && (
        <Link
          to={actionLink}
          style={{
            display: "inline-block",
            backgroundColor: "var(--brand)",
            color: "white",
            padding: "0.55rem 1.1rem",
            borderRadius: "999px",
            textDecoration: "none",
          }}
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
