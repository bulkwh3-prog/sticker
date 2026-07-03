/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StickerItem {
  id: string;
  title: string;       // หัวข้อ
  lpnCode: string;     // รหัส LPN
  quantity: number;    // จำนวน
  weight: string;      // น้ำหนัก (เช่น "12.5 kg" หรือตัวเลข)
  receiveDate: string;  // วันที่รับ
  carLicense: string;  // ทะเบียนรถ
  sabCode: string;     // SAB Code
  productName: string; // ชื่อสินค้า
  lot: string;         // Lot
  barcode: string;     // บาร์โค้ดที่ต้องการพิมพ์
  copies: number;      // จำนวนสำเนาสติ๊กเกอร์ของรายการนี้ (Default = 1)
  selected: boolean;   // ระบุการเลือกปริ้น
}

export interface PrintHistoryEntry {
  id: string;
  timestamp: string;
  totalLabelsPrinted: number; // ผลรวมของ copies ของไอเท็มที่ถูกเลือกพิมพ์ในรอบนั้น
  totalUniqueItems: number;   // จำนวนแถวเดี่ยวที่เลือกพิมพ์
  items: StickerItem[];       // รายการทั้งหมดที่พิมพ์ในรอบนั้นพร้อมระบุจำนวนสำเนาขณะพิมพ์
}

export interface BarcodeScannerConfig {
  isActive: boolean;
  targetField: keyof StickerItem | null;
  targetItemId: string | null; // null if for the manual-add form
}
