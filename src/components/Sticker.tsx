import React from "react";
import { StickerItem } from "../types";
import { QRCode } from "./QRCode";

interface StickerProps {
  item: StickerItem;
  isPreview?: boolean; // If true, formatted for UI preview; if false, fits the 101.6mm x 101.6mm thermal printer layout.
}

export const Sticker: React.FC<StickerProps> = ({ item, isPreview = false }) => {
  const {
    lpnCode,
    quantity,
    weight,
    receiveDate,
    carLicense,
    sabCode,
    productName,
    lot,
    barcode,
  } = item;

  // Render a clean, high-contrast label matching the user's reference image perfectly
  return (
    <div
      className={`font-sans bg-white text-black flex flex-col justify-between select-none box-border ${
        isPreview
          ? "w-full aspect-square p-4 border border-slate-300 shadow-md rounded-xs text-[11px]"
          : "h-full w-full text-xs"
      }`}
      style={{ boxSizing: "border-box" }}
    >
      {/* 1. Header Zone: PCG Badge + Label Title */}
      <div className="flex items-center gap-2 mb-1.5 justify-start">
        <div className="bg-[#0f2952] text-white text-[9px] md:text-[10px] font-extrabold px-1.5 py-0.5 rounded-xs tracking-wider uppercase">
          PCG
        </div>
        <div className="font-bold text-xs md:text-sm text-black font-sans">
          ใบป้ายประวัติวัตถุดิบ
        </div>
      </div>

      {/* 2. Top Rounded Box containing the LPN Code */}
      <div className="border border-black rounded-lg py-1 px-3 flex items-center justify-center h-10 md:h-12 bg-white">
        <span className="font-mono font-extrabold text-xl md:text-2xl text-black tracking-wider truncate">
          {lpnCode || "0"}
        </span>
      </div>

      {/* 3. Centered QR Code Section */}
      <div className="flex justify-center items-center my-1 md:my-1.5">
        <QRCode value={barcode || lpnCode || "SAMPLE-QRCODE"} size={isPreview ? 85 : 95} />
      </div>

      {/* 4. Middle Details: Qty, Weight, Date, Loc, Car License */}
      <div className="space-y-0.5 md:space-y-1 text-black font-sans">
        {/* Row 1: Quantity & Weight */}
        <div className="flex justify-between items-baseline px-1">
          <div className="flex items-baseline">
            <span className="font-semibold text-[11px] md:text-xs">จำนวน :</span>
            <span className="font-bold text-xs md:text-sm ml-1.5">
              {quantity !== undefined ? quantity.toLocaleString() : "0"}
            </span>
          </div>
          <div className="flex items-baseline">
            <span className="font-semibold text-[11px] md:text-xs">น้ำหนัก :</span>
            <span className="font-bold text-xs md:text-sm ml-1.5">{weight || "0"}</span>
            <span className="font-bold text-[9px] md:text-[10px] ml-1 uppercase">KG.</span>
          </div>
        </div>

        {/* Row 2: Receive Date & Loc */}
        <div className="flex justify-between items-baseline px-1">
          <div className="flex items-baseline">
            <span className="font-semibold text-[11px] md:text-xs">วันที่รับ :</span>
            <span className="font-bold text-xs md:text-sm ml-1.5">{receiveDate || "-"}</span>
          </div>
          <div className="w-1/3 flex items-baseline">
            <span className="font-semibold text-[11px] md:text-xs">Loc :</span>
            <span className="font-bold text-xs md:text-sm ml-1.5"></span>
          </div>
        </div>

        {/* Row 3: Car License Plate */}
        <div className="px-1 flex items-baseline">
          <span className="font-semibold text-[11px] md:text-xs">ทะเบียนรถ :</span>
          <span className="font-bold text-xs md:text-sm ml-1.5 truncate">{carLicense || "-"}</span>
        </div>
      </div>

      {/* 5. Bottom Rounded Box (SAP Code, Name, Lot) */}
      <div className="border border-black rounded-lg p-2.5 mt-1.5 bg-white text-left">
        {/* SAP Code Line */}
        <div className="text-[10px] md:text-xs leading-none">
          <span className="font-semibold">SAP Code :</span>
          <span className="font-mono font-bold ml-1.5">{sabCode || "-"}</span>
        </div>

        {/* Product Name Line */}
        <div className="text-[10px] md:text-xs leading-tight mt-1.5 line-clamp-2 min-h-[1.5em]" title={productName}>
          <span className="font-semibold">Name:</span>
          <span className="font-bold ml-1.5">{productName || "ไม่ได้ระบุชื่อสินค้า"}</span>
        </div>

        {/* Lot Line (Huge Number value) */}
        <div className="flex items-baseline mt-1 leading-none">
          <span className="text-[10px] md:text-xs font-semibold">Lot :</span>
          <span className="font-mono font-extrabold text-lg md:text-xl ml-2 text-black leading-none">
            {lot || "0"}
          </span>
        </div>
      </div>

      {/* 6. Legal / System Footer Text */}
      <div className="text-[7.5px] md:text-[8px] font-medium text-black tracking-tight mt-1 self-start pl-1 uppercase font-sans">
        F-RM-26-03 Rev.01 บังคับใช้เมื่อวันที่ 10/08/2566
      </div>
    </div>
  );
};
