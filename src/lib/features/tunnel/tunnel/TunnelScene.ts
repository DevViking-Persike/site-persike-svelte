import * as THREE from 'three';

export interface TunnelPalette {
  background: string;
  accent: string;
  muted: string;
  faint: string;
}

export interface TunnelProgress {
  /** 0..100 do percurso total do túnel */
  progress: number;
  /** índice da estação mais próxima da câmera */
  stationIndex: number;
}

export interface TunnelSceneOptions {
  palette: TunnelPalette;
  onProgress?: (progress: TunnelProgress) => void;
}

const RING_RADIUS = 6;
const RING_COUNT = 90;
const RING_SPACING = 3.5;
const TUNNEL_DEPTH = RING_COUNT * RING_SPACING;
export const TOTAL_TRAVEL = 660;
const STEER_X = 1.6;
const STEER_Y = 1.1;

/** Cena de túnel estilo Tron dirigida por scroll — sem dependência de framework. */
export class TunnelScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly clock = new THREE.Clock();
  private readonly disposeFns: Array<() => void> = [];

  private readonly rings: THREE.Mesh[] = [];
  private readonly ringGeometry: THREE.TorusGeometry;
  private readonly ringMaterials: THREE.MeshBasicMaterial[];

  private readonly rails: THREE.Line[] = [];
  private readonly railGeometry: THREE.BufferGeometry;
  private readonly railMaterial: THREE.LineBasicMaterial;

  private readonly particles: THREE.Points;
  private readonly particleGeometry: THREE.BufferGeometry;
  private readonly particleMaterial: THREE.PointsMaterial;

  private readonly floorGrid: THREE.GridHelper;
  private readonly ceilingGrid: THREE.GridHelper;

  private readonly pulses: THREE.Mesh[] = [];
  private readonly pulseGeometry: THREE.BoxGeometry;
  private readonly pulseMaterial: THREE.MeshBasicMaterial;
  private readonly pulseData: Array<{ speed: number; angle: number }> = [];

  private readonly gates: Array<{
    group: THREE.Group;
    spinner: THREE.Mesh;
    label: THREE.Sprite;
    textures: THREE.Texture[];
    geometries: THREE.BufferGeometry[];
    materials: THREE.Material[];
    center: number;
  }> = [];

  private raf = 0;
  private running = false;
  private cameraZ = 0;
  private targetProgress = 0;
  private steerX = 0;
  private steerY = 0;
  private posX = 0;
  private posY = 0;
  private readonly options: TunnelSceneOptions;
  private readonly reducedMotion: boolean;
  private lastReported = -1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    options: TunnelSceneOptions
  ) {
    this.options = options;
    this.reducedMotion =
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const { background, accent, muted, faint } = options.palette;
    const bgColor = new THREE.Color(background);
    this.scene.background = bgColor;
    this.scene.fog = new THREE.FogExp2(bgColor.getHex(), 0.024);

    this.camera = new THREE.PerspectiveCamera(72, 1, 0.1, 170);
    this.camera.position.set(0, 0, 0);

    // — Anéis do túnel (geometria e materiais compartilhados) —
    this.ringGeometry = new THREE.TorusGeometry(RING_RADIUS, 0.05, 6, 64);
    this.ringMaterials = [
      new THREE.MeshBasicMaterial({ color: new THREE.Color(faint), transparent: true, opacity: 0.28 }),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(muted), transparent: true, opacity: 0.42 }),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(accent),
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    ];
    for (let i = 0; i < RING_COUNT; i++) {
      const neon = i % 12 === 0 ? 2 : i % 6 === 0 ? 1 : 0;
      const ring = new THREE.Mesh(this.ringGeometry, this.ringMaterials[neon]);
      ring.position.z = -i * RING_SPACING;
      this.scene.add(ring);
      this.rings.push(ring);
    }

    // — Trilhos longitudinais de energia —
    this.railGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 2),
      new THREE.Vector3(0, 0, -TUNNEL_DEPTH)
    ]);
    this.railMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(accent),
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const railCount = 16;
    for (let i = 0; i < railCount; i++) {
      const angle = (i / railCount) * Math.PI * 2 + 0.15;
      const rail = new THREE.Line(this.railGeometry, this.railMaterial);
      rail.position.set(
        Math.cos(angle) * RING_RADIUS,
        Math.sin(angle) * RING_RADIUS,
        0
      );
      this.scene.add(rail);
      this.rails.push(rail);
    }

    // — Pó dourado —
    const particleCount = 520;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.2 + Math.random() * 4.4;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = -Math.random() * TUNNEL_DEPTH;
    }
    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    this.particleMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(accent),
      size: 0.055,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particles);

    // — Grade estilo Tron: piso e teto —
    const gridColor = new THREE.Color(accent);
    const gridDim = new THREE.Color(faint);
    this.floorGrid = new THREE.GridHelper(220, 110, gridColor, gridDim);
    this.ceilingGrid = new THREE.GridHelper(220, 110, gridColor, gridDim);
    for (const grid of [this.floorGrid, this.ceilingGrid]) {
      const material = grid.material as THREE.LineBasicMaterial;
      material.transparent = true;
      material.opacity = grid === this.floorGrid ? 0.14 : 0.07;
      material.depthWrite = false;
    }
    this.floorGrid.position.y = -3.6;
    this.ceilingGrid.position.y = 6.8;
    this.scene.add(this.floorGrid, this.ceilingGrid);

    // — Pulsos de luz correndo pelos trilhos —
    this.pulseGeometry = new THREE.BoxGeometry(0.09, 0.09, 9);
    this.pulseMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(accent),
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const pulseCount = 10;
    for (let i = 0; i < pulseCount; i++) {
      const pulse = new THREE.Mesh(this.pulseGeometry, this.pulseMaterial);
      const angle = (i / pulseCount) * Math.PI * 2;
      const speed = 34 + Math.random() * 30;
      this.pulseData.push({ speed, angle });
      pulse.position.set(
        Math.cos(angle) * (RING_RADIUS - 0.15),
        Math.sin(angle) * (RING_RADIUS - 0.15),
        -Math.random() * TUNNEL_DEPTH
      );
      this.scene.add(pulse);
      this.pulses.push(pulse);
    }

    this.registerEvents();
    this.resize();
  }

  /** Posiciona o portão i no ponto central (0..1) do percurso. */
  setCenters(centers: number[]): void {
    this.gates.forEach((gate, index) => {
      const center = centers[index];
      if (center === undefined) return;
      gate.center = center;
      gate.group.position.z = -center * TOTAL_TRAVEL;
    });
  }

  /** Define o alvo de scroll (0..1) — a câmera viaja até lá com suavização. */
  setScroll(progress01: number): void {
    this.targetProgress = Math.min(Math.max(progress01, 0), 1);
  }

  /** Cria um portão de estação (anel segmentado giratório + brilho + rótulo). */
  addStationGate(title: string, index: number): void {
    const { accent, muted } = this.options.palette;
    const group = new THREE.Group();
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];

    // Anel interno segmentado — arcos dourados
    const segments = 6;
    const duty = 0.62;
    const step = (Math.PI * 2) / segments;
    const innerMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(accent),
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    materials.push(innerMat);
    for (let k = 0; k < segments; k++) {
      const arc = new THREE.TorusGeometry(RING_RADIUS + 0.7, 0.13, 6, 40, step * duty);
      geometries.push(arc);
      const mesh = new THREE.Mesh(arc, innerMat);
      mesh.rotation.z = k * step;
      group.add(mesh);
    }

    // Anel externo de "tiques" — gira lentamente
    const ticks = 24;
    const tickStep = (Math.PI * 2) / ticks;
    const tickMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(muted),
      transparent: true,
      opacity: 0.5
    });
    materials.push(tickMat);
    const spinner = new THREE.Mesh();
    for (let k = 0; k < ticks; k++) {
      const tick = new THREE.TorusGeometry(RING_RADIUS + 1.7, 0.028, 4, 8, tickStep * 0.45);
      geometries.push(tick);
      const mesh = new THREE.Mesh(tick, tickMat);
      mesh.rotation.z = k * tickStep;
      spinner.add(mesh);
    }
    group.add(spinner);

    // Brilho radial atrás do portão
    const glowTexture = this.createGlowTexture();
    textures.push(glowTexture);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: new THREE.Color(accent),
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    materials.push(glow.material);
    glow.scale.set(17, 17, 1);
    glow.position.z = -0.8;
    group.add(glow);

    // Rótulo da estação
    const { sprite, texture } = this.createLabel(title, index);
    textures.push(texture);
    materials.push(sprite.material);
    sprite.position.set(0, 2.6, -1.2);
    group.add(sprite);

    group.position.z = -0.001 * (index + 1);
    this.scene.add(group);
    this.gates.push({ group, spinner, label: sprite, textures, geometries, materials, center: 0 });
  }

  private createGlowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      gradient.addColorStop(0, 'rgba(255, 240, 190, 0.9)');
      gradient.addColorStop(0.25, 'rgba(232, 184, 39, 0.35)');
      gradient.addColorStop(1, 'rgba(232, 184, 39, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 256);
    }
    return new THREE.CanvasTexture(canvas);
  }

  private createLabel(title: string, index: number): {
    sprite: THREE.Sprite;
    texture: THREE.CanvasTexture;
  } {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const { accent, faint } = this.options.palette;
    if (ctx) {
      ctx.textAlign = 'center';
      ctx.fillStyle = faint;
      ctx.font = '600 26px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillText(`${String(index + 1).padStart(2, '0')} // SEÇÃO`, 384, 74);
      ctx.fillStyle = accent;
      ctx.font = '700 68px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillText(title.toUpperCase(), 384, 158);
      ctx.fillStyle = accent;
      ctx.fillRect(234, 190, 300, 3);
    }
    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
    );
    sprite.scale.set(9.2, 3.1, 1);
    return { sprite, texture };
  }

  private registerEvents(): void {
    const onPointerMove = (event: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      this.steerX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.steerY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    };
    const onVisibility = () => {
      if (document.hidden) {
        this.stop();
      } else if (!this.running) {
        this.start();
      }
    };

    this.canvas.addEventListener('pointermove', onPointerMove);
    document.addEventListener('visibilitychange', onVisibility);
    this.disposeFns.push(
      () => this.canvas.removeEventListener('pointermove', onPointerMove),
      () => document.removeEventListener('visibilitychange', onVisibility)
    );

    const observer = new ResizeObserver(() => this.resize());
    observer.observe(this.canvas);
    this.disposeFns.push(() => observer.disconnect());
  }

  private resize(): void {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    const loop = () => {
      if (!this.running) return;
      this.update();
      this.renderer.render(this.scene, this.camera);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private update(): void {
    const dt = Math.min(this.clock.getDelta(), 0.1);

    // Viagem dirigida por scroll, com suavização
    const targetZ = -this.targetProgress * TOTAL_TRAVEL;
    const follow = this.reducedMotion ? 1 : Math.min(dt * 5.5, 1);
    this.cameraZ += (targetZ - this.cameraZ) * follow;

    // Parallax de mouse + rolagem sutil da câmera
    const targetX = this.steerX * STEER_X;
    const targetY = this.steerY * STEER_Y;
    const prevX = this.posX;
    this.posX += (targetX - this.posX) * Math.min(dt * 3.5, 1);
    this.posY += (targetY - this.posY) * Math.min(dt * 3.5, 1);
    const lateralVelocity = this.posX - prevX;

    this.camera.position.set(this.posX, this.posY, this.cameraZ);
    this.camera.lookAt(this.posX * 0.3, this.posY * 0.3, this.cameraZ - 14);
    this.camera.rotation.z += -lateralVelocity * 5;

    // Grade infinita acompanhando a câmera (snap de 2 em 2 unidades)
    const gridZ = Math.round(this.cameraZ / 2) * 2;
    this.floorGrid.position.z = gridZ;
    this.ceilingGrid.position.z = gridZ;

    // Recicla anéis que ficaram para trás
    for (const ring of this.rings) {
      if (ring.position.z > this.cameraZ + 4) {
        ring.position.z -= TUNNEL_DEPTH;
      }
    }

    // Recicla partículas
    const positions = this.particleGeometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      const z = positions.getZ(i);
      if (z > this.cameraZ + 2) {
        positions.setZ(i, z - TUNNEL_DEPTH);
      }
    }
    positions.needsUpdate = true;

    // Pulsos correndo em direção à câmera
    const pulseSpeedFactor = this.reducedMotion ? 0.35 : 1;
    for (let i = 0; i < this.pulses.length; i++) {
      const pulse = this.pulses[i];
      pulse.position.z += this.pulseData[i].speed * dt * pulseSpeedFactor;
      if (pulse.position.z > this.cameraZ + 12) {
        pulse.position.z = this.cameraZ - TUNNEL_DEPTH * 0.75 - Math.random() * 40;
        const angle = Math.random() * Math.PI * 2;
        this.pulseData[i].angle = angle;
        pulse.position.x = Math.cos(angle) * (RING_RADIUS - 0.15);
        pulse.position.y = Math.sin(angle) * (RING_RADIUS - 0.15);
      }
    }

    // Portões: gira o anel de tiques; fade do rótulo conforme distância
    for (const gate of this.gates) {
      if (!this.reducedMotion) {
        gate.spinner.rotation.z += dt * 0.35;
      }
      const distance = Math.abs(gate.group.position.z - this.cameraZ);
      const labelMaterial = gate.label.material as THREE.SpriteMaterial;
      labelMaterial.opacity = Math.min(Math.max(1.6 - distance / 34, 0.15), 1);
    }

    // Estação ativa = portão mais próximo + progresso do percurso
    let activeIndex = 0;
    let nearest = Infinity;
    for (let i = 0; i < this.gates.length; i++) {
      const distance = Math.abs(this.gates[i].group.position.z - this.cameraZ);
      if (distance < nearest) {
        nearest = distance;
        activeIndex = i;
      }
    }
    const progress = Math.round(
      Math.min(Math.max(this.cameraZ / -TOTAL_TRAVEL, 0), 1) * 100
    );
    const reportKey = progress * 100 + activeIndex;
    if (this.options.onProgress && reportKey !== this.lastReported) {
      this.lastReported = reportKey;
      this.options.onProgress({ progress, stationIndex: activeIndex });
    }
  }

  dispose(): void {
    this.stop();
    for (const fn of this.disposeFns) fn();
    this.disposeFns.length = 0;

    for (const gate of this.gates) {
      for (const geometry of gate.geometries) geometry.dispose();
      for (const material of gate.materials) material.dispose();
      for (const texture of gate.textures) texture.dispose();
    }
    this.ringGeometry.dispose();
    for (const material of this.ringMaterials) material.dispose();
    this.railGeometry.dispose();
    this.railMaterial.dispose();
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    this.pulseGeometry.dispose();
    this.pulseMaterial.dispose();
    this.floorGrid.dispose();
    this.ceilingGrid.dispose();
    this.renderer.dispose();
  }
}
