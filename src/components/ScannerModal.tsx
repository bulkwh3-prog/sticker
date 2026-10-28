import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, X, RefreshCw, AlertCircle, Check } from "lucide-react";

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string, field: string) => void;
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
  
  const qrReaderRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "camera-scanner-view";

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    setScannedResult(null);
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
    // Visual feedback delay
    setTimeout(() => {
      onScanSuccess(text, selectedField);
      onClose();
    }, 800);
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
          {scannedResult && (
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
