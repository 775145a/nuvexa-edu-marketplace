'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  wordClassName?: string;
  showWord?: boolean;
  size?: number;
  onDark?: boolean;
}

export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  const uid = useId().replace(/:/g, '');
  const tileId = `nvx-tile-${uid}`;
  const sparkId = `nvx-spark-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('drop-shadow-[0_6px_16px_rgba(235,32,39,0.35)]', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={tileId} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C9111A" />
          <stop offset="0.55" stopColor="#EB2027" />
          <stop offset="1" stopColor="#FF2D17" />
        </linearGradient>
        <linearGradient id={sparkId} x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFC9C4" />
          <stop offset="1" stopColor="#FF907E" />
        </linearGradient>
      </defs>

      <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${tileId})`} />

      <rect x="2" y="2" width="44" height="44" rx="13" stroke="white" strokeOpacity="0.18" strokeWidth="1.2" />

      <g stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 32V16" />
        <path d="M14.5 16L33.5 32" />
        <path d="M33.5 32V16" />
      </g>

      <path
        d="M33.5 16 L40.5 12.5 L40.5 19.5 Z"
        fill={`url(#${sparkId})`}
        stroke="white"
        strokeWidth="0"
      />

      <circle cx="11" cy="37" r="2.4" fill="white" opacity="0.9" />
    </svg>
  );
}

export function Logo({ className, wordClassName, showWord = true, size = 40, onDark }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      {showWord && (
        <span
          className={cn(
            'font-display text-[1.35rem] font-extrabold leading-none tracking-tight',
            onDark ? 'text-white' : 'text-foreground',
            wordClassName,
          )}
        >
          Nuve<span className="logo-gradient-text">xa</span>
        </span>
      )}
    </span>
  );
}
