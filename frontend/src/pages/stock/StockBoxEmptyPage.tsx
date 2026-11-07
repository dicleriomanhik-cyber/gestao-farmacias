export default function StockBoxEmptyPage() {
  return (
    <div style={{ width: "100%", maxWidth: 1060, margin: "0 auto", boxSizing: "border-box" }}>
      <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: "3rem 1.5rem", textAlign: "center" }}>
        <p style={{ fontSize: "1.05rem", fontWeight: 600, color: "#1d2433", margin: "0 0 0.5rem" }}>Nenhuma caixa registada.</p>
        <p style={{ fontSize: "0.9rem", color: "#6b7280", margin: 0 }}>Não há detalhe para mostrar. Quando receberes mercadoria ou registares uma caixa, o detalhe aparece aqui.</p>
      </div>
    </div>
  );
}