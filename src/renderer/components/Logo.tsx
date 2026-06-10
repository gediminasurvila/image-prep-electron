import React from 'react'

/**
 * Inline SVG of the app icon (photo card with sun + mountains on a gradient
 * tile). Inlined rather than imported as a PNG so it stays crisp at small sizes
 * and needs no asset bundling. Mirrors build/icon.svg.
 */
export function Logo({ size = 22 }: { size?: number }): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      role="img"
      aria-label="ImagePrep"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ipBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b8cff" />
          <stop offset="1" stopColor="#7c4dff" />
        </linearGradient>
        <linearGradient id="ipMtn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b8cff" />
          <stop offset="1" stopColor="#7c4dff" />
        </linearGradient>
        <clipPath id="ipCard">
          <rect x="232" y="280" width="560" height="464" rx="56" ry="56" />
        </clipPath>
      </defs>

      <rect x="0" y="0" width="1024" height="1024" rx="232" ry="232" fill="url(#ipBg)" />
      <rect x="232" y="280" width="560" height="464" rx="56" ry="56" fill="#ffffff" />

      <g clipPath="url(#ipCard)">
        <circle cx="372" cy="408" r="58" fill="#ffd166" />
        <path d="M232 744 L420 470 L560 660 L660 540 L792 744 Z" fill="url(#ipMtn)" />
        <path d="M232 744 L560 470 L792 744 Z" fill="#3f5fd6" opacity="0.85" />
      </g>
    </svg>
  )
}
