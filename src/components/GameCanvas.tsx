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
  SpeedBoostTriangle,
  PointMultiplierTriangle,
  FusionCooldownReductionTriangle,
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
  const [speedBoosts, setSpeedBoosts] = useState<SpeedBoostTriangle[]>([]);
  const [pointMultipliers, setPointMultipliers] = useState<PointMultiplierTriangle[]>([]);
  const [fusionCooldownReductions, setFusionCooldownReductions] = useState<FusionCooldownReductionTriangle[]>([]);
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
  const speedBoostsRef = useRef<SpeedBoostTriangle[]>([]);
  const pointMultipliersRef = useRef<PointMultiplierTriangle[]>([]);
  const fusionCooldownReductionsRef = useRef<FusionCooldownReductionTriangle[]>([]);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const keysPressed = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Triangle spawning timers
  const lastSpeedBoostSpawnRef = useRef<number>(0);
  const lastPointMultiplierSpawnRef = useRef<number>(0);
  const lastFusionCooldownReductionSpawnRef = useRef<number>(0);

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

    // Create giant cells - rare but powerful enemies!
    console.log('Creating giant cells...');
    const giantCells: BotCell[] = [];
    const giantCount = Math.floor(Math.random() * 3) + 1; // 1-3 giant cells
    
    for (let i = 0; i < giantCount; i++) {
      let x, y;
      let attempts = 0;
      do {
        x = Math.random() * 3000;
        y = Math.random() * 3000;
        attempts++;
      } while (Math.sqrt((x - playerX) ** 2 + (y - playerY) ** 2) < 600 && attempts < 10); // Min 600 units from player

      // Create giant cells with massive sizes
      const giantMasses = [150, 250, 400]; // Giant cell sizes
      const mass = giantMasses[i] || 200;
      
      const giant = new BotCell(
        `giant_${entityId++}`,
        x,
        y,
        mass
      );
      giantCells.push(giant);
      
      console.log(`👹 Giant ${i}: (${x.toFixed(1)}, ${y.toFixed(1)}) mass: ${mass} distance from player: ${Math.sqrt((x - playerX) ** 2 + (y - playerY) ** 2).toFixed(1)}`);
    }
    
    // Add giant cells to the regular bot array
    botCells.push(...giantCells);
    setBots(botCells);
    botsRef.current = botCells;

    // Initialize empty triangle arrays - triangles will spawn continuously
    console.log('Initializing triangle spawning system...');
    setSpeedBoosts([]);
    speedBoostsRef.current = [];
    setPointMultipliers([]);
    pointMultipliersRef.current = [];
    setFusionCooldownReductions([]);
    fusionCooldownReductionsRef.current = [];
    
    // Initialize spawn timers
    lastSpeedBoostSpawnRef.current = Date.now();
    lastPointMultiplierSpawnRef.current = Date.now();
    lastFusionCooldownReductionSpawnRef.current = Date.now();

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

  // Continuous triangle spawning
  const spawnTriangles = useCallback(() => {
    const now = Date.now();
    const currentPlayer = playerRef.current;
    if (!currentPlayer) return;

    // Spawn speed boost triangles every 16-30 seconds (halved)
    if (now - lastSpeedBoostSpawnRef.current > 16000 + Math.random() * 14000) {
      const x = Math.random() * 3000;
      const y = Math.random() * 3000;
      
      // Avoid spawning too close to player
      const distanceFromPlayer = Math.sqrt((x - currentPlayer.position.x) ** 2 + (y - currentPlayer.position.y) ** 2);
      if (distanceFromPlayer > 300) {
        const triangle = new SpeedBoostTriangle(
          `speed_boost_${Date.now()}`,
          x,
          y
        );
        
        const newTriangles = [...speedBoostsRef.current, triangle];
        setSpeedBoosts(newTriangles);
        speedBoostsRef.current = newTriangles;
        lastSpeedBoostSpawnRef.current = now;
        
        console.log(`🔵 Spawned speed boost triangle at (${x.toFixed(1)}, ${y.toFixed(1)}) - Total: ${newTriangles.length}`);
      } else {
        console.log(`🔵 Speed boost triangle spawn blocked - too close to player (${distanceFromPlayer.toFixed(1)} < 300)`);
      }
    }

    // Spawn point multiplier triangles every 24-40 seconds (halved)
    if (now - lastPointMultiplierSpawnRef.current > 24000 + Math.random() * 16000) {
      const x = Math.random() * 3000;
      const y = Math.random() * 3000;
      
      const distanceFromPlayer = Math.sqrt((x - currentPlayer.position.x) ** 2 + (y - currentPlayer.position.y) ** 2);
      if (distanceFromPlayer > 300) {
        const triangle = new PointMultiplierTriangle(
          `point_mult_${Date.now()}`,
          x,
          y
        );
        
        const newTriangles = [...pointMultipliersRef.current, triangle];
        setPointMultipliers(newTriangles);
        pointMultipliersRef.current = newTriangles;
        lastPointMultiplierSpawnRef.current = now;
        
        console.log(`🔴 Spawned point multiplier triangle at (${x.toFixed(1)}, ${y.toFixed(1)}) - Total: ${newTriangles.length}`);
      } else {
        console.log(`🔴 Point multiplier triangle spawn blocked - too close to player (${distanceFromPlayer.toFixed(1)} < 300)`);
      }
    }

    // Spawn fusion cooldown reduction triangles every 40-60 seconds (halved)
    if (now - lastFusionCooldownReductionSpawnRef.current > 40000 + Math.random() * 20000) {
      const x = Math.random() * 3000;
      const y = Math.random() * 3000;
      
      const distanceFromPlayer = Math.sqrt((x - currentPlayer.position.x) ** 2 + (y - currentPlayer.position.y) ** 2);
      if (distanceFromPlayer > 300) {
        const triangle = new FusionCooldownReductionTriangle(
          `fusion_cooldown_reduction_${Date.now()}`,
          x,
          y
        );
        
        const newTriangles = [...fusionCooldownReductionsRef.current, triangle];
        setFusionCooldownReductions(newTriangles);
        fusionCooldownReductionsRef.current = newTriangles;
        lastFusionCooldownReductionSpawnRef.current = now;
        
        console.log(`🟢 Spawned fusion cooldown reduction triangle at (${x.toFixed(1)}, ${y.toFixed(1)}) - Total: ${newTriangles.length}`);
      } else {
        console.log(`🟢 Fusion cooldown reduction triangle spawn blocked - too close to player (${distanceFromPlayer.toFixed(1)} < 300)`);
      }
    }
  }, []);

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
    const lerpFactor = 0.15; // Increased for smoother camera following

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
      const currentSpeedBoosts = speedBoostsRef.current;
      const currentPointMultipliers = pointMultipliersRef.current;
      const currentFusionCooldownReductions = fusionCooldownReductionsRef.current;

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

      // Debug output (very reduced frequency)
      if (Math.random() < 0.001) { // ~0.1 FPS debug output
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
        currentPellets.forEach((pellet, i) => {
          try {
            pellet.draw(ctx, cameraRef.current);
          } catch (error) {
            console.error(`Error rendering pellet ${i}:`, error);
          }
        });
      }

      if (currentBots.length > 0) {
        console.log(`🎨 Rendering ${currentBots.length} bots`);
        currentBots.forEach((bot, i) => {
          try {
            bot.draw(ctx, cameraRef.current);
          } catch (error) {
            console.error(`Error rendering bot ${i}:`, error);
          }
        });
      } else {
        console.log('❌ No bots to render');
      }


      if (currentSpeedBoosts.length > 0) {
        console.log(`🎨 Rendering ${currentSpeedBoosts.length} speed boost triangles`);
        currentSpeedBoosts.forEach((triangle, i) => {
          try {
            triangle.draw(ctx, cameraRef.current);
          } catch (error) {
            console.error(`Error rendering speed boost triangle ${i}:`, error);
          }
        });
      } else {
        console.log('❌ No speed boost triangles to render');
      }

      if (currentPointMultipliers.length > 0) {
        console.log(`🎨 Rendering ${currentPointMultipliers.length} point multiplier triangles`);
        currentPointMultipliers.forEach((triangle, i) => {
          try {
            triangle.draw(ctx, cameraRef.current);
          } catch (error) {
            console.error(`Error rendering point multiplier triangle ${i}:`, error);
          }
        });
      } else {
        console.log('❌ No point multiplier triangles to render');
      }

      if (currentFusionCooldownReductions.length > 0) {
        console.log(`🎨 Rendering ${currentFusionCooldownReductions.length} fusion cooldown reduction triangles`);
        currentFusionCooldownReductions.forEach((triangle, i) => {
          try {
            triangle.draw(ctx, cameraRef.current);
          } catch (error) {
            console.error(`Error rendering fusion cooldown reduction triangle ${i}:`, error);
          }
        });
      } else {
        console.log('❌ No fusion cooldown reduction triangles to render');
      }

      if (currentPlayer) {
        try {
          currentPlayer.draw(ctx, cameraRef.current);
        } catch (error) {
          console.error('Error rendering player:', error);
        }
      }

    // Debug: Draw entity count and positions
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.fillText(`Entities: ${currentPellets.length} food, ${currentBots.length} bots, ${currentPlayer ? 1 : 0} player, ${currentSpeedBoosts.length} speed, ${currentPointMultipliers.length} points, ${currentFusionCooldownReductions.length} fusion`, 10, canvasSize.height - 40);

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
    const currentSpeedBoosts = speedBoostsRef.current;
    const currentPointMultipliers = pointMultipliersRef.current;
    const currentFusionCooldownReductions = fusionCooldownReductionsRef.current;

    if (!currentPlayer) return;

    // Skip collision detection for first 3 seconds after spawn to prevent instant death
    if (Date.now() - gameStartTimeRef.current < 3000) {
      return; // Skip collisions for first 3 seconds
    }

    const playerCells = currentPlayer.getAllCells();
    let pelletsToRemove: string[] = [];
    let botsToRemove: string[] = [];
    let playerCellsToRemove: string[] = [];
    let speedBoostsToRemove: string[] = [];
    let pointMultipliersToRemove: string[] = [];
    let fusionCooldownReductionsToRemove: string[] = [];

    // Check player cells vs food pellets
    playerCells.forEach(playerCell => {
      currentPellets.forEach(pellet => {
        if (!pellet) return;
        const distance = Math.sqrt(
          Math.pow(playerCell.position.x - pellet.position.x, 2) +
          Math.pow(playerCell.position.y - pellet.position.y, 2)
        );

        if (distance < playerCell.size + pellet.size) {
          // Player eats pellet - NO scale effect for pellets
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

    // Check player cells vs speed boost triangles
    playerCells.forEach(playerCell => {
      currentSpeedBoosts.forEach(triangle => {
        if (!triangle) return;
        const distance = Math.sqrt(
          Math.pow(playerCell.position.x - triangle.position.x, 2) +
          Math.pow(playerCell.position.y - triangle.position.y, 2)
        );

        if (distance < playerCell.size + triangle.size) {
          // Player collects speed boost triangle
          playerCell.startSpeedBoostFromTriangle(triangle.getSpeedBoost(), triangle.getSpeedBoostDuration());

          // Create particle effect
          particleSystemRef.current?.createParticleBurst(
            triangle.position,
            8,
            { color: '#00ff88', speed: 80, size: 2, life: 800 }
          );

          speedBoostsToRemove.push(triangle.id);
        }
      });
    });

    // Check player cells vs point multiplier triangles
    playerCells.forEach(playerCell => {
      currentPointMultipliers.forEach(triangle => {
        if (!triangle) return;
        const distance = Math.sqrt(
          Math.pow(playerCell.position.x - triangle.position.x, 2) +
          Math.pow(playerCell.position.y - triangle.position.y, 2)
        );

        if (distance < playerCell.size + triangle.size) {
          // Player collects point multiplier triangle
          playerCell.startPointMultiplier(triangle.getPointMultiplier(), triangle.getPointMultiplierDuration());

          // Create particle effect
          particleSystemRef.current?.createParticleBurst(
            triangle.position,
            10,
            { color: '#ff4444', speed: 100, size: 3, life: 1000 }
          );

          pointMultipliersToRemove.push(triangle.id);
        }
      });
    });

    // Check player cells vs fusion cooldown reduction triangles
    playerCells.forEach(playerCell => {
      currentFusionCooldownReductions.forEach(triangle => {
        if (!triangle) return;
        const distance = Math.sqrt(
          Math.pow(playerCell.position.x - triangle.position.x, 2) +
          Math.pow(playerCell.position.y - triangle.position.y, 2)
        );

        if (distance < playerCell.size + triangle.size) {
          // Player collects fusion cooldown reduction triangle
          if (playerCell instanceof PlayerCell) {
            // Get the main player cell (the one that controls everything)
            const mainPlayer = playerRef.current;
            if (mainPlayer) {
              // Apply fusion cooldown reduction to main player
              mainPlayer.startFusionCooldownReduction();
              console.log(`🟢 Green powerup collected! Fusion cooldown halved for main player`);
              
              // Debug: Show current fusion cooldown
              console.log(`🔍 Current fusion cooldown: ${(mainPlayer.getFusionCooldownRemaining() / 1000).toFixed(1)}s`);
              console.log(`🔍 Current split duration: ${(mainPlayer.getFusionTimeRemaining() / 1000).toFixed(1)}s`);
            }
          }

          // Create particle effect
          particleSystemRef.current?.createParticleBurst(
            triangle.position,
            12,
            { color: '#00ff00', speed: 120, size: 4, life: 1200 }
          );

          fusionCooldownReductionsToRemove.push(triangle.id);
        }
      });
    });

    // Check player cells vs bot cells with improved collision mechanics
    playerCells.forEach(playerCell => {
      currentBots.forEach(bot => {
        if (!bot) return;
        const distance = Math.sqrt(
          Math.pow(playerCell.position.x - bot.position.x, 2) +
          Math.pow(playerCell.position.y - bot.position.y, 2)
        );

        // Calculate collision threshold - require more overlap than just touching
        const collisionThreshold = (playerCell.size + bot.size) * 0.7; // 70% overlap required
        
        if (distance < collisionThreshold) {
          if (playerCell.canEat(bot)) {
            // Player eats bot - WITH scale effect
            playerCell.addMass(bot.getMass(), true);

            // Create particle effect
            particleSystemRef.current?.createExplosion(
              bot.position,
              { color: '#ff4444', intensity: 10, size: 3 }
            );

            botsToRemove.push(bot.id);
          } else if (bot.canEat(playerCell)) {
            // Bot eats player cell - only the specific cell that was touched
            console.log(`💀 BOT EATING PLAYER! Bot mass: ${bot.getMass()}, Player mass: ${playerCell.getMass()}`);
            console.log(`Bot position: (${bot.position.x.toFixed(1)}, ${bot.position.y.toFixed(1)})`);
            console.log(`Player position: (${playerCell.position.x.toFixed(1)}, ${playerCell.position.y.toFixed(1)})`);
            
            bot.addMass(playerCell.getMass());

            // Create particle effect
            particleSystemRef.current?.createExplosion(
              playerCell.position,
              { color: '#ff0000', intensity: 15, size: 5 }
            );

            // Mark this specific player cell for removal
            playerCellsToRemove.push(playerCell.id);
            
            // If this was the main player cell, check if we have other cells
            if (playerCell.id === currentPlayer.id) {
              console.log('💀 MAIN PLAYER CELL EATEN! Checking for remaining cells...');
              // Don't end game immediately - let the removal logic handle it
            }
          }
        }
      });
    });


    // Prevent player cells from eating each other (no cannibalism)
    // Only apply to split cells, not main cell vs split cells
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


    if (speedBoostsToRemove.length > 0) {
      speedBoostsRef.current = currentSpeedBoosts.filter(triangle => !speedBoostsToRemove.includes(triangle.id));
      setSpeedBoosts(speedBoostsRef.current);
    }

    if (pointMultipliersToRemove.length > 0) {
      pointMultipliersRef.current = currentPointMultipliers.filter(triangle => !pointMultipliersToRemove.includes(triangle.id));
      setPointMultipliers(pointMultipliersRef.current);
    }

    if (fusionCooldownReductionsToRemove.length > 0) {
      fusionCooldownReductionsRef.current = currentFusionCooldownReductions.filter(triangle => !fusionCooldownReductionsToRemove.includes(triangle.id));
      setFusionCooldownReductions(fusionCooldownReductionsRef.current);
    }

    // Handle removal of specific player cells (split cells)
    if (playerCellsToRemove.length > 0 && currentPlayer) {
      // Check if main player cell was eaten
      const mainCellEaten = playerCellsToRemove.includes(currentPlayer.id);
      
      if (mainCellEaten) {
        // Main cell was eaten - check if we have split cells to take over
        if (currentPlayer.splitCells.length > 0) {
          // Promote first split cell to main cell
          const newMainCell = currentPlayer.splitCells[0];
          currentPlayer.splitCells.splice(0, 1);
          
          // Use the new method to promote split cell
          currentPlayer.promoteSplitCellToMain(newMainCell);
          
          console.log('🔄 Main cell eaten! Promoting split cell to main cell.');
        } else {
          // No split cells left - game over
          console.log('💀 ALL PLAYER CELLS EATEN - Game Over!');
          gameStore.endGame(false); // false = lost
          return;
        }
      }
      
      // Remove other split cells that were eaten
      currentPlayer.removeSplitCells(playerCellsToRemove);
      
      // Reset split level if no split cells remain
      if (currentPlayer.splitCells.length === 0) {
        currentPlayer.resetSplitLevel();
      }
      
      console.log(`🍽️ ${playerCellsToRemove.length} player cells eaten by bots. Remaining: ${currentPlayer.getAllCells().length} cells`);
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
    const currentSpeedBoosts = speedBoostsRef.current;
    const currentPointMultipliers = pointMultipliersRef.current;
    const currentFusionCooldownReductions = fusionCooldownReductionsRef.current;

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

    // Render power triangles
    if (currentSpeedBoosts.length > 0) {
      console.log(`🎨 Rendering ${currentSpeedBoosts.length} speed boost triangles`);
      currentSpeedBoosts.forEach((triangle, i) => {
        try {
          triangle.draw(ctx, cameraRef.current);
        } catch (error) {
          console.error(`Error rendering speed boost triangle ${i}:`, error);
        }
      });
    }

    if (currentPointMultipliers.length > 0) {
      console.log(`🎨 Rendering ${currentPointMultipliers.length} point multiplier triangles`);
      currentPointMultipliers.forEach((triangle, i) => {
        try {
          triangle.draw(ctx, cameraRef.current);
        } catch (error) {
          console.error(`Error rendering point multiplier triangle ${i}:`, error);
        }
      });
    }

    if (currentFusionCooldownReductions.length > 0) {
      console.log(`🎨 Rendering ${currentFusionCooldownReductions.length} fusion cooldown reduction triangles`);
      currentFusionCooldownReductions.forEach((triangle, i) => {
        try {
          triangle.draw(ctx, cameraRef.current);
        } catch (error) {
          console.error(`Error rendering fusion cooldown reduction triangle ${i}:`, error);
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

    // Render power triangles
    if (currentSpeedBoosts.length > 0) {
      console.log(`🎨 Rendering ${currentSpeedBoosts.length} speed boost triangles`);
      currentSpeedBoosts.forEach((triangle, i) => {
        try {
          triangle.draw(ctx, cameraRef.current);
        } catch (error) {
          console.error(`Error rendering speed boost triangle ${i}:`, error);
        }
      });
    }

    if (currentPointMultipliers.length > 0) {
      console.log(`🎨 Rendering ${currentPointMultipliers.length} point multiplier triangles`);
      currentPointMultipliers.forEach((triangle, i) => {
        try {
          triangle.draw(ctx, cameraRef.current);
        } catch (error) {
          console.error(`Error rendering point multiplier triangle ${i}:`, error);
        }
      });
    }

    if (currentFusionCooldownReductions.length > 0) {
      console.log(`🎨 Rendering ${currentFusionCooldownReductions.length} fusion cooldown reduction triangles`);
      currentFusionCooldownReductions.forEach((triangle, i) => {
        try {
          triangle.draw(ctx, cameraRef.current);
        } catch (error) {
          console.error(`Error rendering fusion cooldown reduction triangle ${i}:`, error);
        }
      });
    }

    // Render power triangles
    if (currentSpeedBoosts.length > 0) {
      console.log(`🎨 Rendering ${currentSpeedBoosts.length} speed boost triangles`);
      currentSpeedBoosts.forEach((triangle, i) => {
        try {
          triangle.draw(ctx, cameraRef.current);
        } catch (error) {
          console.error(`Error rendering speed boost triangle ${i}:`, error);
        }
      });
    }

    if (currentPointMultipliers.length > 0) {
      console.log(`🎨 Rendering ${currentPointMultipliers.length} point multiplier triangles`);
      currentPointMultipliers.forEach((triangle, i) => {
        try {
          triangle.draw(ctx, cameraRef.current);
        } catch (error) {
          console.error(`Error rendering point multiplier triangle ${i}:`, error);
        }
      });
    }

    if (currentFusionCooldownReductions.length > 0) {
      console.log(`🎨 Rendering ${currentFusionCooldownReductions.length} fusion cooldown reduction triangles`);
      currentFusionCooldownReductions.forEach((triangle, i) => {
        try {
          triangle.draw(ctx, cameraRef.current);
        } catch (error) {
          console.error(`Error rendering fusion cooldown reduction triangle ${i}:`, error);
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
    ctx.fillText(`Entities: ${currentPellets.length} food, ${currentBots.length} bots, ${currentPlayer ? 1 : 0} player, ${currentSpeedBoosts.length} speed, ${currentPointMultipliers.length} points, ${currentFusionCooldownReductions.length} fusion`, 10, canvasSize.height - 40);

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
        // Update entities using refs - deltaTime is already in milliseconds
        if (playerRef.current) {
          playerRef.current.update(deltaTime);
          updateCamera(playerRef.current, getGameConfig(canvasSize.width, canvasSize.height));
        }

        botsRef.current.forEach(bot => bot.update(deltaTime));
        pelletsRef.current.forEach(pellet => pellet.update(deltaTime));
        speedBoostsRef.current.forEach(triangle => triangle.update(deltaTime));
        pointMultipliersRef.current.forEach(triangle => triangle.update(deltaTime));
        fusionCooldownReductionsRef.current.forEach(triangle => triangle.update(deltaTime));

        // Update particles
        particleSystemRef.current?.update(deltaTime);

        // Spawn new triangles
        spawnTriangles();

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
          // Stealth skill is active - no balance effects needed
        }

        // Update power-up status from player
        if (playerRef.current) {
          const powerUpStatus = playerRef.current.getPowerUpStatus();
          currentState.updatePowerUpStatus(powerUpStatus);
          
          // Update score from player
          const playerScore = playerRef.current.getTotalScore();
          if (playerScore !== currentState.score) {
            currentState.updateScore(playerScore - currentState.score);
          }
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

      {/* Elegant Game HUD */}
      <div className="game-hud" style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        pointerEvents: 'none'
      }}>
        {/* Top Bar - Main Status */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(20, 20, 40, 0.95) 100%)',
          border: '2px solid #00ffff',
          borderRadius: '0 0 15px 15px',
          margin: '0 20px',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 20px rgba(0, 255, 255, 0.3)',
          backdropFilter: 'blur(10px)'
        }}>
          {/* Left - Score & Player Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
            {/* Score */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                color: '#00ffff', 
                fontSize: '22px', 
                fontWeight: 'bold',
                textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
                fontFamily: 'monospace'
              }}>
                {playerRef.current?.getTotalScore() || 0}
              </div>
              <div style={{ color: '#888', fontSize: '10px', fontFamily: 'monospace' }}>SCORE</div>
            </div>

            {/* Player Name */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                color: '#ffffff',
                fontSize: '18px',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                textShadow: '0 0 8px rgba(255, 255, 255, 0.3)'
              }}>
                {playerName}
              </div>
              <div style={{ color: '#888', fontSize: '10px', fontFamily: 'monospace' }}>PLAYER</div>
            </div>

            {/* Cells Count */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                color: '#ffaa00', 
                fontSize: '18px', 
                fontWeight: 'bold',
                textShadow: '0 0 8px rgba(255, 170, 0, 0.5)',
                fontFamily: 'monospace'
              }}>
                {playerRef.current?.getAllCells().length || 0}
              </div>
              <div style={{ color: '#888', fontSize: '10px', fontFamily: 'monospace' }}>CELLS</div>
            </div>
          </div>

          {/* Center - Game Status */}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{
              color: '#00ffff',
              fontSize: '16px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              textShadow: '0 0 8px currentColor'
            }}>
              HUMANITY PROTOCOL
            </div>
            <div style={{ color: '#888', fontSize: '10px', fontFamily: 'monospace' }}>
              SURVIVE & GROW
            </div>
          </div>

          {/* Right - Split System */}
          {playerRef.current && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {/* Split Status */}
              <div style={{ textAlign: 'center' }}>
                {playerRef.current.canSplit() ? (
                  <div style={{
                    padding: '6px 12px',
                    background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(0, 200, 255, 0.3))',
                    border: '1px solid #00ffff',
                    borderRadius: '8px',
                    color: '#00ffff',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    textShadow: '0 0 5px rgba(0, 255, 255, 0.5)',
                    boxShadow: '0 0 10px rgba(0, 255, 255, 0.3)'
                  }}>
                    SPLIT READY
                  </div>
                ) : (
                  <div>
                    <div style={{
                      width: '80px',
                      height: '6px',
                      background: 'rgba(0, 255, 255, 0.2)',
                      border: '1px solid #00ffff',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      marginBottom: '4px'
                    }}>
                      <div style={{
                        width: `${100 * (1 - playerRef.current.getSplitCooldownProgress())}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #00ffff, #00aaff)',
                        borderRadius: '3px',
                        transition: 'width 0.3s ease',
                        boxShadow: '0 0 5px rgba(0, 255, 255, 0.5)'
                      }} />
                    </div>
                    <div style={{ color: '#00ffff', fontSize: '10px', fontFamily: 'monospace' }}>
                      SPLIT ({(playerRef.current.getSplitCooldownProgress() * 7.5).toFixed(1)}s)
                    </div>
                  </div>
                )}
                <div style={{ color: '#888', fontSize: '9px', fontFamily: 'monospace', marginTop: '2px' }}>
                  L{playerRef.current.getSplitLevel()}/{playerRef.current.getMaxSplitLevel()}
                </div>
              </div>

              {/* Fusion Status */}
              {playerRef.current.getAllCells().length > 1 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '80px',
                    height: '6px',
                    background: 'rgba(255, 0, 255, 0.2)',
                    border: '1px solid #ff00ff',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    marginBottom: '4px'
                  }}>
                    <div style={{
                      width: `${100 * (1 - playerRef.current.getFusionCooldownProgress())}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #ff00ff, #ff80ff)',
                      borderRadius: '3px',
                      transition: 'width 0.3s ease',
                      boxShadow: '0 0 5px rgba(255, 0, 255, 0.5)'
                    }} />
                  </div>
                  <div style={{ color: '#ff00ff', fontSize: '10px', fontFamily: 'monospace' }}>
                    FUSION ({(playerRef.current.getFusionCooldownRemaining() / 1000).toFixed(1)}s)
                  </div>
                </div>
              )}

              {/* Game Status */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  color: gameStore.isPaused ? '#ff4444' : '#00ff00',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  textShadow: '0 0 5px currentColor'
                }}>
                  {gameStore.isPaused ? 'PAUSED' : 'ACTIVE'}
                </div>
              </div>
            </div>
          )}
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
        entities={[...(playerRef.current ? [playerRef.current] : []), ...botsRef.current, ...pelletsRef.current, ...speedBoostsRef.current, ...pointMultipliersRef.current, ...fusionCooldownReductionsRef.current]}
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
