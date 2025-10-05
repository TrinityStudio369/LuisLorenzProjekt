import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { getBalanceStatus } from '../utils/balanceMechanics';

export const HUD: React.FC = () => {
  const { humanity, kiControl, score } = useGameStore();

  const balanceStatus = getBalanceStatus();

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
      {/* Score Display */}
      <motion.div
        className="score-display"
        style={{
          background: 'rgba(0, 0, 0, 0.8)',
          border: '2px solid #00ffff',
          borderRadius: '8px',
          padding: '10px',
          marginBottom: '10px',
          color: '#00ffff',
          textAlign: 'center'
        }}
        whileHover={{ scale: 1.05 }}
      >
        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
          SCORE: {score.toLocaleString()}
        </div>
      </motion.div>

      {/* Balance Meters */}
      <div className="balance-meters" style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
        {/* Humanity Meter */}
        <motion.div
          className="humanity-meter"
          style={{
            flex: 1,
            background: 'rgba(0, 0, 0, 0.8)',
            border: '2px solid #00ff00',
            borderRadius: '8px',
            padding: '10px'
          }}
          animate={{
            borderColor: humanity > 70 ? '#00ff00' : humanity > 30 ? '#ffff00' : '#ff0000'
          }}
        >
          <div style={{ color: '#00ff00', fontSize: '14px', marginBottom: '5px' }}>
            HUMANITY
          </div>
          <div
            style={{
              width: '100%',
              height: '20px',
              background: 'rgba(0, 255, 0, 0.2)',
              border: '1px solid #00ff00',
              borderRadius: '10px',
              overflow: 'hidden'
            }}
          >
            <motion.div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #00ff00, #00aa00)',
                borderRadius: '10px'
              }}
              animate={{ width: `${humanity}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div style={{ color: '#00ff00', fontSize: '12px', textAlign: 'center', marginTop: '5px' }}>
            {humanity}/100
          </div>
        </motion.div>

        {/* KI-Control Meter */}
        <motion.div
          className="ki-control-meter"
          style={{
            flex: 1,
            background: 'rgba(0, 0, 0, 0.8)',
            border: '2px solid #ff4444',
            borderRadius: '8px',
            padding: '10px'
          }}
          animate={{
            borderColor: kiControl > 70 ? '#ff0000' : kiControl > 30 ? '#ff8800' : '#ff4444'
          }}
        >
          <div style={{ color: '#ff4444', fontSize: '14px', marginBottom: '5px' }}>
            KI-CONTROL
          </div>
          <div
            style={{
              width: '100%',
              height: '20px',
              background: 'rgba(255, 68, 68, 0.2)',
              border: '1px solid #ff4444',
              borderRadius: '10px',
              overflow: 'hidden'
            }}
          >
            <motion.div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #ff4444, #aa0000)',
                borderRadius: '10px'
              }}
              animate={{ width: `${kiControl}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div style={{ color: '#ff4444', fontSize: '12px', textAlign: 'center', marginTop: '5px' }}>
            {kiControl}/100
          </div>
        </motion.div>
      </div>

      {/* Balance Status */}
      <motion.div
        className="balance-status"
        style={{
          background: 'rgba(0, 0, 0, 0.8)',
          border: `2px solid ${balanceStatus.color}`,
          borderRadius: '8px',
          padding: '10px',
          textAlign: 'center'
        }}
        animate={{
          borderColor: balanceStatus.color,
          boxShadow: `0 0 10px ${balanceStatus.color}40`
        }}
        transition={{ duration: 0.5 }}
      >
        <div
          style={{
            color: balanceStatus.color,
            fontSize: '16px',
            fontWeight: 'bold',
            marginBottom: '5px'
          }}
        >
          {balanceStatus.status.toUpperCase()}
        </div>
        <div
          style={{
            color: '#ffffff',
            fontSize: '12px',
            lineHeight: '1.4'
          }}
        >
          {balanceStatus.message}
        </div>
      </motion.div>

      {/* Cyberpunk-style corner decorations */}
      <div
        style={{
          position: 'absolute',
          top: '-2px',
          left: '-2px',
          width: '20px',
          height: '20px',
          borderLeft: '3px solid #00ffff',
          borderTop: '3px solid #00ffff'
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '-2px',
          right: '-2px',
          width: '20px',
          height: '20px',
          borderRight: '3px solid #00ffff',
          borderTop: '3px solid #00ffff'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-2px',
          left: '-2px',
          width: '20px',
          height: '20px',
          borderLeft: '3px solid #00ffff',
          borderBottom: '3px solid #00ffff'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-2px',
          right: '-2px',
          width: '20px',
          height: '20px',
          borderRight: '3px solid #00ffff',
          borderBottom: '3px solid #00ffff'
        }}
      />
    </motion.div>
  );
};
