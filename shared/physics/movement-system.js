// shared/physics/movement-system.js

import { log, warn } from '../utils/logger.js';
import { Vector3 } from './vector.js';
import { Projectile } from '../entities/projectile.js';
import { Player } from '../entities/player.js';
import { GRAVITY } from '../constants/game-settings.js'; 

export class MovementSystem {
    /** @type {import('./collision-system.js').CollisionSystem} */
    collisionSystem;
    /** @type {{min: Vector3, max: Vector3}} */
    mapBounds;
    /** @type {Array<{position: Vector3, size: Vector3}>} */
    obstacles;

    /**
     * Cria uma instância do MovementSystem.
     * @param {import('./collision-system.js').CollisionSystem} collisionSystem
     * @param {{min: Vector3, max: Vector3}} mapBounds
     * @param {Array<{position: Vector3, size: Vector3}>} staticObstacles
     */
    constructor(collisionSystem, mapBounds, staticObstacles) {
        if (!collisionSystem) throw new Error("MovementSystem requires a CollisionSystem instance.");
        if (!mapBounds) throw new Error("MovementSystem requires mapBounds.");
        if (!staticObstacles) throw new Error("MovementSystem requires staticObstacles array.");
        
        this.collisionSystem = collisionSystem;
        this.mapBounds = mapBounds;
        this.obstacles = staticObstacles;
        log(`MovementSystem initialized with CollisionSystem, MapBounds, and ${staticObstacles.length} obstacles.`);
    }

    update(entities, deltaTime, players) {
        if (deltaTime <= 0) return;

        const GROUND_Y = this.mapBounds.min.y; // Cache ground level

        for (const entity of entities) {
            if (!(entity.position instanceof Vector3) || !(entity.velocity instanceof Vector3) || typeof entity.getBoundingBox !== 'function') {
                 continue;
            }

            // --- APLICAR GRAVIDADE ---
            if (!entity.ignoreGravity) {
                entity.velocity.y -= GRAVITY * deltaTime;
            }
           
            // Guarda a posição *antes* de mover
            const previousPosition = entity.position.clone();

            // Calcula deslocamento e posição potencial
            const deltaPosition = entity.velocity.clone().multiplyScalar(deltaTime);
            const potentialPosition = previousPosition.clone().add(deltaPosition);

            let finalPosition = potentialPosition; // Posição final padrão
            let projectileStoppedByHit = false; // Flag para hit com objeto/jogador
            let projectileStoppedByGround = false; // Flag para hit com chão

            // --- LÓGICA ESPECÍFICA PARA PROJÉTEIS ---
            if (entity instanceof Projectile && !entity.markForRemoval) {
                
                // 1. Checar Hit com Obstáculos Estáticos via Raycast
                const hitStaticResult = this.collisionSystem.checkProjectileHitStaticObstacleRaycast(
                    previousPosition,
                    deltaPosition,
                    this.obstacles
                );
                
                // 2. Checar Hit com Jogadores
                const hitPlayerResult = this.collisionSystem.checkProjectileHitRaycast(
                    entity,
                    previousPosition,
                    deltaPosition,
                    players
                );
                
                // Determinar qual hit ocorreu primeiro (menor tempo t)
                let finalHitResult = null;
                
                if (hitStaticResult && hitPlayerResult) {
                    // Ambos ocorreram - escolher o de menor t
                    finalHitResult = hitStaticResult.t <= hitPlayerResult.t ? hitStaticResult : hitPlayerResult;
                } else {
                    // Apenas um deles ocorreu (ou nenhum)
                    finalHitResult = hitStaticResult || hitPlayerResult;
                }
                
                if (finalHitResult && finalHitResult.t >= 0 && finalHitResult.t <= 1) {
                    // Calcula o ponto exato de impacto
                    const impactPoint = previousPosition.clone().add(
                        deltaPosition.clone().multiplyScalar(finalHitResult.t)
                    );
                    
                    // Define a posição final como o ponto de impacto
                    finalPosition = impactPoint;
                    projectileStoppedByHit = true;
                    entity.markForRemoval = true;
                    entity.velocity.zero(); // Zera a velocidade explicitamente
                    
                    // Emitir evento para broadcast
                    if (global.eventEmitter) {
                        global.eventEmitter.emit('broadcastImpactEffect', {
                            projectileId: entity.id,
                            position: [impactPoint.x, impactPoint.y, impactPoint.z],
                            surfaceType: finalHitResult.target ? 'player' : 'static',
                            obstacleType: finalHitResult.obstacle ? finalHitResult.obstacle.type : null
                        });
                    }
                    
                    // Verifica o tipo de colisão e processa
                    if (finalHitResult.target) { // Hit em jogador
                        log(`Collision resolved: Proj ${entity.id} hit Player ${finalHitResult.target.id} at exact impact point`);
                        try {
                            const hitboxKey = finalHitResult.hitboxKey || 'default';
                            finalHitResult.target.takeDamage(entity.damage, hitboxKey);
                        } catch(e) {
                            warn(`Error applying damage:`, e);
                        }
                    } else if (finalHitResult.obstacle) { // Hit em obstáculo
                        log(`Collision resolved: Proj ${entity.id} hit Obstacle ${finalHitResult.obstacle.type} at exact impact point`);
                    }
                }
                
                // --- 5. CHECK GROUND COLLISION (SE NÃO HOUVE HIT POR RAYCAST) ---
                if (!projectileStoppedByHit) {
                    // Verifica se o segmento cruza o plano do chão
                    if (previousPosition.y >= GROUND_Y && potentialPosition.y < GROUND_Y) {
                        // Calcula o tempo 't' de interseção com o plano do chão (y = GROUND_Y)
                        const t_ground = (GROUND_Y - previousPosition.y) / (potentialPosition.y - previousPosition.y);
                        
                        // Garante que a interseção ocorra dentro do segmento de movimento deste frame
                        if (t_ground >= 0 && t_ground <= 1) {
                            const groundImpactPoint = previousPosition.clone().add(
                                deltaPosition.clone().multiplyScalar(t_ground)
                            );
                            finalPosition = groundImpactPoint;
                            projectileStoppedByGround = true; // Marca como parado pelo chão
                            entity.markForRemoval = true;
                            entity.velocity.zero(); // Para o movimento
                            
                            log(`Collision resolved: Proj ${entity.id} hit GROUND at ${groundImpactPoint.toString()}`);
                            
                            // Emite evento de impacto para o hit no chão
                            if (global.eventEmitter) {
                                global.eventEmitter.emit('broadcastImpactEffect', {
                                    projectileId: entity.id,
                                    position: [groundImpactPoint.x, groundImpactPoint.y, groundImpactPoint.z],
                                    surfaceType: 'static', // Chão é estático
                                    obstacleType: 'ground' // Tipo específico para chão
                                });
                            }
                        }
                    }
                }
                // --- FIM DA VERIFICAÇÃO DE COLISÃO COM O CHÃO ---
            }

            // Combina flags de parada
            const projectileStopped = projectileStoppedByHit || projectileStoppedByGround;

            // --- Resolução de Colisão com Limites (Se o projétil não foi parado por colisão) ---
            if (!projectileStopped) {
                finalPosition = this.collisionSystem.resolveWorldBoundsCollision(
                    entity,
                    potentialPosition, // Posição potencial calculada
                    this.mapBounds
                );
                
                // --- Resolve Colisão com Obstáculos Estáticos ---
                finalPosition = this.collisionSystem.resolveStaticObstacleCollision(
                    entity,
                    finalPosition, // Posição após ajuste de limites
                    this.obstacles
                );
            }

            // Aplica a posição final calculada
            entity.position.copy(finalPosition);

            // Zera velocidade Y se colidiu com o chão
            const IS_ON_GROUND = finalPosition.y <= GROUND_Y + 0.01;
            if (IS_ON_GROUND && entity.velocity.y < 0) {
                 entity.velocity.y = 0;
            }
            
            // Se o projétil foi parado por colisão, zera sua velocidade
            if (projectileStopped) {
                entity.velocity.zero();
            }
        }
    }
}