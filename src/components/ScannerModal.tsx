import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, X, RefreshCw, AlertCircle, Check, Layers, ArrowRight } from "lucide-react";
import { parseScannedBarcode, ParsedBarcodeResult } from "../utils/barcodeHelper";
import { StickerItem } from "../types";

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string, field: string, fullData?: Partial<StickerItem>) => void;
  availableFields: { key: string; label: string }[];
  defaultField?: string;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  availableFields,
  defaultField = "barcode",
}) => {
  const [selectedField, setSelectedField] = useState<string>(defaultField);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>("");
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [compositeData, setCompositeData] = useState<ParsedBarcodeResult | null>(null);
  
  const qrReaderRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "camera-scanner-view";

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    setScannedResult(null);
    setCompositeData(null);
    setIsInitializing(true);
    setErrorMsg(null);

    // Give a small delay to make sure DOM is mounted
    const timer = setTimeout(() => {
      initializeScanner();
    }, 300);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen, activeCameraId]);

  const stopScanner = async () => {
    if (qrReaderRef.current) {
      if (qrReaderRef.current.isScanning) {
        try {
          await qrReaderRef.current.stop();
        } catch (err) {
          console.error("Failed to stop scanner", err);
        }
      }
      qrReaderRef.current = null;
    }
  };

  const initializeScanner = async () => {
    try {
      // Check for camera devices
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        throw new Error("ไม่พบกล้องในเครื่องของคุณ หรือไม่ได้รับอนุญาตให้เข้าถึงกล้อง");
      }
      setCameras(devices);

      // Select camera: either the active one, or prefer back camera, or first one
      let cameraId = activeCameraId;
      if (!cameraId) {
        const backCam = devices.find(device => 
          device.label.toLowerCase().includes("back") || 
          device.label.toLowerCase().includes("rear") || 
          device.label.toLowerCase().includes("environment")
        );
        cameraId = backCam ? backCam.id : devices[0].id;
        setActiveCameraId(cameraId);
      }

      const html5Qrcode = new Html5Qrcode(scannerId);
      qrReaderRef.current = html5Qrcode;

      await html5Qrcode.start(
        cameraId,
        {
          fps: 10,
          qrbox: (width, height) => {
            // Rectangular box for general barcodes
            const boxWidth = Math.min(width * 0.8, 300);
            const boxHeight = Math.min(height * 0.4, 150);
            return { width: boxWidth, height: boxHeight };
          },
          aspectRatio: 1.777778 // 16:9
        },
        (decodedText) => {
          // Play a small default beep or feedback
          handleSuccessfulScan(decodedText);
        },
        (errorMessage) => {
          // Verbose error logging can be ignored (it's called on every frame when no code is found)
        }
      );

      setIsInitializing(false);
    } catch (err: any) {
      console.error("Scanner init error:", err);
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการเปิดกล้องสแกน");
      setIsInitializing(false);
    }
  };

  const handleSuccessfulScan = (text: string) => {
    setScannedResult(text);
    const parsed = parseScannedBarcode(text);

    if (parsed.isComposite) {
      setCompositeData(parsed);
      // Wait for user confirmation or quick button action
    } else {
      // Normal single barcode
      setTimeout(() => {
        onScanSuccess(text, selectedField);
        onClose();
      }, 700);
    }
  };

  const applyFullData = () => {
    if (!scannedResult || !compositeData) return;
    const fullData: Partial<StickerItem> = {};
    if (compositeData.sabCode) fullData.sabCode = compositeData.sabCode;
    if (compositeData.quantity !== undefined) fullData.quantity = compositeData.quantity;
    if (compositeData.weight) fullData.weight = compositeData.weight;
    if (compositeData.receiveDate) fullData.receiveDate = compositeData.receiveDate;
    if (compositeData.expireDate) fullData.expireDate = compositeData.expireDate;
    if (compositeData.carLicense) fullData.carLicense = compositeData.carLicense;
    if (compositeData.lpnCode) fullData.lpnCode = compositeData.lpnCode;
    fullData.barcode = scannedResult;

    onScanSuccess(scannedResult, selectedField, fullData);
    onClose();
  };

  const applySingleField = () => {
    if (!scannedResult) return;
    onScanSuccess(scannedResult, selectedField);
    onClose();
  };

  const toggleCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setActiveCameraId(cameras[nextIndex].id);
  };

  if (!isOpen) return null;

  return (
    <div id="scanner-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-md overflow-hidden bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2 text-emerald-400">
            <Camera className="w-5 h-5" />
            <h3 className="font-semibold text-white text-md">สแกนรหัสผ่านกล้อง</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form selection & info */}
        <div className="p-4 bg-gray-950 border-b border-gray-800">
          <label className="block mb-2 text-xs font-medium text-gray-400">
            ปลายทางข้อมูลหลังสแกนสำเร็จ:
          </label>
          <div className="flex flex-wrap gap-2">
            {availableFields.map((field) => (
              <button
                key={field.key}
                type="button"
                onClick={() => setSelectedField(field.key)}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-all ${
                  selectedField === field.key
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-xs"
                    : "bg-gray-900 text-gray-400 border-gray-800 hover:text-gray-300"
                }`}
              >
                {field.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scan Area Container */}
        <div className="relative flex flex-col items-center justify-center bg-black aspect-video">
          
          {/* Target Box Overlay */}
          {!isInitializing && !errorMsg && !scannedResult && (
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
              <div className="relative w-[300px] h-[120px] border-2 border-dashed border-emerald-500 rounded-lg animate-pulse">
                {/* Custom target corner lines */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400"></div>
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400"></div>
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400"></div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400"></div>
                
                {/* Red scanning line */}
                <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-red-500 opacity-80 shadow-red-500 shadow-md"></div>
              </div>
              <div className="absolute bottom-4 text-[10px] text-gray-400 bg-black/60 px-2 py-1 rounded font-mono">
                นำบาร์โค้ดให้อยู่ในกรอบเพื่อสแกน
              </div>
            </div>
          )}

          {/* Actual Video Tag target for html5-qrcode */}
          <div 
            id={scannerId} 
            className="w-full h-full overflow-hidden [&_video]:object-cover"
          ></div>

          {/* Loading Indicator */}
          {isInitializing && !errorMsg && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-950">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-xs text-gray-400 font-medium">กำลังเปิดระบบกล้อง...</p>
            </div>
          )}

          {/* Scanned Success Screen */}
          {scannedResult && compositeData && (
            <div className="absolute inset-0 flex flex-col justify-between p-3.5 bg-gray-950/98 z-30 text-white overflow-y-auto">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 mb-1.5">
                  <div className="p-1 bg-emerald-500/20 rounded-md">
                    <Layers className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-white">ตรวจพบ QR Code รวมข้อมูล 6 ช่อง!</h4>
                    <p className="text-[10px] text-emerald-400 font-medium">สแกนเนอร์สามารถอ่านข้อมูลทุกช่องได้ครบถ้วน</p>
                  </div>
                </div>

                {/* 6 Fields Grid Preview */}
                <div className="grid grid-cols-2 gap-1.5 text-[11px] my-2">
                  <div className="bg-gray-900 p-2 rounded-lg border border-gray-800">
                    <span className="text-[9px] text-gray-400 block font-bold">1. SAB Code:</span>
                    <span className="font-mono font-bold text-emerald-300 truncate block">{compositeData.sabCode || "-"}</span>
                  </div>
                  <div className="bg-gray-900 p-2 rounded-lg border border-gray-800">
                    <span className="text-[9px] text-gray-400 block font-bold">2. จำนวน:</span>
                    <span className="font-mono font-bold text-indigo-300 block">{compositeData.quantity !== undefined ? compositeData.quantity.toLocaleString() : "-"}</span>
                  </div>
                  <div className="bg-gray-900 p-2 rounded-lg border border-gray-800">
                    <span className="text-[9px] text-gray-400 block font-bold">3. น้ำหนัก:</span>
                    <span className="font-mono font-bold text-indigo-300 block">{compositeData.weight ? `${compositeData.weight} KG` : "-"}</span>
                  </div>
                  <div className="bg-gray-900 p-2 rounded-lg border border-gray-800">
                    <span className="text-[9px] text-gray-400 block font-bold">4. วันที่รับ:</span>
                    <span className="font-mono font-bold text-amber-300 block">{compositeData.receiveDate || "-"}</span>
                  </div>
                  <div className="bg-gray-900 p-2 rounded-lg border border-gray-800">
                    <span className="text-[9px] text-gray-400 block font-bold">5. วันหมดอายุ:</span>
                    <span className="font-mono font-bold text-red-400 block">{compositeData.expireDate || "-"}</span>
                  </div>
                  <div className="bg-gray-900 p-2 rounded-lg border border-gray-800">
                    <span className="text-[9px] text-gray-400 block font-bold">6. ทะเบียนรถ:</span>
                    <span className="font-mono font-bold text-cyan-300 truncate block">{compositeData.carLicense || "-"}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-1.5 pt-1">
                <button
                  type="button"
                  onClick={applyFullData}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>นำเข้าข้อมูลครบทั้ง 6 ช่องทันที (Auto-fill All)</span>
                </button>
                <button
                  type="button"
                  onClick={applySingleField}
                  className="w-full py-1.5 px-3 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white border border-gray-800 rounded-xl text-[10px] font-medium transition-all cursor-pointer"
                >
                  นำเข้าเฉพาะช่อง "{availableFields.find(f => f.key === selectedField)?.label || selectedField}"
                </button>
              </div>
            </div>
          )}

          {/* Scanned Success Screen (Single Field) */}
          {scannedResult && !compositeData && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-emerald-950/95 z-20 transition-all duration-300">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                <Check className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-white">สแกนสำเร็จ!</p>
              <div className="px-4 py-2 max-w-[90%] bg-black/40 rounded-lg border border-emerald-500/20 text-center">
                <span className="block text-[10px] text-gray-400 font-mono">ข้อมูลที่ได้</span>
                <span className="font-mono text-xs text-emerald-300 font-semibold break-all">{scannedResult}</span>
              </div>
            </div>
          )}

          {/* Error Message Screen */}
          {errorMsg && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-950 p-6 text-center">
              <AlertCircle className="w-10 h-10 text-red-500" />
              <h4 className="text-sm font-semibold text-white">ไม่สามารถเปิดใช้งานกล้องได้</h4>
              <p className="text-xs text-gray-400 max-w-xs">{errorMsg}</p>
              <button
                onClick={initializeScanner}
                className="mt-2 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-all"
              >
                ลองใหม่อีกครั้ง
              </button>
            </div>
          )}
        </div>

        {/* Footer / Controls */}
        <div className="flex items-center justify-between p-4 bg-gray-950 border-t border-gray-800">
          <div className="text-[10px] text-gray-500">
            {cameras.length > 0 ? `พบกล้องทั้งหมด ${cameras.length} ตัว` : "ไม่พบข้อมูลกล้อง"}
          </div>
          {cameras.length > 1 && (
            <button
              onClick={toggleCamera}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white bg-gray-900 border border-gray-800 rounded-lg hover:bg-gray-800 transition-colors"
              title="สลับกล้อง"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>สลับกล้อง</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
