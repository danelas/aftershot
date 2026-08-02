'use client';

import {useRef, useState} from 'react';

// Draggable before/after comparison — the same shot the reel engine animates,
// so the hero demos the product with zero video weight.
export default function BeforeAfterSlider() {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  function move(clientX: number) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }

  return (
    <div className="ba-wrap">
      <div
        ref={ref}
        className="ba"
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          move(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && move(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
      >
        <img src="/real-before.jpg" alt="Driveway before pressure washing" />
        <div className="after-clip" style={{clipPath: `inset(0 0 0 ${pos}%)`}}>
          <img src="/real-after.jpg" alt="Driveway after pressure washing" />
        </div>
        <div className="divider" style={{left: `${pos}%`}}>
          <div className="knob">↔</div>
        </div>
        <span className="tag before">BEFORE</span>
        <span className="tag after">AFTER</span>
      </div>
      <span className="ba-hint">Drag to compare — this becomes a reel, automatically</span>
    </div>
  );
}
