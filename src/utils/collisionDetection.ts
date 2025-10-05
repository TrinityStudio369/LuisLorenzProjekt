import { Position, Entity } from '../types/game';

export function getDistance(pos1: Position, pos2: Position): number {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isColliding(entity1: Entity, entity2: Entity): boolean {
  const distance = getDistance(entity1.position, entity2.position);
  return distance < (entity1.size + entity2.size);
}

export function checkCollisions(entities: Entity[]): CollisionResult[] {
  const results: CollisionResult[] = [];

  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const entity1 = entities[i];
      const entity2 = entities[j];

      if (isColliding(entity1, entity2)) {
        results.push({
          entity1: entity1,
          entity2: entity2,
          distance: getDistance(entity1.position, entity2.position)
        });
      }
    }
  }

  return results;
}

export function pointInCircle(point: Position, center: Position, radius: number): boolean {
  return getDistance(point, center) <= radius;
}

export function rectangleOverlap(
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect2.x + rect2.width < rect1.x ||
    rect1.y + rect1.height < rect2.y ||
    rect2.y + rect2.height < rect1.y
  );
}

export interface CollisionResult {
  entity1: Entity;
  entity2: Entity;
  distance: number;
}

export function findNearestEntity(position: Position, entities: Entity[], excludeIds: string[] = []): Entity | null {
  let nearest: Entity | null = null;
  let minDistance = Infinity;

  for (const entity of entities) {
    if (excludeIds.includes(entity.id)) continue;

    const distance = getDistance(position, entity.position);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = entity;
    }
  }

  return nearest;
}

export function getEntitiesInRadius(center: Position, radius: number, entities: Entity[]): Entity[] {
  return entities.filter(entity =>
    getDistance(center, entity.position) <= radius
  );
}
