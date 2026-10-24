import React, { useEffect, useRef, useState } from 'react';
import { Compass } from 'lucide-react';

/**
 * Interactive DotGlobe component inspired by Framer aisol-dot-globe & Wayfare.
 * - Responsive canvas scaling
 * - Supports window.matchMedia('(prefers-reduced-motion: reduce)')
 * - Interactive mouse/touch drag rotation
 * - Static fallback for devices with reduced motion or when canvas is disabled
 */
export function DotGlobe({
  size = 420,
  dotColor = '#1B4332',
  accentColor = '#E07A5F',
  className = '',
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0.25, y: 0.6 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [dimensions, setDimensions] = useState(size);

  // Check reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Responsive dimension tracking
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const target = Math.min(size, containerWidth > 0 ? containerWidth - 16 : size);
        setDimensions(Math.max(260, target));
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    const currentSize = dimensions;

    // High-DPI screen scaling
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = currentSize * dpr;
    canvas.height = currentSize * dpr;
    ctx.scale(dpr, dpr);

    const radius = currentSize * 0.38;
    const cx = currentSize / 2;
    const cy = currentSize / 2;

    // Generate points on sphere using Fibonacci distribution
    const numPoints = 420;
    const points = [];
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < numPoints; i++) {
      const theta = (2 * Math.PI * i) / goldenRatio;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / numPoints);

      const x = Math.cos(theta) * Math.sin(phi);
      const y = Math.cos(phi);
      const z = Math.sin(theta) * Math.sin(phi);

      // Coordinates marked as destinations (terracotta)
      const isDestination = i % 18 === 0;

      points.push({ x, y, z, isDestination });
    }

    const autoRotateSpeed = prefersReducedMotion ? 0 : 0.0035;

    const render = () => {
      ctx.clearRect(0, 0, currentSize, currentSize);

      if (!isDraggingRef.current && !prefersReducedMotion) {
        rotationRef.current.y += autoRotateSpeed;
      }

      const rotX = rotationRef.current.x;
      const rotY = rotationRef.current.y;

      // Draw subtle orbital guide ring
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.08, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(234, 227, 214, 0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Perspective projection
      const projected = points.map((p) => {
        // Rotate around Y
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const x1 = p.x * cosY + p.z * sinY;
        const z1 = -p.x * sinY + p.z * cosY;

        // Rotate around X
        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;

        const scale = 2.4 / (2.4 + z2);
        const px = cx + x1 * radius * scale;
        const py = cy + y2 * radius * scale;

        return {
          px,
          py,
          scale,
          z: z2,
          isDestination: p.isDestination,
        };
      });

      // Depth sort
      projected.sort((a, b) => a.z - b.z);

      // Render dots
      projected.forEach((p) => {
        const alpha = Math.max(0.12, (1 - p.z) / 2);
        const dotRadius = p.isDestination ? 3.4 * p.scale : 1.7 * p.scale;

        ctx.beginPath();
        ctx.arc(p.px, p.py, Math.max(0.5, dotRadius), 0, Math.PI * 2);

        if (p.isDestination) {
          ctx.fillStyle = `rgba(224, 122, 95, ${Math.min(1, alpha + 0.35)})`;
          ctx.shadowColor = accentColor;
          ctx.shadowBlur = 8;
        } else {
          ctx.fillStyle = `rgba(27, 67, 50, ${alpha * 0.75})`;
          ctx.shadowBlur = 0;
        }

        ctx.fill();
        ctx.shadowBlur = 0;
      });

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    // Mouse & Touch interaction
    const handleStart = (clientX, clientY) => {
      isDraggingRef.current = true;
      mousePosRef.current = { x: clientX, y: clientY };
    };

    const handleMove = (clientX, clientY) => {
      if (!isDraggingRef.current) return;
      const dx = clientX - mousePosRef.current.x;
      const dy = clientY - mousePosRef.current.y;
      rotationRef.current.y += dx * 0.005;
      rotationRef.current.x += dy * 0.005;
      mousePosRef.current = { x: clientX, y: clientY };
      if (prefersReducedMotion) {
        render();
      }
    };

    const handleEnd = () => {
      isDraggingRef.current = false;
    };

    const onMouseDown = (e) => handleStart(e.clientX, e.clientY);
    const onMouseMove = (e) => handleMove(e.clientX, e.clientY);
    const onMouseUp = handleEnd;

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        handleStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchMove = (e) => {
      if (e.touches.length === 1) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchEnd = handleEnd;

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      canvas.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [dimensions, prefersReducedMotion, accentColor]);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center select-none w-full max-w-[440px] mx-auto ${className}`}
    >
      <canvas
        ref={canvasRef}
        style={{ width: `${dimensions}px`, height: `${dimensions}px` }}
        className="pointer-events-auto cursor-grab active:cursor-grabbing touch-none transition-opacity duration-500"
        aria-label="Interactive 3D particle globe representing global trip coordinates"
        role="img"
      >
        {/* Static accessibility fallback */}
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center rounded-3xl bg-ivory-100 border border-ivory-300">
          <Compass className="w-16 h-16 text-forest-600 mb-2" />
          <p className="text-sm font-semibold text-charcoal-800">Global Trip Navigator</p>
          <p className="text-xs text-charcoal-500">Interactive coordinates mapped across worldwide destinations.</p>
        </div>
      </canvas>
    </div>
  );
}

export default DotGlobe;
