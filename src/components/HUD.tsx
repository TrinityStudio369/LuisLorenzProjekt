import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { PlayerCell } from '../utils/entities';

interface HUDProps {
  player?: PlayerCell | null;
}

export const HUD: React.FC<HUDProps> = ({ player }) => {
  const { score, powerUpStatus } = useGameStore();

  return (
    <motion.div
      className="hud"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        right: '10px',
        zIndex: 1000,
        pointerEvents: 'none',
        fontFamily: 'monospace'
      }}
    >
      {/* Bar 1: Score */}
      <motion.div
        className="main-status-bar"
        style={{
          background: 'rgba(0, 0, 0, 0.9)',
          border: '2px solid #00ffff',
          borderRadius: '8px',
          padding: '8px 12px',
          marginBottom: '8px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        {/* Score */}
        <div style={{ color: '#00ffff', fontSize: '18px', fontWeight: 'bold' }}>
          SCORE: {score.toLocaleString()}
        </div>
      </motion.div>

      {/* Bar 2: Power-ups */}
      <motion.div
        className="powerup-bar"
        style={{
          background: 'rgba(0, 0, 0, 0.8)',
          border: '1px solid #444',
          borderRadius: '6px',
          padding: '6px 10px',
          marginBottom: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px'
        }}
      >
        {/* Speed Boost */}
        {powerUpStatus.speedBoost.isActive && (
          <div style={{ color: '#00ff00', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span>⚡</span>
            <span>SPEED x{powerUpStatus.speedBoost.multiplier}</span>
            <span style={{ color: '#888' }}>
              ({(powerUpStatus.speedBoost.timeRemaining / 1000).toFixed(1)}s)
            </span>
          </div>
        )}

        {/* Point Multiplier */}
        {powerUpStatus.pointMultiplier.isActive && (
          <div style={{ color: '#ffaa00', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span>💰</span>
            <span>POINTS x{powerUpStatus.pointMultiplier.multiplier}</span>
            <span style={{ color: '#888' }}>
              ({(powerUpStatus.pointMultiplier.timeRemaining / 1000).toFixed(1)}s)
            </span>
          </div>
        )}

        {/* Fusion Cooldown Reduction */}
        {powerUpStatus.fusionCooldownReduction.isActive && (
          <div style={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span>🔄</span>
            <span>FUSION HALVED</span>
            <span style={{ color: '#888' }}>
              ({(powerUpStatus.fusionCooldownReduction.timeRemaining / 1000).toFixed(1)}s)
            </span>
          </div>
        )}
      </motion.div>

      {/* Bar 3: Player Stats */}
      {player && (
        <motion.div
          className="player-stats-bar"
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid #444',
            borderRadius: '6px',
            padding: '6px 10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px'
          }}
        >
          {/* Mass */}
          <div style={{ color: '#ffaa00' }}>
            MASS: {player.getMass().toFixed(1)}
          </div>

          {/* Split Level */}
          <div style={{ color: '#00ff00' }}>
            LEVEL: {player.getSplitLevel()}
          </div>

          {/* Cells Count */}
          <div style={{ color: '#00ffff' }}>
            CELLS: {player.getAllCells().length}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};