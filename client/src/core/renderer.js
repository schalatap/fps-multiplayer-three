import * as THREE from 'three';
import { log, warn } from '../../../shared/utils/logger.js';
import gameMap from '../../../shared/gameplay/world/map.js'; // Importar para pegar limites
import { PLAYER_EYE_HEIGHT } from '../../../shared/constants/game-settings.js'; // Importar a constante unificada
import { createWeaponMesh } from '../generation/weapon-model-generator.js';
import { NetworkManager } from '../network/network-manager.js'; // Importar para obter ID local

const IMPACT_EFFECT_DURATION_MS = 500; // Duração do efeito em milissegundos
const IMPACT_EFFECT_SIZE = 0.3;
// Cores para diferentes tipos de superfície
const IMPACT_COLORS = {
    player: 0xff4444,   // Vermelho para impacto em jogador
    static: 0xcccccc,   // Cinza para superfície genérica
    box: 0x9d6a3f,      // Marrom para caixas
    tree: 0x44aa44,     // Verde para árvores
    ramp: 0xaaaaaa,     // Cinza claro para rampas
    ground: 0x8b4513    // Marrom escuro para chão (cor de terra)
};

// --- Constantes para Camera ADS ---
const CAMERA_NORMAL_FOV = 75;
const CAMERA_AIM_FOV = 60; // FOV menor para zoom ao mirar
const CAMERA_FOV_LERP_SPEED = 10; // Velocidade de interpolação do FOV

// --- Offset de Mira (para estilo Counter Strike) ---
const CAMERA_FORWARD_OFFSET = 0.2; // Câmera ligeiramente à frente do personagem
const CAMERA_AIM_OFFSET = new THREE.Vector3(0, -0.05, 0.3); // Posicionamento quando mirando

const CAMERA_POS_LERP_SPEED = 12; // Velocidade de interpolação da posição

// --- Partes do corpo a serem ocultadas em primeira pessoa ---
const FIRST_PERSON_HIDDEN_PARTS = ['head', 'torso', 'back'];

export class Renderer {
    /** @type {THREE.Scene} */
    scene;
    /** @type {THREE.PerspectiveCamera} */
    camera;
    /** @type {THREE.WebGLRenderer} */
    webGLRenderer;
    /** @type {HTMLElement} */
    container;
    /** @type {THREE.DirectionalLight} */ // Guardar referência à luz
    directionalLight;
    /** @type {import('../gameplay/client-world.js').ClientWorld | null} */
    clientWorld;
    /** @type {Array<{mesh: THREE.Object3D, removeAt: number}>} */
    activeImpactEffects = [];
    /** @type {number} */
    targetFov = CAMERA_NORMAL_FOV;
    /** @type {THREE.Vector3} */
    targetCameraOffset = new THREE.Vector3(0, 0, 0); // Offset ADICIONAL da câmera (para ADS)
    /** @type {THREE.Vector3} */
    currentCameraOffset = new THREE.Vector3(0, 0, 0); // Offset atual interpolado

    /**
     * Guarda o ID do mesh do jogador local para controle de visibilidade.
     * @type {string | null}
     * @private
     */
    _localPlayerMeshId = null;

    /**
     * Cria uma instância do Renderer.
     * @param {HTMLElement} containerElement - Elemento DOM para renderização.
     * @param {import('../gameplay/client-world.js').ClientWorld} clientWorldInstance - Instância do mundo cliente.
     */
    constructor(containerElement, clientWorldInstance) {
        if (!containerElement) throw new Error("Renderer requires a valid container element.");
        if (!clientWorldInstance) throw new Error("Renderer requires a ClientWorld instance.");
        
        this.container = containerElement;
        this.clientWorld = clientWorldInstance;
        this.activeImpactEffects = [];
        
        this.initializeScene();
        this.initializeCamera();
        this.initializeRenderer();
        this.initializeLights();
        this.setupResizeListener();
        
        log('[CLIENT] Renderer initialized with ClientWorld.');
    }

    initializeScene() {
        this.scene = new THREE.Scene();
        // Fundo azul claro (skybox seria melhor no futuro)
        this.scene.background = new THREE.Color(0x87CEEB);
        // Ajusta a névoa para a nova escala do mapa
        this.scene.fog = new THREE.Fog(0xaaaaaa, 30, 150); // Começa mais longe, vai mais longe
    }

    initializeCamera() {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(CAMERA_NORMAL_FOV, aspect, 0.1, 1000);
        this.camera.rotation.order = 'YXZ';
        this.camera.position.set(0, 1.7, 0); // Posição inicial pode precisar de ajuste
        this.camera.lookAt(0, 1.7, -1);
    }

    initializeRenderer() {
        this.webGLRenderer = new THREE.WebGLRenderer({ antialias: true });
        this.webGLRenderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.webGLRenderer.setPixelRatio(window.devicePixelRatio);
        this.webGLRenderer.shadowMap.enabled = true;
        this.webGLRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.webGLRenderer.domElement);
    }

    initializeLights() {
        const ambientLight = new THREE.AmbientLight(0x606060, 1.5); // Aumenta um pouco a ambiente
        this.scene.add(ambientLight);

        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // Aumenta um pouco
        this.directionalLight.position.set(50, 80, 60); // Posição mais alta e distante
        this.directionalLight.target.position.set(0, 0, 0);

        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048; // Aumenta resolução da sombra
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 10; // Ajusta near/far
        this.directionalLight.shadow.camera.far = 200;

        // *** AJUSTE CRÍTICO PARA MAPA MAIOR ***
        // Calcula o frustum da câmera de sombra para cobrir os limites do mapa
        const bounds = gameMap.getBounds();
        const shadowCamSizeX = (bounds.max.x - bounds.min.x) / 2 + 10; // Metade da largura + margem
        const shadowCamSizeZ = (bounds.max.z - bounds.min.z) / 2 + 10; // Metade da profundidade + margem
        this.directionalLight.shadow.camera.left = -shadowCamSizeX;
        this.directionalLight.shadow.camera.right = shadowCamSizeX;
        this.directionalLight.shadow.camera.top = shadowCamSizeZ; // Eixo Z do mundo mapeia para Top/Bottom da sombra
        this.directionalLight.shadow.camera.bottom = -shadowCamSizeZ;
        // Atualiza a matriz de projeção da câmera de sombra
        this.directionalLight.shadow.camera.updateProjectionMatrix();
        // *** FIM DO AJUSTE ***

        this.scene.add(this.directionalLight);
        this.scene.add(this.directionalLight.target);
    }

    /**
     * Configura o listener para redimensionamento da janela.
     */
    setupResizeListener() {
        window.addEventListener('resize', this.updateSize.bind(this), false);
    }

    /**
     * Atualiza o tamanho do renderizador e o aspect ratio da câmera
     * quando a janela é redimensionada.
     */
    updateSize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        if (width === 0 || height === 0) return; // Evita erros se o container estiver oculto

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.webGLRenderer.setSize(width, height);
        this.webGLRenderer.setPixelRatio(window.devicePixelRatio); // Atualiza pixel ratio se mudar
        log('[CLIENT] Renderer size updated.');
    }

    /**
     * Renderiza a cena a partir da perspectiva da câmera.
     */
    render() {
        this.processImpactEvents();
        this.updateImpactEffects();

        // --- FPS: Ocultar seletivamente partes do jogador local ---
        const localPlayerId = NetworkManager.getLocalPlayerId();
        if (localPlayerId) {
            // Guarda o ID se ainda não tivermos
            if (!this._localPlayerMeshId) {
                const localPlayerEntity = this.clientWorld?.getPlayer(localPlayerId);
                if (localPlayerEntity?.mesh) {
                    this._localPlayerMeshId = localPlayerEntity.mesh.uuid; // Usar UUID do mesh
                    
                    // Configurar visibilidade inicial das partes
                    this.configureLocalPlayerVisibility(localPlayerEntity.mesh);
                }
            } else {
                // Atualizar visibilidade conforme necessário
                const localPlayerMesh = this.scene.getObjectByProperty('uuid', this._localPlayerMeshId);
                if (localPlayerMesh) {
                    this.updateLocalPlayerVisibility(localPlayerMesh);
                }
            }
        }

        this.webGLRenderer.render(this.scene, this.camera);
    }

    /**
     * Configura a visibilidade inicial das partes do corpo do jogador local para primeira pessoa.
     * @param {THREE.Object3D} playerMesh - O mesh do jogador local
     */
    configureLocalPlayerVisibility(playerMesh) {
        if (!playerMesh) return;
        
        // Percorre recursivamente todos os filhos do mesh
        playerMesh.traverse((child) => {
            if (child.userData && child.userData.bodyPart) {
                // Ocultar partes específicas do corpo para vista em primeira pessoa
                const shouldHide = FIRST_PERSON_HIDDEN_PARTS.some(part => 
                    child.userData.bodyPart.includes(part));
                
                if (shouldHide) {
                    child.visible = false;
                }
            }
        });
        
        log('[CLIENT] First-person view configured - selective body part visibility.');
    }

    /**
     * Atualiza a visibilidade das partes do corpo do jogador local baseado na rotação da câmera.
     * Por exemplo, pode ocultar braços se olhar muito para cima.
     * @param {THREE.Object3D} playerMesh - O mesh do jogador local
     */
    updateLocalPlayerVisibility(playerMesh) {
        // Aqui poderíamos implementar lógica adicional para ajustar a visibilidade
        // de certas partes dependendo do pitch da câmera, por exemplo
    }

    /**
     * Processa a fila de eventos de impacto do ClientWorld.
     */
    processImpactEvents() {
        if (!this.clientWorld) return;

        const impactEvents = this.clientWorld.getAndClearImpactEvents();
        if (impactEvents.length > 0) {
            for (const event of impactEvents) {
                this.createImpactEffect(event.id, event.position, event.surfaceType, event.obstacleType);
            }
        }
    }

    /**
     * Atualiza os efeitos visuais de impacto ativos, removendo os expirados.
     */
    updateImpactEffects() {
        const now = Date.now();
        let i = this.activeImpactEffects.length;
        
        // Iterar de trás para frente para remover elementos com segurança
        while (i--) {
            const effect = this.activeImpactEffects[i];
            if (now >= effect.removeAt) {
                // Remover da cena
                this.scene.remove(effect.mesh);
                
                // Limpar recursos
                if (effect.mesh.material) {
                    if (Array.isArray(effect.mesh.material)) {
                        effect.mesh.material.forEach(m => m.dispose());
                    } else {
                        effect.mesh.material.dispose();
                    }
                }
                
                // Remover do array
                this.activeImpactEffects.splice(i, 1);
            }
        }
    }

    /**
     * Cria um efeito visual de impacto.
     * @param {string} id - ID único do efeito
     * @param {number[]} position - Posição [x,y,z] do impacto
     * @param {string} surfaceType - Tipo de superfície ('player' ou 'static')
     * @param {string|null} obstacleType - Tipo de obstáculo (se aplicável)
     */
    createImpactEffect(id, position, surfaceType, obstacleType) {
        // Determinar a cor do efeito baseado no tipo de superfície/obstáculo
        let color;
        if (surfaceType === 'player') {
            color = IMPACT_COLORS.player;
        } else if (obstacleType === 'ground') { // Verifica especificamente impacto no chão
            color = IMPACT_COLORS.ground;
        } else if (obstacleType && IMPACT_COLORS[obstacleType]) {
            color = IMPACT_COLORS[obstacleType];
        } else {
            color = IMPACT_COLORS.static;
        }
        
        // Criar a geometria do efeito (uma pequena esfera)
        const geometry = new THREE.SphereGeometry(IMPACT_EFFECT_SIZE, 8, 8);
        
        // Criar o material com a cor determinada
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8
        });
        
        // Criar o mesh e posicioná-lo
        const effectMesh = new THREE.Mesh(geometry, material);
        effectMesh.position.set(position[0], position[1], position[2]);
        effectMesh.name = `impact_${id}`;
        
        // Adicionar à cena
        this.scene.add(effectMesh);
        
        // Registrar para remoção futura
        this.activeImpactEffects.push({
            mesh: effectMesh,
            removeAt: Date.now() + IMPACT_EFFECT_DURATION_MS
        });
        
        // Adicionar animação de fade-out
        this.animateImpactEffect(material);
    }
    
    /**
     * Anima o efeito de impacto com um fade-out gradual.
     * @param {THREE.Material} material - Material do efeito a ser animado
     */
    animateImpactEffect(material) {
        const startOpacity = material.opacity;
        const startTime = Date.now();
        const fadeDuration = IMPACT_EFFECT_DURATION_MS;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(1, elapsed / fadeDuration);
            
            // Reduzir a opacidade gradualmente
            material.opacity = startOpacity * (1 - progress);
            
            // Continuar a animação enquanto não estiver completa
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        // Iniciar a animação
        requestAnimationFrame(animate);
    }

    /**
     * Atualiza a posição e rotação da câmera para visão em primeira pessoa.
     * @param {import('../gameplay/client-player.js').ClientPlayer | null | undefined} localPlayer
     * @param {import('./input-controller.js').InputController | null} inputController
     */
    updateCamera(localPlayer, inputController) {
        if (!inputController) return;

        // --- Rotação da Câmera ---
        // Diretamente do input controller. Ordem YXZ é crucial.
        this.camera.rotation.y = inputController.getYaw();   // Rotação horizontal
        this.camera.rotation.x = inputController.getPitch(); // Rotação vertical
        this.camera.rotation.z = 0;                          // Roll sempre zero

        // --- Posição Base da Câmera ---
        const cameraBasePosition = new THREE.Vector3();
        if (localPlayer) {
            // Posição dos "olhos" do jogador
            cameraBasePosition.copy(localPlayer.position);
            cameraBasePosition.y += PLAYER_EYE_HEIGHT;
            
            // Adicionar offset para frente (estilo CS)
            const forwardVector = new THREE.Vector3(0, 0, -CAMERA_FORWARD_OFFSET);
            forwardVector.applyQuaternion(this.camera.quaternion);
            cameraBasePosition.add(forwardVector);
        } else {
            // Posição padrão se não houver jogador (ex: carregando)
            cameraBasePosition.set(0, 5, 10);
        }

        // --- FOV e Offset (ADS) ---
        const isAiming = localPlayer ? localPlayer.isAiming : false;
        this.targetFov = isAiming ? CAMERA_AIM_FOV : CAMERA_NORMAL_FOV;
        
        // Quando estiver mirando, aplica offset adicional (arma mais centralizada)
        const targetOffsetLocal = isAiming ? CAMERA_AIM_OFFSET : new THREE.Vector3(0, 0, 0);

        // Interpolar FOV
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.targetFov, CAMERA_FOV_LERP_SPEED * 0.016);
        this.camera.updateProjectionMatrix();

        // Interpolar Offset Local da Câmera
        this.currentCameraOffset.lerp(targetOffsetLocal, CAMERA_POS_LERP_SPEED * 0.016);

        // Calcular a posição final da câmera: Base + Offset Local transformado para World
        const finalCameraPosition = cameraBasePosition.clone();
        const worldOffset = this.currentCameraOffset.clone();
        worldOffset.applyQuaternion(this.camera.quaternion);
        finalCameraPosition.add(worldOffset);

        // Aplicar posição final à câmera
        this.camera.position.copy(finalCameraPosition);
    }

    /**
     * Limpa recursos ao descartar o renderer.
     */
    dispose() {
        window.removeEventListener('resize', this.updateSize.bind(this));
        
        // Limpar efeitos de impacto restantes
        this.activeImpactEffects.forEach(effect => {
            this.scene.remove(effect.mesh);
            effect.mesh.geometry?.dispose();
            if (Array.isArray(effect.mesh.material)) {
                effect.mesh.material.forEach(m => m.dispose());
            } else {
                effect.mesh.material?.dispose();
            }
        });
        this.activeImpactEffects = [];

        // Limpar cena de forma mais robusta
        while(this.scene.children.length > 0){
             const child = this.scene.children[0];
             this.scene.remove(child);
             // Tentar limpar geometria/material se for Mesh
             if (child instanceof THREE.Mesh) {
                 child.geometry?.dispose();
                 if (Array.isArray(child.material)) {
                     child.material.forEach(m => m.dispose());
                 } else {
                     child.material?.dispose();
                 }
             }
        }

        if (this.webGLRenderer) {
            this.container.removeChild(this.webGLRenderer.domElement);
            this.webGLRenderer.dispose();
        }
        log('[CLIENT] Renderer disposed.');
    }
}