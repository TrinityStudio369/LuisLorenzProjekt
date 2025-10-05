import React, { useRef, useEffect } from 'react';
import { Camera, Position, Entity } from '../types/game';

interface MiniMapProps {
  camera: Camera;
  playerPosition: Position;
  entities: Entity[];
  canvasSize: { width: number; height: number };
  worldBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export const MiniMap: React.FC<MiniMapProps> = ({
  camera,
  playerPosition,
  entities,
  canvasSize,
  worldBounds
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const miniMapSize = 200; // Size of the minimap in pixels

    // Fixed world bounds 0-3000 for minimap (9x larger world)
    const minX = 0;
    const maxX = 3000;
    const minY = 0;
    const maxY = 3000;

    const worldWidth = maxX - minX;
    const worldHeight = maxY - minY;

    // Scale factors to convert world coordinates to minimap coordinates
    const scaleX = miniMapSize / worldWidth;
    const scaleY = miniMapSize / worldHeight;

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, miniMapSize, miniMapSize);

    // Draw world border
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, miniMapSize, miniMapSize);

    // Convert world coordinates to minimap coordinates
    const worldToMiniMap = (worldX: number, worldY: number): Position => ({
      x: (worldX - minX) * scaleX,
      y: (worldY - minY) * scaleY
    });

    // Calculate camera viewport
    const halfViewportWidth = canvasSize.width / (2 * camera.zoom);
    const halfViewportHeight = canvasSize.height / (2 * camera.zoom);

    // Draw entities
    entities.forEach(entity => {
      const miniMapPos = worldToMiniMap(entity.position.x, entity.position.y);

      // Different colors for different entity types
      if (entity.id.startsWith('player')) {
        ctx.fillStyle = '#00ffff'; // Cyan for player
        ctx.beginPath();
        ctx.arc(miniMapPos.x, miniMapPos.y, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (entity.id.startsWith('bot')) {
        ctx.fillStyle = '#ff4444'; // Red for bots
        ctx.beginPath();
        ctx.arc(miniMapPos.x, miniMapPos.y, 1, 0, Math.PI * 2);
        ctx.fill();
      } else if (entity.id.startsWith('pellet')) {
        ctx.fillStyle = '#ffff00'; // Yellow for pellets
        ctx.fillRect(miniMapPos.x - 0.5, miniMapPos.y - 0.5, 1, 1);
      }
    });

    // Draw camera viewport rectangle
    const viewportMinX = camera.x - halfViewportWidth;
    const viewportMaxX = camera.x + halfViewportWidth;
    const viewportMinY = camera.y - halfViewportHeight;
    const viewportMaxY = camera.y + halfViewportHeight;

    const miniMapViewportMin = worldToMiniMap(viewportMinX, viewportMinY);
    const miniMapViewportMax = worldToMiniMap(viewportMaxX, viewportMaxY);

    const viewportWidth = miniMapViewportMax.x - miniMapViewportMin.x;
    const viewportHeight = miniMapViewportMax.y - miniMapViewportMin.y;

    // Only draw viewport if it's within the minimap bounds
    if (viewportWidth > 0 && viewportHeight > 0 &&
        miniMapViewportMin.x < miniMapSize && miniMapViewportMin.y < miniMapSize &&
        miniMapViewportMax.x > 0 && miniMapViewportMax.y > 0) {

      ctx.strokeStyle = '#00ff00'; // Green border for viewport
      ctx.lineWidth = 2;
      ctx.strokeRect(
        Math.max(0, miniMapViewportMin.x),
        Math.max(0, miniMapViewportMin.y),
        Math.min(miniMapSize - miniMapViewportMin.x, viewportWidth),
        Math.min(miniMapSize - miniMapViewportMin.y, viewportHeight)
      );
    }

    // Draw center crosshair (world origin at 0,0)
    const centerPos = worldToMiniMap(0, 0);
    if (centerPos.x >= 0 && centerPos.x <= miniMapSize && centerPos.y >= 0 && centerPos.y <= miniMapSize) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerPos.x - 5, centerPos.y);
      ctx.lineTo(centerPos.x + 5, centerPos.y);
      ctx.moveTo(centerPos.x, centerPos.y - 5);
      ctx.lineTo(centerPos.x, centerPos.y + 5);
      ctx.stroke();
    }

  }, [camera, playerPosition, entities, canvasSize, worldBounds]);

  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      left: '20px',
      background: 'rgba(0, 0, 0, 0.8)',
      border: '2px solid #00ffff',
      borderRadius: '5px',
      padding: '10px'
    }}>
      <canvas
        ref={canvasRef}
        width={200}
        height={200}
        style={{
          display: 'block',
          background: '#0a0a0a'
        }}
      />
      <div style={{
        color: '#00ffff',
        fontSize: '10px',
        fontFamily: 'Arial',
        textAlign: 'center',
        marginTop: '5px'
      }}>
        MINIMAP
      </div>
    </div>
  );
};
