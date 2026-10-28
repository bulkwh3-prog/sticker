import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeProps {
  value: string;
  height?: number;
  width?: number;
  fontSize?: number;
}

export const Barcode: React.FC<BarcodeProps> = ({
  value,
  height = 40,
  width = 1.6,
  fontSize = 11,
}) => {
  const elementRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (elementRef.current && value) {
      try {
        JsBarcode(elementRef.current, value, {
          format: "CODE128",
          width: width,
          height: height,
          displayValue: true,
          fontSize: fontSize,
          font: "monospace",
          textMargin: 2,
          margin: 4,
          background: "transparent",
        });
      } catch (err) {
        console.error("Barcode generation error for value:", value, err);
      }
    }
  }, [value, height, width, fontSize]);

  if (!value || value.trim() === "") {
    return (
      <div className="flex items-center justify-center border border-dashed border-gray-300 h-12 text-gray-400 font-mono text-xs">
        (ใส่รหัสบาร์โค้ด)
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center w-full overflow-hidden">
      <svg ref={elementRef} className="max-w-full h-auto" id={`barcode-svg-${encodeURIComponent(value)}`}></svg>
    </div>
  );
};
