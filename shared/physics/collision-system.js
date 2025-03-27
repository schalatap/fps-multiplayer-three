import { log, warn } from '../utils/logger.js';
import { Vector3 } from './vector.js';
import { clamp } from '../utils/math-utils.js';

/**
 * Sistema responsável por detectar e resolver colisões.
 */
export class CollisionSystem {

  /**
   * Cria uma instância do CollisionSystem.
   */
  constructor() {
    log('CollisionSystem initialized.');
  }

  /**
   * Verifica se uma AABB está (parcialmente ou totalmente) fora dos limites do mapa.
   * @param {{min: Vector3, max: Vector3}} aabb - A AABB a ser verificada.
   * @param {{min: Vector3, max: Vector3}} mapBounds - Os limites do mapa.
   * @returns {boolean} `true` se a AABB estiver fora dos limites, `false` caso contrário.
   */
  checkWorldBounds(aabb, mapBounds) {
    return (
      aabb.min.x < mapBounds.min.x ||
      aabb.max.x > mapBounds.max.x ||
      aabb.min.y < mapBounds.min.y ||
      aabb.max.y > mapBounds.max.y ||
      aabb.min.z < mapBounds.min.z ||
      aabb.max.z > mapBounds.max.z
    );
  }

  /**
   * Resolve colisões de uma entidade com os limites do mundo.
   * Modifica a posição potencial para mantê-la dentro dos limites e ajusta a velocidade.
   * @param {import('../base/game-object.js').GameObject} entity - A entidade colidindo.
   * @param {Vector3} potentialPosition - A posição que a entidade tentaria alcançar sem colisão.
   * @param {{min: Vector3, max: Vector3}} mapBounds - Os limites do mapa.
   * @returns {Vector3} A posição final ajustada da entidade após a resolução da colisão.
   */
  resolveWorldBoundsCollision(entity, potentialPosition, mapBounds) {
    // Obter a AABB da entidade *na posição potencial*
    const entityHalfWidth = (entity.width || 0.1) / 2; // Usa largura/profundidade específica se existir, senão um valor pequeno
    const entityHalfDepth = (entity.depth || entity.width || 0.1) / 2;
    const entityHeight = entity.height || 0.1; // Usa altura específica

    const potentialAABB = {
        min: new Vector3(
            potentialPosition.x - entityHalfWidth,
            potentialPosition.y, // Assumindo que a posição Y é a base
            potentialPosition.z - entityHalfDepth
        ),
        max: new Vector3(
            potentialPosition.x + entityHalfWidth,
            potentialPosition.y + entityHeight,
            potentialPosition.z + entityHalfDepth
        ),
    };

    const finalPosition = potentialPosition.clone(); // Começa com a posição desejada
    let collided = false;

    // Resolve Colisão no eixo X
    if (potentialAABB.min.x < mapBounds.min.x) {
        finalPosition.x = mapBounds.min.x + entityHalfWidth;
        if (entity.velocity.x < 0) entity.velocity.x = 0; // Zera velocidade contra a parede
        collided = true;
    } else if (potentialAABB.max.x > mapBounds.max.x) {
        finalPosition.x = mapBounds.max.x - entityHalfWidth;
        if (entity.velocity.x > 0) entity.velocity.x = 0;
        collided = true;
    }

    // Resolve Colisão no eixo Y (Chão e Teto)
    if (potentialAABB.min.y < mapBounds.min.y) {
        finalPosition.y = mapBounds.min.y; // Coloca na superfície do chão
        if (entity.velocity.y < 0) entity.velocity.y = 0; // Para a queda
        collided = true;
        // Aqui poderíamos adicionar uma flag 'isGrounded' na entidade
        // entity.isGrounded = true;
    } else if (potentialAABB.max.y > mapBounds.max.y) {
        finalPosition.y = mapBounds.max.y - entityHeight;
        if (entity.velocity.y > 0) entity.velocity.y = 0; // Bateu no teto
        collided = true;
    } else {
        // Se não colidiu com chão/teto, não está no chão (a menos que outra lógica diga o contrário)
        // entity.isGrounded = false;
    }


    // Resolve Colisão no eixo Z
    if (potentialAABB.min.z < mapBounds.min.z) {
        finalPosition.z = mapBounds.min.z + entityHalfDepth;
        if (entity.velocity.z < 0) entity.velocity.z = 0;
        collided = true;
    } else if (potentialAABB.max.z > mapBounds.max.z) {
        finalPosition.z = mapBounds.max.z - entityHalfDepth;
        if (entity.velocity.z > 0) entity.velocity.z = 0;
        collided = true;
    }

    // if (collided) {
    //     // log(`Collision resolved for ${entity.id}. Original: ${potentialPosition}, Final: ${finalPosition}`);
    // }

    return finalPosition;
  }

  // --- Futuro: Colisão Entidade vs Entidade ---

  /**
   * Verifica se duas AABBs se sobrepõem.
   * @param {{min: Vector3, max: Vector3}} boxA
   * @param {{min: Vector3, max: Vector3}} boxB
   * @returns {boolean} `true` se houver sobreposição, `false` caso contrário.
   */
  checkAABBOverlap(boxA, boxB) {
    // Verifica se NÃO HÁ sobreposição em qualquer um dos eixos
    const noOverlap =
      boxA.max.x <= boxB.min.x || // A está totalmente à esquerda de B
      boxA.min.x >= boxB.max.x || // A está totalmente à direita de B
      boxA.max.y <= boxB.min.y || // A está totalmente abaixo de B
      boxA.min.y >= boxB.max.y || // A está totalmente acima de B
      boxA.max.z <= boxB.min.z || // A está totalmente atrás de B
      boxA.min.z >= boxB.max.z;   // A está totalmente à frente de B

    // Se não houver 'não sobreposição', então há sobreposição
    return !noOverlap;
  }

  /**
   * Verifica se um raio (segmento de linha com distância máxima) intersecta uma AABB.
   * Usa o algoritmo Slab Test (Kay-Kajiya), corrigido para raios paralelos.
   * @param {Vector3} rayOrigin - Ponto inicial do raio.
   * @param {Vector3} rayDirection - Vetor de direção do raio (NÃO precisa ser normalizado, representa o deslocamento total).
   * @param {number} maxDistance - O comprimento máximo do raio (magnitude de rayDirection). Se rayDirection já é o deslocamento, maxDistance é sua magnitude.
   * @param {{min: Vector3, max: Vector3}} aabb - A AABB a ser testada.
   * @returns {number | null} Retorna o tempo de interseção (tmin) se houver interseção, ou null caso contrário.
   */
  checkRayAABBIntersection(rayOrigin, rayDirection, maxDistance, aabb) {
      // Se a magnitude da direção for muito pequena, trata como ponto e faz overlap check
      if (rayDirection.magnitudeSq() < 0.00001) {
          const pointBox = { min: rayOrigin.clone(), max: rayOrigin.clone() };
          return this.checkAABBOverlap(pointBox, aabb) ? 0 : null;
      }

      // --- REVISÃO DA LÓGICA SLAB TEST ---
      // Tratamos t como a fração do vetor rayDirection (0 a 1)
      let tmin = 0;
      let tmax = 1; // O fim do nosso movimento neste frame é t=1

      const EPSILON = 1e-6;

      for (let i = 0; i < 3; i++) {
          const axis = i === 0 ? 'x' : i === 1 ? 'y' : 'z';
          const dirAxis = rayDirection[axis];
          const originAxis = rayOrigin[axis];
          const minAxis = aabb.min[axis];
          const maxAxis = aabb.max[axis];

          if (Math.abs(dirAxis) < EPSILON) {
              if (originAxis < minAxis || originAxis > maxAxis) {
                  return null; // Paralelo e fora
              }
              continue; // Paralelo e dentro
          }

          const invDir = 1.0 / dirAxis;
          let t1 = (minAxis - originAxis) * invDir;
          let t2 = (maxAxis - originAxis) * invDir;

          if (t1 > t2) [t1, t2] = [t2, t1]; // Garante t1 < t2

          tmin = Math.max(tmin, t1); // Queremos o *último* tempo de entrada
          tmax = Math.min(tmax, t2); // Queremos o *primeiro* tempo de saída

          if (tmin > tmax) { // Se o intervalo se inverteu, não há interseção
              return null;
          }
      }

      // Interseção ocorre se o intervalo [tmin, tmax] for válido
      // E o intervalo de interseção [tmin, tmax] se sobrepõe com o intervalo do nosso raio [0, 1].
      if (tmin <= 1 && tmax >= 0 && tmin >= 0) {
          return tmin; // Retorna o tempo de entrada
      }

      return null; // Não houve interseção no segmento [0, 1]
  }

  /**
   * Verifica, usando raycasting, se um projétil colidiu com algum obstáculo estático.
   * @param {Vector3} projectilePreviousPos - A posição do projétil no início do tick.
   * @param {Vector3} projectileDeltaMove - O vetor de deslocamento do projétil neste tick.
   * @param {Array<{position: Vector3, size: Vector3}>} obstacles - Lista de obstáculos estáticos.
   * @returns {{obstacle: object, t: number} | null} Retorna o primeiro obstáculo atingido e o tempo de impacto, ou null.
   */
  checkProjectileHitStaticObstacleRaycast(projectilePreviousPos, projectileDeltaMove, obstacles) {
      const rayOrigin = projectilePreviousPos;
      const rayDirection = projectileDeltaMove;
      const maxDistance = rayDirection.magnitude();

      if (maxDistance < 0.0001) {
          return null; // Movimento insignificante
      }

      let closestHit = null;
      let min_t = Infinity;

      for (const obstacle of obstacles) {
          // Calcular AABB do obstáculo
          const obsHalfSize = obstacle.size.clone().divideScalar(2);
          const obsMin = obstacle.position.clone().add(new Vector3(-obsHalfSize.x, 0, -obsHalfSize.z));
          const obsMax = obstacle.position.clone().add(new Vector3(obsHalfSize.x, obstacle.size.y, obsHalfSize.z));
          const obstacleAABB = { min: obsMin, max: obsMax };

          const t_hit = this.checkRayAABBIntersection(rayOrigin, rayDirection, maxDistance, obstacleAABB);
          
          if (t_hit !== null && t_hit >= 0 && t_hit < min_t) {
              min_t = t_hit;
              closestHit = obstacle;
          }
      }

      if (closestHit) {
          log(`--> Raycast Static Hit: Projectile vs Obstacle of type ${closestHit.type} at t=${min_t.toFixed(3)}`);
          return { obstacle: closestHit, t: min_t };
      }

      return null;
  }

  /**
   * Verifica se um projétil colidiu com algum dos alvos fornecidos usando raycasting.
   * @param {import('../entities/projectile.js').Projectile} projectile - O projétil a ser verificado.
   * @param {Vector3} projectilePreviousPos - A posição do projétil no início do tick.
   * @param {Vector3} projectileDeltaMove - O vetor de deslocamento do projétil neste tick.
   * @param {Iterable<import('../entities/player.js').Player>} targets - Coleção de alvos potenciais.
   * @returns {{target: import('../entities/player.js').Player, hitboxKey: string, t: number} | null} O primeiro alvo atingido, a hitbox e o tempo de impacto, ou null.
   */
  checkProjectileHitRaycast(projectile, projectilePreviousPos, projectileDeltaMove, targets) {
    if (!projectile || projectile.markForRemoval) {
        return null;
    }

    const rayOrigin = projectilePreviousPos;
    const rayDirection = projectileDeltaMove; // Vetor de deslocamento
    const maxDistance = rayDirection.magnitude();

    // Se o movimento for insignificante, não faz raycast
    if (maxDistance < 0.0001) {
        return null;
    }

    let closestHitResult = null;
    let min_t = Infinity;

    try {
        for (const target of targets) {
            // Verifica se o alvo é válido e não é o próprio dono
            if (!target || target.id === projectile.ownerId || !target.isAlive) {
                continue;
            }
            // Verifica se o alvo tem o método getHitboxes
            if (typeof target.getHitboxes !== 'function') {
                warn(`CollisionSystem Raycast: Target ${target.id} does not have getHitboxes method.`);
                continue;
            }

            const hitboxes = target.getHitboxes();
            
            for (const hitboxKey in hitboxes) {
                if (!hitboxes.hasOwnProperty(hitboxKey)) continue;
                
                const targetBox = hitboxes[hitboxKey];
                const t_hit = this.checkRayAABBIntersection(rayOrigin, rayDirection, maxDistance, targetBox);
                
                if (t_hit !== null && t_hit >= 0 && t_hit < min_t) {
                    min_t = t_hit;
                    closestHitResult = { target: target, hitboxKey: hitboxKey, t: min_t };
                }
            }
        }
    } catch (error) {
        warn(`[CollisionSystem] Error during projectile raycast for ${projectile.id}:`, error);
    }

    if (closestHitResult) {
        log(`--> Raycast Hit: Proj ${projectile.id} vs Player ${closestHitResult.target.id} at ${closestHitResult.hitboxKey}, t=${closestHitResult.t.toFixed(3)}`);
    }

    return closestHitResult;
  }

  /**
   * Resolve colisões entre uma entidade e obstáculos estáticos.
   * Ajusta a posição da entidade para evitar interpenetração.
   * @param {import('../base/game-object.js').GameObject & import('../base/collidable.js').Collidable} entity - A entidade móvel.
   * @param {Vector3} potentialPosition - A posição que a entidade tentaria ocupar.
   * @param {Array<{position: Vector3, size: Vector3}>} obstacles - Lista de obstáculos estáticos.
   * @returns {Vector3} A posição final ajustada após colisões com obstáculos.
   */
  resolveStaticObstacleCollision(entity, potentialPosition, obstacles) {
    const adjustedPosition = potentialPosition.clone();
    const MAX_RESOLUTION_ITERATIONS = 3; // Evitar loops infinitos
    const RESOLUTION_EPSILON = 0.001; // Pequena tolerância para evitar z-fighting ou ficar preso

    for (let iter = 0; iter < MAX_RESOLUTION_ITERATIONS; iter++) {
        let collisionOccurredThisIteration = false;

        // Calcula a AABB da entidade na posição atualmente ajustada
        const entityAABB = entity.getBoundingBox(adjustedPosition);

        for (const obstacle of obstacles) {
            // Calcular AABB do obstáculo
            const obsHalfSize = obstacle.size.clone().divideScalar(2);
            const obsMin = obstacle.position.clone().add(new Vector3(-obsHalfSize.x, 0, -obsHalfSize.z));
            const obsMax = obstacle.position.clone().add(new Vector3(obsHalfSize.x, obstacle.size.y, obsHalfSize.z));
            const obstacleAABB = { min: obsMin, max: obsMax };

            if (this.checkAABBOverlap(entityAABB, obstacleAABB)) {
                collisionOccurredThisIteration = true;

                // Calcula sobreposição
                const overlapX = Math.min(entityAABB.max.x, obstacleAABB.max.x) - Math.max(entityAABB.min.x, obstacleAABB.min.x);
                const overlapY = Math.min(entityAABB.max.y, obstacleAABB.max.y) - Math.max(entityAABB.min.y, obstacleAABB.min.y);
                const overlapZ = Math.min(entityAABB.max.z, obstacleAABB.max.z) - Math.max(entityAABB.min.z, obstacleAABB.min.z);

                // Determina o eixo de menor penetração para resolução
                if (overlapX <= overlapY && overlapX <= overlapZ) {
                    // Resolve em X
                    const entityCenterX = entityAABB.min.x + (entityAABB.max.x - entityAABB.min.x) / 2;
                    const obstacleCenterX = obstacleAABB.min.x + (obstacleAABB.max.x - obstacleAABB.min.x) / 2;
                    const pushDirectionX = entityCenterX < obstacleCenterX ? -(overlapX + RESOLUTION_EPSILON) : (overlapX + RESOLUTION_EPSILON);
                    adjustedPosition.x += pushDirectionX;
                    if (Math.sign(entity.velocity.x) * Math.sign(pushDirectionX) < 0) entity.velocity.x = 0;
                    entityAABB.min.x += pushDirectionX;
                    entityAABB.max.x += pushDirectionX;
                } else if (overlapY <= overlapX && overlapY <= overlapZ) {
                    // Resolve em Y
                    const entityCenterY = entityAABB.min.y + (entityAABB.max.y - entityAABB.min.y) / 2;
                    const obstacleCenterY = obstacleAABB.min.y + (obstacleAABB.max.y - obstacleAABB.min.y) / 2;
                    const pushDirectionY = entityCenterY < obstacleCenterY ? -(overlapY + RESOLUTION_EPSILON) : (overlapY + RESOLUTION_EPSILON);
                    adjustedPosition.y += pushDirectionY;
                    if (Math.sign(entity.velocity.y) * Math.sign(pushDirectionY) < 0) entity.velocity.y = 0;
                    entityAABB.min.y += pushDirectionY;
                    entityAABB.max.y += pushDirectionY;
                } else {
                    // Resolve em Z
                    const entityCenterZ = entityAABB.min.z + (entityAABB.max.z - entityAABB.min.z) / 2;
                    const obstacleCenterZ = obstacleAABB.min.z + (obstacleAABB.max.z - obstacleAABB.min.z) / 2;
                    const pushDirectionZ = entityCenterZ < obstacleCenterZ ? -(overlapZ + RESOLUTION_EPSILON) : (overlapZ + RESOLUTION_EPSILON);
                    adjustedPosition.z += pushDirectionZ;
                    if (Math.sign(entity.velocity.z) * Math.sign(pushDirectionZ) < 0) entity.velocity.z = 0;
                    entityAABB.min.z += pushDirectionZ;
                    entityAABB.max.z += pushDirectionZ;
                }
            }
        }

        // Se não houve colisões nesta iteração, a posição está estável, podemos sair
        if (!collisionOccurredThisIteration) {
            break;
        }
    }

    return adjustedPosition;
  }
}