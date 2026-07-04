/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { 
  StickerItem, 
  PrintHistoryEntry, 
  BarcodeScannerConfig 
} from "./types";
import { Sticker } from "./components/Sticker";
import { ScannerModal } from "./components/ScannerModal";
import { parseExcelRows, downloadTemplate } from "./utils/excelParser";
import { 
  Printer, 
  Upload, 
  Download, 
  Plus, 
  Trash2, 
  FileText, 
  History, 
  Camera, 
  Search, 
  RefreshCw, 
  Check, 
  AlertCircle,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Flame,
  UserCheck,
  Calendar
} from "lucide-react";

export default function App() {
  // --- States ---
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [history, setHistory] = useState<PrintHistoryEntry[]>([]);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDate, setFilterDate] = useState<string>("all");

  const shiftFilterDate = (days: number) => {
    let currentBaseDateStr = filterDate;
    if (filterDate === "all") {
      if (stickers.length > 0) {
        const dates = stickers.map(s => s.receiveDate).filter(Boolean);
        if (dates.length > 0) {
          currentBaseDateStr = dates.sort().reverse()[0];
        } else {
          currentBaseDateStr = new Date().toISOString().split("T")[0];
        }
      } else {
        currentBaseDateStr = new Date().toISOString().split("T")[0];
      }
    }

    try {
      const d = new Date(currentBaseDateStr);
      if (isNaN(d.getTime())) return;
      d.setDate(d.getDate() + days);
      const newDateStr = d.toISOString().split("T")[0];
      setFilterDate(newDateStr);
    } catch (e) {
      console.error(e);
    }
  };
  
  // Form states
  const [formData, setFormData] = useState<Omit<StickerItem, "id" | "copies" | "selected">>({
    title: "",
    lpnCode: "",
    quantity: 1,
    weight: "",
    receiveDate: new Date().toISOString().split("T")[0],
    carLicense: "",
    sabCode: "",
    productName: "",
    lot: "",
    barcode: "",
  });

  // Bulk operation states
  const [bulkCopyMethod, setBulkCopyMethod] = useState<"fixed" | "quantity" | "custom">("fixed");
  const [bulkCopyValue, setBulkCopyValue] = useState<number>(1);
  const [customDivisor, setCustomDivisor] = useState<number>(10); // for Qty / Pack Size

  // Scanner Modal states
  const [scannerConfig, setScannerConfig] = useState<BarcodeScannerConfig>({
    isActive: false,
    targetField: null,
    targetItemId: null,
  });

  // UI status feedback
  const [alert, setAlert] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [isPrintSpooling, setIsPrintSpooling] = useState(false);
  const [showHistoryOnly, setShowHistoryOnly] = useState(false);

  // Hidden print element ref for print triggers
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // --- Initial Hydration from LocalStorage ---
  useEffect(() => {
    const savedStickers = localStorage.getItem("4x4_sticker_items");
    const savedHistory = localStorage.getItem("4x4_sticker_print_history");

    if (savedStickers) {
      try {
        const parsed = JSON.parse(savedStickers);
        setStickers(parsed);
        if (parsed.length > 0) {
          setActivePreviewId(parsed[0].id);
        }
      } catch (e) {
        console.error("Failed to parse stickers from localStorage", e);
      }
    } else {
      // Default sample item so the app doesn't look empty
      const sampleItem: StickerItem = {
        id: "sample-1",
        title: "คลังสินค้าเครื่องดื่ม A",
        lpnCode: "LPN-2607-991",
        quantity: 150,
        weight: "22.4 kg",
        receiveDate: new Date().toISOString().split("T")[0],
        carLicense: "70-9876 เชียงใหม่",
        sabCode: "SAB-Z802",
        productName: "น้ำผลไม้เข้มข้นรสส้ม ตราสวีทออเรนจ์ ขนาด 1L",
        lot: "LOT2607A",
        barcode: "BAR2607991",
        copies: 2,
        selected: true,
      };
      setStickers([sampleItem]);
      setActivePreviewId("sample-1");
    }

    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse print history from localStorage", e);
      }
    }
  }, []);

  // --- Save states on change ---
  useEffect(() => {
    if (stickers.length > 0 || localStorage.getItem("4x4_sticker_items")) {
      localStorage.setItem("4x4_sticker_items", JSON.stringify(stickers));
    }
  }, [stickers]);

  useEffect(() => {
    localStorage.setItem("4x4_sticker_print_history", JSON.stringify(history));
  }, [history]);

  // Alert dismiss helper
  const triggerAlert = (message: string, type: "success" | "error" | "info" = "success") => {
    setAlert({ message, type });
    setTimeout(() => {
      setAlert(null);
    }, 4000);
  };

  // --- Form Handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "quantity" ? Math.max(0, parseInt(value, 10) || 0) : value
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lpnCode.trim() && !formData.barcode.trim()) {
      triggerAlert("กรุณากรอกรหัส LPN หรือ บาร์โค้ด อย่างน้อยหนึ่งรายการ", "error");
      return;
    }

    const newItem: StickerItem = {
      ...formData,
      id: "item_" + Date.now(),
      copies: 1,
      selected: true,
      // If barcode is empty, default to LPN code
      barcode: formData.barcode.trim() || formData.lpnCode.trim(),
    };

    setStickers(prev => [newItem, ...prev]);
    setActivePreviewId(newItem.id);
    
    // Clear form but keep Header, Date, SAB Code, Quantity & Weight for fast sequential entries
    setFormData(prev => ({
      title: prev.title,
      lpnCode: "",
      quantity: prev.quantity,
      weight: prev.weight,
      receiveDate: prev.receiveDate,
      carLicense: prev.carLicense,
      sabCode: prev.sabCode,
      productName: "",
      lot: "",
      barcode: "",
    }));

    triggerAlert("เพิ่มรายการสติ๊กเกอร์เรียบร้อยแล้ว");
  };

  // --- Camera Scan Handlers ---
  const openScanner = (field: keyof StickerItem, itemId: string | null = null) => {
    setScannerConfig({
      isActive: true,
      targetField: field,
      targetItemId: itemId,
    });
  };

  const handleScanSuccess = (decodedText: string, field: string) => {
    const targetField = field as keyof StickerItem;
    
    // Case 1: Editing existing item in the table list
    if (scannerConfig.targetItemId) {
      setStickers(prev => prev.map(item => {
        if (item.id === scannerConfig.targetItemId) {
          const updated = { ...item, [targetField]: decodedText };
          // If updating LPN and barcode was empty/matching, sync barcode
          if (targetField === "lpnCode" && (!item.barcode || item.barcode === item.lpnCode)) {
            updated.barcode = decodedText;
          }
          return updated;
        }
        return item;
      }));
      triggerAlert(`สแกนสำเร็จ: อัปเดตช่องข้อมูลแล้ว`);
    } 
    // Case 2: Adding via manual form
    else {
      setFormData(prev => {
        const updated = { ...prev, [targetField]: decodedText };
        if (targetField === "lpnCode" && !prev.barcode) {
          updated.barcode = decodedText;
        }
        return updated;
      });
      triggerAlert(`สแกนสำเร็จ: นำรหัสใส่ในฟอร์มแล้ว`);
    }
  };

  // --- Excel Import Handler ---
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "binary", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { raw: false });
        
        if (json.length === 0) {
          triggerAlert("ไม่พบข้อมูลในไฟล์ Excel ที่อัปโหลด", "error");
          return;
        }

        const mappedRows = parseExcelRows(json);
        const importedItems: StickerItem[] = mappedRows.map((row, index) => ({
          ...row,
          id: `excel_${Date.now()}_${index}`,
          copies: 1, // Default to 1 copy
          selected: true,
        }));

        setStickers(prev => [...importedItems, ...prev]);
        if (importedItems.length > 0) {
          setActivePreviewId(importedItems[0].id);
        }
        
        triggerAlert(`นำเข้าข้อมูลสำเร็จทั้งหมด ${importedItems.length} รายการ`);
        if (fileInputRef.current) fileInputRef.current.value = ""; // reset input
      } catch (err) {
        console.error(err);
        triggerAlert("ไม่สามารถประมวลผลไฟล์ Excel ได้ กรุณาตรวจสอบความถูกต้องของเทมเพลต", "error");
      }
    };
    reader.readAsBinaryString(file);
  };

  // --- Auto Copies Calculation Logic ---
  const applyAutoCopiesRules = () => {
    const selectedCount = stickers.filter(s => s.selected).length;
    if (selectedCount === 0) {
      triggerAlert("กรุณาเลือกรายการสติ๊กเกอร์ในตารางก่อนตั้งค่าอัตโนมัติ", "info");
      return;
    }

    setStickers(prev => prev.map(item => {
      if (!item.selected) return item;

      let calculatedCopies = item.copies;
      if (bulkCopyMethod === "fixed") {
        calculatedCopies = Math.max(1, bulkCopyValue);
      } else if (bulkCopyMethod === "quantity") {
        calculatedCopies = Math.max(1, item.quantity);
      } else if (bulkCopyMethod === "custom") {
        // e.g. Qty / Pack size, round up (เช่น 120 ชิ้น แพ็คละ 10 = ปริ้น 12 แผ่น)
        const divisor = Math.max(1, customDivisor);
        calculatedCopies = Math.ceil(item.quantity / divisor);
        if (calculatedCopies < 1) calculatedCopies = 1;
      }

      return {
        ...item,
        copies: calculatedCopies,
      };
    }));

    triggerAlert(`ตั้งค่าจำนวนสำเนาสำหรับ ${selectedCount} รายการแบบอัตโนมัติเรียบร้อยแล้ว`);
  };

  // --- Selection and Item Handlers ---
  const toggleSelectAll = (checked: boolean) => {
    setStickers(prev => prev.map(item => ({ ...item, selected: checked })));
  };

  const toggleSelectItem = (id: string) => {
    setStickers(prev => prev.map(item => 
      item.id === id ? { ...item, selected: !item.selected } : item
    ));
  };

  const updateItemCopy = (id: string, newCopies: number) => {
    setStickers(prev => prev.map(item => 
      item.id === id ? { ...item, copies: Math.max(1, newCopies) } : item
    ));
  };

  const handleInlineEdit = (id: string, field: keyof StickerItem, val: any) => {
    setStickers(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: field === "quantity" ? Math.max(0, parseInt(val, 10) || 0) : val };
        // Sync barcode if LPN was updated and barcode was empty/same
        if (field === "lpnCode" && (!item.barcode || item.barcode === item.lpnCode)) {
          updated.barcode = val;
        }
        return updated;
      }
      return item;
    }));
  };

  const deleteItem = (id: string) => {
    setStickers(prev => prev.filter(item => item.id !== id));
    if (activePreviewId === id) {
      const remaining = stickers.filter(item => item.id !== id);
      setActivePreviewId(remaining.length > 0 ? remaining[0].id : null);
    }
    triggerAlert("ลบรายการแล้ว", "info");
  };

  const clearAllStickers = () => {
    if (window.confirm("คุณต้องการลบรายการสติ๊กเกอร์ทั้งหมดในตารางใช่หรือไม่?")) {
      setStickers([]);
      setActivePreviewId(null);
      triggerAlert("ล้างตารางรายการทั้งหมดแล้ว", "info");
    }
  };

  const deleteSelectedStickers = () => {
    const selectedIds = stickers.filter(s => s.selected).map(s => s.id);
    if (selectedIds.length === 0) {
      triggerAlert("ไม่มีรายการที่ถูกเลือกเพื่อลบ", "info");
      return;
    }
    if (window.confirm(`คุณต้องการลบ ${selectedIds.length} รายการที่ถูกเลือกใช่หรือไม่?`)) {
      const remaining = stickers.filter(s => !s.selected);
      setStickers(remaining);
      setActivePreviewId(remaining.length > 0 ? remaining[0].id : null);
      triggerAlert(`ลบรายการที่เลือกสำเร็จ (${selectedIds.length} รายการ)`, "info");
    }
  };

  // --- Print Trigger ---
  const handlePrint = () => {
    const selectedToPrint = stickers.filter(s => s.selected && s.copies > 0);
    
    if (selectedToPrint.length === 0) {
      triggerAlert("กรุณาเลือกสติ๊กเกอร์อย่างน้อย 1 รายการ และระบุจำนวนสำเนามากกว่า 0", "error");
      return;
    }

    setIsPrintSpooling(true);
    triggerAlert("กำลังเตรียมพิมพ์สติ๊กเกอร์...", "info");

    // Add to history
    const totalCopies = selectedToPrint.reduce((acc, curr) => acc + curr.copies, 0);
    const historyEntry: PrintHistoryEntry = {
      id: "hist_" + Date.now(),
      timestamp: new Date().toLocaleString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      totalLabelsPrinted: totalCopies,
      totalUniqueItems: selectedToPrint.length,
      items: JSON.parse(JSON.stringify(selectedToPrint)), // Deep clone active state
    };

    setHistory(prev => [historyEntry, ...prev]);

    // Give browsers time to build the print DOM
    setTimeout(() => {
      window.print();
      setIsPrintSpooling(false);
      triggerAlert(`ส่งออกงานพิมพ์ทั้งหมด ${totalCopies} สำเนา เรียบร้อยแล้ว`, "success");
    }, 800);
  };

  // Re-load items from historical print back to the table
  const restoreHistoryEntry = (entry: PrintHistoryEntry) => {
    if (window.confirm(`คุณต้องการดึงรายการสติ๊กเกอร์จำนวน ${entry.totalUniqueItems} รายการจากประวัตินี้ กลับเข้าตารางแก้ไขใช่หรือไม่? (รายการซ้ำจะถูกเขียนเพิ่ม)`)) {
      setStickers(prev => {
        // Map elements with fresh IDs to avoid react key clash
        const restored: StickerItem[] = entry.items.map((item, idx) => ({
          ...item,
          id: `restored_${Date.now()}_${idx}`,
          selected: true
        }));
        return [...restored, ...prev];
      });
      setShowHistoryOnly(false);
      if (entry.items.length > 0) {
        setActivePreviewId(entry.items[0].id);
      }
      triggerAlert("คืนค่าข้อมูลจากประวัติงานพิมพ์เรียบร้อย");
    }
  };

  const clearHistory = () => {
    if (window.confirm("คุณต้องการลบประวัติการพิมพ์ย้อนหลังทั้งหมดใช่หรือไม่? (ข้อมูลในตารางปัจจุบันจะไม่ได้รับผลกระทบ)")) {
      setHistory([]);
      triggerAlert("ลบประวัติการพิมพ์เรียบร้อยแล้ว", "info");
    }
  };

  // --- Sticker Preview Pagination ---
  const activeSticker = stickers.find(s => s.id === activePreviewId);
  const activeIndex = stickers.findIndex(s => s.id === activePreviewId);

  const prevPreview = () => {
    if (activeIndex > 0) {
      setActivePreviewId(stickers[activeIndex - 1].id);
    }
  };

  const nextPreview = () => {
    if (activeIndex < stickers.length - 1) {
      setActivePreviewId(stickers[activeIndex + 1].id);
    }
  };

  // Filter labels based on search
  const filteredStickers = stickers.filter(item => {
    // 1. Filter by date if a specific date is active
    if (filterDate && filterDate !== "all") {
      if (item.receiveDate !== filterDate) return false;
    }

    // 2. Filter by search query
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      item.productName.toLowerCase().includes(query) ||
      item.lpnCode.toLowerCase().includes(query) ||
      item.barcode.toLowerCase().includes(query) ||
      item.title.toLowerCase().includes(query) ||
      item.sabCode.toLowerCase().includes(query) ||
      item.lot.toLowerCase().includes(query) ||
      item.carLicense.toLowerCase().includes(query)
    );
  });

  const selectedItemsToPrint = stickers.filter(s => s.selected);
  const sumOfCopies = selectedItemsToPrint.reduce((sum, item) => sum + item.copies, 0);

  // Available scanner target fields
  const scanFields = [
    { key: "barcode", label: "คิวอาร์โค้ด (QR Code)" },
    { key: "lpnCode", label: "รหัส LPN" },
    { key: "sabCode", label: "SAB Code" },
    { key: "lot", label: "Lot" },
    { key: "carLicense", label: "ทะเบียนรถ" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* 
        ===================
        PRINT ONLY WRAPPER
        ===================
        This wrapper is parsed specifically by our CSS print media query.
        It renders stickers in full 4"x4" physical layout one after another with page breaks.
      */}
      <div id="print-area-container" className="hidden">
        {selectedItemsToPrint.map((item) => {
          // Multiply item based on copies count
          return Array.from({ length: item.copies }).map((_, i) => (
            <div 
              key={`print-${item.id}-${i}`} 
              className="sticker-print-page"
            >
              <Sticker item={item} isPreview={false} />
            </div>
          ));
        })}
      </div>

      {/* 
        ===================
        MAIN APPLICATION LAYOUT
        ===================
      */}
      <div id="main-app-layout" className="pb-16 bg-[#f8fafc] min-h-screen">
        
        {/* Navigation Bar / Header */}
        <header className="sticky top-0 z-40 bg-[#0f172a] text-slate-100 border-b border-slate-800 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-fuchsia-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
                <Printer className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5 font-sans">
                  <span>4x4 Label Printer Workspace</span>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-md border border-indigo-500/30 font-medium">v1.2</span>
                </h1>
                <p className="text-xs text-slate-400 font-medium font-sans">ระบบพิมพ์สติ๊กเกอร์ขนาด 4x4 นิ้ว สำหรับงานคลังสินค้าและระบบขนส่ง</p>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-semibold shadow-xs transition-all duration-150 cursor-pointer"
                title="ดาวน์โหลดไฟล์ตัวอย่างสเปรดชีต"
                id="btn-download-template"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>ดาวน์โหลดเทมเพลต Excel</span>
              </button>

              <button
                onClick={() => {
                  if (fileInputRef.current) fileInputRef.current.click();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 hover:border-indigo-400 rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/10 transition-all duration-150 cursor-pointer"
                title="นำเข้าไฟล์ข้อมูล Excel เข้าตาราง"
                id="btn-upload-excel"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>นำเข้า Excel / CSV</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleExcelUpload}
                accept=".xlsx, .xls, .csv"
                className="hidden"
              />
            </div>
          </div>
        </header>

        {/* Workspace Body */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          
          {/* Dynamic feedback banner */}
          {alert && (
            <div 
              id="system-alert"
              className={`mb-6 p-4 rounded-2xl border flex items-center gap-3 shadow-md animate-fade-in ${
                alert.type === "error"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : alert.type === "info"
                  ? "bg-sky-50 border-sky-200 text-sky-800"
                  : "bg-emerald-50 border-emerald-200 text-emerald-800"
              }`}
            >
              {alert.type === "error" ? (
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
              ) : alert.type === "info" ? (
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-sky-600" />
              ) : (
                <Check className="w-5 h-5 flex-shrink-0 text-emerald-600" />
              )}
              <span className="text-xs sm:text-sm font-semibold">{alert.message}</span>
            </div>
          )}

          {/* Top Quick Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-white border border-slate-200/60 rounded-2xl shadow-xs flex items-center gap-4 hover:shadow-sm hover:translate-y-[-1px] transition-all duration-200">
              <div className="p-2.5 bg-slate-50 text-slate-500 rounded-xl border border-slate-100">
                <ClipboardList className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400">รายการทั้งหมด</span>
                <span className="font-mono text-lg font-bold text-slate-800">{stickers.length}</span>
                <span className="text-[10px] text-slate-500 ml-1">รายการ</span>
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-200/60 rounded-2xl shadow-xs flex items-center gap-4 hover:shadow-sm hover:translate-y-[-1px] transition-all duration-200">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400">เลือกพิมพ์คิวปัจจุบัน</span>
                <span className="font-mono text-lg font-bold text-emerald-600">{selectedItemsToPrint.length}</span>
                <span className="text-[10px] text-slate-500 ml-1">รายการ</span>
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-200/60 rounded-2xl shadow-xs flex items-center gap-4 hover:shadow-sm hover:translate-y-[-1px] transition-all duration-200">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400">จำนวนพิมพ์รวม ( copies )</span>
                <span className="font-mono text-lg font-bold text-indigo-600">{sumOfCopies}</span>
                <span className="text-[10px] text-slate-500 ml-1">แผ่น</span>
              </div>
            </div>

            <div 
              className="p-4 bg-white border border-slate-200/60 rounded-2xl shadow-xs flex items-center gap-4 cursor-pointer hover:bg-slate-50 hover:shadow-sm hover:translate-y-[-1px] transition-all duration-200"
              onClick={() => setShowHistoryOnly(!showHistoryOnly)}
            >
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                <History className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400">ประวัติการพิมพ์ย้อนหลัง</span>
                <span className="font-mono text-lg font-bold text-amber-600">{history.length}</span>
                <span className="text-[10px] text-slate-500 ml-1">ครั้ง</span>
              </div>
            </div>
          </div>

          {/* Toggle History View directly */}
          {showHistoryOnly ? (
            <div className="bg-white border border-slate-200/60 rounded-3xl shadow-sm p-6 mb-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">ประวัติการพิมพ์สติ๊กเกอร์ทั้งหมด</h3>
                    <p className="text-xs text-slate-400">ประวัติการพิมพ์จะถูกบันทึกโดยอัตโนมัติเมื่อทำการพิมพ์สติ๊กเกอร์</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={clearHistory}
                    disabled={history.length === 0}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 rounded-xl transition-all font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบประวัติทั้งหมด</span>
                  </button>
                  <button
                    onClick={() => setShowHistoryOnly(false)}
                    className="flex-1 sm:flex-initial px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl font-semibold hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    กลับสู่หน้าจัดการข้อมูล
                  </button>
                </div>
              </div>

              {history.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-xs font-semibold">ยังไม่มีประวัติการส่งออกพิมพ์สติ๊กเกอร์ในระบบ</p>
                  <p className="text-slate-400 text-[11px] mt-1">ประวัติจะถูกจัดเก็บหลังจากคุณเลือกรายการและสั่งพิมพ์ด้วยปุ่มพิมพ์สีเขียว</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((entry) => (
                    <div key={entry.id} className="border border-slate-200/60 rounded-2xl p-4 hover:border-slate-300 hover:shadow-xs transition-all bg-white">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block font-mono uppercase tracking-wider">BATCH ID: {entry.id}</span>
                          <span className="text-xs font-bold text-slate-700">{entry.timestamp}</span>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-lg font-bold whitespace-nowrap">
                            พิมพ์ทั้งหมด {entry.totalLabelsPrinted} แผ่น ({entry.totalUniqueItems} รายการสินค้า)
                          </span>
                          <button
                            onClick={() => restoreHistoryEntry(entry)}
                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-700 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>คืนค่าพิมพ์อีกครั้ง</span>
                          </button>
                        </div>
                      </div>

                      {/* Display summary of items inside this print batch */}
                      <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        {entry.items.map((item, i) => (
                          <div key={i} className="bg-slate-50/50 p-2.5 border border-slate-200/60 rounded-xl flex justify-between items-start">
                            <div className="truncate pr-2">
                              <span className="block font-mono font-bold text-slate-700 text-[11px]">{item.lpnCode || "(ไม่มี LPN)"}</span>
                              <span className="block text-slate-500 font-medium truncate text-[10px]">{item.productName}</span>
                            </div>
                            <span className="text-[9px] bg-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap">
                              x{item.copies}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            
            // MAIN GRID WORKSPACE
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT & CENTER WORKSPACE COLUMN: Forms and Table (8 Cols) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* 1. MANUAL ENTRY FORM */}
                <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-xs">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 mb-5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-50 rounded-lg border border-emerald-100 text-emerald-600">
                        <Plus className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">เพิ่มรายการสติ๊กเกอร์ใหม่</h3>
                        <p className="text-[11px] text-slate-400">กรอกข้อมูลเพื่อสร้างบาร์โค้ดสติ๊กเกอร์คลังสินค้า</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openScanner("barcode")}
                      className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-slate-500" />
                      <span>สแกนกล้องเพิ่มข้อมูล</span>
                    </button>
                  </div>

                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                      {/* LPN Code */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">รหัส LPN (LPN Code) *</label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            name="lpnCode"
                            value={formData.lpnCode}
                            onChange={handleInputChange}
                            placeholder="รหัส LPN บังคับ"
                            required
                            className="flex-1 min-w-0 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-800 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl py-2 px-3.5 transition-all text-xs font-mono font-bold focus:outline-none placeholder-slate-400"
                          />
                          <button
                            type="button"
                            onClick={() => openScanner("lpnCode")}
                            className="px-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-slate-600 transition-colors flex items-center justify-center cursor-pointer"
                            title="สแกน LPN ด้วยกล้อง"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Barcode Value */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">คิวอาร์โค้ดสินค้า (QR Code to print)</label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            name="barcode"
                            value={formData.barcode}
                            onChange={handleInputChange}
                            placeholder="ปล่อยว่างเพื่อเลียนแบบ LPN"
                            className="flex-1 min-w-0 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-800 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl py-2 px-3.5 transition-all text-xs font-mono focus:outline-none placeholder-slate-400"
                          />
                          <button
                            type="button"
                            onClick={() => openScanner("barcode")}
                            className="px-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-slate-600 transition-colors flex items-center justify-center cursor-pointer"
                            title="สแกน QR Code ด้วยกล้อง"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                        </div>
                        {/* Quick Mimic Options */}
                        <div className="mt-1 flex flex-wrap gap-1 items-center">
                          <span className="text-[9px] font-bold text-slate-400 mr-1">เลียนแบบ:</span>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, barcode: prev.lpnCode }))}
                            className="text-[10px] bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 text-slate-600 px-1.5 py-0.5 rounded font-medium transition-all cursor-pointer"
                            title="เลียนแบบรหัส LPN"
                          >
                            LPN
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, barcode: prev.sabCode }))}
                            className="text-[10px] bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 text-slate-600 px-1.5 py-0.5 rounded font-medium transition-all cursor-pointer"
                            title="เลียนแบบรหัส SAB Code"
                          >
                            SAB Code
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, barcode: String(prev.quantity) }))}
                            className="text-[10px] bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 text-slate-600 px-1.5 py-0.5 rounded font-medium transition-all cursor-pointer"
                            title="เลียนแบบจำนวน"
                          >
                            จำนวน
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, barcode: prev.weight }))}
                            className="text-[10px] bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 text-slate-600 px-1.5 py-0.5 rounded font-medium transition-all cursor-pointer"
                            title="เลียนแบบน้ำหนัก"
                          >
                            น้ำหนัก
                          </button>
                        </div>
                      </div>

                      {/* Product Name */}
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">ชื่อสินค้าและรายละเอียด (Product Name)</label>
                        <input
                          type="text"
                          name="productName"
                          value={formData.productName}
                          onChange={handleInputChange}
                          placeholder="ชื่อสินค้าเต็ม เช่น ซอสปรุงรสตราเจ็ดดาว ขนาด 500มล."
                          className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-800 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl py-2 px-3.5 transition-all text-xs font-medium focus:outline-none"
                        />
                      </div>

                      {/* Quantity */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">จำนวนสินค้าในพาเลท (Quantity)</label>
                        <input
                          type="number"
                          name="quantity"
                          value={formData.quantity}
                          onChange={handleInputChange}
                          min="0"
                          className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-800 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl py-2 px-3.5 transition-all text-xs font-mono font-bold focus:outline-none"
                        />
                      </div>

                      {/* Weight */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">น้ำหนักรวม (Weight เช่น 20.5 kg)</label>
                        <input
                          type="text"
                          name="weight"
                          value={formData.weight}
                          onChange={handleInputChange}
                          placeholder="เช่น 15 kg หรือ 8.4"
                          className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-800 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl py-2 px-3.5 transition-all text-xs font-mono focus:outline-none"
                        />
                      </div>

                      {/* Receive Date */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">วันที่รับสินค้า (Receive Date)</label>
                        <input
                          type="date"
                          name="receiveDate"
                          value={formData.receiveDate}
                          onChange={handleInputChange}
                          className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-800 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl py-2 px-3.5 transition-all text-xs font-mono focus:outline-none"
                        />
                      </div>

                      {/* Car License */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">ทะเบียนรถนำส่ง (Vehicle/License)</label>
                        <input
                          type="text"
                          name="carLicense"
                          value={formData.carLicense}
                          onChange={handleInputChange}
                          placeholder="เช่น 70-1234 กทม"
                          className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-800 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl py-2 px-3.5 transition-all text-xs font-medium focus:outline-none"
                        />
                      </div>

                      {/* SAB Code */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">รหัส SAB Code</label>
                        <input
                          type="text"
                          name="sabCode"
                          value={formData.sabCode}
                          onChange={handleInputChange}
                          placeholder="เช่น SAB-Z802"
                          className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-800 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl py-2 px-3.5 transition-all text-xs font-mono focus:outline-none"
                        />
                      </div>

                      {/* Lot */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">ล็อตการจัดเก็บ (Lot / Batch)</label>
                        <input
                          type="text"
                          name="lot"
                          value={formData.lot}
                          onChange={handleInputChange}
                          placeholder="เช่น LOT2607"
                          className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-800 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl py-2 px-3.5 transition-all text-xs font-mono focus:outline-none"
                        />
                      </div>

                      {/* Submit */}
                      <div className="md:col-span-3 flex justify-end pt-2">
                        <button
                          type="submit"
                          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/10 transition-all cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>บันทึกและเพิ่มเข้าตาราง</span>
                        </button>
                      </div>

                    </div>
                  </form>
                </div>

                {/* 2. AUTOMATIC COPIES CONFIGURATION BAR */}
                <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-xs">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-indigo-50 rounded-lg border border-indigo-100 text-indigo-600">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">ตัวช่วยคำนวณจำนวนพิมพ์สติ๊กเกอร์อัตโนมัติ (Auto Copies Engine)</h4>
                      <p className="text-[11px] text-slate-400">กำหนดเงื่อนไขปรับปริมาณการปริ้นสำหรับทุกรายการที่ถูกเลือก</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                    
                    {/* Method Selector */}
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">เกณฑ์การคำนวณสำเนา</label>
                      <select
                        value={bulkCopyMethod}
                        onChange={(e) => setBulkCopyMethod(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white font-medium"
                      >
                        <option value="fixed">พิมพ์คงที่เท่ากันทุกรายการ</option>
                        <option value="quantity">พิมพ์แปรผันตามจำนวนสินค้า (1:1)</option>
                        <option value="custom">คำนวณจากสูตรหาร (จำนวน / บรรจุภัณฑ์)</option>
                      </select>
                    </div>

                    {/* Parameter input depending on method */}
                    {bulkCopyMethod === "fixed" && (
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">จำนวนสำเนาคงที่ (แผ่น)</label>
                        <input
                          type="number"
                          value={bulkCopyValue}
                          onChange={(e) => setBulkCopyValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          min="1"
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white font-mono font-bold"
                        />
                      </div>
                    )}

                    {bulkCopyMethod === "custom" && (
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">บรรจุกล่องละกี่ชิ้น (Pack size)</label>
                        <input
                          type="number"
                          value={customDivisor}
                          onChange={(e) => setCustomDivisor(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          min="1"
                          placeholder="เช่น 10 หรือ 20"
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white font-mono font-bold"
                        />
                      </div>
                    )}

                    {bulkCopyMethod === "quantity" && (
                      <div className="text-slate-500 text-[11px] py-2 px-3 font-medium bg-white border border-dashed border-slate-200 rounded-xl text-center">
                        สำเนา = จำนวนสินค้า (1:1)
                      </div>
                    )}

                    {/* Submit calculation */}
                    <div>
                      <button
                        type="button"
                        onClick={applyAutoCopiesRules}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/10 transition-all cursor-pointer"
                      >
                        <span>เริ่มตั้งค่าสำเนาอัตโนมัติ</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. TABLE OF LABELS */}
                <div className="bg-white border border-slate-200/60 rounded-3xl shadow-xs overflow-hidden">
                  
                  {/* Table Controls */}
                  <div className="p-4 border-b border-slate-100 flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                      <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="ค้นหาตามสินค้า, LPN, บาร์โค้ด..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-slate-50/50 focus:bg-white text-xs text-slate-800 transition-all"
                        />
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={deleteSelectedStickers}
                          className="flex items-center gap-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ลบที่เลือก</span>
                        </button>
                        <button
                          type="button"
                          onClick={clearAllStickers}
                          className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <span>ล้างทั้งหมด</span>
                        </button>
                      </div>
                    </div>

                    {/* Date Browser Row ("ย้อนดูวัน") */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pt-3 border-t border-slate-100/50">
                      <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
                        <div className="flex items-center gap-1 text-slate-600 font-bold text-xs mr-1 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200/50">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                          <span>ย้อนดูวัน:</span>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => setFilterDate("all")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            filterDate === "all"
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          แสดงทั้งหมด
                        </button>

                        <button
                          type="button"
                          onClick={() => setFilterDate(new Date().toISOString().split("T")[0])}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            filterDate === new Date().toISOString().split("T")[0]
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          วันนี้
                        </button>

                        {(() => {
                          const yesterday = new Date();
                          yesterday.setDate(yesterday.getDate() - 1);
                          const yesterdayStr = yesterday.toISOString().split("T")[0];
                          return (
                            <button
                              type="button"
                              onClick={() => setFilterDate(yesterdayStr)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                filterDate === yesterdayStr
                                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15"
                                  : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              เมื่อวาน
                            </button>
                          );
                        })()}
                      </div>

                      <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                        <button
                          type="button"
                          onClick={() => shiftFilterDate(-1)}
                          className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold transition-all cursor-pointer"
                          title="ย้อนหลัง 1 วัน"
                        >
                          &larr; วันก่อนหน้า
                        </button>

                        <input
                          type="date"
                          value={filterDate === "all" ? "" : filterDate}
                          onChange={(e) => setFilterDate(e.target.value || "all")}
                          className="px-2.5 py-1 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-mono font-bold bg-white"
                        />

                        <button
                          type="button"
                          onClick={() => shiftFilterDate(1)}
                          className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold transition-all cursor-pointer"
                          title="ถัดไป 1 วัน"
                        >
                          วันถัดไป &rarr;
                        </button>
                      </div>
                    </div>

                    {/* Quick Unique Date Badges */}
                    {stickers.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs overflow-x-auto py-1 scrollbar-thin">
                        <span className="text-slate-400 font-bold whitespace-nowrap">ประวัติวันที่พบในตาราง:</span>
                        {(Array.from(new Set(stickers.map(s => s.receiveDate).filter(Boolean))) as string[])
                          .sort()
                          .reverse()
                          .map((dateStr) => {
                            const count = stickers.filter(s => s.receiveDate === dateStr).length;
                            const isSelected = filterDate === dateStr;
                            
                            let formattedDate = dateStr;
                            try {
                              const parts = dateStr.split("-");
                              if (parts.length === 3) {
                                formattedDate = `${parts[2]}/${parts[1]}/${parseInt(parts[0]) + 543}`;
                              }
                            } catch (e) {}

                            return (
                              <button
                                key={dateStr}
                                type="button"
                                onClick={() => setFilterDate(isSelected ? "all" : dateStr)}
                                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                                  isSelected 
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/50"
                                }`}
                              >
                                <span>{formattedDate}</span>
                                <span className="bg-white/80 px-1.5 py-0.2 rounded font-mono font-bold text-[10px] text-slate-500 shadow-3xs">{count}</span>
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Actual spreadsheet grid */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="bg-slate-50/80 border-b border-slate-200/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="p-3 w-12 text-center">
                            <input
                              type="checkbox"
                              checked={stickers.length > 0 && stickers.every(s => s.selected)}
                              onChange={(e) => toggleSelectAll(e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                            />
                          </th>
                          <th className="p-3 w-32">รหัส LPN</th>
                          <th className="p-3">ชื่อสินค้า / ทะเบียน / Lot</th>
                          <th className="p-3 w-20 text-center">จำนวนสินค้า</th>
                          <th className="p-3 w-24">น้ำหนัก</th>
                          <th className="p-3 w-32 text-center">จำนวนที่ปริ้น (copies)</th>
                          <th className="p-3 w-24 text-center">QR Code</th>
                          <th className="p-3 w-12 text-center">ลบ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStickers.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-16 text-center text-slate-400 font-medium">
                              {searchQuery ? "ไม่พบข้อมูลสติ๊กเกอร์ที่ตรงกับการค้นหา" : "ไม่มีข้อมูลสติ๊กเกอร์คลังสินค้าในตาราง"}
                              <div className="mt-2 text-[11px] text-slate-400">
                                กรุณากรอกฟอร์มเพื่อบันทึก หรือ คลิกนำเข้าไฟล์ Excel ด้านขวาบน
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredStickers.map((item) => {
                            const isActivePreview = item.id === activePreviewId;
                            return (
                              <tr 
                                key={item.id}
                                className={`hover:bg-slate-50/60 transition-colors ${
                                  isActivePreview ? "bg-indigo-50/20" : ""
                                }`}
                              >
                                {/* Checkbox Selector */}
                                <td className="p-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={item.selected}
                                    onChange={() => toggleSelectItem(item.id)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                                  />
                                </td>

                                {/* LPN Code - Inline Edit */}
                                <td className="p-3 font-mono font-bold text-slate-800">
                                  <input
                                    type="text"
                                    value={item.lpnCode}
                                    onChange={(e) => handleInlineEdit(item.id, "lpnCode", e.target.value)}
                                    className="w-full bg-transparent hover:bg-slate-100/70 focus:bg-white px-2 py-1.5 border border-transparent focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-lg focus:outline-none transition-all font-mono font-bold"
                                  />
                                </td>

                                {/* Metadata fields (ProductName, Vehicle, Lot) */}
                                <td className="p-3">
                                  <div className="max-w-[180px] sm:max-w-xs space-y-1">
                                    <input
                                      type="text"
                                      value={item.productName}
                                      onChange={(e) => handleInlineEdit(item.id, "productName", e.target.value)}
                                      className="w-full font-semibold text-slate-700 bg-transparent hover:bg-slate-100/70 focus:bg-white px-2 py-1 border border-transparent focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-lg focus:outline-none truncate"
                                      title={item.productName}
                                    />
                                    <div className="flex gap-1.5 text-[9px] text-slate-500 pl-2">
                                      <span className="bg-slate-100 px-1.5 py-0.5 rounded font-bold max-w-[110px] truncate" title={`ทะเบียนรถ: ${item.carLicense}`}>
                                        รถ: {item.carLicense || "-"}
                                      </span>
                                      <span className="bg-slate-100 px-1.5 py-0.5 rounded font-bold max-w-[90px] truncate" title={`Lot: ${item.lot}`}>
                                        Lot: {item.lot || "-"}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* Quantity */}
                                <td className="p-3 text-center">
                                  <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => handleInlineEdit(item.id, "quantity", e.target.value)}
                                    className="w-16 text-center bg-transparent hover:bg-slate-100/70 focus:bg-white py-1.5 border border-transparent focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-lg focus:outline-none font-mono font-bold text-slate-700"
                                  />
                                </td>

                                {/* Weight */}
                                <td className="p-3 font-mono">
                                  <input
                                    type="text"
                                    value={item.weight}
                                    onChange={(e) => handleInlineEdit(item.id, "weight", e.target.value)}
                                    className="w-16 bg-transparent hover:bg-slate-100/70 focus:bg-white px-1.5 py-1.5 border border-transparent focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-lg focus:outline-none font-bold"
                                  />
                                </td>

                                {/* Printing Copies with Fast Counter */}
                                <td className="p-3">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => updateItemCopy(item.id, item.copies - 1)}
                                      className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-600 font-bold font-mono select-none transition-all cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      value={item.copies}
                                      onChange={(e) => updateItemCopy(item.id, parseInt(e.target.value, 10) || 1)}
                                      min="1"
                                      className="w-10 text-center bg-white border border-slate-200 rounded-lg py-0.5 font-mono font-extrabold text-slate-800 focus:outline-none focus:border-indigo-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => updateItemCopy(item.id, item.copies + 1)}
                                      className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-600 font-bold font-mono select-none transition-all cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>

                                {/* Barcode / Action to scan or select preview */}
                                <td className="p-3 text-center">
                                  <div className="flex items-center gap-1.5 justify-center">
                                    <button
                                      type="button"
                                      onClick={() => setActivePreviewId(item.id)}
                                      className={`px-2.5 py-1 text-[10px] rounded-lg font-bold transition-all cursor-pointer ${
                                        isActivePreview
                                          ? "bg-indigo-600 text-white shadow-xs"
                                          : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                                      }`}
                                    >
                                      {item.barcode ? "ดูตัวอย่าง" : "เพิ่มโค้ด"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openScanner("barcode", item.id)}
                                      className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700 cursor-pointer"
                                      title="สแกนอัปเดต QR Code แถวนี้"
                                    >
                                      <Camera className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>

                                {/* Actions (Delete) */}
                                <td className="p-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => deleteItem(item.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="ลบแถวนี้"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Display table total metrics */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 text-right text-xs font-semibold text-slate-500">
                    แสดงรายการสินค้าทั้งหมด {filteredStickers.length} จาก {stickers.length} รายการ
                  </div>
                </div>
              </div>

              {/* RIGHT WORKSPACE COLUMN: STICKER PREVIEW & PRINT PANEL (4 Cols) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* 1. VISUAL 1:1 STICKER PREVIEWER */}
                <div className="bg-white border border-slate-200/60 rounded-3xl shadow-xs p-6 flex flex-col items-center">
                  <div className="w-full flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-slate-700">
                      <div className="p-1 bg-emerald-50 rounded-lg border border-emerald-100 text-emerald-600">
                        <FileText className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-xs text-slate-800">ตัวอย่างสติ๊กเกอร์ (4"x4" Preview)</h4>
                    </div>
                    {stickers.length > 0 && (
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        แผ่นที่ {activeIndex + 1} / {stickers.length}
                      </span>
                    )}
                  </div>

                  {activeSticker ? (
                    <div className="w-full flex flex-col items-center">
                      
                      {/* Scaled Sticker container simulating 4x4 */}
                      <div className="w-full bg-slate-100/70 p-4 rounded-2xl border border-slate-200 flex justify-center items-center relative overflow-hidden shadow-inner">
                        <div className="w-full max-w-[280px] shadow-2xl rounded-xl transition-all duration-300 hover:scale-[1.01]">
                          <Sticker item={activeSticker} isPreview={true} />
                        </div>
                      </div>

                      {/* Pagination buttons */}
                      {stickers.length > 1 && (
                        <div className="flex items-center justify-between w-full mt-4 px-1">
                          <button
                            onClick={prevPreview}
                            disabled={activeIndex === 0}
                            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl transition-colors disabled:opacity-40 disabled:hover:bg-white cursor-pointer shadow-xs"
                            title="สติ๊กเกอร์ก่อนหน้า"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          
                          <span className="text-[11px] font-bold text-slate-600 truncate max-w-[150px] font-mono" title={activeSticker.lpnCode}>
                            LPN: {activeSticker.lpnCode || "(ไม่มี)"}
                          </span>

                          <button
                            onClick={nextPreview}
                            disabled={activeIndex === stickers.length - 1}
                            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl transition-colors disabled:opacity-40 disabled:hover:bg-white cursor-pointer shadow-xs"
                            title="สติ๊กเกอร์ถัดไป"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-20 text-center text-slate-400 font-medium">
                      <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-xs">ไม่มีรายการใดแสดงตัวอย่าง</p>
                    </div>
                  )}
                </div>

                {/* 2. PRINT ACTION DESK */}
                <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-xs space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                    <div className="p-1 bg-indigo-50 rounded-lg text-indigo-600 border border-indigo-100">
                      <Printer className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">แผงควบคุมการพิมพ์สติ๊กเกอร์</h4>
                  </div>

                  {/* Print checklist & counters */}
                  <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3 text-xs text-slate-600">
                    <div className="flex justify-between items-center font-semibold">
                      <span>คลังสินค้าทั้งหมด:</span>
                      <span className="font-mono font-bold text-slate-800">{stickers.length} รายการ</span>
                    </div>
                    <div className="flex justify-between items-center font-semibold">
                      <span>รายการคัดเลือกเพื่อสั่งพิมพ์:</span>
                      <span className="font-mono font-bold text-emerald-600">{selectedItemsToPrint.length} รายการ</span>
                    </div>
                    <div className="flex justify-between items-center font-bold text-slate-900 pt-2.5 border-t border-dashed border-slate-200">
                      <span>รวมจำนวนพิมพ์สุทธิ:</span>
                      <span className="font-mono text-indigo-600 text-sm font-extrabold decoration-indigo-300 decoration-2">{sumOfCopies} สำเนา (แผ่น)</span>
                    </div>
                  </div>

                  {/* Print Action Buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={handlePrint}
                      disabled={isPrintSpooling || selectedItemsToPrint.length === 0}
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-300 disabled:to-slate-300 text-white rounded-2xl text-xs font-extrabold shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 active:scale-[0.99] transition-all cursor-pointer disabled:cursor-not-allowed disabled:shadow-none uppercase tracking-wider"
                      title="กดส่งคำสั่งพิมพ์สติ๊กเกอร์ทั้งหมดที่ถูกเลือกไปยังเครื่องพิมพ์"
                      id="btn-print-labels"
                    >
                      <Printer className="w-4 h-4" />
                      <span>พิมพ์สติ๊กเกอร์ ({sumOfCopies} แผ่น)</span>
                    </button>

                    <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                      คำแนะนำ: ตั้งค่า "ขนาดกระดาษ" เป็น 4"x4" หรือ 100mm x 100mm และเลือก "พิมพ์ไม่มีระยะขอบ (Margins: None)" ในหน้าต่างพิมพ์ของเบราว์เซอร์
                    </p>
                  </div>
                </div>

                {/* 3. EXPLAINER HELP CARD */}
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-3xl p-5 text-xs text-indigo-900/90 space-y-3">
                  <h5 className="font-bold flex items-center gap-1.5 text-indigo-950 text-[12px]">
                    <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                    <span>คำแนะนำการทำงาน</span>
                  </h5>
                  <ul className="list-disc pl-4 space-y-2 text-[11px] leading-relaxed font-medium text-slate-600">
                    <li>สามารถเพิ่มข้อมูลด้วยฟอร์มด้านซ้าย หรือนำเข้าสเปรดชีต Excel ครั้งละมากๆ ได้</li>
                    <li>แก้ไขข้อมูลโดยการคลิกที่เซลล์ในตารางได้โดยตรง ระบบจะบันทึกให้อัตโนมัติ</li>
                    <li>ใช้ตัวช่วย <strong className="text-indigo-700">Auto Copies</strong> เพื่อประหยัดเวลาการคำนวณจำนวนแผ่นตามล็อตและปริมาณ</li>
                    <li>ตรวจสอบความปลอดภัยของเครื่องสแกนบาร์โค้ดโดยคลิกที่สัญลักษณ์กล้องตามช่องข้อมูล</li>
                  </ul>
                </div>

              </div>

            </div>
          )}

        </main>
      </div>

      {/* Camera barcode scanner modal portal element */}
      <ScannerModal
        isOpen={scannerConfig.isActive}
        onClose={() => setScannerConfig({ isActive: false, targetField: null, targetItemId: null })}
        onScanSuccess={handleScanSuccess}
        availableFields={scanFields}
        defaultField={String(scannerConfig.targetField || "barcode")}
      />

    </div>
  );
}
