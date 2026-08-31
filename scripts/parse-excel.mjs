import XLSX from "xlsx";
import { writeFileSync } from "fs";

const excelPath = "c:\\Users\\radhi\\Downloads\\Copy of பஞ்சபட்சி.xlsx";
const wb = XLSX.readFile(excelPath);

console.log("SHEETS:", wb.SheetNames);

const allData = {};

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  allData[name] = rows;
  console.log(`\n=== ${name} (${rows.length} rows) ===`);
  rows.slice(0, 120).forEach((row, i) => {
    const line = row.map((c) => String(c ?? "").trim()).filter(Boolean).join(" | ");
    if (line) console.log(`R${i + 1}: ${line}`);
  });
}

writeFileSync("scripts/excel-raw.json", JSON.stringify(allData, null, 2));
console.log("\nWrote scripts/excel-raw.json");
