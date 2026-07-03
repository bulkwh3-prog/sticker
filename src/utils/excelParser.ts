import * as XLSX from "xlsx";
import { StickerItem } from "../types";

// Synonym mappings for smart header recognition
const HEADER_MAPPINGS: Record<keyof Omit<StickerItem, "id" | "copies" | "selected">, string[]> = {
  title: ["หัวข้อ", "title", "header", "topic", "หัวเรื่อง", "ประเภท", "กลุ่ม"],
  lpnCode: ["รหัส lpn", "รหัสlpn", "lpn code", "lpn", "รหัสแอลพีเอ็น", "lpn_code", "รหัสกล่อง", "รหัสพาเลท"],
  quantity: ["จำนวน", "qty", "quantity", "count", "ยอด", "จำนวนชิ้น", "pcs", "units", "pack"],
  weight: ["น้ำหนัก", "weight", "wt", "kg", "น้ำหนักสุทธิ", "weight_kg", "นํ้าหนัก"],
  receiveDate: ["วันที่รับ", "date", "receive date", "receive_date", "วันที่", "rec date", "วันที่นำเข้า", "วันที่รับสินค้า"],
  carLicense: ["ทะเบียนรถ", "ทะเบียน", "car", "vehicle", "license plate", "truck no", "ทะเบียนรถยนต์", "car_license", "ยานพาหนะ"],
  sabCode: ["sab code", "sab", "รหัส sab", "sabcode", "sab_code", "รหัสเอสเออบี"],
  productName: ["ชื่อสินค้า", "ชื่อ", "product", "product name", "product_name", "รายการ", "ชื่อสินค้า/รายละเอียด", "description", "item"],
  lot: ["lot", "batch", "ล็อต", "lot no", "lot_no", "batch no", "เลขล็อต", "lotnumber"],
  barcode: ["บาร์โค้ด", "barcode", "บาร์โค้ดที่ต้องการพิมพ์", "code", "รหัสแท่ง", "บาร์โค้ดสินค้า", "barcode_val"],
};

/**
 * Normalizes string for key matching
 */
const normalizeKey = (str: string): string => {
  return str.trim().toLowerCase().replace(/[\s\-_]/g, "");
};

/**
 * Parses raw Excel JSON rows and maps them to standard StickerItem fields
 */
export const parseExcelRows = (rows: any[]): Omit<StickerItem, "id" | "copies" | "selected">[] => {
  if (!rows || rows.length === 0) return [];

  return rows.map((row) => {
    const item: Partial<Omit<StickerItem, "id" | "copies" | "selected">> = {};

    // For each field we want to populate, search the row keys for matching synonyms
    Object.entries(HEADER_MAPPINGS).forEach(([targetField, synonyms]) => {
      const fieldKey = targetField as keyof typeof HEADER_MAPPINGS;
      let matchedValue: any = "";

      // Try finding a matching column name in the row
      for (const rowKey of Object.keys(row)) {
        const normalizedRowKey = normalizeKey(rowKey);
        const isMatch = synonyms.some(synonym => {
          const normSynonym = normalizeKey(synonym);
          return normalizedRowKey === normSynonym || normalizedRowKey.includes(normSynonym) || normSynonym.includes(normalizedRowKey);
        });

        if (isMatch) {
          matchedValue = row[rowKey];
          break;
        }
      }

      // Format types
      if (fieldKey === "quantity") {
        const parsedQty = parseInt(matchedValue, 10);
        item[fieldKey] = isNaN(parsedQty) ? 0 : parsedQty;
      } else if (fieldKey === "weight") {
        item[fieldKey] = matchedValue !== undefined && matchedValue !== null ? String(matchedValue) : "";
      } else {
        item[fieldKey] = matchedValue !== undefined && matchedValue !== null ? String(matchedValue).trim() : "";
      }
    });

    // Provide fallbacks if fields are empty
    return {
      title: item.title || "สินค้าทั่วไป",
      lpnCode: item.lpnCode || "",
      quantity: item.quantity !== undefined ? item.quantity : 0,
      weight: item.weight || "",
      receiveDate: item.receiveDate || new Date().toISOString().split("T")[0],
      carLicense: item.carLicense || "",
      sabCode: item.sabCode || "",
      productName: item.productName || "ไม่ได้ระบุชื่อสินค้า",
      lot: item.lot || "",
      barcode: item.barcode || item.lpnCode || "", // Fallback barcode to LPN code if empty
    };
  });
};

/**
 * Downloads a sample Excel template for users to use
 */
export const downloadTemplate = () => {
  const wsData = [
    {
      "หัวข้อ": "สินค้าคลังสินค้า A",
      "รหัส LPN": "LPN-2607-0012",
      "จำนวน": 120,
      "น้ำหนัก": "18.5 kg",
      "วันที่รับ": "2026-07-02",
      "ทะเบียนรถ": "70-1234 กทม",
      "SAB Code": "SAB-A101",
      "ชื่อสินค้า": "กล่องบรรจุภัณฑ์อะลูมิเนียมเกรดพรีเมียม (Size M)",
      "Lot": "LOT260701A",
      "บาร์โค้ด": "BAR26070012"
    },
    {
      "หัวข้อ": "สินค้าแผนกขนส่ง B",
      "รหัส LPN": "LPN-2607-0013",
      "จำนวน": 80,
      "น้ำหนัก": "12.0 kg",
      "วันที่รับ": "2026-07-02",
      "ทะเบียนรถ": "80-5678 สมุทรปราการ",
      "SAB Code": "SAB-B202",
      "ชื่อสินค้า": "สายไฟทองแดงแกนเดี่ยว ความยาว 50 เมตร",
      "Lot": "LOT260701B",
      "บาร์โค้ด": "BAR26070013"
    },
    {
      "หัวข้อ": "สินค้าคลังสินค้า A",
      "รหัส LPN": "LPN-2607-0014",
      "จำนวน": 300,
      "น้ำหนัก": "5.2 kg",
      "วันที่รับ": "2026-07-03",
      "ทะเบียนรถ": "70-1234 กทม",
      "SAB Code": "SAB-A102",
      "ชื่อสินค้า": "ข้อต่อท่อประปา PVC สามทาง 1 นิ้ว",
      "Lot": "LOT260702A",
      "บาร์โค้ด": "BAR26070014"
    }
  ];

  const ws = XLSX.utils.json_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "4x4_Sticker_Template");
  
  // Set column widths so template is beautiful out-of-the-box
  ws["!cols"] = [
    { wch: 18 }, // หัวข้อ
    { wch: 18 }, // รหัส LPN
    { wch: 10 }, // จำนวน
    { wch: 12 }, // น้ำหนัก
    { wch: 15 }, // วันที่รับ
    { wch: 18 }, // ทะเบียนรถ
    { wch: 14 }, // SAB Code
    { wch: 35 }, // ชื่อสินค้า
    { wch: 14 }, // Lot
    { wch: 18 }, // บาร์โค้ด
  ];

  XLSX.writeFile(wb, "4x4_Sticker_Template.xlsx");
};
