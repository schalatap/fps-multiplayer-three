// server/src/gameplay/server-player.js

import { Player } from '../../../shared/entities/player.js';
import { Vector3 } from '../../../shared/physics/vector.js';
import { log, warn } from '../../../shared/utils/logger.js';
// CORREÇÃO: Importar as novas constantes
import {
    BASE_PLAYER_SPEED,
    RESPAWN_DELAY,
    PLAYER_ACCELERATION, // <-- NOVO
    PLAYER_FRICTION,     // <-- NOVO
    MIN_SPEED_THRESHOLD  // <-- NOVO
} from '../../../shared/constants/game-settings.js';
import { clamp } from '../../../shared/utils/math-utils.js';
import { WeaponFactory } from '../../../shared/gameplay/weapons/weapon-factory.js';
// Import não é estritamente necessário se usarmos apenas type hint, mas manter não prejudica
import { SpawnManager } from './spawn-manager.js';

/**
 * Representa a instância autoritativa de um jogador no servidor.
 */
export class ServerPlayer extends Player {
  /** @type {import('socket.io').Socket} */
  socket;
  /** @type {number} */
  lastProcessedInputTime;
  /** @type {number} */
  lastProcessedInputSequence = -1;
  /** @type {Array<import('../../../shared/models/player-input.js').PlayerInput>} */
  pendingInputs;
  /** @type {number} */
  lookYaw = 0;
  /** @type {number} */
  lookPitch = 0;
  /** @type {WeaponFactory} */
  weaponFactory;
  /** @type {SpawnManager} */
  spawnManager; // Propriedade declarada
  /** @type {number} */
  timeToRespawn = 0;

  /**
   * Cria uma nova instância de ServerPlayer.
   * @param {import('socket.io').Socket} socket
   * @param {SpawnManager} spawnManager
   * @param {string} [name]
   * @param {Vector3} [position]
   */
  constructor(socket, spawnManager, name = `Player_${socket.id.substring(0, 4)}`, position = new Vector3()) {
    super(socket.id, name, position);

    if (!socket) throw new Error("ServerPlayer requires a valid socket instance.");
    if (!spawnManager) throw new Error("ServerPlayer requires a valid SpawnManager instance.");

    this.socket = socket;
    // CORREÇÃO 2: Armazenar a instância do spawnManager
    this.spawnManager = spawnManager;
    this.lastProcessedInputTime = Date.now();
    this.pendingInputs = [];
    this.timeToRespawn = 0;

    this.weaponFactory = new WeaponFactory();
    const initialWeapon = this.weaponFactory.createWeapon('pistol', this);
    if (initialWeapon) {
        this.equipWeapon(initialWeapon);
    } else {
        warn(`[ServerPlayer ${this.id}] Failed to create initial weapon 'pistol'.`);
    }
  }

  /**
   * Método chamado quando a vida do jogador chega a zero.
   */
  onDeath() {
    // Agora RESPAWN_DELAY está definido
    this.timeToRespawn = RESPAWN_DELAY;
    this.velocity.zero();
    log(`Player ${this.id} will respawn in ${RESPAWN_DELAY} seconds.`);
    // Lógica de progressão (Etapa 21) pode vir aqui
  }

  /**
   * Método de atualização do jogador no servidor.
   * @param {number} deltaTime
   */
  update(deltaTime) {
    if (!this.isAlive) {
        this.timeToRespawn -= deltaTime;
        if (this.timeToRespawn <= 0) {
            // Agora this.spawnManager deve estar definido
            const spawnPosition = this.spawnManager.getSpawnPoint();
            this.respawn(spawnPosition);
        }
        return;
    }

    this.applyInputs(deltaTime);
    this.currentWeapon?.update(deltaTime);
  }

  /**
   * Processa um pacote de input recebido do cliente.
   * @param {import('../../../shared/models/player-input.js').PlayerInput} inputData
   */
  processInput(inputData) {
     if (inputData && typeof inputData.sequence === 'number') {
         this.pendingInputs.push(inputData);
     } else {
          log(`[ServerPlayer ${this.id}] Received invalid input data.`);
     }
  }

  /**
   * Processa os inputs pendentes para determinar a velocidade e orientação,
   * AGORA COM ACELERAÇÃO E ATRITO, E CÁLCULO DE DIREÇÃO CORRIGIDO.
   * @param {number} serverDeltaTime - O deltaTime do tick do servidor.
   */
  applyInputs(serverDeltaTime) {
      if (!this.isAlive) {
          this.velocity.zero();
          this.pendingInputs = [];
          return;
      }

      let latestInput = null;
      for (const input of this.pendingInputs) {
          if (input.sequence > this.lastProcessedInputSequence) {
              if (!latestInput || input.sequence > latestInput.sequence) {
                  latestInput = input;
              }
          }
      }

      // --- Cálculo da Direção e Velocidade Alvo ---
      let targetVelocity = Vector3.ZERO.clone(); // Começa com velocidade alvo zero
      let inputDirection = Vector3.ZERO.clone(); // Vetor de input local
      let hasMovementInput = false;

      if (latestInput) {
          const input = latestInput;
          const keys = input.keys;

          // 1. Atualiza orientação do jogador (essencial para cálculo da direção)
          this.lookYaw = input.lookYaw;
          this.lookPitch = input.lookPitch;

          // 2. Calcula vetor de input local (WASD) - CORREÇÃO DO MAPEAMENTO
          if (keys.W) inputDirection.z -= 1; // CORRIGIDO: Z- é para frente
          if (keys.S) inputDirection.z += 1; // CORRIGIDO: Z+ é para trás
          if (keys.A) inputDirection.x -= 1; // CORRIGIDO: X- é para esquerda
          if (keys.D) inputDirection.x += 1; // CORRIGIDO: X+ é para direita

          if (inputDirection.magnitudeSq() > 0) {
              hasMovementInput = true;
              inputDirection.normalize(); // Normaliza input local

              // 3. CORREÇÃO da rotação baseada na câmera
              // Em FPS, queremos que W sempre vá para onde a câmera está olhando
              const angle = this.lookYaw;
              
              // Matriz de rotação simplificada (rotação no eixo Y)
              const cosYaw = Math.cos(angle);
              const sinYaw = Math.sin(angle);
              
              // A orientação padrão no three.js é Z- sendo "para frente"
              // Então transformamos nosso input para esse sistema de coordenadas
              const worldX = inputDirection.x * cosYaw + inputDirection.z * sinYaw;
              const worldZ = -inputDirection.x * sinYaw + inputDirection.z * cosYaw;
              
              const worldDirection = new Vector3(worldX, 0, worldZ).normalize();
              
              // 4. Define a velocidade alvo
              targetVelocity = worldDirection.multiplyScalar(BASE_PLAYER_SPEED);
          }

          // Processa Disparo (lógica separada do movimento)
          if (keys.Fire) {
            const yaw = this.lookYaw;
            const pitch = this.lookPitch;
            const x = -Math.sin(yaw) * Math.cos(pitch);
            const y = Math.sin(pitch);
            const z = -Math.cos(yaw) * Math.cos(pitch);
            const fireDirection = new Vector3(x, y, z).normalize();
            const projectileData = this.fireWeapon(fireDirection);
            if (projectileData) {
                this.emitEvent('projectileFired', projectileData);
            }
          }

          // Atualiza sequência processada e limpa inputs antigos
          this.lastProcessedInputSequence = input.sequence;
          this.lastProcessedInputTime = Date.now();
          this.pendingInputs = this.pendingInputs.filter(inp => inp.sequence > this.lastProcessedInputSequence);

      } else {
          // Sem input novo, targetVelocity continua zero
          // Limpa inputs antigos (se houver)
           this.pendingInputs = this.pendingInputs.filter(input => input.sequence > this.lastProcessedInputSequence);
      }

      // --- Aplicação de Aceleração e Atrito (Exponencial) ---
      const K_ACCEL = PLAYER_ACCELERATION; // Fator de aceleração (quão rápido atinge a meta)
      const K_FRICTION = PLAYER_FRICTION;  // Fator de atrito

      if (hasMovementInput) {
          // Interpola exponencialmente para a velocidade alvo
          const alpha = 1 - Math.exp(-K_ACCEL * serverDeltaTime);
          this.velocity.lerp(targetVelocity, alpha);
      } else {
          // Interpola exponencialmente para velocidade zero (atrito)
          const alpha = 1 - Math.exp(-K_FRICTION * serverDeltaTime);
          this.velocity.lerp(Vector3.ZERO, alpha);

          // Se a velocidade ficar muito pequena, zera completamente
          if (this.velocity.magnitudeSq() < MIN_SPEED_THRESHOLD * MIN_SPEED_THRESHOLD) {
              this.velocity.zero();
          }
      }
      // --- Fim Aceleração/Atrito ---
  }

  /**
   * Emite um evento (placeholder).
   * @param {string} eventName
   * @param {any} data
   */
  emitEvent(eventName, data) {
        if (global.eventEmitter) {
            global.eventEmitter.emit(eventName, data);
        } else {
            warn(`[ServerPlayer ${this.id}] Event emitter not available for event: ${eventName}`);
        }
    }
}