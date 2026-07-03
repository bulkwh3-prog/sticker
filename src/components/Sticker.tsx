import React from "react";
import { StickerItem } from "../types";
import { Barcode } from "./Barcode";
import { Box, Calendar, Truck, Layers, Tag, Scale } from "lucide-react";

interface StickerProps {
  item: StickerItem;
  isPreview?: boolean; // If true, adds borders/styling for UI; if false, it is formatted purely for thermal printer black-and-white print output.
}

export const Sticker: React.FC<StickerProps> = ({ item, isPreview = false }) => {
  const {
    title,
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

  // Render a clean grid of details for thermal print efficiency
  return (
    <div
      className={`sticker-print-page font-sans bg-white text-black flex flex-col justify-between select-none ${
        isPreview
          ? "border-2 border-gray-800 rounded-xl shadow-lg w-full max-w-[360px] h-[360px] p-4 text-xs"
          : "text-sm h-full w-full"
      }`}
      style={{ boxSizing: "border-box" }}
    >
      {/* 2. Middle Grid: LPN and Basic Logistics Info */}
      <div className="grid grid-cols-12 gap-1 border-b border-black pb-1.5 mb-1 text-[11px]">
        {/* LPN Code (Prominent) */}
        <div className="col-span-7 border-r border-black pr-1 flex flex-col justify-between">
          <div className="text-[9px] font-bold text-gray-500 flex items-center gap-1 uppercase">
            <Tag className="w-2.5 h-2.5" />
            <span>LPN Code / รหัส LPN</span>
          </div>
          <div 
            className="font-mono font-bold text-md text-black tracking-wider break-all mt-0.5 leading-none"
            style={{ fontSize: "25px", lineHeight: "42px" }}
          >
            {lpnCode || "-"}
          </div>
        </div>

        {/* Receive Date & License Plate */}
        <div className="col-span-5 pl-1 flex flex-col justify-between gap-1">
          <div>
            <div className="text-[8px] font-bold text-gray-500 flex items-center gap-1 uppercase">
              <Calendar className="w-2.5 h-2.5" />
              <span>วันที่รับ (Date)</span>
            </div>
            <div 
              className="font-mono text-black font-bold"
              style={{ fontSize: "17px" }}
            >
              {receiveDate || "-"}
            </div>
          </div>
          <div>
            <div className="text-[8px] font-bold text-gray-500 flex items-center gap-1 uppercase">
              <Truck className="w-2.5 h-2.5" />
              <span>ทะเบียนรถ (Vehicle)</span>
            </div>
            <div 
              className="font-sans text-black font-bold truncate"
              style={{ fontSize: "13px" }}
            >
              {carLicense || "-"}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Product Name (Large, easy-to-read) */}
      <div className="flex-1 flex flex-col justify-start mb-1 text-[11px]">
        <div className="text-[9px] font-bold text-gray-500 uppercase flex items-center gap-1 mb-0.5">
          <Box className="w-2.5 h-2.5" />
          <span>Product / ชื่อสินค้า</span>
        </div>
        <div 
          className="font-bold text-xs text-black leading-tight line-clamp-2" 
          title={productName}
          style={{ 
            fontSize: "24px",
            textAlign: "center",
            marginBottom: "0px",
            marginRight: "0px",
            paddingBottom: "0px",
            paddingRight: "0px",
            paddingTop: "26px"
          }}
        >
          {productName || "ไม่ได้ระบุชื่อสินค้า"}
        </div>
      </div>

      {/* 4. Sab Code & Lot Info */}
      <div className="grid grid-cols-2 gap-1 border-t border-b border-black py-1 mb-1 text-[11px]">
        <div className="border-r border-black pr-1">
          <div className="text-[8px] font-bold text-gray-500 uppercase">SAB Code</div>
          <div 
            className="font-mono font-bold text-xs truncate text-black"
            style={{ fontSize: "10px" }}
          >
            {sabCode || "-"}
          </div>
        </div>
        <div className="pl-1">
          <div className="text-[8px] font-bold text-gray-500 uppercase flex items-center gap-1">
            <Layers className="w-2.5 h-2.5 text-gray-400" />
            <span>Lot / ล็อต</span>
          </div>
          <div 
            className="font-mono font-bold text-xs truncate text-black"
            style={{ marginLeft: "39px", fontSize: "15px" }}
          >
            {lot || "-"}
          </div>
        </div>
      </div>

      {/* 5. Quantity & Weight Highlight */}
      <div className="grid grid-cols-2 gap-1 border-b border-black pb-1.5 mb-1.5">
        <div className="border-r border-black pr-2 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-gray-500 uppercase">Qty / จำนวน</span>
            <span 
              className="font-mono font-bold text-lg text-black leading-none mt-0.5"
              style={{ marginTop: "2px", marginLeft: "44px", fontSize: "21px" }}
            >
              {quantity !== undefined ? quantity.toLocaleString() : "0"}
            </span>
          </div>
          <span className="text-[9px] font-semibold text-gray-600 bg-gray-100 px-1 rounded">PCS</span>
        </div>
        
        <div className="pl-2 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-gray-500 uppercase flex items-center gap-0.5">
              <Scale className="w-2.5 h-2.5 text-gray-400" />
              <span>Weight / น้ำหนัก</span>
            </span>
            <span 
              className="font-mono font-bold text-lg text-black leading-none mt-0.5 truncate"
              style={{ marginLeft: "37px" }}
            >
              {weight || "0"}
            </span>
          </div>
          <span className="text-[9px] font-semibold text-gray-600 bg-gray-100 px-1 rounded">KG</span>
        </div>
      </div>

      {/* 6. Dynamic Vector Barcode */}
      <div className="mt-auto">
        <Barcode value={barcode || lpnCode || "SAMPLE-BARCODE"} height={isPreview ? 36 : 40} />
      </div>
    </div>
  );
};
