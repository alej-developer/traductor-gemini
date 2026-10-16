/**
 * Traductor Gemini Enterprise - 3D Forest Scene Engine
 * Arquitectura Three.js para renderizado de bosque profundo, niebla volumétrica,
 * haces de luz crepusculares (god rays), luciérnagas y hojas 3D interactivas.
 * Inspirado en la estética de One Page Love (Ivy Engine, Ambicular, Peaceful Panda).
 */

(function () {
  'use strict';

  // Si Three.js no está disponible en la ventana, salimos silenciosamente
  if (typeof THREE === 'undefined') {
    console.warn('Three.js no detectado. Modo visual 3D omitido.');
    return;
  }

  const canvas = document.getElementById('forestCanvas');
  if (!canvas) return;

  // Parámetros y Estado del Escenario
  const config = {
    fogColor: 0x070c09,
    treeCount: 52,
    sporeCount: 140,
    leafCount: 38,
    mistLayerCount: 5,
  };

  let scene, camera, renderer;
  let mouseX = 0, mouseY = 0;
  let targetCamX = 0, targetCamY = 0;
  let clock = new THREE.Clock();
  let windStrength = 1.0;
  let targetWindStrength = 1.0;

  // Grupos y Elementos 3D
  let treesGroup = new THREE.Group();
  let mistGroup = new THREE.Group();
  let lightRaysGroup = new THREE.Group();
  let sporesMesh;
  let leaves = [];

  /**
   * Genera textura procedural en canvas para niebla y partículas
   */
  function createSoftRadialTexture(colorHex, size = 128) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = size;
    tempCanvas.height = size;
    const ctx = tempCanvas.getContext('2d');

    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, colorHex);
    grad.addColorStop(0.3, colorHex.replace('1)', '0.5)'));
    grad.addColorStop(0.7, colorHex.replace('1)', '0.1)'));
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(tempCanvas);
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * Inicialización del renderizador y la escena 3D
   */
  function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(config.fogColor, 0.0022);

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 600);
    camera.position.set(0, 12, 50);

    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(config.fogColor, 0.95);

    // Luces
    const ambientLight = new THREE.AmbientLight(0x13261a, 1.4);
    scene.add(ambientLight);

    const moonLight = new THREE.DirectionalLight(0xdcf0e2, 1.1);
    moonLight.position.set(-60, 90, 40);
    scene.add(moonLight);

    const forestGlow = new THREE.PointLight(0x52b788, 1.5, 120);
    forestGlow.position.set(0, 15, -10);
    scene.add(forestGlow);

    // Construcción de capas del bosque
    buildTerrainAndTrees();
    buildLightRays();
    buildVolumetricMist();
    buildBioluminescentSpores();
    buildFallingLeaves();

    // Eventos de entrada
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    animate();
  }

  /**
   * Generación procedural de árboles de pino con varios niveles de copa
   */
  function buildTerrainAndTrees() {
    scene.add(treesGroup);

    // Geometrías reutilizables para optimización Draco / draw calls
    const trunkGeo = new THREE.CylinderGeometry(0.4, 0.7, 10, 5);
    const cone1Geo = new THREE.ConeGeometry(5.5, 9, 6);
    const cone2Geo = new THREE.ConeGeometry(4.2, 7.5, 6);
    const cone3Geo = new THREE.ConeGeometry(2.8, 6, 6);

    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x181410 });
    const pineColors = [0x0e2417, 0x143521, 0x1b432a, 0x225535, 0x193b26];

    for (let i = 0; i < config.treeCount; i++) {
      const tree = new THREE.Group();

      // Posición en abanico con profundidad de -60 a -320
      const x = (Math.random() - 0.5) * 360;
      const z = -60 - Math.random() * 260;
      const scale = 0.75 + Math.random() * 0.9;
      const y = -14 + Math.sin(x * 0.02) * 5;

      const folColor = pineColors[Math.floor(Math.random() * pineColors.length)];
      const folMat = new THREE.MeshLambertMaterial({
        color: folColor,
        flatShading: true,
      });

      // Tronco
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 5;
      tree.add(trunk);

      // Copas escalonadas
      const tier1 = new THREE.Mesh(cone1Geo, folMat);
      tier1.position.y = 10;
      tree.add(tier1);

      const tier2 = new THREE.Mesh(cone2Geo, folMat);
      tier2.position.y = 14.5;
      tree.add(tier2);

      const tier3 = new THREE.Mesh(cone3Geo, folMat);
      tier3.position.y = 18.5;
      tree.add(tier3);

      tree.position.set(x, y, z);
      tree.scale.set(scale, scale, scale);
      tree.rotation.y = Math.random() * Math.PI * 2;

      treesGroup.add(tree);
    }
  }

  /**
   * Haces de luz volumétrica (God Rays) inclinados
   */
  function buildLightRays() {
    scene.add(lightRaysGroup);

    const rayTexture = createSoftRadialTexture('rgba(235, 245, 225, 1)', 256);
    const rayMat = new THREE.MeshBasicMaterial({
      map: rayTexture,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    const rayGeo = new THREE.PlaneGeometry(16, 120);

    for (let i = 0; i < 6; i++) {
      const ray = new THREE.Mesh(rayGeo, rayMat);
      ray.position.set(-80 + i * 32, 28, -80 + (i % 3) * 20);
      ray.rotation.z = -0.42; // Inclinación natural de haz solar
      ray.rotation.y = 0.18;
      ray.userData = {
        baseOpacity: 0.07 + Math.random() * 0.08,
        pulseSpeed: 0.6 + Math.random() * 0.8,
        offset: Math.random() * Math.PI * 2,
      };
      lightRaysGroup.add(ray);
    }
  }

  /**
   * Planos horizontales de niebla volumétrica flotante
   */
  function buildVolumetricMist() {
    scene.add(mistGroup);

    const mistTexture = createSoftRadialTexture('rgba(150, 185, 160, 1)', 256);
    const mistMat = new THREE.MeshBasicMaterial({
      map: mistTexture,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
    });

    const mistGeo = new THREE.PlaneGeometry(140, 50);

    for (let i = 0; i < config.mistLayerCount; i++) {
      const mistPlane = new THREE.Mesh(mistGeo, mistMat);
      mistPlane.position.set((Math.random() - 0.5) * 160, 2 + i * 3, -40 - i * 45);
      mistPlane.rotation.x = 0;
      mistPlane.userData = {
        speed: 0.4 + i * 0.2,
        startX: mistPlane.position.x,
      };
      mistGroup.add(mistPlane);
    }
  }

  /**
   * Luciérnagas y esporas bioluminiscentes en suspensión
   */
  function buildBioluminescentSpores() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(config.sporeCount * 3);
    const originalPositions = new Float32Array(config.sporeCount * 3);
    const scales = new Float32Array(config.sporeCount);
    const phases = new Float32Array(config.sporeCount);

    for (let i = 0; i < config.sporeCount; i++) {
      const x = (Math.random() - 0.5) * 160;
      const y = Math.random() * 45 - 5;
      const z = 20 - Math.random() * 140;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      originalPositions[i * 3] = x;
      originalPositions[i * 3 + 1] = y;
      originalPositions[i * 3 + 2] = z;

      scales[i] = 1.0 + Math.random() * 2.2;
      phases[i] = Math.random() * Math.PI * 2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.userData = { originalPositions, phases, scales };

    const sporeTex = createSoftRadialTexture('rgba(212, 185, 130, 1)', 64);
    const mat = new THREE.PointsMaterial({
      map: sporeTex,
      size: 3.2,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0x95d5b2,
    });

    sporesMesh = new THREE.Points(geo, mat);
    scene.add(sporesMesh);
  }

  /**
   * Hojas de otoño y coníferas cayendo con física 3D
   */
  function buildFallingLeaves() {
    // Geometría curva tipo hoja
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, 0);
    leafShape.quadraticCurveTo(0.9, 1.2, 0, 2.5);
    leafShape.quadraticCurveTo(-0.9, 1.2, 0, 0);

    const leafGeo = new THREE.ShapeGeometry(leafShape);
    leafGeo.center();

    const leafColors = [0xc18c5d, 0x8a6240, 0x588157, 0xa3b18a, 0x344e41];

    for (let i = 0; i < config.leafCount; i++) {
      const color = leafColors[i % leafColors.length];
      const mat = new THREE.MeshLambertMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });

      const leaf = new THREE.Mesh(leafGeo, mat);
      resetLeaf(leaf, true);
      scene.add(leaf);
      leaves.push(leaf);
    }
  }

  function resetLeaf(leaf, initial = false) {
    leaf.position.x = (Math.random() - 0.5) * 110;
    leaf.position.y = initial ? Math.random() * 60 - 5 : 45 + Math.random() * 15;
    leaf.position.z = 25 - Math.random() * 85;

    leaf.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    const scale = 0.6 + Math.random() * 0.7;
    leaf.scale.set(scale, scale, scale);

    leaf.userData = {
      fallSpeed: 0.08 + Math.random() * 0.07,
      swaySpeed: 1.2 + Math.random() * 1.5,
      rotSpeedX: (Math.random() - 0.5) * 0.04,
      rotSpeedY: (Math.random() - 0.5) * 0.05,
      rotSpeedZ: (Math.random() - 0.5) * 0.03,
      swayAmp: 0.15 + Math.random() * 0.2,
      phase: Math.random() * Math.PI * 2,
    };
  }

  function onMouseMove(e) {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    targetCamX = mouseX * 18;
    targetCamY = 12 + mouseY * 8;
  }

  function onTouchMove(e) {
    if (e.touches.length > 0) {
      mouseX = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
      targetCamX = mouseX * 14;
      targetCamY = 12 + mouseY * 6;
    }
  }

  function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * Bucle principal de animación 60/120 FPS
   */
  function animate() {
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();
    const delta = clock.getDelta();

    // Rampa suave de fuerza de viento
    windStrength += (targetWindStrength - windStrength) * 0.04;

    // Movimiento de cámara suave con amortiguación
    camera.position.x += (targetCamX - camera.position.x) * 0.035;
    camera.position.y += (targetCamY - camera.position.y) * 0.035;
    camera.lookAt(0, 8, -60);

    // Animación de haces de luz crepusculares
    lightRaysGroup.children.forEach((ray) => {
      const u = ray.userData;
      ray.material.opacity = u.baseOpacity + Math.sin(time * u.pulseSpeed + u.offset) * 0.04;
      ray.position.x += Math.sin(time * 0.2 + u.offset) * 0.02 * windStrength;
    });

    // Desplazamiento de niebla volumétrica
    mistGroup.children.forEach((mist) => {
      mist.position.x += 0.04 * mist.userData.speed * windStrength;
      if (mist.position.x > 120) {
        mist.position.x = -120;
      }
    });

    // Suspensión y brillo de esporas bioluminiscentes
    if (sporesMesh) {
      const pos = sporesMesh.geometry.attributes.position.array;
      const orig = sporesMesh.geometry.userData.originalPositions;
      const phases = sporesMesh.geometry.userData.phases;

      for (let i = 0; i < config.sporeCount; i++) {
        const idx = i * 3;
        const p = phases[i];

        // Deriva orgánica con funciones senoidales
        pos[idx] = orig[idx] + Math.sin(time * 0.6 + p) * 3.5;
        pos[idx + 1] = orig[idx + 1] + Math.cos(time * 0.8 + p) * 2.2;
        pos[idx + 2] = orig[idx + 2] + Math.sin(time * 0.4 + p * 1.5) * 2.0;

        // Viento empuja sutilmente
        pos[idx] += (windStrength - 1.0) * 0.3;
      }
      sporesMesh.geometry.attributes.position.needsUpdate = true;
    }

    // Física de caída de hojas 3D
    leaves.forEach((leaf) => {
      const u = leaf.userData;

      leaf.position.y -= u.fallSpeed * (1 + (windStrength - 1.0) * 1.5);
      leaf.position.x += (Math.sin(time * u.swaySpeed + u.phase) * u.swayAmp + (windStrength - 1.0) * 0.4);
      leaf.position.z += Math.cos(time * u.swaySpeed * 0.7 + u.phase) * (u.swayAmp * 0.5);

      leaf.rotation.x += u.rotSpeedX * windStrength;
      leaf.rotation.y += u.rotSpeedY * windStrength;
      leaf.rotation.z += u.rotSpeedZ * windStrength;

      if (leaf.position.y < -12) {
        resetLeaf(leaf, false);
      }
    });

    renderer.render(scene, camera);
  }

  // API Pública para interacciones de la aplicación
  window.ForestScene = {
    triggerGust: function (strength = 2.4, duration = 3000) {
      targetWindStrength = strength;
      setTimeout(() => {
        targetWindStrength = 1.0;
      }, duration);
    },
  };

  // Inicialización al cargar el DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
