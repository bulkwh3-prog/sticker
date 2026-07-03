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

  return (
    <div
      className={`font-sans bg-white text-black flex flex-col justify-between select-none box-border ${
        isPreview
          ? "border border-slate-300 shadow-md rounded-xs text-[11px]"
          : "h-full w-full text-[11px] p-5 border border-black"
      }`}
      style={{
        boxSizing: "border-box",
        width: isPreview ? "294px" : "100%",
        height: isPreview ? "328px" : "100%",
        padding: isPreview ? "16px" : "20px",
      }}
    >
      {/* 1. Header Zone: PCG Badge + Label Title */}
      <div
        className="flex items-center justify-center gap-2 mb-1.5 mt-1 relative"
        style={isPreview ? { marginBottom: "5px", marginTop: "-11px" } : undefined}
      >
        <div className="bg-[#0f2952] text-white text-[9px] md:text-[10px] font-extrabold px-1.5 py-0.5 rounded-xs tracking-wider uppercase absolute left-1">
          PCG
        </div>
        <div className="font-bold text-xs md:text-sm text-black font-sans tracking-wide">
          ใบป้ายประวัติวัตถุดิบ
        </div>
      </div>

      {/* 2. Top Rounded Box containing the LPN Code */}
      <div
        className="border border-black rounded-lg py-1 px-3 flex items-center justify-center min-h-[48px] h-auto bg-white mb-2"
        style={
          isPreview
            ? {
                marginLeft: "0px",
                marginTop: "-8px",
                paddingRight: "12px",
                paddingTop: "2px",
                marginRight: "0px",
                marginBottom: "-4px",
                height: "48px",
                paddingBottom: "4px",
              }
            : undefined
        }
      >
        <span
          className="font-mono font-extrabold text-black tracking-wider truncate"
          style={{ fontSize: "38px" }}
        >
          {lpnCode || "0"}
        </span>
      </div>

      {/* 3. Centered QR Code Section */}
      <div className="flex justify-center items-center my-1.5 bg-white">
        <QRCode value={barcode || lpnCode || "SAMPLE-QRCODE"} size={isPreview ? 90 : 105} isPreview={isPreview} />
      </div>

      {/* 4. Middle Details: Qty, Weight, Date, Loc, Car License */}
      <div
        className="space-y-1.5 my-1.5 text-black font-sans px-1"
        style={isPreview ? { marginRight: "0px", marginBottom: "40px" } : undefined}
      >
        {/* Row 1: Quantity & Weight */}
        <div className="flex justify-between items-baseline">
          <div className="flex items-baseline">
            <span className="font-bold text-[11px] md:text-xs">จำนวน :</span>
            <span
              className="font-extrabold text-black ml-1.5"
              style={{ fontSize: "16px", marginLeft: "32px" }}
            >
              {quantity !== undefined ? quantity.toLocaleString() : "0"}
            </span>
          </div>
          <div className="flex items-baseline">
            <span
              className="font-bold text-[11px] md:text-xs"
              style={{ marginLeft: "0px", paddingTop: "0px", marginTop: "0px" }}
            >
              น้ำหนัก :
            </span>
            <span className="font-extrabold text-xs md:text-sm ml-1.5">{weight || "0"}</span>
            <span
              className="font-extrabold text-[9px] md:text-[10px] ml-1.5 uppercase"
              style={{ marginRight: "10px" }}
            >
              KG.
            </span>
          </div>
        </div>

        {/* Row 2: Receive Date & Loc */}
        <div className="flex justify-between items-baseline">
          <div className="flex items-baseline">
            <span className="font-bold text-[11px] md:text-xs">วันที่รับ :</span>
            <span className="font-extrabold text-xs md:text-sm ml-1.5">{receiveDate || "-"}</span>
          </div>
          <div className="flex items-baseline" style={{ marginRight: "35px" }}>
            <span className="font-bold text-[11px] md:text-xs">Loc :</span>
            <span className="font-extrabold text-xs md:text-sm ml-1.5"></span>
          </div>
        </div>

        {/* Row 3: Car License Plate */}
        <div className="flex items-baseline">
          <span className="font-bold text-[11px] md:text-xs">ทะเบียนรถ :</span>
          <span className="font-extrabold text-xs md:text-sm ml-1.5 truncate">{carLicense || "-"}</span>
        </div>
      </div>

      {/* 5. Bottom Rounded Box (SAP Code, Name, Lot) */}
      <div
        className="border border-black rounded-xl p-3 bg-white text-left mt-1"
        style={
          isPreview
            ? {
                width: "260px",
                height: "79px",
                marginBottom: "-1px",
                marginRight: "0px",
                marginTop: "-41px",
              }
            : undefined
        }
      >
        {/* SAP Code Line */}
        <div className="text-[10px] md:text-xs leading-none">
          <span className="font-bold">SAP Code :</span>
          <span className="font-mono font-extrabold ml-1.5">{sabCode || "-"}</span>
        </div>

        {/* Product Name Line */}
        <div className="text-[10px] md:text-xs leading-tight mt-2 line-clamp-2 min-h-[1.5em]" title={productName}>
          <span className="font-bold">Name:</span>
          <span className="font-extrabold ml-1.5">{productName || "ไม่ได้ระบุชื่อสินค้า"}</span>
        </div>

        {/* Lot Line (Huge Number value) */}
        <div
          className="flex items-baseline mt-2 leading-none"
          style={isPreview ? { marginRight: "0px", marginLeft: "0px", marginTop: "0px" } : undefined}
        >
          <span className="text-[10px] md:text-xs font-bold">Lot :</span>
          <span className="font-mono font-extrabold text-2xl ml-3 text-black leading-none">
            {lot || "0"}
          </span>
        </div>
      </div>

      {/* 6. Legal / System Footer Text */}
      <div
        className="text-[7.5px] md:text-[8px] font-bold text-black tracking-tight mt-2 self-start pl-1 uppercase font-sans"
        style={isPreview ? { marginTop: "2px" } : undefined}
      >
        F-RM-26-03 Rev.01 บังคับใช้เมื่อวันที่ 10/08/2566
      </div>
    </div>
  );
};
