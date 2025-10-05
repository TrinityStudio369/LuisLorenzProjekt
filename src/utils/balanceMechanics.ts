import { useGameStore } from '../stores/gameStore';
import { EntityType } from '../types/game';

export interface BalanceAction {
  type: 'eat_pellet' | 'eat_drone' | 'recruit_civ' | 'lose_to_drone' | 'hack_node' | 'skill_use';
  entityType?: EntityType;
  amount?: number;
}

export function processBalanceAction(action: BalanceAction): void {
  const store = useGameStore.getState();

  switch (action.type) {
    case 'eat_pellet':
      // Eating data pellets gives humanity boost, but can randomly affect KI-Control
      store.updateHumanity(5);
      if (Math.random() < 0.3) { // 30% chance
        store.updateKIControl(Math.random() < 0.5 ? 2 : -1);
      }
      break;

    case 'eat_drone':
      // Eating a drone reduces KI-Control significantly
      store.updateKIControl(-10);
      store.updateHumanity(2); // Small humanity boost for removing threat
      break;

    case 'recruit_civ':
      // Recruiting civilians boosts humanity
      store.updateHumanity(8);
      break;

    case 'lose_to_drone':
      // Losing to a drone hurts humanity and boosts KI-Control
      store.updateHumanity(-10);
      store.updateKIControl(5);
      break;

    case 'hack_node':
      // Hacking nodes significantly reduces KI-Control
      store.updateKIControl(-20);
      store.updateHumanity(5); // Small humanity boost for resistance
      break;

    case 'skill_use':
      // Different skills have different balance effects
      switch (action.entityType) {
        case EntityType.PLAYER: // Parley skill
          if (Math.random() < 0.5) {
            store.updateHumanity(10);
            store.updateKIControl(-5);
          } else {
            store.updateHumanity(-5);
          }
          break;

        case EntityType.DRONE: // Decoy skill
          store.updateKIControl(-10);
          break;

        case EntityType.NODE: // Breach skill
          store.updateHumanity(-10);
          store.updateKIControl(-15);
          break;
      }
      break;
  }
}

export function getBalanceStatus(): {
  status: 'harmony' | 'unstable' | 'crisis' | 'shutdown';
  message: string;
  color: string;
} {
  const { humanity, kiControl } = useGameStore.getState();

  if (humanity >= 85 && kiControl <= 20) {
    return {
      status: 'harmony',
      message: 'Harmony Achieved: Humans and AI coexist peacefully!',
      color: '#00ff00'
    };
  }

  if (kiControl === 0) {
    return {
      status: 'shutdown',
      message: 'Total Shutdown: AI systems neutralized!',
      color: '#ffff00'
    };
  }

  if (humanity === 0) {
    return {
      status: 'crisis',
      message: 'Humanity Lost: Complete AI domination!',
      color: '#ff0000'
    };
  }

  if (kiControl >= 100) {
    return {
      status: 'crisis',
      message: 'KI-Control Max: AI singularity achieved!',
      color: '#ff0000'
    };
  }

  // Check for unstable balance
  const imbalance = Math.abs(humanity - kiControl);
  if (imbalance >= 60) {
    return {
      status: 'unstable',
      message: imbalance > 70 ? 'Critical Imbalance: System unstable!' : 'Imbalanced: Seek equilibrium',
      color: '#ffaa00'
    };
  }

  return {
    status: 'unstable',
    message: 'Maintaining Balance: Continue the struggle',
    color: '#ffffff'
  };
}

export function calculateSkillCost(skillId: string): { humanity: number; kiControl: number } {
  switch (skillId) {
    case 'stealth':
      return { humanity: -5, kiControl: 0 }; // Per second cost
    case 'breach':
      return { humanity: -10, kiControl: -15 };
    default:
      return { humanity: 0, kiControl: 0 };
  }
}

export function getBalanceMultiplier(action: BalanceAction): number {
  const { humanity, kiControl } = useGameStore.getState();
  const imbalance = Math.abs(humanity - kiControl);

  // Actions that help the imbalanced side get bonus multipliers
  let multiplier = 1.0;

  if (action.type === 'eat_pellet' && humanity < kiControl) {
    multiplier += 0.2; // Bonus humanity gain when humanity is lower
  }

  if (action.type === 'eat_drone' && kiControl > humanity) {
    multiplier += 0.3; // Bonus KI-Control reduction when KI is higher
  }

  if (action.type === 'recruit_civ' && humanity < kiControl) {
    multiplier += 0.25;
  }

  // Penalty for extreme imbalance
  if (imbalance > 70) {
    multiplier *= 0.8;
  }

  return multiplier;
}
