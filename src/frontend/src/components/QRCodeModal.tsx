import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface QRCodeModalProps {
  open: boolean;
  onClose: () => void;
  anonymousId: string;
}

export function QRCodeModal({ open, onClose, anonymousId }: QRCodeModalProps) {
  const [copied, setCopied] = useState(false);

  // Generate QR code using a public API (no external package needed)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(anonymousId)}&bgcolor=0a0a0a&color=00e5ff&margin=2`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(anonymousId);
      setCopied(true);
      toast.success("ID kopyalandı!", { duration: 2000 });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kopyalanamadı");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-xs mx-auto bg-[oklch(0.09_0_0)] border border-white/10 rounded-2xl"
        data-ocid="qrcode.dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-center text-base font-semibold">
            Benim QR Kodum
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div className="rounded-xl overflow-hidden border border-white/10 p-2 bg-[#0a0a0a]">
            <img
              src={qrUrl}
              alt="QR Code"
              width={220}
              height={220}
              className="block"
            />
          </div>

          <p className="font-mono text-sm text-primary text-center break-all">
            {anonymousId}
          </p>

          <Button
            onClick={handleCopy}
            variant="outline"
            size="sm"
            className="w-full gap-2 border-white/10 bg-white/5 hover:bg-white/10"
            data-ocid="qrcode.copy_button"
          >
            {copied ? (
              <Check className="w-4 h-4 text-[oklch(0.72_0.2_145)]" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? "Kopyalandı!" : "Kopyala"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
