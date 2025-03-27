import * as THREE from 'three';
import { log, warn } from '../../../shared/utils/logger.js';
import gameMap from '../../../shared/gameplay/world/map.js'; // Importar para pegar limites
import { PLAYER_EYE_HEIGHT } from '../../../shared/constants/game-settings.js'; // Importar a constante unificada
import { createWeaponMesh } from '../generation/weapon-model-generator.js';

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
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.camera.rotation.order = 'YXZ';
        this.camera.position.set(0, 5, 10); // Posição inicial pode precisar de ajuste
        this.camera.lookAt(0, 0, 0);
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

        // --- Helpers (Descomentar para Debug) ---
        // const lightHelper = new THREE.DirectionalLightHelper(this.directionalLight, 10);
        // this.scene.add(lightHelper);
        // const shadowCameraHelper = new THREE.CameraHelper(this.directionalLight.shadow.camera);
        // this.scene.add(shadowCameraHelper);
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
        // Processar eventos de impacto antes de renderizar
        this.processImpactEvents();
        
        // Atualizar efeitos existentes 
        this.updateImpactEffects();
        
        // Renderizar a cena
        this.webGLRenderer.render(this.scene, this.camera);
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
     * Atualiza a posição e rotação da câmera.
     * @param {import('../gameplay/client-player.js').ClientPlayer | null} localPlayer
     * @param {import('./input-controller.js').InputController} inputController
     */
    updateCamera(localPlayer, inputController) {
        if (!inputController) return; // Não faz nada se não houver input controller

        if (!localPlayer) {
            // Se não há jogador local (ex: ainda conectando), usa uma visão padrão
            this.camera.position.set(0, 5, 10);
            this.camera.lookAt(0, 0, 0);
            // Garante que a rotação padrão seja aplicada
            this.camera.rotation.set(0, 0, 0);
            this.camera.rotation.order = 'YXZ'; // Mantém a ordem correta
            return;
        }

        // --- Atualizar Rotação da Câmera ---
        const yaw = inputController.getYaw();   // Rotação horizontal
        const pitch = inputController.getPitch(); // Rotação vertical (limitada no InputController)

        // Aplica a rotação à câmera (YXZ order)
        this.camera.rotation.y = yaw;   // Gira horizontalmente
        this.camera.rotation.x = pitch; // Gira verticalmente

        // --- Atualizar Posição da Câmera ---
        // Copia a posição base do jogador
        this.camera.position.copy(localPlayer.position);
        // Adiciona o offset da altura dos olhos usando a constante importada
        this.camera.position.y += PLAYER_EYE_HEIGHT;

        // A direção para onde a câmera olha é determinada pela sua rotação.
    }

    /**
     * Limpa recursos ao descartar o renderer.
     */
    dispose() {
        window.removeEventListener('resize', this.updateSize.bind(this));
        if (this.webGLRenderer) {
            this.container.removeChild(this.webGLRenderer.domElement);
            this.webGLRenderer.dispose(); // Libera recursos WebGL
        }
        // Limpar cena (dispose de geometrias/materiais se necessário)
        log('[CLIENT] Renderer disposed.');
    }
}