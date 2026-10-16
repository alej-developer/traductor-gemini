/**
 * Traductor del Bosque - Escena 3D Natural y Viva
 * Renderizado orgánico mediante Three.js: niebla de montaña volumétrica,
 * siluetas de coníferas estratificadas, ramas colgantes con balanceo del viento,
 * haces de luz natural crepusculares, luciérnagas doradas y hojas otoñales con aerodinámica real.
 * Diseñado con estética pictórica de documental botánico (sin polígonos sintéticos ni estilo robótico).
 */

(function () {
  'use strict';

  if (typeof THREE === 'undefined') {
    return;
  }

  const canvas = document.getElementById('forestCanvas');
  if (!canvas) return;

  const config = {
    skyColor: 0x09120c,
    fogColor: 0x0c1710,
    treeCount: 65,
    fireflyCount: 120,
    leafCount: 42,
    mistLayerCount: 7,
  };

  let scene, camera, renderer;
  let mouseX = 0, mouseY = 0;
  let targetCamX = 0, targetCamY = 0;
  const clock = new THREE.Clock();
  let windStrength = 1.0;
  let targetWindStrength = 1.0;

  const forestGroup = new THREE.Group();
  const canopyForeground = new THREE.Group();
  const mistGroup = new THREE.Group();
  const lightRaysGroup = new THREE.Group();
  let firefliesMesh;
  const leaves = [];

  /**
   * Genera textura procedural de vapor orgánico o destello suave
   */
  function createOrganicSoftTexture(colorRgba, size = 256) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = size;
    tempCanvas.height = size;
    const ctx = tempCanvas.getContext('2d');

    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, colorRgba);
    grad.addColorStop(0.25, colorRgba.replace(/[\d\.]+\)$/, '0.45)'));
    grad.addColorStop(0.65, colorRgba.replace(/[\d\.]+\)$/, '0.12)'));
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(tempCanvas);
    texture.needsUpdate = true;
    return texture;
  }

  function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(config.fogColor, 0.0028);

    camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.5, 500);
    camera.position.set(0, 10, 48);

    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(config.skyColor, 1);

    // Iluminación natural: luz suave de cielo y sol filtrado
    const ambientLight = new THREE.AmbientLight(0x192d20, 1.6);
    scene.add(ambientLight);

    const sunBeam = new THREE.DirectionalLight(0xf4ebd9, 1.4);
    sunBeam.position.set(-50, 80, 30);
    scene.add(sunBeam);

    const warmGroundBounce = new THREE.PointLight(0xbfa57d, 1.0, 90);
    warmGroundBounce.position.set(0, 8, -5);
    scene.add(warmGroundBounce);

    // Construcción del paisaje natural
    buildMountainRidges();
    buildOrganicForest();
    buildForegroundCanopy();
    buildVolumetricSunbeams();
    buildAtmosphericMist();
    buildFireflies();
    buildFallingLeaves();

    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    animate();
  }

  /**
   * Crestas montañosas lejanas con degradado aéreo
   */
  function buildMountainRidges() {
    const ridgeMat = new THREE.MeshBasicMaterial({
      color: 0x070e0a,
      transparent: true,
      opacity: 0.85,
    });

    for (let r = 0; r < 3; r++) {
      const shape = new THREE.Shape();
      shape.moveTo(-300, -30);
      for (let x = -300; x <= 300; x += 30) {
        const h = Math.sin(x * 0.015 + r * 1.8) * 16 + Math.cos(x * 0.03) * 8 + (2 - r) * 14;
        shape.lineTo(x, h);
      }
      shape.lineTo(300, -30);
      shape.closePath();

      const geo = new THREE.ShapeGeometry(shape);
      const mesh = new THREE.Mesh(geo, ridgeMat);
      mesh.position.set(0, 5 + r * 6, -220 - r * 60);
      scene.add(mesh);
    }
  }

  /**
   * Bosque orgánico de abetos y coníferas con copas estratificadas
   */
  function buildOrganicForest() {
    scene.add(forestGroup);

    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.65, 14, 6);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x14100c });

    const foliageColors = [
      0x0f2316, 0x142c1c, 0x193724, 0x1f422c, 0x173421, 0x244c33
    ];

    for (let i = 0; i < config.treeCount; i++) {
      const tree = new THREE.Group();

      const x = (Math.random() - 0.5) * 340;
      const z = -45 - Math.random() * 210;
      const scale = 0.7 + Math.random() * 0.85;
      const y = -12 + Math.sin(x * 0.02) * 4;

      // Tronco
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 7;
      tree.add(trunk);

      // Follaje orgánico en capas escalonadas con pequeñas variaciones
      const baseColor = foliageColors[Math.floor(Math.random() * foliageColors.length)];
      const folMat = new THREE.MeshLambertMaterial({
        color: baseColor,
        flatShading: true,
      });

      const tiers = 4 + Math.floor(Math.random() * 2);
      for (let t = 0; t < tiers; t++) {
        const radius = 5.2 * (1 - t * 0.16);
        const height = 5.5 - t * 0.5;
        const coneGeo = new THREE.ConeGeometry(radius, height, 7);
        const cone = new THREE.Mesh(coneGeo, folMat);
        cone.position.y = 8 + t * 3.6;
        cone.rotation.y = Math.random() * Math.PI;
        cone.rotation.z = (Math.random() - 0.5) * 0.05; // Leve curvatura natural
        tree.add(cone);
      }

      tree.position.set(x, y, z);
      tree.scale.set(scale, scale, scale);
      tree.userData = {
        baseRotZ: (Math.random() - 0.5) * 0.04,
        swayOffset: Math.random() * Math.PI * 2,
        swaySpeed: 0.8 + Math.random() * 0.5,
      };

      forestGroup.add(tree);
    }
  }

  /**
   * Ramas y briznas colgantes en primer plano para enmarcar la vista
   */
  function buildForegroundCanopy() {
    scene.add(canopyForeground);

    const boughTexture = createOrganicSoftTexture('rgba(20, 42, 28, 0.95)', 256);
    const boughMat = new THREE.MeshBasicMaterial({
      map: boughTexture,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const boughGeo = new THREE.PlaneGeometry(35, 18);

    // Rama superior izquierda
    const boughLeft = new THREE.Mesh(boughGeo, boughMat);
    boughLeft.position.set(-28, 24, 25);
    boughLeft.rotation.z = -0.25;
    canopyForeground.add(boughLeft);

    // Rama superior derecha
    const boughRight = new THREE.Mesh(boughGeo, boughMat);
    boughRight.position.set(30, 25, 22);
    boughRight.rotation.z = 0.3;
    canopyForeground.add(boughRight);
  }

  /**
   * Haces de luz solar suave (God Rays)
   */
  function buildVolumetricSunbeams() {
    scene.add(lightRaysGroup);

    const rayTex = createOrganicSoftTexture('rgba(245, 235, 210, 1)', 256);
    const rayMat = new THREE.MeshBasicMaterial({
      map: rayTex,
      transparent: true,
      opacity: 0.09,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const rayGeo = new THREE.PlaneGeometry(18, 140);

    for (let i = 0; i < 5; i++) {
      const ray = new THREE.Mesh(rayGeo, rayMat);
      ray.position.set(-65 + i * 28, 30, -50 + (i % 3) * 15);
      ray.rotation.z = -0.44;
      ray.rotation.y = 0.15;
      ray.userData = {
        baseOpacity: 0.06 + Math.random() * 0.05,
        speed: 0.5 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
      };
      lightRaysGroup.add(ray);
    }
  }

  /**
   * Niebla de montaña y vapor forestal en múltiples estratos
   */
  function buildAtmosphericMist() {
    scene.add(mistGroup);

    const mistTex = createOrganicSoftTexture('rgba(160, 185, 170, 1)', 256);
    const mistMat = new THREE.MeshBasicMaterial({
      map: mistTex,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const mistGeo = new THREE.PlaneGeometry(160, 55);

    for (let i = 0; i < config.mistLayerCount; i++) {
      const plane = new THREE.Mesh(mistGeo, mistMat);
      plane.position.set((Math.random() - 0.5) * 140, 2 + i * 2.5, -30 - i * 35);
      plane.userData = {
        speed: 0.25 + i * 0.15,
      };
      mistGroup.add(plane);
    }
  }

  /**
   * Luciérnagas doradas con brillo de respiración orgánico
   */
  function buildFireflies() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(config.fireflyCount * 3);
    const originPos = new Float32Array(config.fireflyCount * 3);
    const phases = new Float32Array(config.fireflyCount);

    for (let i = 0; i < config.fireflyCount; i++) {
      const x = (Math.random() - 0.5) * 140;
      const y = Math.random() * 38 - 3;
      const z = 22 - Math.random() * 115;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      originPos[i * 3] = x;
      originPos[i * 3 + 1] = y;
      originPos[i * 3 + 2] = z;

      phases[i] = Math.random() * Math.PI * 2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.userData = { originPos, phases };

    const fireflyTex = createOrganicSoftTexture('rgba(240, 210, 140, 1)', 64);
    const mat = new THREE.PointsMaterial({
      map: fireflyTex,
      size: 3.6,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xf5d996, // Luz dorada cálida natural
    });

    firefliesMesh = new THREE.Points(geo, mat);
    scene.add(firefliesMesh);
  }

  /**
   * Hojas de otoño naturales cayendo con aerodinámica real
   */
  function buildFallingLeaves() {
    // Silueta de hoja orgánica con nervadura curva
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, -0.2);
    leafShape.bezierCurveTo(0.8, 0.6, 1.0, 1.8, 0, 2.6);
    leafShape.bezierCurveTo(-1.0, 1.8, -0.8, 0.6, 0, -0.2);

    const leafGeo = new THREE.ShapeGeometry(leafShape);
    leafGeo.center();

    // Paleta botánica cálida (ámbar, ocre, musgo, cobre y salvia)
    const rusticColors = [
      0xc47e48, 0xa35a34, 0xd4a373, 0x606c38, 0x8a9e5b, 0x3b5335
    ];

    for (let i = 0; i < config.leafCount; i++) {
      const color = rusticColors[i % rusticColors.length];
      const mat = new THREE.MeshLambertMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
      });

      const leaf = new THREE.Mesh(leafGeo, mat);
      resetLeaf(leaf, true);
      scene.add(leaf);
      leaves.push(leaf);
    }
  }

  function resetLeaf(leaf, initial = false) {
    leaf.position.x = (Math.random() - 0.5) * 110;
    leaf.position.y = initial ? Math.random() * 55 - 4 : 42 + Math.random() * 12;
    leaf.position.z = 24 - Math.random() * 75;

    leaf.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    const scale = 0.55 + Math.random() * 0.6;
    leaf.scale.set(scale, scale, scale);

    leaf.userData = {
      fallSpeed: 0.065 + Math.random() * 0.055,
      swayFreq: 1.1 + Math.random() * 1.3,
      swayAmp: 0.12 + Math.random() * 0.18,
      tumbleX: (Math.random() - 0.5) * 0.03,
      tumbleY: (Math.random() - 0.5) * 0.04,
      tumbleZ: (Math.random() - 0.5) * 0.025,
      phase: Math.random() * Math.PI * 2,
    };
  }

  function onMouseMove(e) {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    targetCamX = mouseX * 15;
    targetCamY = 10 + mouseY * 6;
  }

  function onTouchMove(e) {
    if (e.touches.length > 0) {
      mouseX = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
      targetCamX = mouseX * 10;
      targetCamY = 10 + mouseY * 5;
    }
  }

  function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function animate() {
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();

    // Transición suave de la fuerza del viento
    windStrength += (targetWindStrength - windStrength) * 0.035;

    // Perspectiva de cámara con amortiguación natural
    camera.position.x += (targetCamX - camera.position.x) * 0.03;
    camera.position.y += (targetCamY - camera.position.y) * 0.03;
    camera.lookAt(0, 7, -50);

    // Balanceo suave del follaje en los árboles
    forestGroup.children.forEach((tree) => {
      const u = tree.userData;
      tree.rotation.z = u.baseRotZ + Math.sin(time * u.swaySpeed + u.swayOffset) * 0.015 * windStrength;
    });

    // Balanceo de ramas en primer plano
    canopyForeground.children.forEach((bough, idx) => {
      bough.position.y += Math.sin(time * 0.7 + idx) * 0.01;
      bough.rotation.z += Math.cos(time * 0.5 + idx) * 0.001;
    });

    // Pulsación suave de los rayos solares
    lightRaysGroup.children.forEach((ray) => {
      const u = ray.userData;
      ray.material.opacity = u.baseOpacity + Math.sin(time * u.speed + u.phase) * 0.03;
    });

    // Desplazamiento lento de la niebla
    mistGroup.children.forEach((mist) => {
      mist.position.x += 0.03 * mist.userData.speed * windStrength;
      if (mist.position.x > 110) {
        mist.position.x = -110;
      }
    });

    // Vuelo y brillo de luciérnagas
    if (firefliesMesh) {
      const pos = firefliesMesh.geometry.attributes.position.array;
      const orig = firefliesMesh.geometry.userData.originPos;
      const phases = firefliesMesh.geometry.userData.phases;

      for (let i = 0; i < config.fireflyCount; i++) {
        const idx = i * 3;
        const p = phases[i];

        pos[idx] = orig[idx] + Math.sin(time * 0.5 + p) * 2.8;
        pos[idx + 1] = orig[idx + 1] + Math.cos(time * 0.65 + p) * 1.8;
        pos[idx + 2] = orig[idx + 2] + Math.sin(time * 0.35 + p * 1.2) * 1.5;

        pos[idx] += (windStrength - 1.0) * 0.25;
      }
      firefliesMesh.geometry.attributes.position.needsUpdate = true;
    }

    // Aerodinámica de hojas cayendo
    leaves.forEach((leaf) => {
      const u = leaf.userData;

      leaf.position.y -= u.fallSpeed * (1 + (windStrength - 1.0) * 1.4);
      leaf.position.x += Math.sin(time * u.swayFreq + u.phase) * u.swayAmp + (windStrength - 1.0) * 0.35;
      leaf.position.z += Math.cos(time * u.swayFreq * 0.8 + u.phase) * (u.swayAmp * 0.45);

      leaf.rotation.x += u.tumbleX * windStrength;
      leaf.rotation.y += u.tumbleY * windStrength;
      leaf.rotation.z += u.tumbleZ * windStrength;

      if (leaf.position.y < -12) {
        resetLeaf(leaf, false);
      }
    });

    renderer.render(scene, camera);
  }

  // API para interacciones naturales
  window.ForestScene = {
    triggerGust: function (strength = 2.2, duration = 3000) {
      targetWindStrength = strength;
      setTimeout(() => {
        targetWindStrength = 1.0;
      }, duration);
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
