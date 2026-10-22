interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = "Ocorreu um erro ao carregar os dados.", onRetry }: ErrorStateProps) {
  return (
    <div style={{ textAlign: "center", padding: "3rem", color: "#b91c1c" }}>
      <p style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            backgroundColor: "#b91c1c",
            color: "white",
            padding: "0.5rem 1rem",
            borderRadius: "4px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
