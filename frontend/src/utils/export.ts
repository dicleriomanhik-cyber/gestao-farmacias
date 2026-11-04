import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportToExcel<T extends Record<string, any>>(
  filename: string,
  headers: string[],
  rows: T[],
  sheetName = "Dados"
) {
  const data = [headers, ...rows.map((r) => Object.values(r))];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToPDF(
  filename: string,
  title: string,
  headers: string[],
  rows: (string | number)[][]
) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-PT")}`, 14, 28);

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 34,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59] },
  });

  doc.save(`${filename}.pdf`);
}
