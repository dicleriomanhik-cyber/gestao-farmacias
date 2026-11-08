import { useEffect, useState } from "react";
import {
  getReportSummary,
  getReportSales,
  getReportExpenses,
  getReportCash,
  getReportStock,
} from "../../services/reportService";
import { getReturns } from "../../services/returnService";
import type {
  ReportSummaryData,
  ReportSalesData,
  ReportExpensesData,
  ReportStockData,
} from "../../types/reports";
import type { SaleReturn } from "../../types/returns";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";

import CustomSelect from '../../components/ui/CustomSelect';
import { useAuth } from "../../hooks/useAuth";
import { canAccessFinancialReports } from "../../utils/permissions";
import { formatDate } from '../../utils/formatDate';
import { allRefunds, refundedAmount } from "../../utils/refundStatus";
import { categoryLabel, methodLabel } from "../../utils/expenseLabels";

function money(v: string | number | undefined | null): string {
  if (v === undefined || v === null) return "0.00";
  return parseFloat(String(v)).toFixed(2);
}

function opName(r: unknown): string {
  return (r as { operatorName?: string | null }).operatorName || "—";
}

const PAID_FROM_LABELS: Record<string, string> = {
  PHARMACY_CASH: "Caixa da farmácia",
  OWNER_CASH: "Dinheiro do dono ou do colaborador",
  BANK: "Banco / transferência",
  MPESA: "M-Pesa",
  EMOLA: "e-Mola",
  OTHER: "Outro",
};

type DateFilter = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM" | "ALL";

function rangeFor(f: DateFilter, cs: string, ce: string): { startDate: string; endDate: string } | undefined {
  if (f === "ALL") return undefined;
  const now = new Date();
  let a = new Date(now);
  a.setHours(0, 0, 0, 0);
  let b = new Date(now);
  b.setHours(23, 59, 59, 999);
  if (f === "WEEKLY") {
    a.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  } else if (f === "MONTHLY") {
    a = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (f === "YEARLY") {
    a = new Date(now.getFullYear(), 0, 1);
  } else if (f === "CUSTOM") {
    if (!cs || !ce) return undefined;
    a = new Date(cs + "T00:00:00");
    b = new Date(ce + "T23:59:59.999");
    if (a > b) return undefined;
  }
  return { startDate: a.toISOString(), endDate: b.toISOString() };
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ReportSummaryData | null>(null);
  const [sales, setSales] = useState<ReportSalesData | null>(null);
  const [expenses, setExpenses] = useState<ReportExpensesData | null>(null);
  const [stock, setStock] = useState<ReportStockData | null>(null);
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<SaleReturn | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const canFinancial = canAccessFinancialReports(user?.permissions);

  const [dateFilter, setDateFilter] = useState<DateFilter>("DAILY");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [paidFromFilter, setPaidFromFilter] = useState("ALL");

  function load() {
    const rg = rangeFor(dateFilter, customStart, customEnd);
    setLoading(true);
    setError(false);
    Promise.all([
      getReportSummary(),
      getReportSales(rg),
      canFinancial ? getReportExpenses(rg) : Promise.resolve(null),
      canFinancial ? getReportCash() : Promise.resolve(null),
      getReportStock(),
      getReturns({ limit: 1000 }),
    ])
      .then(([s, sa, e, _, st, r]) => {
        setSummary(s);
        setSales(sa);
        setExpenses(e);
        setStock(st);
        setReturns(r.data);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, customStart, customEnd]);

  if (loading && !summary) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar os relatórios." onRetry={load} />;

  const now = new Date();
  function isWithinPeriod(dateStr: string) {
    const d = new Date(dateStr);
    if (dateFilter === "DAILY") return d.toLocaleDateString("pt-PT") === now.toLocaleDateString("pt-PT");
    if (dateFilter === "WEEKLY") {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
      start.setHours(0, 0, 0, 0);
      return d >= start;
    }
    if (dateFilter === "MONTHLY") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (dateFilter === "YEARLY") return d.getFullYear() === now.getFullYear();
    if (dateFilter === "CUSTOM") {
      let ok = true;
      if (customStart) {
        const start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
        if (d < start) ok = false;
      }
      if (customEnd) {
        const end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
        if (d > end) ok = false;
      }
      return ok;
    }
    return true;
  }

  const filteredSalesList = sales?.sales.filter(s => isWithinPeriod(s.createdAt)) ?? [];
  const periodExpensesList = expenses?.expenses.filter(e => isWithinPeriod(e.expenseDate)) ?? [];
  const filteredExpensesList = paidFromFilter === "ALL" ? periodExpensesList : periodExpensesList.filter(e => (e.paidFrom ?? "OTHER") === paidFromFilter);
  const filteredReturnsList = returns.filter(r => isWithinPeriod(r.createdAt) && r.status !== "CANCELLED" && (r.lines ?? []).some((l: any) => refundedAmount(r, l) > 0));

  const grossSales = filteredSalesList.reduce((acc, s) => acc + parseFloat(s.total), 0);
  const totalRefunds = allRefunds(returns).filter((f) => isWithinPeriod(f.createdAt)).reduce((acc, f) => acc + f.amount, 0);
  const totalSales = grossSales - totalRefunds;
  const totalExpenses = filteredExpensesList.reduce((acc, e) => acc + parseFloat(e.amount), 0);
  const expiringLots = (stock?.products ?? []).flatMap((p) => p.lots.filter((l) => l.status === "NEAR_EXPIRY" || l.status === "EXPIRED").map((l) => ({ ...l, productName: p.productName })));
  const expiredCount = expiringLots.filter((l) => l.status === "EXPIRED").length;
  const lowStockProducts: { productId: string; productName: string; totalAvailable: number }[] = (stock as any)?.lowStockProducts ?? [];
  const goTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const cardProps = (id: string) => ({ role: "button" as const, tabIndex: 0, onClick: () => goTo(id), onKeyDown: (e: { key: string }) => { if (e.key === "Enter" || e.key === " ") goTo(id); }, style: { padding: "1rem", cursor: "pointer" } });


  async function handleExportPDF() {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Relatório Completo de Gestão", 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-PT")}`, 14, 28);
    doc.text(`Período: ${dateFilter === "DAILY" ? "Hoje" : dateFilter === "WEEKLY" ? "Esta Semana" : dateFilter === "MONTHLY" ? "Este Mês" : dateFilter === "YEARLY" ? "Este Ano" : dateFilter === "ALL" ? "Tudo" : `${customStart} a ${customEnd}`}`, 14, 34);

    let y = 40;
    doc.setFontSize(14);
    doc.text("Resumo Financeiro", 14, y);
    autoTable(doc, { startY: y + 4, head: [["Métrica", "Valor"]], body: [
      ["Total Vendas", totalSales.toFixed(2) + " MT"],
      ["Total Despesas", totalExpenses.toFixed(2) + " MT"],
      ["Lucro / Prejuízo", (totalSales - totalExpenses).toFixed(2) + " MT"],
    ], styles: { fontSize: 9 }, headStyles: { fillColor: [30, 41, 59] } });
    y = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(14);
    doc.text("Vendas", 14, y);
    autoTable(doc, { startY: y + 4, head: [["Nº", "Data", "Total", "Colaborador"]], body: filteredSalesList.map(s => [s.saleNumber, formatDate(s.createdAt), parseFloat(s.total).toFixed(2) + " MT", s.operatorName || "—"]), styles: { fontSize: 9 }, headStyles: { fillColor: [22, 101, 52] } });
    y = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(14);
    doc.text("Despesas", 14, y);
    autoTable(doc, { startY: y + 4, head: [["Data", "Descrição", "Categoria", "Método", "Valor"]], body: filteredExpensesList.map(e => [formatDate(e.expenseDate), e.description, categoryLabel(e.category), methodLabel(e.method), parseFloat(e.amount).toFixed(2) + " MT"]), styles: { fontSize: 9 }, headStyles: { fillColor: [153, 27, 27] } });
    y = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(14);
    doc.text("Devoluções", 14, y);
    autoTable(doc, { startY: y + 4, head: [["Nº", "Venda", "Motivo", "Total", "Colaborador"]], body: filteredReturnsList.map(r => [r.returnNumber, r.sale?.saleNumber ?? "—", r.reason, parseFloat(r.totalRefund).toFixed(2) + " MT", opName(r)]), styles: { fontSize: 9 }, headStyles: { fillColor: [202, 138, 4] } });
    y = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(14);
    doc.text("Stock", 14, y);
    autoTable(doc, { startY: y + 4, head: [["Produto", "Disponível", "Valor"]], body: (stock?.products ?? []).map(p => [p.productName, p.totalAvailable, parseFloat(p.totalValue).toFixed(2) + " MT"]), styles: { fontSize: 9 }, headStyles: { fillColor: [30, 64, 175] } });

    doc.save("relatorio-completo.pdf");
  }

  return (
    <div>
      <div style={{ position: "sticky", top: 0, zIndex: 50, backgroundColor: "#f1f5f9", paddingBottom: "1rem", paddingTop: "0.5rem", boxShadow: "0 -1.5rem 0 #f1f5f9, 0 4px 6px -1px rgba(0,0,0,0.05)" }}>
        <div className="card" style={{ padding: "1rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" }}>
          <div style={{ width: "220px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, marginBottom: "0.25rem", color: "#475569" }}>Período</label>
            <CustomSelect
              value={dateFilter}
              onChange={(val) => setDateFilter(val as DateFilter)}
              options={[
                { value: "DAILY", label: "Hoje" },
                { value: "WEEKLY", label: "Esta Semana" },
                { value: "MONTHLY", label: "Este Mês" },
                { value: "YEARLY", label: "Este Ano" },
                { value: "CUSTOM", label: "Personalizado" },
                { value: "ALL", label: "Ver Tudo" },
              ]}
              style={{ width: "100%", fontSize: "0.85rem", padding: "0.4rem 0.6rem" }}
            />
          </div>

          {canFinancial && (
            <div style={{ width: "260px" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, marginBottom: "0.25rem", color: "#475569" }}>Pago com</label>
              <CustomSelect
                value={paidFromFilter}
                onChange={setPaidFromFilter}
                options={[{ value: "ALL", label: "Todas as origens" }, ...Object.entries(PAID_FROM_LABELS).map(([value, label]) => ({ value, label }))]}
                style={{ width: "100%", fontSize: "0.85rem", padding: "0.4rem 0.6rem" }}
              />
            </div>
          )}

          {dateFilter === "CUSTOM" && (
            <>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, marginBottom: "0.25rem", color: "#475569" }}>Início</label>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="input" style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, marginBottom: "0.25rem", color: "#475569" }}>Fim</label>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="input" style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
              </div>
            </>
          )}

          <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
            <button onClick={handleExportPDF} className="btn btn-secondary" disabled={loading}>{"\u{1F4C4} PDF"}</button>
            <button onClick={load} className="btn btn-secondary" disabled={loading}>
              {loading ? "A carregar…" : "Actualizar"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem", marginTop: "1rem" }}>
        <div className="card" {...cardProps("sec-vendas")}>
          <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Total Vendas</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#166534" }}>{money(totalSales)} MT</p>
          <small style={{ color: "#6b7280" }}>{filteredSalesList.length} vendas{totalRefunds > 0 ? ` · devolvido ${money(totalRefunds)} MT` : ""}</small>
        </div>
        {canFinancial && (
          <div className="card" {...cardProps("sec-despesas")}>
            <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Total Despesas</h3>
            <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#b91c1c" }}>{money(totalExpenses)} MT</p>
            <small style={{ color: "#6b7280" }}>{filteredExpensesList.length} despesas</small>
          </div>
        )}
        <div className="card" {...cardProps("sec-expirar")}>
          <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Lotes a Expirar</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: expiringLots.length > 0 ? "#b91c1c" : "#166534" }}>{expiringLots.length}</p>
          <small style={{ color: "#6b7280" }}>{expiredCount > 0 ? `${expiredCount} já expirados` : "a expirar em breve"}</small>
        </div>
        <div className="card" {...cardProps("sec-stockbaixo")}>
          <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Stock Baixo</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: lowStockProducts.length > 0 ? "#b45309" : "#166534" }}>{lowStockProducts.length}</p>
          <small style={{ color: "#6b7280" }}>produtos com pouco stock</small>
        </div>
      </div>

      {canFinancial && filteredExpensesList.length === 0 && (
        <div id="sec-despesas" className="card" style={{ padding: "1rem", marginBottom: "1.5rem", scrollMarginTop: "140px" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Despesas</h2>
          <p style={{ color: "#6b7280" }}>Sem despesas no período.</p>
        </div>
      )}

      {canFinancial && filteredExpensesList.length > 0 && (
        <div id="sec-despesas" className="card" style={{ padding: "1rem", marginBottom: "1.5rem", overflowX: "auto", scrollMarginTop: "140px" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem" }}>Despesas</h2>
          <table className="table" style={{ tableLayout: "fixed", width: "100%" }}>
            <thead>
              <tr><th style={{ width: "13%" }}>Data</th><th style={{ width: "19%" }}>Categoria</th><th style={{ width: "12%" }}>Método</th><th style={{ width: "24%" }}>Pago com</th><th style={{ width: "14%" }}>Valor</th><th style={{ width: "8%" }}>%</th><th style={{ width: "10%" }}>Acções</th></tr>
            </thead>
            <tbody>
              {filteredExpensesList.map((e) => (
                <tr key={e.id}>
                  <td>{formatDate(e.expenseDate)}</td>
                  <td>{categoryLabel(e.category)}</td>
                  <td>{methodLabel(e.method)}</td>
                  <td>{PAID_FROM_LABELS[e.paidFrom ?? "OTHER"] ?? e.paidFrom}</td>
                  <td>{money(e.amount)} MT</td>
                  <td>{totalExpenses > 0 ? ((parseFloat(e.amount) / totalExpenses) * 100).toFixed(1) : "0.0"}%</td>
                  <td><button onClick={() => setSelectedExpense(e)} className="btn-soft">Ver</button></td>
                </tr>
              ))}
              <tr style={{ fontWeight: "bold" }}>
                <td colSpan={4}>Total ({filteredExpensesList.length} despesas)</td>
                <td>{money(totalExpenses)} MT</td>
                <td>100.0%</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {filteredSalesList.length === 0 && (
        <div id="sec-vendas" className="card" style={{ padding: "1rem", marginBottom: "1.5rem", scrollMarginTop: "140px" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Vendas</h2>
          <p style={{ color: "#6b7280" }}>Sem vendas no período.</p>
        </div>
      )}

      {filteredSalesList.length > 0 && (
        <div id="sec-vendas" className="card" style={{ padding: "1rem", marginBottom: "1.5rem", overflowX: "auto", scrollMarginTop: "140px" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem" }}>Vendas</h2>
          <table className="table" style={{ tableLayout: "fixed", width: "100%" }}>
            <thead>
              <tr><th style={{ width: "15%" }}>Nº</th><th style={{ width: "20%" }}>Data</th><th style={{ width: "20%" }}>Total</th><th style={{ width: "30%" }}>Colaborador</th></tr>
            </thead>
            <tbody>
              {filteredSalesList.map((s) => (
                <tr key={s.id}>
                  <td>{s.saleNumber}</td>
                  <td>{formatDate(s.createdAt)}</td>
                  <td>{money(s.total)} MT</td>
                  <td>{s.operatorName || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredReturnsList.length > 0 && (
        <div className="card" style={{ padding: "1rem", marginBottom: "1.5rem", overflowX: "auto" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem" }}>Devoluções do Período</h2>
          <table className="table" style={{ tableLayout: "fixed", width: "100%" }}>
            <thead>
              <tr><th style={{ width: "12%" }}>Nº</th><th style={{ width: "12%" }}>Venda</th><th style={{ width: "30%" }}>Motivo</th><th style={{ width: "16%" }}>Total</th><th style={{ width: "15%" }}>Colaborador</th><th style={{ width: "15%" }}>Acções</th></tr>
            </thead>
            <tbody>
              {filteredReturnsList.map((r) => (
                <tr key={r.id}>
                  <td>{r.returnNumber}</td>
                  <td>{r.sale?.saleNumber ?? "—"}</td>
                  <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.reason}>{r.reason}</td>
                  <td>{money(r.totalRefund)} MT</td>
                  <td>{opName(r)}</td>
                  <td>
                    <button onClick={() => setSelectedReturn(r)} className="btn-soft">
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div id="sec-expirar" className="card" style={{ padding: "1rem", marginBottom: "1.5rem", overflowX: "auto", scrollMarginTop: "140px" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem" }}>Lotes a Expirar</h2>
        {expiringLots.length === 0 ? (
          <p style={{ color: "#6b7280" }}>Nenhum lote a expirar.</p>
        ) : (
          <table className="table" style={{ tableLayout: "fixed", width: "100%" }}>
            <thead>
              <tr><th style={{ width: "34%" }}>Produto</th><th style={{ width: "18%" }}>Lote</th><th style={{ width: "16%" }}>Validade</th><th style={{ width: "14%" }}>Quantidade</th><th style={{ width: "18%" }}>Estado</th></tr>
            </thead>
            <tbody>
              {expiringLots.map((l) => (
                <tr key={l.id}>
                  <td>{l.productName}</td>
                  <td>{l.lotNumber}</td>
                  <td>{l.expiryDate ? formatDate(l.expiryDate) : "\u2014"}</td>
                  <td>{l.quantityAvailable}</td>
                  <td style={{ fontWeight: 600, color: l.status === "EXPIRED" ? "#b91c1c" : "#b45309" }}>{l.status === "EXPIRED" ? "Expirado" : "A expirar"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div id="sec-stockbaixo" className="card" style={{ padding: "1rem", marginBottom: "1.5rem", overflowX: "auto", scrollMarginTop: "140px" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem" }}>Stock Baixo</h2>
        {lowStockProducts.length === 0 ? (
          <p style={{ color: "#6b7280" }}>Nenhum produto com stock baixo.</p>
        ) : (
          <table className="table" style={{ tableLayout: "fixed", width: "100%" }}>
            <thead>
              <tr><th style={{ width: "70%" }}>Produto</th><th style={{ width: "30%" }}>Disponível</th></tr>
            </thead>
            <tbody>
              {lowStockProducts.map((p) => (
                <tr key={p.productId}>
                  <td>{p.productName}</td>
                  <td>{p.totalAvailable}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {stock && (
        <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem" }}>Stock</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
            <span><strong>Produtos:</strong> {stock.summary.totalProducts}</span>
            <span><strong>Lotes:</strong> {stock.summary.totalLots}</span>
            <span><strong>Valor:</strong> {money(stock.summary.totalStockValue)} MT</span>
            <span><strong>Expirados:</strong> {stock.summary.expiredLotsCount}</span>
          </div>
          <table className="table" style={{ tableLayout: "fixed", width: "100%" }}>
            <thead>
              <tr><th style={{ width: "50%" }}>Produto</th><th style={{ width: "25%" }}>Disponível</th><th style={{ width: "25%" }}>Valor</th></tr>
            </thead>
            <tbody>
              {stock.products.map((p) => (
                <tr key={p.productId}>
                  <td>{p.productName}</td>
                  <td>{p.totalAvailable}</td>
                  <td>{money(p.totalValue)} MT</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedExpense && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 9999,
          }}
          onClick={() => setSelectedExpense(null)}
        >
          <div
            className="card"
            style={{
              backgroundColor: "white", borderRadius: "12px", padding: "1.5rem",
              maxWidth: "600px", width: "90%", maxHeight: "80vh",
              overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            }}
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem", color: "#1e293b" }}>Detalhes da despesa</h2>
            <p><strong>Data:</strong> {formatDate(selectedExpense.expenseDate)}</p>
            <p><strong>Categoria:</strong> {categoryLabel(selectedExpense.category)}</p>
            <p><strong>Método:</strong> {methodLabel(selectedExpense.method)}</p>
            <p><strong>Pago com:</strong> {PAID_FROM_LABELS[selectedExpense.paidFrom ?? "OTHER"] ?? selectedExpense.paidFrom}</p>
            <p><strong>Valor:</strong> {money(selectedExpense.amount)} MT</p>
            <p style={{ marginTop: "1rem" }}><strong>Descrição:</strong></p>
            <p style={{ backgroundColor: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {selectedExpense.description}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <button
                onClick={() => setSelectedExpense(null)}
                style={{
                  padding: "0.5rem 1rem", backgroundColor: "#e2e8f0",
                  color: "#1e293b", border: "none", borderRadius: "6px",
                  fontWeight: "500", cursor: "pointer",
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedReturn && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 9999,
          }}
          onClick={() => setSelectedReturn(null)}
        >
          <div
            className="card"
            style={{
              backgroundColor: "white", borderRadius: "12px", padding: "1.5rem",
              maxWidth: "600px", width: "90%", maxHeight: "80vh",
              overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem", color: "#1e293b" }}>
              Devolução {selectedReturn.returnNumber}
            </h2>
            <p><strong>Venda:</strong> {selectedReturn.sale?.saleNumber ?? "—"}</p>
            <p><strong>Estado:</strong> {selectedReturn.status}</p>
            <p><strong>Colaborador:</strong> {opName(selectedReturn)}</p>
            <p><strong>Total Reembolso:</strong> {parseFloat(selectedReturn.totalRefund).toFixed(2)} MT</p>
            <p style={{ marginTop: "1rem" }}><strong>Motivo:</strong></p>
            <p style={{ backgroundColor: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {selectedReturn.reason}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <button
                onClick={() => setSelectedReturn(null)}
                style={{
                  padding: "0.5rem 1rem", backgroundColor: "#e2e8f0",
                  color: "#1e293b", border: "none", borderRadius: "6px",
                  fontWeight: "500", cursor: "pointer",
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





