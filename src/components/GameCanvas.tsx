import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useCanvas } from '../hooks/useCanvas';
import { useGameLoop } from '../hooks/useGameLoop';
import { usePlayerControls } from '../hooks/usePlayerControls';
import { useGameStore } from '../stores/gameStore';
import { GameEngine } from '../utils/GameEngine';
import {
  PlayerCell,
  BotCell,
  FoodPellet,
  Cell,
  AIState
} from '../utils/entities';
import { Camera, Position, Entity } from '../types/game';
import { ParticleSystem } from '../utils/particles';
import { MiniMap } from './MiniMap';

// Game configuration - will be calculated dynamically
const getGameConfig = (width: number, height: number) => ({
  canvasWidth: width,
  canvasHeight: height,
  worldWidth: 2000,  // From -1000 to +1000
  worldHeight: 2000, // From -1000 to +1000
  worldBounds: {
    minX: -1000,
    maxX: 1000,
    minY: -1000,
    maxY: 1000
  },
  playerStartMass: 20,
  foodPelletCount: Math.min(500, Math.floor(2000 * 2000 / 2000)), // Adaptive count based on world size
  botCount: Math.min(50, Math.floor(2000 * 2000 / 15000)),       // Adaptive count based on world size
  baseZoom: 1.0,
  maxZoom: 1.5,
  minZoom: 0.8
});

interface GameCanvasProps {
  playerName: string;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ playerName }) => {
  const gameStore = useGameStore();
  const [player, setPlayer] = useState<PlayerCell | null>(null);
  const [bots, setBots] = useState<BotCell[]>([]);
  const [foodPellets, setFoodPellets] = useState<FoodPellet[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [camera, setCamera] = useState<Camera>({
    x: 0,
    y: 0,
    zoom: 1.0,
    canvasWidth: window.innerWidth,
    canvasHeight: window.innerHeight
  });
  const cameraRef = useRef<Camera>({
    x: 0,
    y: 0,
    zoom: 1.0,
    canvasWidth: window.innerWidth,
    canvasHeight: window.innerHeight
  });
  const gameStartTimeRef = useRef<number>(0);
  const playerRef = useRef<PlayerCell | null>(null);
  const botsRef = useRef<BotCell[]>([]);
  const pelletsRef = useRef<FoodPellet[]>([]);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const keysPressed = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Resize canvas to fit container
  const updateCanvasSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const newSize = {
        width: Math.max(800, rect.width),
        height: Math.max(600, rect.height)
      };
      setCanvasSize(newSize);
      console.log('Canvas resized to:', newSize);
    }
  }, []);

  // Initialize game entities
  const initializeGame = useCallback(() => {
    console.log('🎮 INITIALIZING GAME...');

    // Initialize GameEngine
    if (canvasRef.current) {
      gameEngineRef.current = new GameEngine(canvasRef.current, cameraRef.current);
      console.log('GameEngine initialized');
    }

    const config = getGameConfig(canvasSize.width, canvasSize.height);
    console.log('Config:', config);
    let entityId = 0;

    // Create player at world center (0,0) - camera will be positioned to show player in center
    console.log('Creating player...');
    const playerCell = new PlayerCell(
      `player_${entityId++}`,
      0,  // World center
      0,
      playerName,
      config.playerStartMass
    );
    console.log('Player created at:', playerCell.position);
    console.log('Setting player state and ref...');
    setPlayer(playerCell);
    playerRef.current = playerCell;

    // Create food pellets throughout the world (0-3000 bounds - 9x larger)
    console.log(`Creating ${config.foodPelletCount} food pellets...`);
    const pellets: FoodPellet[] = [];
    for (let i = 0; i < config.foodPelletCount; i++) {
      // Spawn randomly within 0-3000 bounds, avoiding player area
      let x, y;
      do {
        x = Math.random() * 3000;
        y = Math.random() * 3000;
      } while (Math.sqrt((x - 500) ** 2 + (y - 500) ** 2) < 400); // Avoid player spawn area

      const pellet = new FoodPellet(
        `pellet_${entityId++}`,
        x,
        y
      );
      pellets.push(pellet);
      if (i < 5) {
        console.log(`🍎 Pellet ${i}: (${x.toFixed(1)}, ${y.toFixed(1)})`);
      }
    }
    setFoodPellets(pellets);
    pelletsRef.current = pellets;

    // Create bot cells throughout the world (0-3000 bounds, far from player)
    console.log(`Creating ${config.botCount} bot cells...`);
    const botCells: BotCell[] = [];
    const playerX = playerCell.position.x; // 500
    const playerY = playerCell.position.y; // 500

    for (let i = 0; i < config.botCount; i++) {
      // Spawn randomly within 0-3000 bounds, avoiding player area
      let x, y;
      do {
        x = Math.random() * 3000;
        y = Math.random() * 3000;
      } while (Math.sqrt((x - playerX) ** 2 + (y - playerY) ** 2) < 500); // Min 500 units from player

      const mass = 10 + Math.random() * 50;
      const bot = new BotCell(
        `bot_${entityId++}`,
        x,
        y,
        mass
      );
      botCells.push(bot);
      if (i < 3) {
        const distanceFromPlayer = Math.sqrt((x - playerX) ** 2 + (y - playerY) ** 2);
        console.log(`🤖 Bot ${i}: (${x.toFixed(1)}, ${y.toFixed(1)}) dist: ${distanceFromPlayer.toFixed(0)} mass: ${mass.toFixed(1)}`);
      }
    }
    setBots(botCells);
    botsRef.current = botCells;

    // Spawn player at positive coordinates (500, 500) - center of positive quadrant
    playerCell.position.x = 500;
    playerCell.position.y = 500;

    // Initialize camera at player position
    cameraRef.current = {
      x: playerCell.position.x,
      y: playerCell.position.y,
      zoom: config.baseZoom,
      canvasWidth: canvasSize.width,
      canvasHeight: canvasSize.height
    };
    setCamera(cameraRef.current);

    console.log('🚀 Player spawned at positive coordinates:', playerCell.position);

    console.log('✅ Game initialized successfully!');
    console.log('📊 Summary:', {
      player: playerCell.position,
      pellets: pellets.length,
      bots: botCells.length,
      worldBounds: config.worldBounds
    });
  }, [playerName, canvasSize]); // Keep canvasSize for config

  // Update camera based on player position and size
  const updateCamera = useCallback((playerCell: PlayerCell, config: any) => {
    // Calculate target camera position to center on player
    const targetX = playerCell.position.x;
    const targetY = playerCell.position.y;

    // Adjust zoom based on player size (larger player = zoomed out more)
    const baseZoom = 1.0;
    const sizeFactor = Math.max(0.8, Math.min(1.5, playerCell.getTotalMass() / 100));
    const targetZoom = baseZoom / sizeFactor;

    // Smooth camera movement (lerp towards target)
    const currentX = cameraRef.current.x;
    const currentY = cameraRef.current.y;
    const currentZoom = cameraRef.current.zoom;

    // Lerp factor - adjust for smoothness (0.1 = slow, 0.9 = fast)
    const lerpFactor = 0.1;

    const newX = currentX + (targetX - currentX) * lerpFactor;
    const newY = currentY + (targetY - currentY) * lerpFactor;
    const newZoom = currentZoom + (targetZoom - currentZoom) * lerpFactor;

    // Update camera ref
    cameraRef.current = {
      x: newX,
      y: newY,
      zoom: Math.max(config.minZoom, Math.min(config.maxZoom, newZoom)),
      canvasWidth: canvasSize.width,
      canvasHeight: canvasSize.height
    };

    // Update state for React re-renders
    setCamera(cameraRef.current);

    // Debug output (reduced frequency)
    if (Math.random() < 0.05) { // 5% chance
      console.log(`📹 Camera: (${newX.toFixed(1)}, ${newY.toFixed(1)}) zoom: ${newZoom.toFixed(2)} -> target: ${targetZoom.toFixed(2)}`);
    }
  }, [canvasSize]);

  // Keyboard controls (only for splitting)
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Handle cell splitting
    if (event.code === 'Space') {
      event.preventDefault();
      if (playerRef.current && playerRef.current.canSplit()) {
        playerRef.current.split();
        // Add particle effect for split
        particleSystemRef.current?.createExplosion(
          playerRef.current.position,
          { color: '#00ffff', intensity: 15, size: 4 }
        );
      }
    }

    // Handle pause
    if (event.key.toLowerCase() === 'p' || event.key === 'Escape') {
      event.preventDefault();
      gameStore.togglePause();
    }
  }, []);

  // Mouse movement - FAST cursor following with target setting
  const handleMouseMove = useCallback((mousePos: Position) => {
    if (playerRef.current) {
      // Set target for fast cursor following (3x speed boost in movement code)
      playerRef.current.setAllTargets(mousePos);

      // Debug: Log target occasionally
      if (Math.random() < 0.005) {
        console.log(`🎯 Target set to: (${mousePos.x.toFixed(1)}, ${mousePos.y.toFixed(1)})`);
      }
    }
  }, []);

  // Canvas setup
  const { startAnimation, stopAnimation } = useCanvas({
    width: canvasSize.width,
    height: canvasSize.height,
    onDraw: (ctx, deltaTime) => {
      const config = getGameConfig(canvasSize.width, canvasSize.height);

      // Get current entities from refs
      const currentPellets = pelletsRef.current;
      const currentBots = botsRef.current;
      const currentPlayer = playerRef.current;

      // Initialize particle system if needed
    if (!particleSystemRef.current) {
      particleSystemRef.current = new ParticleSystem(ctx, cameraRef.current);
    }
    particleSystemRef.current.updateCamera(cameraRef.current);

      // Update particles
      particleSystemRef.current?.update(deltaTime);

      // Check collisions
      checkCollisions();

      // Render background
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      // Render grid - cover entire canvas
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      const gridSize = 50; // World units between grid lines

      // Draw grid lines in world space (fixed grid that doesn't move with camera)
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;

      // Calculate visible world area
      const worldLeft = cameraRef.current.x - (canvasSize.width / 2) / cameraRef.current.zoom;
      const worldRight = cameraRef.current.x + (canvasSize.width / 2) / cameraRef.current.zoom;
      const worldTop = cameraRef.current.y - (canvasSize.height / 2) / cameraRef.current.zoom;
      const worldBottom = cameraRef.current.y + (canvasSize.height / 2) / cameraRef.current.zoom;

      // Draw vertical grid lines (aligned to world coordinates)
      const startX = Math.floor(worldLeft / gridSize) * gridSize;
      for (let x = startX; x <= worldRight; x += gridSize) {
        const screenX = (x - cameraRef.current.x) * cameraRef.current.zoom + canvasSize.width / 2;
        if (screenX >= 0 && screenX <= canvasSize.width) {
          ctx.beginPath();
          ctx.moveTo(screenX, 0);
          ctx.lineTo(screenX, canvasSize.height);
          ctx.stroke();
        }
      }

      // Draw horizontal grid lines (aligned to world coordinates)
      const startY = Math.floor(worldTop / gridSize) * gridSize;
      for (let y = startY; y <= worldBottom; y += gridSize) {
        const screenY = (y - cameraRef.current.y) * cameraRef.current.zoom + canvasSize.height / 2;
        if (screenY >= 0 && screenY <= canvasSize.height) {
          ctx.beginPath();
          ctx.moveTo(0, screenY);
          ctx.lineTo(canvasSize.width, screenY);
          ctx.stroke();
        }
      }

      // Debug output (reduced frequency)
      if (Math.random() < 0.008) { // ~0.5 FPS debug output
        console.log(`🎮 Entities: ${currentPellets.length} pellets, ${currentBots.length} bots, ${currentPlayer ? 1 : 0} player`);
        if (currentPlayer) {
          const target = currentPlayer.getTargetPosition();
          const playerQuad = currentPlayer.position.x >= 0 && currentPlayer.position.y >= 0 ? '↘️' :
                           currentPlayer.position.x >= 0 && currentPlayer.position.y < 0 ? '↗️' :
                           currentPlayer.position.x < 0 && currentPlayer.position.y >= 0 ? '↙️' : '↖️';
          console.log(`📍 Player ${playerQuad}: (${currentPlayer.position.x.toFixed(1)}, ${currentPlayer.position.y.toFixed(1)})`);
          if (target) {
            const targetQuad = target.x >= 0 && target.y >= 0 ? '↘️' :
                             target.x >= 0 && target.y < 0 ? '↗️' :
                             target.x < 0 && target.y >= 0 ? '↙️' : '↖️';
            console.log(`🎯 Target ${targetQuad}: (${target.x.toFixed(1)}, ${target.y.toFixed(1)})`);
          }
        }
      }

      // No center crosshair - removed as requested

      // Render entities using refs (immediate access)

      if (currentPellets.length > 0) {
        console.log(`🍎 Rendering ${currentPellets.length} food pellets...`);
        currentPellets.forEach((pellet, i) => {
          try {
            pellet.draw(ctx, cameraRef.current);
            // Debug dot for first few
            if (i < 10) {
              const screenX = (pellet.position.x - cameraRef.current.x) * cameraRef.current.zoom + cameraRef.current.canvasWidth / 2;
              const screenY = (pellet.position.y - cameraRef.current.y) * cameraRef.current.zoom + cameraRef.current.canvasHeight / 2;
              ctx.fillStyle = '#ff0000';
              ctx.fillRect(screenX - 1, screenY - 1, 2, 2);
            }
          } catch (error) {
            console.error(`Error rendering pellet ${i}:`, error);
          }
        });
      }

      if (currentBots.length > 0) {
        console.log(`🤖 Rendering ${currentBots.length} bots...`);
        currentBots.forEach((bot, i) => {
          try {
            bot.draw(ctx, cameraRef.current);
            // Debug dot for first few
            if (i < 5) {
              const screenX = (bot.position.x - cameraRef.current.x) * cameraRef.current.zoom + cameraRef.current.canvasWidth / 2;
              const screenY = (bot.position.y - cameraRef.current.y) * cameraRef.current.zoom + cameraRef.current.canvasHeight / 2;
              ctx.fillStyle = '#0000ff';
              ctx.fillRect(screenX - 2, screenY - 2, 4, 4);
            }
          } catch (error) {
            console.error(`Error rendering bot ${i}:`, error);
          }
        });
      }

      if (currentPlayer) {
        console.log('👤 Rendering player...');
        try {
          currentPlayer.draw(ctx, cameraRef.current);
          // Debug marker
          const screenX = (currentPlayer.position.x - cameraRef.current.x) * cameraRef.current.zoom + cameraRef.current.canvasWidth / 2;
          const screenY = (currentPlayer.position.y - cameraRef.current.y) * cameraRef.current.zoom + cameraRef.current.canvasHeight / 2;
          ctx.fillStyle = '#00ff00';
          ctx.fillRect(screenX - 3, screenY - 3, 6, 6);
          console.log(`Player rendered at screen: (${screenX.toFixed(1)}, ${screenY.toFixed(1)})`);
        } catch (error) {
          console.error('Error rendering player:', error);
        }
      }

      // Debug: Draw entity count and positions
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.fillText(`Entities: ${currentPellets.length} food, ${currentBots.length} bots, ${currentPlayer ? 1 : 0} player`, 10, canvasSize.height - 40);

      if (currentPlayer) {
        ctx.fillText(`Player pos: (${Math.round(currentPlayer.position.x)}, ${Math.round(currentPlayer.position.y)})`, 10, canvasSize.height - 25);
        ctx.fillText(`Camera: (${Math.round(cameraRef.current.x)}, ${Math.round(cameraRef.current.y)}) zoom: ${cameraRef.current.zoom.toFixed(1)}`, 10, canvasSize.height - 10);
      }

      // Render particles
      particleSystemRef.current?.render();

      // No canvas UI overlay - using React HUD instead

      if (gameStore.isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvasSize.width / 2, canvasSize.height / 2);
        ctx.textAlign = 'left';
      }
    }
  });

  // Collision detection
  const checkCollisions = useCallback(() => {
    const currentPlayer = playerRef.current;
    const currentPellets = pelletsRef.current;
    const currentBots = botsRef.current;

    if (!currentPlayer) return;

    // Skip collision detection for first 3 seconds after spawn to prevent instant death
    if (Date.now() - gameStartTimeRef.current < 3000) {
      return; // Skip collisions for first 3 seconds
    }

    const playerCells = currentPlayer.getAllCells();
    let pelletsToRemove: string[] = [];
    let botsToRemove: string[] = [];

    // Check player cells vs food pellets
    playerCells.forEach(playerCell => {
      currentPellets.forEach(pellet => {
        if (!pellet) return;
        const distance = Math.sqrt(
          Math.pow(playerCell.position.x - pellet.position.x, 2) +
          Math.pow(playerCell.position.y - pellet.position.y, 2)
        );

        if (distance < playerCell.size + pellet.size) {
          // Player eats pellet
          playerCell.addMass(pellet.getMass());
          pellet.getEaten();

          // Create particle effect
          particleSystemRef.current?.createParticleBurst(
            pellet.position,
            5,
            { color: pellet['color'], speed: 50, size: 1, life: 500 }
          );

          pelletsToRemove.push(pellet.id);
        }
      });
    });

    // Check player cells vs bot cells
    playerCells.forEach(playerCell => {
      currentBots.forEach(bot => {
        if (!bot) return;
        const distance = Math.sqrt(
          Math.pow(playerCell.position.x - bot.position.x, 2) +
          Math.pow(playerCell.position.y - bot.position.y, 2)
        );

        if (distance < playerCell.size + bot.size) {
          if (playerCell.canEat(bot)) {
            // Player eats bot
            playerCell.addMass(bot.getMass());

            // Create particle effect
            particleSystemRef.current?.createExplosion(
              bot.position,
              { color: '#ff4444', intensity: 10, size: 3 }
            );

            botsToRemove.push(bot.id);
          } else if (bot.canEat(playerCell)) {
            // Bot eats player cell
            bot.addMass(playerCell.getMass());

            // Create particle effect
            particleSystemRef.current?.createExplosion(
              playerCell.position,
              { color: '#ff0000', intensity: 15, size: 5 }
            );

            // Remove player cell
            const playerIndex = playerCells.indexOf(playerCell);
            if (playerIndex !== -1) {
              playerCells.splice(playerIndex, 1);
              if (playerCells.length === 0) {
                // All player cells eaten - game over
                console.log('💀 PLAYER DIED - Game Over!');
                gameStore.endGame(false); // false = lost
              }
            }

            botsToRemove.push(bot.id); // Bot gets removed too for balance
          }
        }
      });
    });

    // Prevent player cells from eating each other (no cannibalism)
    for (let i = 0; i < playerCells.length; i++) {
      for (let j = i + 1; j < playerCells.length; j++) {
        const cell1 = playerCells[i];
        const cell2 = playerCells[j];
        const distance = Math.sqrt(
          Math.pow(cell1.position.x - cell2.position.x, 2) +
          Math.pow(cell1.position.y - cell2.position.y, 2)
        );

        // If cells are too close, push them apart
        const minDistance = cell1.size + cell2.size;
        if (distance < minDistance) {
          const pushDistance = (minDistance - distance) / 2;
          const angle = Math.atan2(cell2.position.y - cell1.position.y, cell2.position.x - cell1.position.x);

          // Push both cells apart
          cell1.position.x -= Math.cos(angle) * pushDistance;
          cell1.position.y -= Math.sin(angle) * pushDistance;
          cell2.position.x += Math.cos(angle) * pushDistance;
          cell2.position.y += Math.sin(angle) * pushDistance;
        }
      }
    }

    // Check bot cells vs each other
    currentBots.forEach(bot1 => {
      currentBots.forEach(bot2 => {
        if (bot1.id === bot2.id || botsToRemove.includes(bot1.id) || botsToRemove.includes(bot2.id)) return;

        const distance = Math.sqrt(
          Math.pow(bot1.position.x - bot2.position.x, 2) +
          Math.pow(bot1.position.y - bot2.position.y, 2)
        );

        if (distance < bot1.size + bot2.size) {
          if (bot1.canEat(bot2)) {
            bot1.addMass(bot2.getMass());
            botsToRemove.push(bot2.id);
          } else if (bot2.canEat(bot1)) {
            bot2.addMass(bot1.getMass());
            botsToRemove.push(bot1.id);
          }
        }
      });
    });

    // Remove eaten entities from refs
    if (pelletsToRemove.length > 0) {
      pelletsRef.current = currentPellets.filter(pellet => !pelletsToRemove.includes(pellet.id));
      setFoodPellets(pelletsRef.current);
    }

    if (botsToRemove.length > 0) {
      botsRef.current = currentBots.filter(bot => !botsToRemove.includes(bot.id));
      setBots(botsRef.current);
    }
  }, []);

  // Player controls - only mouse movement
  usePlayerControls({
    onMove: handleMouseMove,
    canvasRef,
    camera,
    canvasSize
  });

  // Draw game function
  const drawGame = useCallback((ctx: CanvasRenderingContext2D, deltaTime: number) => {
    const config = getGameConfig(canvasSize.width, canvasSize.height);

    // Get current entities from refs
    const currentPellets = pelletsRef.current;
    const currentBots = botsRef.current;
    const currentPlayer = playerRef.current;

    // Clear canvas
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Render background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Render grid - cover entire canvas
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    const gridSize = 50; // World units between grid lines

    // Draw vertical grid lines (aligned to world coordinates)
    const worldLeft = cameraRef.current.x - (canvasSize.width / 2) / cameraRef.current.zoom;
    const worldRight = cameraRef.current.x + (canvasSize.width / 2) / cameraRef.current.zoom;
    const startX = Math.floor(worldLeft / gridSize) * gridSize;

    for (let x = startX; x <= worldRight; x += gridSize) {
      const screenX = (x - cameraRef.current.x) * cameraRef.current.zoom + canvasSize.width / 2;
      if (screenX >= 0 && screenX <= canvasSize.width) {
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, canvasSize.height);
        ctx.stroke();
      }
    }

    // Draw horizontal grid lines (aligned to world coordinates)
    const worldTop = cameraRef.current.y - (canvasSize.height / 2) / cameraRef.current.zoom;
    const worldBottom = cameraRef.current.y + (canvasSize.height / 2) / cameraRef.current.zoom;
    const startY = Math.floor(worldTop / gridSize) * gridSize;

    for (let y = startY; y <= worldBottom; y += gridSize) {
      const screenY = (y - cameraRef.current.y) * cameraRef.current.zoom + canvasSize.height / 2;
      if (screenY >= 0 && screenY <= canvasSize.height) {
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(canvasSize.width, screenY);
        ctx.stroke();
      }
    }

    // Render entities using refs (immediate access)
    if (currentPellets.length > 0) {
      console.log(`🍎 Rendering ${currentPellets.length} food pellets...`);
      currentPellets.forEach((pellet, i) => {
        try {
          pellet.draw(ctx, cameraRef.current);
          // Debug dot for first few
          if (i < 10) {
            const screenX = (pellet.position.x - cameraRef.current.x) * cameraRef.current.zoom + cameraRef.current.canvasWidth / 2;
            const screenY = (pellet.position.y - cameraRef.current.y) * cameraRef.current.zoom + cameraRef.current.canvasHeight / 2;
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(screenX - 1, screenY - 1, 2, 2);
          }
        } catch (error) {
          console.error(`Error rendering pellet ${i}:`, error);
        }
      });
    }

    if (currentBots.length > 0) {
      console.log(`🤖 Rendering ${currentBots.length} bots...`);
      currentBots.forEach((bot, i) => {
        try {
          bot.draw(ctx, cameraRef.current);
          // Debug dot for first few
          if (i < 5) {
            const screenX = (bot.position.x - cameraRef.current.x) * cameraRef.current.zoom + cameraRef.current.canvasWidth / 2;
            const screenY = (bot.position.y - cameraRef.current.y) * cameraRef.current.zoom + cameraRef.current.canvasHeight / 2;
            ctx.fillStyle = '#0000ff';
            ctx.fillRect(screenX - 2, screenY - 2, 4, 4);
          }
        } catch (error) {
          console.error(`Error rendering bot ${i}:`, error);
        }
      });
    }

    if (currentPlayer) {
      console.log('👤 Rendering player...');
      try {
        currentPlayer.draw(ctx, cameraRef.current);
        // Debug marker
        const screenX = (currentPlayer.position.x - cameraRef.current.x) * cameraRef.current.zoom + cameraRef.current.canvasWidth / 2;
        const screenY = (currentPlayer.position.y - cameraRef.current.y) * cameraRef.current.zoom + cameraRef.current.canvasHeight / 2;
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(screenX - 3, screenY - 3, 6, 6);
        console.log(`Player rendered at screen: (${screenX.toFixed(1)}, ${screenY.toFixed(1)})`);
      } catch (error) {
        console.error('Error rendering player:', error);
      }
    }

    // Debug: Draw entity count and positions
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.fillText(`Entities: ${currentPellets.length} food, ${currentBots.length} bots, ${currentPlayer ? 1 : 0} player`, 10, canvasSize.height - 40);

    if (currentPlayer) {
      ctx.fillText(`Player pos: (${Math.round(currentPlayer.position.x)}, ${Math.round(currentPlayer.position.y)})`, 10, canvasSize.height - 25);
      ctx.fillText(`Camera: (${Math.round(cameraRef.current.x)}, ${Math.round(cameraRef.current.y)}) zoom: ${cameraRef.current.zoom.toFixed(1)}`, 10, canvasSize.height - 10);
    }

    // Render particles
    particleSystemRef.current?.render();

    // Render pause overlay if paused
    if (gameStore.isPaused) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = '48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', canvasSize.width / 2, canvasSize.height / 2);
      ctx.textAlign = 'left';
    }
  }, [canvasSize, gameStore.isPaused]);

  // Game loop - combined with canvas rendering
  useGameLoop({
    onUpdate: (deltaTime) => {
      // Game logic updates
      if (gameStore.isGameRunning) {
        // Update entities using refs
        if (playerRef.current) {
          playerRef.current.update(deltaTime / 1000);
          updateCamera(playerRef.current, getGameConfig(canvasSize.width, canvasSize.height));
        }

        botsRef.current.forEach(bot => bot.update(deltaTime / 1000));
        pelletsRef.current.forEach(pellet => pellet.update(deltaTime / 1000));

        // Update particles
        particleSystemRef.current?.update(deltaTime);

        // Check collisions
        checkCollisions();

        // Trigger canvas redraw
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            drawGame(ctx, deltaTime);
          }
        }
      }
    },
    isRunning: gameStore.isGameRunning
  });

  // Initialize canvas size on mount
  useEffect(() => {
    updateCanvasSize();
  }, [updateCanvasSize]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => updateCanvasSize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateCanvasSize]);

  // Update camera when canvas size changes
  useEffect(() => {
    setCamera(prev => ({
      ...prev,
      canvasWidth: canvasSize.width,
      canvasHeight: canvasSize.height
    }));
  }, [canvasSize]);

  // Initialize game when game starts (only once)
  useEffect(() => {
    console.log('Game state changed:', gameStore.isGameRunning, 'player exists:', !!player);
    if (gameStore.isGameRunning && !player) { // Only initialize if not already initialized
      console.log('🎮 Game is running, initializing entities...');
      gameStartTimeRef.current = Date.now(); // Record game start time
      initializeGame();
      startAnimation();
    } else if (!gameStore.isGameRunning) {
      stopAnimation();
    }
  }, [gameStore.isGameRunning]); // Remove function dependencies



  // Cleanup animation when component unmounts
  useEffect(() => {
    return () => stopAnimation();
  }, [stopAnimation]);

  // Handle skill cooldowns and periodic updates
  useEffect(() => {
    const interval = setInterval(() => {
      const currentState = useGameStore.getState();

      // Only update if game is running and not paused
      if (currentState.isGameRunning && !currentState.isPaused) {
        // Update skill cooldowns
        currentState.updateSkillCooldowns(100); // 100ms interval

        // Handle stealth skill cost
        const stealthSkill = currentState.skills.find(s => s.id === 'stealth');
        if (stealthSkill?.isActive) {
          currentState.updateHumanity(-5 * (100 / 1000)); // -5 humanity per second
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, []); // Empty dependency array - only run once

  // Add keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div
      ref={containerRef}
      className="game-canvas-container"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
        overflow: 'hidden',
        zIndex: 1000
      }}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          backgroundColor: '#0a0a0a',
          cursor: 'crosshair'
        }}
      />

      {/* Game HUD Overlay */}
      <div className="game-hud" style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '80px',
        background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.7) 70%, transparent 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        boxSizing: 'border-box'
      }}>
        {/* Left side - Score & Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#00ffff', fontSize: '24px', fontWeight: 'bold', fontFamily: 'Arial' }}>
              {playerRef.current?.getTotalScore() || 0}
            </div>
            <div style={{ color: '#888', fontSize: '12px', fontFamily: 'Arial' }}>SCORE</div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#ffaa00', fontSize: '18px', fontWeight: 'bold', fontFamily: 'Arial' }}>
              {playerRef.current?.getAllCells().length || 0}
            </div>
            <div style={{ color: '#888', fontSize: '12px', fontFamily: 'Arial' }}>CELLS</div>
          </div>
        </div>

        {/* Center - Player Name */}
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{
            color: '#00ffff',
            fontSize: '28px',
            fontWeight: 'bold',
            fontFamily: 'Arial',
            textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
          }}>
            {playerName}
          </div>
        </div>

        {/* Right side - Split Cooldown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {playerRef.current && (
            <div style={{ textAlign: 'center' }}>
              {playerRef.current.canSplit() ? (
                <div style={{
                  padding: '5px 10px',
                  background: 'rgba(0, 255, 255, 0.2)',
                  border: '1px solid #00ffff',
                  borderRadius: '4px',
                  color: '#00ffff',
                  fontSize: '12px',
                  fontFamily: 'Arial'
                }}>
                  SPLIT READY
                </div>
              ) : (
                <div>
                  <div style={{
                    width: '100px',
                    height: '8px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    marginBottom: '5px'
                  }}>
                    <div style={{
                      width: `${100 * (1 - playerRef.current.getSplitCooldownProgress())}%`,
                      height: '100%',
                      background: '#00ffff',
                      borderRadius: '4px',
                      transition: 'width 0.1s ease'
                    }} />
                  </div>
                  <div style={{ color: '#00ffff', fontSize: '12px', fontFamily: 'Arial' }}>
                    SPLIT ({(playerRef.current.getSplitCooldownProgress() * 15).toFixed(0)}s)
                  </div>
                </div>
              )}
              <div style={{ color: '#888', fontSize: '10px', fontFamily: 'Arial', marginTop: '2px' }}>
                Cells: {playerRef.current.getAllCells().length}/16
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center' }}>
            <div style={{
              color: gameStore.isPaused ? '#ff4444' : '#00ff00',
              fontSize: '16px',
              fontWeight: 'bold',
              fontFamily: 'Arial'
            }}>
              {gameStore.isPaused ? 'PAUSED' : 'PLAYING'}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="game-controls" style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.8)',
        border: '2px solid #00ffff',
        borderRadius: '10px',
        padding: '15px',
        display: 'flex',
        gap: '20px',
        alignItems: 'center'
      }}>
        <div style={{ color: '#00ffff', fontSize: '14px', fontFamily: 'Arial', fontWeight: 'bold' }}>
          CONTROLS
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ color: '#ffffff', fontSize: '12px', fontFamily: 'Arial' }}>
            <span style={{ color: '#00ffff' }}>Mouse:</span> Move toward cursor
          </div>
          <div style={{ color: '#ffffff', fontSize: '12px', fontFamily: 'Arial' }}>
            <span style={{ color: '#00ffff' }}>SPACE:</span> Split cell
          </div>
          <div style={{ color: '#ffffff', fontSize: '12px', fontFamily: 'Arial' }}>
            <span style={{ color: '#ff4444' }}>P/Esc:</span> Pause
          </div>
        </div>

        <div style={{ color: '#ffaa00', fontSize: '12px', fontFamily: 'Arial', fontStyle: 'italic' }}>
          Eat pellets and smaller cells to grow!
        </div>
      </div>

      {/* MiniMap */}
      <MiniMap
        camera={cameraRef.current}
        playerPosition={playerRef.current?.position || { x: 0, y: 0 }}
        entities={[...(playerRef.current ? [playerRef.current] : []), ...botsRef.current, ...pelletsRef.current]}
        canvasSize={canvasSize}
        worldBounds={getGameConfig(canvasSize.width, canvasSize.height).worldBounds}
      />

      {/* Pause Overlay */}
      {gameStore.isPaused && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            textAlign: 'center',
            color: '#00ffff',
            fontSize: '48px',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            textShadow: '0 0 20px rgba(0, 255, 255, 0.5)'
          }}>
            PAUSED
          </div>
        </div>
      )}
    </div>
  );
};
