import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';

interface SkillIconProps {
  skill: {
    id: string;
    name: string;
    keybind: string;
    cooldown: number;
    currentCooldown: number;
    isActive: boolean;
  };
}

const SkillIcon: React.FC<SkillIconProps> = ({ skill }) => {
  const cooldownPercent = (skill.currentCooldown / skill.cooldown) * 100;
  const isOnCooldown = skill.currentCooldown > 0;

  const getSkillColor = (skillId: string) => {
    switch (skillId) {
      case 'parley': return '#00ff00';
      case 'stealth': return '#0080ff';
      case 'decoy': return '#ffff00';
      case 'breach': return '#ff4444';
      default: return '#ffffff';
    }
  };

  const getSkillIcon = (skillId: string) => {
    switch (skillId) {
      case 'parley': return '🤝';
      case 'stealth': return '👤';
      case 'decoy': return '🎯';
      case 'breach': return '⚡';
      default: return '❓';
    }
  };

  return (
    <motion.div
      className={`skill-icon ${skill.id}`}
      style={{
        position: 'relative',
        width: '60px',
        height: '60px',
        borderRadius: '8px',
        border: `2px solid ${getSkillColor(skill.id)}`,
        background: isOnCooldown ? 'rgba(64, 64, 64, 0.8)' : 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isOnCooldown ? 'not-allowed' : 'pointer',
        overflow: 'hidden'
      }}
      whileHover={!isOnCooldown ? { scale: 1.05 } : {}}
      whileTap={!isOnCooldown ? { scale: 0.95 } : {}}
      animate={{
        boxShadow: skill.isActive
          ? `0 0 15px ${getSkillColor(skill.id)}`
          : 'none'
      }}
    >
      {/* Cooldown overlay */}
      {isOnCooldown && (
        <motion.div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          initial={{ height: '100%' }}
          animate={{ height: `${cooldownPercent}%` }}
          transition={{ duration: 0.1 }}
        />
      )}

      {/* Skill icon */}
      <div
        style={{
          fontSize: '24px',
          zIndex: 1,
          position: 'relative'
        }}
      >
        {getSkillIcon(skill.id)}
      </div>

      {/* Keybind */}
      <div
        style={{
          fontSize: '10px',
          color: getSkillColor(skill.id),
          fontWeight: 'bold',
          zIndex: 1,
          position: 'relative',
          marginTop: '2px'
        }}
      >
        {skill.keybind.toUpperCase()}
      </div>

      {/* Active indicator */}
      {skill.isActive && (
        <motion.div
          style={{
            position: 'absolute',
            bottom: '2px',
            left: '2px',
            right: '2px',
            height: '3px',
            background: getSkillColor(skill.id),
            borderRadius: '2px'
          }}
          animate={{
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity
          }}
        />
      )}

      {/* Tooltip */}
      <motion.div
        style={{
          position: 'absolute',
          bottom: '70px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.9)',
          border: `1px solid ${getSkillColor(skill.id)}`,
          borderRadius: '4px',
          padding: '8px',
          fontSize: '12px',
          color: '#ffffff',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          opacity: 0,
          zIndex: 1000
        }}
        whileHover={{ opacity: 1 }}
      >
        <div style={{ fontWeight: 'bold', color: getSkillColor(skill.id) }}>
          {skill.name}
        </div>
        <div style={{ fontSize: '10px', marginTop: '4px' }}>
          {getSkillDescription(skill.id)}
        </div>
        {skill.cooldown > 0 && (
          <div style={{ fontSize: '10px', marginTop: '2px', color: '#888' }}>
            Cooldown: {skill.cooldown / 1000}s
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

const getSkillDescription = (skillId: string): string => {
  switch (skillId) {
    case 'parley':
      return '50% chance to negotiate - boost Humanity or lose some';
    case 'stealth':
      return 'Invisible for 5s, drones ignore you (-5 Humanity/sec)';
    case 'decoy':
      return 'Spawn fake pellet, distracts nearby drones';
    case 'breach':
      return 'AOE hack wave, damage nearby nodes';
    default:
      return '';
  }
};

export const SkillsBar: React.FC = () => {
  const { skills } = useGameStore();

  return (
    <motion.div
      className="skills-bar"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '15px',
        background: 'rgba(0, 0, 0, 0.8)',
        border: '2px solid #00ffff',
        borderRadius: '12px',
        padding: '10px',
        zIndex: 1000
      }}
    >
      {skills.map((skill) => (
        <SkillIcon key={skill.id} skill={skill} />
      ))}

      {/* Cyberpunk-style corner decorations */}
      <div
        style={{
          position: 'absolute',
          top: '-2px',
          left: '-2px',
          width: '15px',
          height: '15px',
          borderLeft: '2px solid #00ffff',
          borderTop: '2px solid #00ffff'
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '-2px',
          right: '-2px',
          width: '15px',
          height: '15px',
          borderRight: '2px solid #00ffff',
          borderTop: '2px solid #00ffff'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-2px',
          left: '-2px',
          width: '15px',
          height: '15px',
          borderLeft: '2px solid #00ffff',
          borderBottom: '2px solid #00ffff'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-2px',
          right: '-2px',
          width: '15px',
          height: '15px',
          borderRight: '2px solid #00ffff',
          borderBottom: '2px solid #00ffff'
        }}
      />
    </motion.div>
  );
};
