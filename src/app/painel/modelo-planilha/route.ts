import ExcelJS from "exceljs";
import { IMPORT_COLUMNS } from "@/lib/import";

/** Planilha modelo para importar imóveis (P-08). */
export async function GET() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Konexya";
  const sheet = wb.addWorksheet("Imóveis");
  sheet.columns = IMPORT_COLUMNS.map((c) => ({ header: c.label, key: c.key, width: Math.max(14, c.label.length + 4) }));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const help = wb.addWorksheet("Como preencher");
  help.columns = [
    { header: "Coluna", key: "col", width: 26 },
    { header: "Como preencher", key: "hint", width: 110 },
  ];
  help.getRow(1).font = { bold: true };
  for (const c of IMPORT_COLUMNS) help.addRow({ col: c.label, hint: c.hint || "Opcional" });
  help.addRow({});
  help.addRow({ col: "Obrigatórios", hint: "Nome do anúncio, Tipo, Bairro e Valor." });
  help.addRow({ col: "Selo", hint: "Ganha o selo quem tem 5 fotos, área, valor, condomínio, IPTU, descrição com 200 caracteres e localização." });
  const buffer = await wb.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="konexya-modelo-imoveis.xlsx"',
    },
  });
}
