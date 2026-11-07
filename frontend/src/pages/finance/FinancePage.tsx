import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import CustomSelect from "../../components/ui/CustomSelect";
import { getFinance, getFinanceDetails } from "../../services/financeService";
import type { FinanceData, FinanceDetails } from "../../types/finance";
import InventoryTab from "./InventoryTab";

type Filter = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM";

const COLORS = ["#166534", "#2563eb", "#b45309", "#7c3aed", "#b91c1c", "#0e7490", "#4d7c0f", "#a21caf"];

const METHOD_LABELS: Record<string, string> = { CASH: "Dinheiro", CARD: "Cartão", MPESA: "M-Pesa", EMOLA: "e-Mola", TRANSFER: "Transferência", OTHER: "Outro" };
const CATEGORY_LABELS: Record<string, string> = { RENT: "Renda", UTILITIES: "Serviços", TRANSPORT: "Transporte", CONSUMABLES: "Consumíveis", MAINTENANCE: "Manutenção", SALARIES: "Salários", TAXES: "Impostos", OTHER: "Outros" };
const ORIGIN_LABELS: Record<string, string> = { PHARMACY_CASH: "Caixa da farmácia", OWNER_CASH: "Dinheiro do dono ou do colaborador", BANK: "Banco / transferência", MPESA: "M-Pesa", EMOLA: "e-Mola", OTHER: "Outro" };

function range(f: Filter, cs: string, ce: string): { from: string; to: string } | null {
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
    if (!cs || !ce) return null;
    a = new Date(cs + "T00:00:00");
    b = new Date(ce + "T23:59:59.999");
    if (a > b) return null;
  }
  return { from: a.toISOString(), to: b.toISOString() };
}

function semCusto(p: { linesNoCost: number; profit: number }): boolean {
  return p.linesNoCost > 0 && p.profit === 0;
}

function mt(v: number): string {
  return v.toFixed(2) + " MT";
}

function pc(v: number | null): string {
  return v === null ? "—" : v.toFixed(1) + "%";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT");
}

function Delta({ v, invert }: { v: number | null; invert?: boolean }) {
  if (v === null) return <small style={{ color: "#94a3b8" }}>sem período anterior para comparar</small>;
  const good = invert ? v <= 0 : v >= 0;
  return (
    <small style={{ color: good ? "#15803d" : "#b91c1c" }}>
      {v > 0 ? "+" : ""}{v}% face ao período anterior
    </small>
  );
}

function Card({ title, value, color, children }: { title: string; value: string; color: string; children?: ReactNode }) {
  return (
    <div className="card" style={{ padding: "1rem" }}>
      <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>{title}</h3>
      <p style={{ fontSize: "1.5rem", fontWeight: "bold", color }}>{value}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>{children}</div>
    </div>
  );
}

function Pie({ items }: { items: { label: string; value: number }[] }) {
  const data = items.filter((i) => i.value > 0);
  const total = data.reduce((a, i) => a + i.value, 0);
  if (total <= 0) return <p style={{ color: "#64748b" }}>Sem dados no período.</p>;
  const cx = 60;
  const cy = 60;
  const r = 56;
  let acc = 0;
  let pctSum = 0;
  const slices = data.map((d, i) => {
    const start = (acc / total) * 2 * Math.PI;
    acc += d.value;
    const end = (acc / total) * 2 * Math.PI;
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.sin(start);
    const y1 = cy - r * Math.cos(start);
    const x2 = cx + r * Math.sin(end);
    const y2 = cy - r * Math.cos(end);
    const path = data.length === 1 ? null : `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`;
    const isLast = i === data.length - 1;
    const p = isLast ? Math.round((100 - pctSum) * 10) / 10 : Math.round((d.value / total) * 1000) / 10;
    pctSum += p;
    return { d, p, path, color: COLORS[i % COLORS.length] };
  });
  return (
    <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
      <svg viewBox="0 0 120 120" width="140" height="140">
        {slices.map((s) =>
          s.path ? <path key={s.d.label} d={s.path} fill={s.color} /> : <circle key={s.d.label} cx={cx} cy={cy} r={r} fill={s.color} />
        )}
      </svg>
      <div style={{ fontSize: "0.85rem" }}>
        {slices.map((s) => (
          <div key={s.d.label} style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.2rem" }}>
            <span style={{ width: 10, height: 10, backgroundColor: s.color, display: "inline-block", borderRadius: 2 }} />
            <span>{s.d.label}: {mt(s.d.value)} ({s.p.toFixed(1)}%)</span>
          </div>
        ))}
        <div style={{ fontWeight: "bold", marginTop: "0.25rem" }}>Total: {mt(total)} (100%)</div>
      </div>
    </div>
  );
}

function Bars({ series, granularity }: { series: FinanceDetails["series"]; granularity: "day" | "month" }) {
  if (series.length === 0) return <p style={{ color: "#64748b" }}>Sem dados no período.</p>;
  const max = Math.max(1, ...series.flatMap((s) => [s.revenue, s.grossProfit, s.expenses]));
  const h = 180;
  const bw = 14;
  const step = 70;
  const w = Math.max(320, series.length * step + 20);
  const label = (k: string) => (granularity === "month" ? k.slice(5, 7) + "/" + k.slice(0, 4) : k.slice(8, 10) + "/" + k.slice(5, 7));
  const bar = (key: string, x: number, v: number, c: string) => {
    const hh = (Math.max(0, v) / max) * h;
    return <rect key={key} x={x} y={h - hh} width={bw} height={hh} fill={c}><title>{mt(v)}</title></rect>;
  };
  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${w} ${h + 24}`} width={w} height={h + 24}>
          {series.map((s, i) => {
            const x = i * step + 10;
            return (
              <g key={s.k}>
                {bar("r", x, s.revenue, "#166534")}
                {bar("g", x + 16, s.grossProfit, "#2563eb")}
                {bar("e", x + 32, s.expenses, "#b91c1c")}
                <text x={x + 24} y={h + 16} fontSize="10" textAnchor="middle" fill="#64748b">{label(s.k)}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
        <span style={{ color: "#166534" }}>■ Vendas</span>
        <span style={{ color: "#2563eb" }}>■ Lucro bruto</span>
        <span style={{ color: "#b91c1c" }}>■ Despesas</span>
      </div>
    </div>
  );
}

function FinanceSummary() {
  const [filter, setFilter] = useState<Filter>("MONTHLY");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [data, setData] = useState<FinanceData | null>(null);
  const [details, setDetails] = useState<FinanceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const r = range(filter, customStart, customEnd);
    if (!r) return undefined;
    let alive = true;
    setLoading(true);
    setError(false);
    Promise.all([getFinance(r.from, r.to), getFinanceDetails(r.from, r.to)])
      .then(([f, d]) => {
        if (alive) {
          setData(f);
          setDetails(d);
        }
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [filter, customStart, customEnd, tick]);

  async function exportPdf() {
    if (!data || !details) return;
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    const c = data.current;
    doc.setFontSize(18);
    doc.text("Finanças", 14, 20);
    doc.setFontSize(10);
    doc.text(`Período: ${fmtDate(data.period.from)} a ${fmtDate(data.period.to)}`, 14, 28);
    autoTable(doc, {
      startY: 34,
      head: [["Métrica", "Valor"]],
      body: [
        ["Vendas", mt(c.revenue)],
        ["Custo das mercadorias", mt(c.cogs)],
        ["Lucro bruto", mt(c.grossProfit)],
        ["Despesas", mt(c.expenses)],
        ["Devoluções", mt(c.returns)],
        ["Lucro líquido", mt(c.netProfit)],
        ["Margem bruta", pc(c.marginGross)],
        ["Margem líquida", pc(c.marginNet)],
        ["Despesas sobre vendas", pc(c.expensesOnSales)],
        ["Taxa de devoluções", pc(c.returnRate)],
        ["Fora das margens (sem custo registado)", `${c.excluded.lines} de ${c.excluded.linesTotal} linhas, ${mt(c.excluded.revenue)}`],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 41, 59] },
    });
    const y = (doc as any).lastAutoTable.finalY + 10;
    autoTable(doc, {
      startY: y,
      head: [["Produto", "Unidades", "Receita", "Lucro"]],
      body: details.products.map((p) => [p.name, p.units, mt(p.revenue), semCusto(p) ? "—" : p.linesNoCost > 0 ? mt(p.profit) + " *" : mt(p.profit)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [22, 101, 52] },
    });
    doc.setFontSize(8);
    doc.text("* inclui apenas linhas com custo registado", 14, (doc as any).lastAutoTable.finalY + 6);
    doc.save("financas.pdf");
  }

  const c = data?.current;
  const byUnits = details ? [...details.products].sort((a, b) => b.units - a.units) : [];
  const byProfit = details ? [...details.products].sort((a, b) => (semCusto(a) ? 1 : 0) - (semCusto(b) ? 1 : 0) || b.profit - a.profit) : [];
  const mostSold = byUnits.slice(0, 5);
  const leastSold = byUnits.length > 5 ? byUnits.slice(-5).reverse() : [];
  const th = { textAlign: "left" as const };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Finanças</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={exportPdf} className="btn btn-secondary" disabled={loading || !data}>{"\u{1F4C4} PDF"}</button>
          <button onClick={() => setTick((t) => t + 1)} className="btn btn-secondary" disabled={loading}>{loading ? "A carregar…" : "Actualizar"}</button>
        </div>
      </div>

      <div className="card" style={{ padding: "1rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" }}>
        <div style={{ width: "220px" }}>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, marginBottom: "0.25rem", color: "#475569" }}>Período</label>
          <CustomSelect
            value={filter}
            onChange={(val) => setFilter(val as Filter)}
            options={[
              { value: "DAILY", label: "Hoje" },
              { value: "WEEKLY", label: "Esta Semana" },
              { value: "MONTHLY", label: "Este Mês" },
              { value: "YEARLY", label: "Este Ano" },
              { value: "CUSTOM", label: "Personalizado" },
            ]}
          />
        </div>
        {filter === "CUSTOM" && (
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
        {data && (
          <small style={{ marginLeft: "auto", color: "#64748b" }}>
            Período anterior: {fmtDate(data.previousPeriod.from)} a {fmtDate(data.previousPeriod.to)}
          </small>
        )}
      </div>

      {error && <p style={{ color: "#b91c1c" }}>Não foi possível carregar as finanças.</p>}

      {data && details && c && !error && (
        <>
          {c.excluded.lines > 0 && (
            <div style={{ padding: "0.75rem 1rem", backgroundColor: "#fef3c7", border: "1px solid #fde68a", borderRadius: "8px", color: "#92400e" }}>
              {c.excluded.lines} de {c.excluded.linesTotal} linhas de venda não têm custo registado ({mt(c.excluded.revenue)} em vendas). Ficaram fora do custo das mercadorias, do lucro bruto e das margens. As despesas e devoluções contam sempre.
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "1rem" }}>
            <Card title="Vendas" value={mt(c.revenue)} color="#166534"><Delta v={data.change.revenue} /></Card>
            <Card title="Custo das mercadorias" value={mt(c.cogs)} color="#475569"><small style={{ color: "#6b7280" }}>só vendas com custo registado</small></Card>
            <Card title="Lucro bruto" value={mt(c.grossProfit)} color={c.grossProfit >= 0 ? "#15803d" : "#b91c1c"}>
              <Delta v={data.change.grossProfit} />
              <small style={{ color: "#6b7280" }}>Margem bruta: {pc(c.marginGross)}</small>
            </Card>
            <Card title="Despesas" value={mt(c.expenses)} color="#b91c1c"><Delta v={data.change.expenses} invert /></Card>
            <Card title="Devoluções" value={mt(c.returns)} color="#b45309"><small style={{ color: "#6b7280" }}>Taxa: {pc(c.returnRate)}</small></Card>
            <Card title="Lucro líquido" value={mt(c.netProfit)} color={c.netProfit >= 0 ? "#15803d" : "#b91c1c"}>
              <Delta v={data.change.netProfit} />
              <small style={{ color: "#6b7280" }}>Margem líquida: {pc(c.marginNet)}</small>
            </Card>
          </div>

          <div className="card" style={{ padding: "1rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "0.75rem" }}>Percentagens</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.5rem" }}>
              <span><strong>Margem bruta:</strong> {pc(c.marginGross)}</span>
              <span><strong>Margem líquida:</strong> {pc(c.marginNet)}</span>
              <span><strong>Despesas sobre vendas:</strong> {pc(c.expensesOnSales)}</span>
              <span><strong>Taxa de devoluções:</strong> {pc(c.returnRate)}</span>
            </div>
          </div>

          <div className="card" style={{ padding: "1rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "0.75rem" }}>Evolução</h2>
            <Bars series={details.series} granularity={details.granularity} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1rem" }}>
            <div className="card" style={{ padding: "1rem" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "0.75rem" }}>Vendas por método de pagamento</h2>
              <Pie items={details.byPaymentMethod.map((m) => ({ label: METHOD_LABELS[m.method] ?? m.method, value: parseFloat(m.total) }))} />
            </div>
            <div className="card" style={{ padding: "1rem" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "0.75rem" }}>Despesas por categoria</h2>
              <Pie items={details.expensesByCategory.map((m) => ({ label: CATEGORY_LABELS[m.category] ?? m.category, value: parseFloat(m.total) }))} />
            </div>
            <div className="card" style={{ padding: "1rem" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "0.75rem" }}>Despesas por origem</h2>
              <Pie items={details.expensesByOrigin.map((m) => ({ label: ORIGIN_LABELS[m.paidFrom] ?? m.paidFrom, value: parseFloat(m.total) }))} />
            </div>
            <div className="card" style={{ padding: "1rem" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "0.75rem" }}>Peso de cada produto no lucro</h2>
              <Pie items={byProfit.map((p) => ({ label: p.name, value: p.profit }))} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1rem" }}>
            <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "0.75rem" }}>Mais vendidos (unidades)</h2>
              <table className="table" style={{ width: "100%" }}>
                <thead><tr><th style={th}>Produto</th><th style={th}>Unid.</th><th style={th}>Receita</th></tr></thead>
                <tbody>
                  {mostSold.map((p) => (<tr key={p.id}><td>{p.name}</td><td>{p.units}</td><td>{mt(p.revenue)}</td></tr>))}
                </tbody>
              </table>
            </div>
            <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "0.75rem" }}>Mais lucro</h2>
              <table className="table" style={{ width: "100%" }}>
                <thead><tr><th style={th}>Produto</th><th style={th}>Lucro</th></tr></thead>
                <tbody>
                  {byProfit.slice(0, 5).map((p) => (<tr key={p.id}><td>{p.name}{p.linesNoCost > 0 ? " *" : ""}</td><td>{semCusto(p) ? "—" : mt(p.profit)}</td></tr>))}
                </tbody>
              </table>
              <small style={{ color: "#6b7280" }}>* só conta as vendas com custo registado</small>
            </div>
            {leastSold.length > 0 && (
              <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "0.75rem" }}>Menos vendidos (unidades)</h2>
                <table className="table" style={{ width: "100%" }}>
                  <thead><tr><th style={th}>Produto</th><th style={th}>Unid.</th><th style={th}>Receita</th></tr></thead>
                  <tbody>
                    {leastSold.map((p) => (<tr key={p.id}><td>{p.name}</td><td>{p.units}</td><td>{mt(p.revenue)}</td></tr>))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: "1rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "0.75rem" }}>Stock</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <span><strong>Valor ao custo:</strong> {mt(details.stock.valueAtCost)}</span>
              <span><strong>Unidades sem custo:</strong> {details.stock.unitsNoCost}</span>
              <span><strong>A expirar em {details.stock.expiringDays} dias:</strong> {mt(details.stock.expiringValue)} ({details.stock.expiringLots} caixas)</span>
              <span><strong>Sem movimento no período:</strong> {details.noMovement.length} produtos</span>
            </div>
            {details.noMovement.length > 0 && (
              <table className="table" style={{ width: "100%" }}>
                <thead><tr><th style={th}>Produto sem vendas no período</th><th style={th}>Unidades em stock</th></tr></thead>
                <tbody>
                  {details.noMovement.map((p) => (<tr key={p.id}><td>{p.name}</td><td>{p.units}</td></tr>))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function FinancePage() {
  const [tab, setTab] = useState<"SUMMARY" | "INVENTORY">("SUMMARY");
  const tabBtn = (k: "SUMMARY" | "INVENTORY", label: string) => (
    <button
      onClick={() => setTab(k)}
      style={{
        padding: "0.6rem 1.25rem",
        border: "none",
        background: "none",
        cursor: "pointer",
        fontWeight: 600,
        color: tab === k ? "#2563eb" : "#64748b",
        borderBottom: tab === k ? "2px solid #2563eb" : "2px solid transparent",
        marginBottom: "-1px",
      }}
    >
      {label}
    </button>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", gap: "0.25rem", borderBottom: "1px solid #e2e8f0" }}>
        {tabBtn("SUMMARY", "Resumo")}
        {tabBtn("INVENTORY", "Inventário")}
      </div>
      {tab === "SUMMARY" ? (
        <FinanceSummary />
      ) : (
        <>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Inventário</h1>
          <InventoryTab />
        </>
      )}
    </div>
  );
}