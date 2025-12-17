import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ComparisonViewerProps {
  beforeImage: string;
  afterImage: string;
  labelBefore?: string;
  labelAfter?: string;
}

export const ComparisonViewer: React.FC<ComparisonViewerProps> = ({
  beforeImage,
  afterImage,
  labelBefore = "原图",
  labelAfter = "修复后"
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => setIsResizing(true), []);
  const handleMouseUp = useCallback(() => setIsResizing(false), []);

  const handleMouseMove = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!isResizing || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ('touches' in e) ? (e as any).touches[0].clientX : (e as MouseEvent).clientX;
    const position = ((x - rect.left) / rect.width) * 100;
    setSliderPosition(Math.min(Math.max(position, 0), 100));
  }, [isResizing]);

  // Global listeners for dragging outside container
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchend', handleMouseUp);
      window.addEventListener('mousemove', handleMouseMove as any);
      window.addEventListener('touchmove', handleMouseMove as any);
    }
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove as any);
      window.removeEventListener('touchmove', handleMouseMove as any);
    };
  }, [isResizing, handleMouseUp, handleMouseMove]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[500px] overflow-hidden rounded-xl border-2 border-slate-700 select-none cursor-col-resize group bg-checkerboard"
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      {/* After Image (Background) */}
      <img 
        src={afterImage} 
        alt="After" 
        className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"
      />
      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur text-white px-2 py-1 rounded text-xs font-bold pointer-events-none">
        {labelAfter}
      </div>

      {/* Before Image (Foreground, clipped) */}
      <div 
        className="absolute top-0 left-0 h-full w-full overflow-hidden pointer-events-none border-r border-white/50"
        style={{ width: `${sliderPosition}%` }}
      >
        <img 
          src={beforeImage} 
          alt="Before" 
          className="absolute top-0 left-0 max-w-none h-full w-full object-contain"
          style={{ width: containerRef.current?.offsetWidth }}
        />
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur text-white px-2 py-1 rounded text-xs font-bold">
          {labelBefore}
        </div>
      </div>

      {/* Slider Handle */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white cursor-col-resize shadow-[0_0_10px_rgba(0,0,0,0.5)]"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-indigo-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </div>
      </div>
    </div>
  );
};