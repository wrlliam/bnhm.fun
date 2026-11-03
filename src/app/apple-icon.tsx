import { ImageResponse } from "next/og";
import { MARK_DATA_URI } from "@/lib/brand-art";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <img src={MARK_DATA_URI} width={180} height={180} alt="" />,
    size,
  );
}
