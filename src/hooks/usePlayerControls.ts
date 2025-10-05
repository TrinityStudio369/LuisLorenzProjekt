import { useEffect, useRef, useCallback } from 'react';
import { Position } from '../types/game';
import { useGameStore } from '../stores/gameStore';

interface UsePlayerControlsOptions {
  onMove?: (target: Position) => void;
  onSkill?: (skillId: string) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  camera?: { x: number; y: number; zoom: number };
  canvasSize?: { width: number; height: number };
}

export function usePlayerControls({ onMove, onSkill, canvasRef, camera, canvasSize }: UsePlayerControlsOptions) {
  const keysPressed = useRef<Set<string>>(new Set());
  const mousePosition = useRef<Position>({ x: 0, y: 0 });
  const isMouseDown = useRef(false);

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback((screenX: number, screenY: number): Position => {
    if (!canvasRef.current || !camera || !canvasSize) return { x: 0, y: 0 };

    const rect = canvasRef.current.getBoundingClientRect();

    // Convert screen coordinates to canvas coordinates
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;

    // Convert canvas coordinates to world coordinates
    let worldX = (canvasX - canvasSize.width / 2) / camera.zoom + camera.x;
    let worldY = (canvasY - canvasSize.height / 2) / camera.zoom + camera.y;

    // DEBUG: Log detailed conversion
    console.log(`🔍 Conversion: canvas(${canvasX.toFixed(0)},${canvasY.toFixed(0)}) + camera(${camera.x.toFixed(1)},${camera.y.toFixed(1)}) * zoom(${camera.zoom.toFixed(2)}) = world(${worldX.toFixed(1)},${worldY.toFixed(1)})`);

    // TEMP: Ensure we can go negative (add extra offset)
    if (canvasX < canvasSize.width / 2) worldX -= 500; // Extra push left
    if (canvasY < canvasSize.height / 2) worldY -= 500; // Extra push up

    return { x: worldX, y: worldY };
  }, [canvasRef, camera, canvasSize]);

  // Handle keyboard input
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    keysPressed.current.add(key);

    // Handle skill activation
    const skillKeys: { [key: string]: string } = {
      'q': 'parley',
      'shift': 'stealth',
      'e': 'decoy',
      'f': 'breach'
    };

    if (skillKeys[key]) {
      event.preventDefault();
      const skillId = skillKeys[key];
      const gameStore = useGameStore.getState();

      if (gameStore.activateSkill(skillId)) {
        onSkill?.(skillId);
      }
    }

    // Handle pause
    if (key === 'escape' || key === 'p') {
      event.preventDefault();
      useGameStore.getState().togglePause();
    }
  }, [onSkill]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    keysPressed.current.delete(key);
  }, []);

  // Handle mouse input
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;

    mousePosition.current = { x: canvasX, y: canvasY };

    // Always update player target position (like in Agar.io - player always moves toward mouse)
    const worldPos = screenToWorld(event.clientX, event.clientY);

    // Debug output - show mouse direction
    const direction = worldPos.x >= 0 && worldPos.y >= 0 ? '↘️' :
                     worldPos.x >= 0 && worldPos.y < 0 ? '↗️' :
                     worldPos.x < 0 && worldPos.y >= 0 ? '↙️' : '↖️';

    if (Math.random() < 0.05) { // ~5% chance per mouse move
      console.log(`🖱️ Mouse ${direction}: screen(${event.clientX.toFixed(0)},${event.clientY.toFixed(0)}) -> world(${worldPos.x.toFixed(1)},${worldPos.y.toFixed(1)})`);
    }

    onMove?.(worldPos);
  }, [canvasRef, screenToWorld, onMove]);

  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (event.button === 0) { // Left click
      isMouseDown.current = true;
      const worldPos = screenToWorld(event.clientX, event.clientY);
      onMove?.(worldPos);
    }
  }, [screenToWorld, onMove]);

  const handleMouseUp = useCallback((event: MouseEvent) => {
    if (event.button === 0) {
      isMouseDown.current = false;
    }
  }, []);

  // Handle touch input for mobile
  const handleTouchStart = useCallback((event: TouchEvent) => {
    event.preventDefault();
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      const worldPos = screenToWorld(touch.clientX, touch.clientY);
      onMove?.(worldPos);
    }
  }, [screenToWorld, onMove]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    event.preventDefault();
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      const worldPos = screenToWorld(touch.clientX, touch.clientY);
      onMove?.(worldPos);
    }
  }, [screenToWorld, onMove]);

  // TEMP: Disable WASD movement to avoid interference
  // const updateWASDMovement = useCallback(() => {
  //   // WASD movement disabled for debugging
  // }, [onMove]);

  // Setup event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    if (canvasRef.current) {
      canvasRef.current.addEventListener('mousemove', handleMouseMove);
      canvasRef.current.addEventListener('mousedown', handleMouseDown);
      canvasRef.current.addEventListener('mouseup', handleMouseUp);
      canvasRef.current.addEventListener('touchstart', handleTouchStart);
      canvasRef.current.addEventListener('touchmove', handleTouchMove);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);

      if (canvasRef.current) {
        canvasRef.current.removeEventListener('mousemove', handleMouseMove);
        canvasRef.current.removeEventListener('mousedown', handleMouseDown);
        canvasRef.current.removeEventListener('mouseup', handleMouseUp);
        canvasRef.current.removeEventListener('touchstart', handleTouchStart);
        canvasRef.current.removeEventListener('touchmove', handleTouchMove);
      }
    };
  }, [handleKeyDown, handleKeyUp, handleMouseMove, handleMouseDown, handleMouseUp, handleTouchStart, handleTouchMove, canvasRef]);

  // TEMP: Disable WASD movement update loop
  // useEffect(() => {
  //   const interval = setInterval(updateWASDMovement, 16); // ~60fps
  //   return () => clearInterval(interval);
  // }, [updateWASDMovement]);

  return {
    keysPressed: keysPressed.current,
    mousePosition: mousePosition.current,
    isMouseDown: isMouseDown.current
  };
}
