import React, { useEffect, useRef } from "react";
import QRCodeLib from "qrcode";

interface QRCodeProps {
  value: string;
  size?: number;
}

export const QRCode: React.FC<QRCodeProps> = ({ value, size = 100 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCodeLib.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      }, (error) => {
        if (error) console.error("QR Code generation error:", error);
      });
    }
  }, [value, size]);

  if (!value || value.trim() === "") {
    return (
      <div className="flex items-center justify-center border border-dashed border-gray-300 w-24 h-24 text-gray-400 font-mono text-xs">
        (ใส่ข้อมูล QR Code)
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center">
      <canvas ref={canvasRef} className="max-w-full h-auto" />
    </div>
  );
};
