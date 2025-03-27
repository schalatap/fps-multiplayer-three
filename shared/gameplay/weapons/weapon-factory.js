import { Pistol } from './pistol.js';
import { log, warn } from '../../utils/logger.js';
// Importar outras classes de armas aqui quando forem criadas
// import { Rifle } from './rifle.js';
// import { Shotgun } from './shotgun.js';

/**
 * Fábrica responsável por criar instâncias de diferentes tipos de armas.
 */
export class WeaponFactory {

    /**
     * Cria uma instância de uma arma com base no tipo especificado.
     * @param {string} weaponType - O tipo da arma a ser criada (ex: 'pistol', 'rifle').
     * @param {import('../../entities/player.js').Player} owner - O jogador que possuirá a arma.
     * @returns {import('./weapon.js').Weapon | null} A instância da arma criada ou null se o tipo for inválido.
     */
    createWeapon(weaponType, owner) {
        log(`WeaponFactory attempting to create weapon of type: ${weaponType} for owner ${owner?.id}`);

        if (!owner) {
            warn(`WeaponFactory: Cannot create weapon without an owner.`);
            return null;
        }

        switch (weaponType?.toLowerCase()) {
            case 'pistol':
                return new Pistol(owner);
            // case 'rifle':
            //     return new Rifle(owner);
            // case 'shotgun':
            //     return new Shotgun(owner);
            default:
                warn(`WeaponFactory: Unknown weapon type requested: ${weaponType}`);
                return null;
        }
    }
}