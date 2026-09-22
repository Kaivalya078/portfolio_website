'use client';

import { useEffect, useRef } from 'react';
import { createPond } from '@/lib/pond';

/**
 * Mounts the canvas and hands it to the simulation. React's only jobs here are
 * to create the element and to tear the loop down again - every frame after
 * that is driven from `pond.ts` without touching React state.
 *
 * The canvas is a sibling of the panels, never an overlay, so a click on the
 * interface can never reach the water.
 */
export default function KoiPond() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvas.current) return;
    const pond = createPond(canvas.current);
    return () => pond.destroy();
  }, []);

  return (
    <div className="pond">
      <canvas ref={canvas} aria-hidden="true" />
    </div>
  );
}
