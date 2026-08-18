import { jsPDF } from "jspdf";
import { saveAs } from "file-saver";

export interface DREItemExport {
  label: string;
  type: "header" | "item" | "subtotal" | "total" | "margin";
  value: number | string;
  isNegative?: boolean;
}

export interface AccountingExportData {
  companyName: string;
  periodLabel: string;
  regime: "competencia" | "caixa";
  generatedAt: string;
  totals: {
    revenue: number;
    directCosts: number;
    grossProfit: number;
    grossMargin: number;
    opex: number;
    netProfit: number;
    netMargin: number;
  };
  dreRows: DREItemExport[];
  revenueRecords: Array<{
    date: string;
    project: string;
    client: string;
    serviceType: string;
    amount: number;
    status: string;
  }>;
  expenseRecords: Array<{
    date: string;
    description: string;
    category: string;
    nature: string;
    projectOrCompany: string;
    amount: number;
    status: string;
  }>;
  freelancerRecords: Array<{
    date: string;
    freelancerName: string;
    projectName: string;
    amount: number;
    status: string;
  }>;
}

function formatCurrency(val: number | string): string {
  const num = typeof val === "string" ? parseFloat(val) || 0 : val;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

/**
 * Gera um PDF executivo timbrado profissional em folha A4 com jsPDF
 */
export function exportAccountingPDF(data: AccountingExportData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const margin = 14;
  let y = 18;

  // Header Timbrado
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("DELSKI CLOUD", margin, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("RELATÓRIO GERENCIAL & DEMONSTRAÇÃO DO RESULTADO (DRE)", margin, 18);
  doc.text(`Período: ${data.periodLabel} • Regime: ${data.regime === "competencia" ? "Competência" : "Caixa"}`, margin, 23);

  doc.setFontSize(8);
  doc.text(`Emissão: ${data.generatedAt}`, pageWidth - margin - 42, 23);

  y = 38;

  // Quadro de Resumo Executivo (4 Mini Cards)
  const cardW = (pageWidth - margin * 2 - 9) / 4;
  const cardH = 20;

  const cards = [
    { title: "RECEITA BRUTA", val: formatCurrency(data.totals.revenue), color: [37, 99, 235] },
    { title: "LUCRO BRUTO", val: formatCurrency(data.totals.grossProfit), sub: `Margem: ${data.totals.grossMargin.toFixed(1)}%`, color: [16, 185, 129] },
    { title: "DESPESAS OPEX", val: formatCurrency(data.totals.opex), color: [239, 68, 68] },
    { title: "LUCRO LÍQUIDO", val: formatCurrency(data.totals.netProfit), sub: `Margem: ${data.totals.netMargin.toFixed(1)}%`, color: [99, 102, 241] },
  ];

  cards.forEach((c, idx) => {
    const cx = margin + idx * (cardW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cx, y, cardW, cardH, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(c.title, cx + 3, y + 5);

    doc.setFontSize(9.5);
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.val, cx + 3, y + 12);

    if (c.sub) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(c.sub, cx + 3, y + 17);
    }
  });

  y += cardH + 10;

  // Tabela DRE Formatada
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Estrutura da DRE Gerencial", margin, y);
  y += 5;

  // Cabeçalho da Tabela
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 7, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("CONTA / DISCRIMINAÇÃO", margin + 3, y + 4.5);
  doc.text("VALOR (R$)", pageWidth - margin - 25, y + 4.5, { align: "right" });
  y += 7;

  // Linhas da DRE
  data.dreRows.forEach((row, i) => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    const isEven = i % 2 === 0;
    if (isEven && row.type !== "total" && row.type !== "header") {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y, pageWidth - margin * 2, 6, "F");
    }

    if (row.type === "header") {
      doc.setFillColor(226, 232, 240);
      doc.rect(margin, y, pageWidth - margin * 2, 6.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(row.label, margin + 3, y + 4.5);
      doc.text(typeof row.value === "number" ? formatCurrency(row.value) : String(row.value), pageWidth - margin - 3, y + 4.5, { align: "right" });
      y += 6.5;
      return;
    }

    if (row.type === "total" || row.type === "subtotal") {
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, y, pageWidth - margin * 2, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(row.type === "total" ? 15 : 51, row.type === "total" ? 23 : 65, row.type === "total" ? 42 : 85);
      doc.text(row.label, margin + 3, y + 4.8);
      doc.text(typeof row.value === "number" ? formatCurrency(row.value) : String(row.value), pageWidth - margin - 3, y + 4.8, { align: "right" });
      y += 7;
      return;
    }

    if (row.type === "margin") {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`   ${row.label}`, margin + 5, y + 4);
      doc.text(String(row.value), pageWidth - margin - 3, y + 4, { align: "right" });
      y += 5.5;
      return;
    }

    // Linha normal de item
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`   • ${row.label}`, margin + 6, y + 4);

    const formattedVal = typeof row.value === "number"
      ? (row.isNegative ? `-${formatCurrency(row.value)}` : formatCurrency(row.value))
      : String(row.value);

    doc.setTextColor(row.isNegative ? 220 : 51, row.isNegative ? 38 : 65, row.isNegative ? 38 : 85);
    doc.text(formattedVal, pageWidth - margin - 3, y + 4, { align: "right" });
    y += 5.5;
  });

  y += 10;
  if (y > 250) {
    doc.addPage();
    y = 25;
  }

  // Bloco de Assinatura & Fechamento
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  const signW = 70;
  const signX1 = margin + 10;
  const signX2 = pageWidth - margin - signW - 10;

  doc.line(signX1, y, signX1 + signW, y);
  doc.line(signX2, y, signX2 + signW, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("DELSKI CLOUD — GESTÃO FINANCEIRA", signX1 + signW / 2, y + 4, { align: "center" });
  doc.text("RESPONSÁVEL CONTÁBIL / DIRETORIA", signX2 + signW / 2, y + 4, { align: "center" });

  // Download do arquivo
  doc.save(`DRE_DelskiCloud_${data.periodLabel.replace(/\s+/g, "_")}.pdf`);
}

/**
 * Gera e baixa uma planilha contábil completa (CSV com UTF-8 BOM e estruturação por blocos)
 */
export function exportAccountingCSV(data: AccountingExportData) {
  let csv = "\uFEFF"; // UTF-8 BOM para garantir acentuação no Excel

  // Cabeçalho da Empresa
  csv += `DELSKI CLOUD - RELATÓRIO CONTÁBIL & FINANCEIRO\n`;
  csv += `Período de Apuração;${data.periodLabel}\n`;
  csv += `Regime;${data.regime === "competencia" ? "Competência (DRE)" : "Caixa (DFC)"}\n`;
  csv += `Data de Emissão;${data.generatedAt}\n\n`;

  // ── SEÇÃO 1: DRE SINTÉTICA ──────────────────────────────────────────
  csv += `=== 1. DEMONSTRAÇÃO DO RESULTADO (DRE) ===\n`;
  csv += `Conta / Discriminação;Valor (R$)\n`;

  data.dreRows.forEach((r) => {
    const valFormatted = typeof r.value === "number"
      ? (r.isNegative ? -r.value : r.value).toFixed(2).replace(".", ",")
      : String(r.value);
    csv += `"${r.label}";"${valFormatted}"\n`;
  });
  csv += `\n`;

  // ── SEÇÃO 2: LIVRO DE RECEITAS ─────────────────────────────────────
  csv += `=== 2. LIVRO ANALÍTICO DE RECEITAS & PROJETOS ===\n`;
  csv += `Data;Projeto;Cliente;Tipo de Serviço;Valor (R$);Status\n`;
  data.revenueRecords.forEach((rec) => {
    csv += `"${rec.date}";"${rec.project}";"${rec.client}";"${rec.serviceType}";"${rec.amount.toFixed(2).replace(".", ",")}";"${rec.status}"\n`;
  });
  csv += `\n`;

  // ── SEÇÃO 3: LIVRO DE DESPESAS ─────────────────────────────────────
  csv += `=== 3. LIVRO ANALÍTICO DE DESPESAS & OPEX ===\n`;
  csv += `Data / Vencimento;Descrição;Categoria;Tipo de Gasto;Centro de Custo / Projeto;Valor (R$);Status\n`;
  data.expenseRecords.forEach((exp) => {
    csv += `"${exp.date}";"${exp.description}";"${exp.category}";"${exp.nature}";"${exp.projectOrCompany}";"${exp.amount.toFixed(2).replace(".", ",")}";"${exp.status}"\n`;
  });
  csv += `\n`;

  // ── SEÇÃO 4: EXTRATO DE FREELANCERS ────────────────────────────────
  csv += `=== 4. EXTRATO DE REPASSES A PRESTADORES DE SERVIÇO ===\n`;
  csv += `Data;Prestador / Freelancer;Projeto;Valor (R$);Status\n`;
  data.freelancerRecords.forEach((fl) => {
    csv += `"${fl.date}";"${fl.freelancerName}";"${fl.projectName}";"${fl.amount.toFixed(2).replace(".", ",")}";"${fl.status}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, `Pacote_Contabil_Delski_${data.periodLabel.replace(/\s+/g, "_")}.csv`);
}
