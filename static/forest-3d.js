/**
 * Traductor del Bosque - Motor de Física Atmosférica 3D (Three.js)
 * Proyecta niebla volumétrica flotante, luciérnagas bioluminiscentes y hojas otoñales
 * sobre el fondo fotográfico cinematográfico, aportando vida, profundidad y movimiento real.
 * Sin árboles sintéticos poligonales.
 */

(function () {
  'use strict';

  if (typeof THREE === 'undefined') {
    return;
  }

  const canvas = document.getElementById('forestCanvas');
  if (!canvas) return;

  const config = {
    fireflyCount: 130,
    leafCount: 40,
    mistLayerCount: 6,
  };

  let scene, camera, renderer;
  let mouseX = 0, mouseY = 0;
  let targetCamX = 0, targetCamY = 0;
  const clock = new THREE.Clock();
  let windStrength = 1.0;
  let targetWindStrength = 1.0;

  const mistGroup = new THREE.Group();
  const sunRaysGroup = new THREE.Group();
  let firefliesMesh;
  const leaves = [];

  function createSoftTexture(colorRgba, size = 256) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = size;
    tempCanvas.height = size;
    const ctx = tempCanvas.getContext('2d');

    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, colorRgba);
    grad.addColorStop(0.3, colorRgba.replace(/[\d\.]+\)$/, '0.4)'));
    grad.addColorStop(0.7, colorRgba.replace(/[\d\.]+\)$/, '0.08)'));
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(tempCanvas);
    texture.needsUpdate = true;
    return texture;
  }

  function init() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 300);
    camera.position.set(0, 6, 42);

    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // Fondo 100% transparente sobre la fotografía

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    buildVolumetricSunRays();
    buildVolumetricMist();
    buildFireflies();
    buildFallingLeaves();

    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    animate();
  }

  /**
   * Refuerzo de haces solares volumétricos sobre la fotografía
   */
  function buildVolumetricSunRays() {
    scene.add(sunRaysGroup);

    const rayTex = createSoftTexture('rgba(255, 248, 220, 1)', 256);
    const rayMat = new THREE.MeshBasicMaterial({
      map: rayTex,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const rayGeo = new THREE.PlaneGeometry(16, 110);

    for (let i = 0; i < 4; i++) {
      const ray = new THREE.Mesh(rayGeo, rayMat);
      ray.position.set(-30 + i * 22, 18, -25 + (i % 2) * 10);
      ray.rotation.z = -0.48;
      ray.rotation.y = 0.12;
      ray.userData = {
        baseOpacity: 0.05 + i * 0.015,
        speed: 0.5 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
      };
      sunRaysGroup.add(ray);
    }
  }

  /**
   * Capas de niebla de valle desplazándose en profundidad
   */
  function buildVolumetricMist() {
    scene.add(mistGroup);

    const mistTex = createSoftTexture('rgba(190, 215, 200, 1)', 256);
    const mistMat = new THREE.MeshBasicMaterial({
      map: mistTex,
      transparent: true,
      opacity: 0.09,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const mistGeo = new THREE.PlaneGeometry(130, 45);

    for (let i = 0; i < config.mistLayerCount; i++) {
      const plane = new THREE.Mesh(mistGeo, mistMat);
      plane.position.set((Math.random() - 0.5) * 120, -2 + i * 3, -15 - i * 22);
      plane.userData = {
        speed: 0.3 + i * 0.18,
      };
      mistGroup.add(plane);
    }
  }

  /**
   * Luciérnagas doradas con pulsación natural
   */
  function buildFireflies() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(config.fireflyCount * 3);
    const originPos = new Float32Array(config.fireflyCount * 3);
    const phases = new Float32Array(config.fireflyCount);

    for (let i = 0; i < config.fireflyCount; i++) {
      const x = (Math.random() - 0.5) * 110;
      const y = Math.random() * 32 - 4;
      const z = 18 - Math.random() * 75;

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

    const fireflyTex = createSoftTexture('rgba(255, 220, 150, 1)', 64);
    const mat = new THREE.PointsMaterial({
      map: fireflyTex,
      size: 3.4,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xfde047, // Tono luciérnaga dorada cálida
    });

    firefliesMesh = new THREE.Points(geo, mat);
    scene.add(firefliesMesh);
  }

  /**
   * Hojas de bosque cayendo con aerodinámica y cabeceo
   */
  function buildFallingLeaves() {
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, -0.2);
    leafShape.bezierCurveTo(0.7, 0.5, 0.9, 1.6, 0, 2.4);
    leafShape.bezierCurveTo(-0.9, 1.6, -0.7, 0.5, 0, -0.2);

    const leafGeo = new THREE.ShapeGeometry(leafShape);
    leafGeo.center();

    const rusticColors = [
      0xd97706, 0xb45309, 0x78350f, 0x4d7c0f, 0x65a30d, 0xa16207
    ];

    for (let i = 0; i < config.leafCount; i++) {
      const color = rusticColors[i % rusticColors.length];
      const mat = new THREE.MeshBasicMaterial({
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
    leaf.position.x = (Math.random() - 0.5) * 95;
    leaf.position.y = initial ? Math.random() * 45 - 2 : 36 + Math.random() * 10;
    leaf.position.z = 20 - Math.random() * 55;

    leaf.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    const scale = 0.5 + Math.random() * 0.55;
    leaf.scale.set(scale, scale, scale);

    leaf.userData = {
      fallSpeed: 0.065 + Math.random() * 0.05,
      swayFreq: 1.1 + Math.random() * 1.3,
      swayAmp: 0.12 + Math.random() * 0.16,
      tumbleX: (Math.random() - 0.5) * 0.035,
      tumbleY: (Math.random() - 0.5) * 0.04,
      tumbleZ: (Math.random() - 0.5) * 0.025,
      phase: Math.random() * Math.PI * 2,
    };
  }

  function onMouseMove(e) {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    targetCamX = mouseX * 12;
    targetCamY = 6 + mouseY * 5;
  }

  function onTouchMove(e) {
    if (e.touches.length > 0) {
      mouseX = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
      targetCamX = mouseX * 8;
      targetCamY = 6 + mouseY * 4;
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

    windStrength += (targetWindStrength - windStrength) * 0.04;

    camera.position.x += (targetCamX - camera.position.x) * 0.035;
    camera.position.y += (targetCamY - camera.position.y) * 0.035;
    camera.lookAt(0, 4, -40);

    // Ondulación de luz solar
    sunRaysGroup.children.forEach((ray) => {
      const u = ray.userData;
      ray.material.opacity = u.baseOpacity + Math.sin(time * u.speed + u.phase) * 0.025;
    });

    // Desplazamiento de niebla
    mistGroup.children.forEach((mist) => {
      mist.position.x += 0.035 * mist.userData.speed * windStrength;
      if (mist.position.x > 90) {
        mist.position.x = -90;
      }
    });

    // Movimiento orgánico de luciérnagas
    if (firefliesMesh) {
      const pos = firefliesMesh.geometry.attributes.position.array;
      const orig = firefliesMesh.geometry.userData.originPos;
      const phases = firefliesMesh.geometry.userData.phases;

      for (let i = 0; i < config.fireflyCount; i++) {
        const idx = i * 3;
        const p = phases[i];

        pos[idx] = orig[idx] + Math.sin(time * 0.5 + p) * 2.5;
        pos[idx + 1] = orig[idx + 1] + Math.cos(time * 0.65 + p) * 1.6;
        pos[idx + 2] = orig[idx + 2] + Math.sin(time * 0.35 + p * 1.2) * 1.4;

        pos[idx] += (windStrength - 1.0) * 0.25;
      }
      firefliesMesh.geometry.attributes.position.needsUpdate = true;
    }

    // Aerodinámica de hojas
    leaves.forEach((leaf) => {
      const u = leaf.userData;

      leaf.position.y -= u.fallSpeed * (1 + (windStrength - 1.0) * 1.5);
      leaf.position.x += Math.sin(time * u.swayFreq + u.phase) * u.swayAmp + (windStrength - 1.0) * 0.35;
      leaf.position.z += Math.cos(time * u.swayFreq * 0.8 + u.phase) * (u.swayAmp * 0.4);

      leaf.rotation.x += u.tumbleX * windStrength;
      leaf.rotation.y += u.tumbleY * windStrength;
      leaf.rotation.z += u.tumbleZ * windStrength;

      if (leaf.position.y < -10) {
        resetLeaf(leaf, false);
      }
    });

    renderer.render(scene, camera);
  }

  window.ForestScene = {
    triggerGust: function (strength = 2.4, duration = 3000) {
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
