"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** QR code that opens the room's join page. Rendered as inline SVG in the theme's ink colour. */
export function JoinQr({ code, size = 160, className = "" }: { code: string; size?: number; className?: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    const url = `${location.origin}/r/${code}`;
    QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } })
      .then(setSvg)
      .catch(() => setSvg(null));
  }, [code]);
  if (!svg) return <div style={{ width: size, height: size }} className={`rounded-xl bg-ink/5 ${className}`} />;
  return (
    <div
      role="img"
      aria-label={`QR code to join room ${code}`}
      className={`overflow-hidden rounded-xl bg-white p-1.5 shadow-md ${className}`}
      style={{ width: size, height: size }}
      // trusted output from the qrcode library
      dangerouslySetInnerHTML={{ __html: svg.replace("<svg", '<svg width="100%" height="100%"') }}
    />
  );
}
