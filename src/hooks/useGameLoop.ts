import { useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore';

interface UseGameLoopOptions {
  onUpdate?: (deltaTime: number) => void;
  onRender?: (ctx: CanvasRenderingContext2D, deltaTime: number) => void;
  isRunning?: boolean;
}

export function useGameLoop({ onUpdate, onRender, isRunning = true }: UseGameLoopOptions = {}) {
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const isRunningRef = useRef(isRunning);

  // Update running state
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  const gameLoop = useCallback((currentTime: number) => {
    const deltaTime = Math.min(currentTime - lastTimeRef.current, 16.67); // Cap at ~60fps
    lastTimeRef.current = currentTime;

    // Only update if game is running and not paused
    if (isRunningRef.current) {
      // Update game logic
      onUpdate?.(deltaTime);
    }

    // Always render (even when paused)
    // Note: onRender is called from useCanvas, not here

    if (isRunningRef.current) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
  }, [onUpdate]);

  const start = useCallback(() => {
    if (animationFrameRef.current) return;
    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  const stop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
  }, []);

  // Start/stop based on isRunning
  useEffect(() => {
    if (isRunning) {
      start();
    } else {
      stop();
    }
    return stop;
  }, [isRunning, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return stop;
  }, [stop]);

  return {
    start,
    stop,
    isRunning: isRunningRef.current
  };
}
