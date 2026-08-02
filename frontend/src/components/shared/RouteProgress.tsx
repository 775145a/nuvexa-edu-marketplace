'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export function RouteProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (doneTimer.current) clearTimeout(doneTimer.current);

    setVisible(true);
    setProgress(12);

    timer.current = setTimeout(() => setProgress(78), 90);

    doneTimer.current = setTimeout(() => {
      setProgress(100);
      setTimeout(() => setVisible(false), 280);
    }, 420);

    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (doneTimer.current) clearTimeout(doneTimer.current);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]">
      <div
        className="h-full gradient-primary transition-[width] duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
