import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FlipHorizontal, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useQRScanner } from "../qr-code/useQRScanner";

interface QRScannerModalProps {
  open: boolean;
  onClose: () => void;
  onFound: (anonId: string) => void;
}

const ANON_ID_PATTERN = /^\+777 \d{4} \d{4}$/;
const IS_MOBILE =
  /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );

export function QRScannerModal({
  open,
  onClose,
  onFound,
}: QRScannerModalProps) {
  const {
    qrResults,
    isActive,
    isSupported,
    error,
    isLoading,
    canStartScanning,
    startScanning,
    stopScanning,
    switchCamera,
    clearResults,
    videoRef,
    canvasRef,
  } = useQRScanner({
    facingMode: "environment",
    scanInterval: 100,
    maxResults: 5,
  });

  const processedRef = useRef<Set<string>>(new Set());

  // Start/stop scanning based on dialog open state
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — only react to open changes
  useEffect(() => {
    if (open) {
      clearResults();
      processedRef.current.clear();
      startScanning();
    } else {
      stopScanning();
    }
  }, [open]);

  // Watch qrResults for new scans
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — callbacks stable via parent
  useEffect(() => {
    for (const result of qrResults) {
      const key = `${result.data}-${result.timestamp}`;
      if (processedRef.current.has(key)) continue;
      processedRef.current.add(key);

      const trimmed = result.data.trim();
      if (ANON_ID_PATTERN.test(trimmed)) {
        stopScanning();
        onFound(trimmed);
        onClose();
      } else {
        toast.error("Geçersiz QR kodu, tekrar deneyin", { duration: 2500 });
      }
    }
  }, [qrResults]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-sm mx-auto bg-[oklch(0.09_0_0)] border border-white/10 rounded-2xl p-4"
        data-ocid="qrscanner.dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-center text-base font-semibold">
            QR Kodu Tara
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3">
          {isSupported === false ? (
            <div
              className="text-center py-8 text-muted-foreground text-sm"
              data-ocid="qrscanner.error_state"
            >
              Kamera desteklenmiyor
            </div>
          ) : error ? (
            <div
              className="text-center py-8 text-destructive text-sm"
              data-ocid="qrscanner.error_state"
            >
              {error.message}
            </div>
          ) : (
            <div className="relative w-full rounded-xl overflow-hidden bg-black aspect-square">
              {isLoading && !isActive && (
                <div
                  className="absolute inset-0 flex items-center justify-center bg-black/80 z-10"
                  data-ocid="qrscanner.loading_state"
                >
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              )}
              <video
                ref={videoRef as React.RefObject<HTMLVideoElement>}
                playsInline
                muted
                autoPlay
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <canvas
                ref={canvasRef as React.RefObject<HTMLCanvasElement>}
                style={{ display: "none" }}
              />

              {/* Scan overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-6 border-2 border-primary/50 rounded-lg" />
                <div className="absolute top-6 left-6 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                <div className="absolute top-6 right-6 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                <div className="absolute bottom-6 left-6 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                <div className="absolute bottom-6 right-6 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-lg" />
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Arkadaşının QR kodunu kameranın önüne tutun
          </p>

          {IS_MOBILE && isActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => switchCamera()}
              className="gap-2 border-white/10 bg-white/5 hover:bg-white/10"
              data-ocid="qrscanner.toggle"
            >
              <FlipHorizontal className="w-4 h-4" />
              Kamerayı Çevir
            </Button>
          )}

          {!isActive && !isLoading && canStartScanning && (
            <Button
              size="sm"
              onClick={() => startScanning()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-ocid="qrscanner.primary_button"
            >
              Taramayı Başlat
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
