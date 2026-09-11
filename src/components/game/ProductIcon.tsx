import type { ProductId } from "@/types/game";

/**
 * Small inline SVG illustrations, one per surfboard product line. Deliberately
 * simple/stylized (not photorealistic) — just enough visual identity to tell
 * the three product cards apart at a glance. Uses currentColor so it follows
 * the surrounding text color (and therefore the theme).
 */
export function ProductIcon({ productId, className }: { productId: ProductId; className?: string }) {
  switch (productId) {
    case "shortboard":
      return (
        <svg viewBox="0 0 40 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M20 2C30 18 34 36 34 55C34 72 30 88 20 98C10 88 6 72 6 55C6 36 10 18 20 2Z"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="currentColor"
            fillOpacity="0.12"
          />
          <line x1="20" y1="10" x2="20" y2="92" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />
        </svg>
      );
    case "longboard":
      return (
        <svg viewBox="0 0 40 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M20 2C28 10 32 22 32 40L32 70C32 84 27 94 20 98C13 94 8 84 8 70L8 40C8 22 12 10 20 2Z"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="currentColor"
            fillOpacity="0.12"
          />
          <line x1="20" y1="8" x2="20" y2="94" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />
        </svg>
      );
    case "fishboard":
      return (
        <svg viewBox="0 0 40 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M20 2C29 16 33 34 33 52C33 62 31 70 27 76C31 80 33 86 33 92L27 84C24 90 22 94 20 98C18 94 16 90 13 84L7 92C7 86 9 80 13 76C9 70 7 62 7 52C7 34 11 16 20 2Z"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="currentColor"
            fillOpacity="0.12"
          />
          <line x1="20" y1="10" x2="20" y2="78" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />
        </svg>
      );
  }
}
