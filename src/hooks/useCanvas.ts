import { useRef, useEffect, useCallback } from 'react';

interface UseCanvasOptions {
  width: number;
  height: number;
  onDraw?: (ctx: CanvasRenderingContext2D, deltaTime: number) => void;
  onResize?: (width: number, height: number) => void;
}

export function useCanvas({ width, height, onDraw, onResize }: UseCanvasOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // Get canvas context
  const getContext = useCallback((): CanvasRenderingContext2D | null => {
    if (!canvasRef.current) return null;
    return canvasRef.current.getContext('2d');
  }, []);

  // Handle canvas resize
  const resize = useCallback(() => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvasRef.current.width = width * dpr;
    canvasRef.current.height = height * dpr;

    canvasRef.current.style.width = `${width}px`;
    canvasRef.current.style.height = `${height}px`;

    const ctx = getContext();
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    onResize?.(width, height);
  }, [width, height, getContext, onResize]);

  // Animation loop
  const animate = useCallback((currentTime: number) => {
    const deltaTime = currentTime - lastTimeRef.current;
    lastTimeRef.current = currentTime;

    const ctx = getContext();
    if (ctx && onDraw) {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Call draw function
      onDraw(ctx, deltaTime);
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [getContext, onDraw, width, height]);

  // Start/stop animation
  const startAnimation = useCallback(() => {
    if (animationFrameRef.current) return;
    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [animate]);

  const stopAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
  }, []);

  // Setup canvas
  useEffect(() => {
    resize();
  }, [resize]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [resize]);

  // Cleanup animation frame
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    canvasRef,
    getContext,
    startAnimation,
    stopAnimation,
    resize
  };
}
