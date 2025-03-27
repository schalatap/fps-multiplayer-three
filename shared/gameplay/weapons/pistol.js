import { Weapon } from './weapon.js';
import { Vector3 } from '../../physics/vector.js';
import { log } from '../../utils/logger.js';
import {
    PISTOL_DAMAGE,
    PISTOL_FIRE_RATE,
    PISTOL_RANGE,
    PISTOL_PROJECTILE_SPEED,
    PISTOL_AMMO,
    PISTOL_RELOAD_TIME,
    PISTOL_PROJECTILE_SIZE
} from '../../constants/weapon-stats.js';
import { PLAYER_EYE_HEIGHT } from '../../constants/game-settings.js'; // Importar a constante unificada

/**
 * Implementação da arma Pistola.
 */
export class Pistol extends Weapon {
    /**
     * @param {import('../../entities/player.js').Player} owner
     */
    constructor(owner) {
        super(owner); // Chama o construtor da classe Weapon

        // Define as estatísticas específicas da pistola
        this.damage = PISTOL_DAMAGE;
        this.fireRate = PISTOL_FIRE_RATE;
        this.range = PISTOL_RANGE;
        this.projectileSpeed = PISTOL_PROJECTILE_SPEED;
        this.ammo = PISTOL_AMMO;
        this.maxAmmo = PISTOL_AMMO; // Assumindo que começa cheio
        this.reloadTime = PISTOL_RELOAD_TIME;

        // Recalcula o intervalo com base no fireRate específico
        this.fireInterval = 1000 / this.fireRate;

        log(`Pistol created for player ${owner.id}. Fire rate: ${this.fireRate} shots/s`);
    }

    /**
     * Tenta disparar a pistola.
     * Retorna os dados para criar um projétil no servidor se o tiro for válido.
     * @param {Vector3} direction - Direção normalizada do tiro.
     * @returns {object | null} Dados do projétil ou null.
     */
    fire(direction) {
        if (!this.canFire()) {
            return null; // Não pode atirar (cooldown, recarregando, sem munição)
        }

        // Atualiza o timestamp do último tiro
        this.lastFireTime = Date.now();

        // Deduz munição (se não for infinita)
        if (this.maxAmmo !== Infinity) {
            this.ammo--;
            log(`Player ${this.owner.id} fired Pistol. Ammo left: ${this.ammo}`);
            // Iniciar recarga se ficar sem munição
            if (this.ammo <= 0) {
                this.startReload();
            }
        } else {
            // log(`Player ${this.owner.id} fired Pistol.`);
        }

        // --- Calcular dados do Projétil ---
        // 1. Origem: Posição *base* do jogador + altura dos olhos.
        //    Isso aproxima a posição da câmera do cliente.
        const origin = this.owner.position.clone()
                         .add(new Vector3(0, PLAYER_EYE_HEIGHT, 0)); // Usa a constante importada

        // 2. Velocidade: Direção * velocidade do projétil
        const velocity = direction.clone().multiplyScalar(this.projectileSpeed);

        // Retorna os dados necessários para o GameStateManager criar o projétil
        return {
            type: 'pistol_bullet', // Identificador do tipo de projétil
            ownerId: this.owner.id,
            origin: { x: origin.x, y: origin.y, z: origin.z }, // Serializa como objeto simples
            velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
            damage: this.damage,
            speed: this.projectileSpeed,
            range: this.range,
            size: PISTOL_PROJECTILE_SIZE // Pode ser usado para a bounding box
        };
    }

    // update(deltaTime) {
    //     super.update(deltaTime); // Chama o update da arma base (para recarga, etc.)
    // }
}