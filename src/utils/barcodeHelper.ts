import { StickerItem } from "../types";

export type BarcodeMode = "full" | "compact" | "single";
export type CodeType = "qrcode" | "barcode1d";

export interface ParsedBarcodeResult {
  isComposite: boolean;
  fieldsFound: number;
  sabCode?: string;
  quantity?: number;
  weight?: string;
  receiveDate?: string;
  expireDate?: string;
  carLicense?: string;
  lpnCode?: string;
  lot?: string;
  productName?: string;
  rawText: string;
}

/**
 * Builds the composite barcode / QR code string containing all requested fields:
 * Sabcode, จำนวน (Qty), น้ำหนัก (Weight), วันที่รับสินค้า (Receive Date), วันที่หมดอายุ (Expire Date), ทะเบียน (Car License)
 */
export function buildCompositeBarcode(
  item: Partial<StickerItem>,
  mode: BarcodeMode = "full"
): string {
  if (mode === "single") {
    return item.barcode || item.lpnCode || "SAMPLE";
  }

  const sab = (item.sabCode || "").trim();
  const qty = item.quantity !== undefined ? item.quantity : 0;
  const wt = (item.weight || "").trim();
  const rec = (item.receiveDate || "").trim();
  const exp = (item.expireDate || "").trim();
  const car = (item.carLicense || "").trim();

  if (mode === "compact") {
    // Pipe-delimited format (machine friendly)
    const parts: string[] = [];
    if (sab) parts.push(`SAB:${sab}`);
    parts.push(`QTY:${qty}`);
    if (wt) parts.push(`WT:${wt}`);
    if (rec) parts.push(`REC:${rec}`);
    if (exp) parts.push(`EXP:${exp}`);
    if (car) parts.push(`CAR:${car}`);
    return parts.join("|");
  }

  // "full" - Clean readable multiline format (ideal for warehouse scanners & smartphone cameras)
  const lines: string[] = [
    `SAB: ${sab || "-"}`,
    `จำนวน: ${qty}`,
    `น้ำหนัก: ${wt || "0"} KG`,
    `วันที่รับ: ${rec || "-"}`,
    `วันหมดอายุ: ${exp || "-"}`,
    `ทะเบียน: ${car || "-"}`,
  ];

  return lines.join("\n");
}

/**
 * Builds a compact 1D Barcode (Code 128) string containing all 6 fields:
 * SAB Code, จำนวน, น้ำหนัก, วันที่รับ, วันหมดอายุ, ทะเบียน
 * Note: 1D barcodes only support ASCII (no Thai characters) and length should be under 40-45 chars
 * to fit nicely across the 4-inch sticker width without scanner reading failures.
 */
export function build1DCompactBarcode(item: Partial<StickerItem>): string {
  // Extract alphanumeric characters for SAB
  const sab = (item.sabCode || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 14);
  const qty = item.quantity !== undefined ? item.quantity : 0;
  // Weight digits
  const wt = (item.weight || "").replace(/[^0-9.]/g, "").slice(0, 6);
  // Clean date to YYMMDD or compact numbers
  const cleanDate = (d?: string) => {
    if (!d) return "";
    const digits = d.replace(/[^0-9]/g, "");
    return digits.length >= 6 ? digits.slice(-6) : digits;
  };
  const rec = cleanDate(item.receiveDate);
  const exp = cleanDate(item.expireDate);
  // Car license plate: keep alphanumeric, numbers and dashes (e.g. 71-2139)
  const car = (item.carLicense || "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 10);

  // Delimited with asterisk (*) standard
  return `${sab || "0"}*${qty}*${wt || "0"}*${rec || "0"}*${exp || "0"}*${car || "0"}`;
}

/**
 * Checks if a string contains composite barcode data
 */
export function isCompositeBarcodeText(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  return (
    (t.includes("\n") && (t.includes("SAB") || t.includes("จำนวน") || t.includes("น้ำหนัก") || t.includes("ทะเบียน") || t.includes("วันที่รับ") || t.includes("วันหมดอายุ"))) ||
    (t.includes("|") && (t.includes("SAB:") || t.includes("QTY:") || t.includes("WT:") || t.includes("REC:") || t.includes("EXP:") || t.includes("CAR:"))) ||
    (t.includes("*") && t.split("*").length >= 4) ||
    (t.startsWith("{") && t.endsWith("}"))
  );
}

/**
 * Parses scanned barcode data (from camera or physical scanner) and extracts all 6 fields
 */
export function parseScannedBarcode(text: string): ParsedBarcodeResult {
  const trimmed = (text || "").trim();
  const result: ParsedBarcodeResult = {
    isComposite: false,
    fieldsFound: 0,
    rawText: trimmed,
  };

  if (!trimmed) return result;

  // 1. JSON parsing check
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const obj = JSON.parse(trimmed);
      let found = 0;
      if (obj.sab || obj.sabCode || obj.sapCode || obj["SAB Code"] || obj["SAP Code"]) {
        result.sabCode = String(obj.sab || obj.sabCode || obj.sapCode || obj["SAB Code"] || obj["SAP Code"]).trim();
        found++;
      }
      if (obj.qty !== undefined || obj.quantity !== undefined || obj["จำนวน"] !== undefined) {
        result.quantity = parseInt(obj.qty ?? obj.quantity ?? obj["จำนวน"], 10) || 0;
        found++;
      }
      if (obj.wt || obj.weight || obj["น้ำหนัก"]) {
        result.weight = String(obj.wt || obj.weight || obj["น้ำหนัก"]).trim();
        found++;
      }
      if (obj.rec || obj.receiveDate || obj["วันที่รับ"] || obj["วันที่รับสินค้า"]) {
        result.receiveDate = String(obj.rec || obj.receiveDate || obj["วันที่รับ"] || obj["วันที่รับสินค้า"]).trim();
        found++;
      }
      if (obj.exp || obj.expireDate || obj["วันหมดอายุ"]) {
        result.expireDate = String(obj.exp || obj.expireDate || obj["วันหมดอายุ"]).trim();
        found++;
      }
      if (obj.car || obj.carLicense || obj["ทะเบียน"] || obj["ทะเบียนรถ"]) {
        result.carLicense = String(obj.car || obj.carLicense || obj["ทะเบียน"] || obj["ทะเบียนรถ"]).trim();
        found++;
      }
      if (obj.lpn || obj.lpnCode || obj["LPN"]) {
        result.lpnCode = String(obj.lpn || obj.lpnCode || obj["LPN"]).trim();
      }

      result.fieldsFound = found;
      if (found >= 2) {
        result.isComposite = true;
      }
      return result;
    } catch {
      // not JSON
    }
  }

  // 2. Compact Asterisk Delimited (1D Barcode format: SAB*QTY*WT*REC*EXP*CAR)
  if (trimmed.includes("*")) {
    const starParts = trimmed.split("*").map(s => s.trim());
    if (starParts.length >= 4) {
      let labeledCount = 0;
      starParts.forEach((part) => {
        if (/^S(?:AB)?:/i.test(part)) { result.sabCode = part.replace(/^S(?:AB)?:/i, "").trim(); labeledCount++; }
        else if (/^Q(?:TY)?:/i.test(part)) { result.quantity = parseInt(part.replace(/^Q(?:TY)?:/i, "").trim(), 10) || 0; labeledCount++; }
        else if (/^W(?:T)?:/i.test(part)) { result.weight = part.replace(/^W(?:T)?:/i, "").trim(); labeledCount++; }
        else if (/^R(?:EC)?:/i.test(part)) { result.receiveDate = part.replace(/^R(?:EC)?:/i, "").trim(); labeledCount++; }
        else if (/^E(?:XP)?:/i.test(part)) { result.expireDate = part.replace(/^E(?:XP)?:/i, "").trim(); labeledCount++; }
        else if (/^C(?:AR)?:/i.test(part)) { result.carLicense = part.replace(/^C(?:AR)?:/i, "").trim(); labeledCount++; }
      });

      if (labeledCount >= 2) {
        result.fieldsFound = labeledCount;
        result.isComposite = true;
        return result;
      }

      // If positional (no labels): [SAB, QTY, WT, REC, EXP, CAR]
      if (starParts.length >= 5) {
        if (starParts[0] && starParts[0] !== "-") result.sabCode = starParts[0];
        if (starParts[1] && !isNaN(Number(starParts[1]))) result.quantity = parseInt(starParts[1], 10);
        if (starParts[2] && starParts[2] !== "-") result.weight = starParts[2];
        if (starParts[3] && starParts[3] !== "-") result.receiveDate = starParts[3];
        if (starParts[4] && starParts[4] !== "-") result.expireDate = starParts[4];
        if (starParts[5] && starParts[5] !== "-") result.carLicense = starParts[5];

        let count = 0;
        if (result.sabCode) count++;
        if (result.quantity !== undefined) count++;
        if (result.weight) count++;
        if (result.receiveDate) count++;
        if (result.expireDate) count++;
        if (result.carLicense) count++;

        result.fieldsFound = count;
        if (count >= 2) {
          result.isComposite = true;
          return result;
        }
      }
    }
  }

  // 3. Delimited (newlines or pipes or semicolons)
  const isPipe = trimmed.includes("|");
  const isSemi = trimmed.includes(";");
  const lines = trimmed.includes("\n") 
    ? trimmed.split("\n") 
    : isPipe 
    ? trimmed.split("|") 
    : isSemi 
    ? trimmed.split(";") 
    : [trimmed];

  const sabRegex = /^(?:sab|sap|sab\s*code|sap\s*code|รหัส\s*sab|รหัส\s*sap)[:=\-]\s*(.*)$/i;
  const qtyRegex = /^(?:qty|quantity|จำนวน|ยอด|จำนวนสินค้า)[:=\-]\s*(\d+)/i;
  const wtRegex = /^(?:wt|weight|น้ำหนัก|นํ้าหนัก)[:=\-]\s*(.*?)(?:\s*kg\.?)?$/i;
  const recRegex = /^(?:rec|receive|rec\s*date|receive\s*date|วันที่รับ|วันที่รับสินค้า|วันที่)[:=\-]\s*(.*)$/i;
  const expRegex = /^(?:exp|expiry|expire|exp\s*date|expire\s*date|วันหมดอายุ|หมดอายุ|วันสิ้นอายุ)[:=\-]\s*(.*)$/i;
  const carRegex = /^(?:car|car\s*license|vehicle|ทะเบียน|ทะเบียนรถ|ทะเบียนรถยนต์|license)[:=\-]\s*(.*)$/i;
  const lpnRegex = /^(?:lpn|lpn\s*code|รหัส\s*lpn)[:=\-]\s*(.*)$/i;

  let count = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    let m;
    if ((m = line.match(sabRegex))) {
      result.sabCode = m[1].trim();
      count++;
    } else if ((m = line.match(qtyRegex))) {
      result.quantity = parseInt(m[1].trim(), 10);
      count++;
    } else if ((m = line.match(wtRegex))) {
      result.weight = m[1].trim();
      count++;
    } else if ((m = line.match(recRegex))) {
      result.receiveDate = m[1].trim();
      count++;
    } else if ((m = line.match(expRegex))) {
      result.expireDate = m[1].trim();
      count++;
    } else if ((m = line.match(carRegex))) {
      result.carLicense = m[1].trim();
      count++;
    } else if ((m = line.match(lpnRegex))) {
      result.lpnCode = m[1].trim();
      count++;
    }
  }

  result.fieldsFound = count;
  if (count >= 2) {
    result.isComposite = true;
  }

  return result;
}
