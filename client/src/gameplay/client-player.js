// client/src/gameplay/client-player.js
import { Player } from '../../../shared/entities/player.js';
import { Vector3 } from '../../../shared/physics/vector.js';
import { log, warn } from '../../../shared/utils/logger.js';
import { clamp } from '../../../shared/utils/math-utils.js';
import { createPlayerMesh } from '../generation/character-model-generator.js';
// Import Singletons ou referências globais (MELHORAR COM DI NO FUTURO)
import { NetworkManager } from '../network/network-manager.js';
import {
    SERVER_TICK_INTERVAL_MS,
    BASE_PLAYER_SPEED,
    PLAYER_ACCELERATION, // <-- NOVO
    PLAYER_FRICTION,     // <-- NOVO
    MIN_SPEED_THRESHOLD,  // <-- NOVO
    GRAVITY // <-- Importar GRAVITY
} from '../../../shared/constants/game-settings.js';

// Tipos para JSDoc (melhora autocomplete e verificação)
/** @typedef {import('../core/input-controller.js').InputController} InputController */
/** @typedef {import('../../../shared/physics/collision-system.js').CollisionSystem} CollisionSystem */
/** @typedef {import('../../../shared/gameplay/world/map.js').GameMap} GameMap */
/** @typedef {import('../../../shared/models/player-state.js').PlayerState} PlayerState */

// Tempo (em ms) que tentamos renderizar 'atrás' do último estado recebido.
const RENDER_DELAY = SERVER_TICK_INTERVAL_MS * 1.5;
const RECONCILIATION_THRESHOLD_SQ = 0.05 * 0.05; // Limiar (quadrado) para corrigir posição (5cm)

// --- Injeção de Dependência Temporária (GLOBAL - EVITAR EM PRODUÇÃO) ---
// Idealmente, injetar via construtor, container DI, ou passagem pelo ClientWorld.
/** @type {InputController | null} */
let _inputController = null;
/** @type {CollisionSystem | null} */
let _collisionSystem = null;
/** @type {GameMap | null} */
let _gameMap = null;

/**
 * Configura dependências globais para ClientPlayer (SOLUÇÃO TEMPORÁRIA).
 * @param {InputController} inputCtrl
 * @param {CollisionSystem} collisionSys
 * @param {GameMap} gameMp
 */
export function setClientPlayerDependencies(inputCtrl, collisionSys, gameMp) {
    _inputController = inputCtrl;
    _collisionSystem = collisionSys;
    _gameMap = gameMp;
    log('[CLIENT] ClientPlayer dependencies injected (temporary solution).');
}
// --- Fim Injeção Temporária ---


/**
 * Representa a instância de um jogador no lado do cliente.
 * Lida com interpolação para jogadores remotos e predição/reconciliação para o jogador local.
 */
export class ClientPlayer extends Player {

    // Propriedades para interpolação
    /** @type {PlayerState | null} */
    previousState = null;
    /** @type {PlayerState | null} */
    targetState = null;
    /** @type {number} */
    lastStateTimestamp = 0;
    /** @type {number} */
    targetStateTimestamp = 0;

    /** @type {import('three').Mesh | import('three').Group | null} */
    mesh = null;

    /**
     * @param {PlayerState} initialState - O primeiro estado recebido do servidor.
     */
    constructor(initialState) {
        // Chama o construtor da classe Player base com ID e nome
        super(initialState.id, initialState.name);

        // Aplica o estado inicial completo (incluindo posição, vida, isAlive, etc.)
        this.setState(initialState);

        // Configura estados de interpolação
        this.targetState = { ...initialState }; // Clona
        this.previousState = { ...initialState }; // Clona
        // Usa timestamp do servidor ou estima se não vier no estado inicial
        this.targetStateTimestamp = initialState.timestamp || Date.now();
        this.lastStateTimestamp = this.targetStateTimestamp - SERVER_TICK_INTERVAL_MS; // Estima timestamp anterior

        // Criação do Mesh 3D
        try {
            this.mesh = createPlayerMesh();
            // Associar ID da entidade ao UUID do mesh pode ajudar a encontrá-lo na cena
            this.mesh.uuid = this.id;
            // Guardar referência da entidade no mesh pode ser útil
            this.mesh.userData = { entityId: this.id, isPlayerMesh: true };
            this.mesh.position.copy(this.position); // Define posição inicial do mesh
            this.mesh.visible = this.isAlive; // Define visibilidade inicial
            log(`[CLIENT] Created mesh for player ${this.id}. Initial visibility: ${this.isAlive}`);
        } catch (error) {
            warn(`[CLIENT] Failed to create mesh for player ${this.id}:`, error);
            this.mesh = null;
        }

        log(`[CLIENT] ClientPlayer created: ${this.id} (${this.name}) at ${this.position.toString()}`);
    }

    /**
     * Atualiza os estados (para interpolação/reconciliação) com base nos dados do servidor.
     * @param {PlayerState} newState - O novo estado recebido do servidor.
     * @param {number} serverTimestamp - O timestamp do snapshot do servidor.
     */
    updateState(newState, serverTimestamp) {
        const isLocalPlayer = this.id === NetworkManager.getLocalPlayerId();

        // Armazena estados para interpolação (SEMPRE, exceto talvez para local se não interpolar nada)
        // Mesmo para local, guardar targetState pode ser útil para reconciliação
        if (this.targetState) {
            this.previousState = { ...this.targetState };
            this.lastStateTimestamp = this.targetStateTimestamp;
        } else {
             // Se targetState é nulo (primeira atualização?), usa newState como previous também
             this.previousState = { ...newState };
             this.lastStateTimestamp = serverTimestamp - SERVER_TICK_INTERVAL_MS;
        }
        this.targetState = newState;
        this.targetStateTimestamp = serverTimestamp;


        if (isLocalPlayer) {
            // --- Reconciliação para Jogador Local ---
            const previousIsAlive = this.isAlive; // Guarda estado anterior para log

            // Aplica estados autoritativos não preditos (vida, score, isAlive, etc.)
            if (newState.health !== undefined) this.health = newState.health;
            if (newState.maxHealth !== undefined) this.maxHealth = newState.maxHealth;
            if (newState.score !== undefined) this.score = newState.score;
            if (newState.isAlive !== undefined) this.isAlive = newState.isAlive;
            // Futuro: Aplicar mana, atributos, etc.

            if (previousIsAlive !== this.isAlive) {
                log(`[CLIENT] Local player ${this.id} isAlive changed: ${this.isAlive}`);
                if (!this.isAlive) {
                    // Ações imediatas ao morrer (ex: efeito sonoro, overlay)
                } else {
                    // Ações imediatas ao respawnar (ex: efeito sonoro)
                }
            }

            // Reconciliação de Posição
            if (newState.position && this.isAlive) { // Só reconcilia posição se estiver vivo
                const serverPos = new Vector3(newState.position.x, newState.position.y, newState.position.z);
                const discrepancySq = this.position.distanceToSq(serverPos);

                if (discrepancySq > RECONCILIATION_THRESHOLD_SQ) {
                    warn(`[CLIENT] Reconciling local player ${this.id} position. Error: ${Math.sqrt(discrepancySq).toFixed(3)}m`);
                    this.position.copy(serverPos); // Correção abrupta ("snap")
                    this.velocity.zero(); // Zera velocidade após correção para evitar continuar no erro
                    // Para correção suave: re-simular inputs desde o último estado acked
                }
            } else if (!this.isAlive) {
                 // Se o servidor diz que estamos mortos, garante que a posição local corresponda
                 // (Embora a predição já deva parar, isso garante consistência)
                 if(newState.position) {
                     this.position.set(newState.position.x, newState.position.y, newState.position.z);
                 }
                 this.velocity.zero();
            }
            // Limpeza de inputs pendentes (se reconciliação avançada)
            // if (newState.lastAckedInputSequence !== undefined) { ... }

        } else {
            // --- Aplicação de Estado para Jogadores Remotos ---
            // Aplica todos os estados não-posicionais diretamente.
            // A posição será tratada pela interpolação no método update().
            super.setState(newState); // Usa o setState da classe base Player
        }
    }

    /**
     * Atualização por frame no cliente: Executa predição ou interpolação.
     * @param {number} deltaTime - Tempo desde o último frame.
     */
    update(deltaTime) {
        const isLocalPlayer = this.id === NetworkManager.getLocalPlayerId();

        if (isLocalPlayer) {
            // --- Predição de Movimento (Jogador Local) ---
            if (this.isAlive && _inputController && _collisionSystem && _gameMap) {
                // 1. Obter input atual
                const currentKeys = _inputController.getActionKeysState();
                const currentYaw = _inputController.getYaw();

                // 2. Calcular/Atualizar velocidade local com aceleração/atrito
                this.applyInputLocally(currentKeys, currentYaw, deltaTime); // Passa deltaTime agora

                // --- APLICAR GRAVIDADE NA PREDIÇÃO ---
                // Somente se não estivermos "no chão" (simples: verifica se Y > 0)
                // Uma checagem mais robusta usaria raycast para baixo ou estado isGrounded
                if (this.position.y > _gameMap.getBounds().min.y + 0.01) { // Se não está exatamente no chão
                    this.velocity.y -= GRAVITY * deltaTime;
                }
                // --- FIM GRAVIDADE PREDIÇÃO ---

                // 3. Calcular deslocamento e posição prevista
                const deltaPosition = this.velocity.clone().multiplyScalar(deltaTime);
                const predictedPosition = this.position.clone().add(deltaPosition);

                // 4. Resolver colisão com limites do mundo localmente
                const finalPosition = _collisionSystem.resolveWorldBoundsCollision(
                    this,
                    predictedPosition,
                    _gameMap.getBounds()
                );

                // 5. Aplicar posição final predita
                this.position.copy(finalPosition);

                // Zera velocidade Y local se colidiu com chão
                const GROUND_Y = _gameMap.getBounds().min.y;
                 const IS_ON_GROUND = finalPosition.y <= GROUND_Y + 0.01;
                 if (IS_ON_GROUND && this.velocity.y < 0) {
                      this.velocity.y = 0;
                 }

            } else if (!this.isAlive) {
                // Se local e morto, garantir velocidade zero
                this.velocity.zero();
            }
        } else {
            // --- Interpolação (Jogadores Remotos) ---
            if (this.isAlive && this.previousState && this.targetState && this.targetStateTimestamp > this.lastStateTimestamp) {
                const now = Date.now();
                const renderTimestamp = now - RENDER_DELAY; // O tempo que queremos visualizar

                const timeRatio = (this.targetStateTimestamp - this.lastStateTimestamp);
                let alpha = (timeRatio > 0)
                    ? (renderTimestamp - this.lastStateTimestamp) / timeRatio
                    : 1; // Evita divisão por zero se timestamps iguais

                alpha = clamp(alpha, 0, 1); // Garante que alpha esteja entre 0 e 1

                // Interpola posição
                if (this.previousState.position && this.targetState.position) {
                    const prevPos = new Vector3(this.previousState.position.x, this.previousState.position.y, this.previousState.position.z);
                    const targetPos = new Vector3(this.targetState.position.x, this.targetState.position.y, this.targetState.position.z);
                    this.position.copy(prevPos).lerp(targetPos, alpha);
                }
                // Poderíamos interpolar rotação aqui se enviada no estado

            } else if (this.targetState?.position) {
                 // Se não pode interpolar, usa a posição mais recente conhecida
                 this.position.set(this.targetState.position.x, this.targetState.position.y, this.targetState.position.z);
            }
            // Se remoto e morto, a posição interpolada ainda será aplicada,
            // mas o SceneManager o tornará invisível.
        }

        // --- Atualização Visual (Mesh) ---
        if (this.mesh) {
            this.mesh.position.copy(this.position);

            // Atualiza rotação visual do jogador local para corresponder à câmera
            if (isLocalPlayer && _inputController) {
                this.mesh.rotation.y = _inputController.getYaw();
                // Se o modelo tiver uma "frente" diferente do eixo Z negativo padrão do Three.js, ajuste:
                // this.mesh.rotation.y = _inputController.getYaw() + Math.PI;
            }
            // Rotação visual para jogadores remotos (poderia ser interpolada se enviada)
        }
    }

    /**
     * Calcula a velocidade local baseada no input, com aceleração/atrito (para predição).
     * @param {object} keys - Estado das teclas {W, A, S, D, ...}.
     * @param {number} lookYaw - Rotação horizontal.
     * @param {number} clientDeltaTime - Delta time do frame do cliente.
     */
    applyInputLocally(keys, lookYaw, clientDeltaTime) {
        // 1. Calcula vetor de input local
        let inputDirection = Vector3.ZERO.clone();
        let hasMovementInput = false;
        if (keys.W) inputDirection.z -= 1; // Z- é para frente
        if (keys.S) inputDirection.z += 1; // Z+ é para trás
        if (keys.A) inputDirection.x -= 1; // X- é para esquerda
        if (keys.D) inputDirection.x += 1; // X+ é para direita

        // 2. Calcula direção e velocidade alvo no mundo
        let targetVelocity = Vector3.ZERO.clone();
        if (inputDirection.magnitudeSq() > 0) {
            hasMovementInput = true;
            inputDirection.normalize();
            
            // CORREÇÃO da rotação baseada na câmera
            const angle = lookYaw;
            const cosYaw = Math.cos(angle);
            const sinYaw = Math.sin(angle);
            
            // A orientação padrão no three.js é Z- sendo "para frente"
            const worldX = inputDirection.x * cosYaw + inputDirection.z * sinYaw;
            const worldZ = -inputDirection.x * sinYaw + inputDirection.z * cosYaw;
            
            const worldDirection = new Vector3(worldX, 0, worldZ).normalize();
            targetVelocity = worldDirection.multiplyScalar(BASE_PLAYER_SPEED);
        }

        // 3. Aplica Aceleração ou Atrito (espelhando servidor)
        if (hasMovementInput) {
            const accelFactor = clamp(PLAYER_ACCELERATION * clientDeltaTime, 0, 1);
            this.velocity.lerp(targetVelocity, accelFactor);
        } else {
            const currentSpeedSq = this.velocity.magnitudeSq();
            if (currentSpeedSq > MIN_SPEED_THRESHOLD * MIN_SPEED_THRESHOLD) {
                const frictionMagnitude = PLAYER_FRICTION * clientDeltaTime;
                const currentSpeed = Math.sqrt(currentSpeedSq);
                const newSpeed = Math.max(0, currentSpeed - frictionMagnitude);
                if (currentSpeed > 0) { // Evita divisão por zero
                    this.velocity.multiplyScalar(newSpeed / currentSpeed);
                } else {
                     this.velocity.zero();
                }
            } else {
                this.velocity.zero();
            }
        }

        // --- Aplicação de Aceleração e Atrito (Exponencial - ESPELHANDO SERVIDOR) ---
        const K_ACCEL = PLAYER_ACCELERATION;
        const K_FRICTION = PLAYER_FRICTION;

        if (hasMovementInput) {
            // Interpola exponencialmente para a velocidade alvo
            const alpha = 1 - Math.exp(-K_ACCEL * clientDeltaTime);
            this.velocity.lerp(targetVelocity, alpha);
        } else {
            // Interpola exponencialmente para velocidade zero (atrito)
            const alpha = 1 - Math.exp(-K_FRICTION * clientDeltaTime);
            this.velocity.lerp(Vector3.ZERO, alpha);

            // Se a velocidade ficar muito pequena, zera completamente
            if (this.velocity.magnitudeSq() < MIN_SPEED_THRESHOLD * MIN_SPEED_THRESHOLD) {
                this.velocity.zero();
            }
        }
         // --- Fim Aceleração/Atrito ---
    }

    // --- Métodos de Cena ---
    /**
     * Adiciona o mesh à cena Three.js.
     * @param {import('three').Scene} scene
     */
    addToScene(scene) {
        if (this.mesh && !this.mesh.parent) {
            scene.add(this.mesh);
            // log(`[CLIENT] Added mesh for player ${this.id} to scene.`);
        } else if (!this.mesh) {
            warn(`[CLIENT] Cannot add player ${this.id} to scene: mesh is null.`);
        }
    }

    /**
     * Remove o mesh da cena Three.js.
     * @param {import('three').Scene} scene
     */
    removeFromScene(scene) {
        if (this.mesh && this.mesh.parent === scene) {
            scene.remove(this.mesh);
            // log(`[CLIENT] Removed mesh for player ${this.id} from scene.`);
        }
         // O dispose é melhor feito pelo SceneManager ao confirmar a remoção
    }
}