import * as THREE from 'three';

export interface TunnelStation {
  id: string;
  title: string;
  subtitle: string;
}

export interface TunnelPalette {
  background: string;
  accent: string;
  muted: string;
  faint: string;
}

export interface TunnelProgress {
  /** 0..100 dentro da volta atual do túnel */
  progress: number;
  /** índice da estação à frente (mod stations.length) */
  stationIndex: number;
  /** velocidade normalizada 0..1 */
  speed: number;
}

export interface TunnelSceneOptions {
  stations: TunnelStation[];
  palette: TunnelPalette;
  onProgress?: (progress: TunnelProgress) => void;
}

const RING_RADIUS = 6;
const RING_COUNT = 80;
const RING_SPACING = 4;
const TUNNEL_DEPTH = RING_COUNT * RING_SPACING;
const GATE_INTERVAL = 110;
const GATE_OFFSET = -40;
const BASE_SPEED = 9;
const BOOST_SPEED = 26;
const BRAKE_SPEED = 5;
const STEER_X = 2.4;
const STEER_Y = 1.6;

/** Cena de túnel 3D infinita — sem dependência de framework. */
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

  private readonly gates: Array<{
    group: THREE.Group;
    passed: boolean;
    label: THREE.Sprite;
    texture: THREE.CanvasTexture;
  }> = [];

  private raf = 0;
  private running = false;
  private cameraZ = 0;
  private speed = BASE_SPEED;
  private targetSpeed = BASE_SPEED;
  private steerX = 0;
  private steerY = 0;
  private posX = 0;
  private posY = 0;
  private readonly stationCount: number;
  private readonly options: TunnelSceneOptions;
  private readonly reducedMotion: boolean;
  private lastReported = -1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    options: TunnelSceneOptions
  ) {
    this.options = options;
    this.stationCount = Math.max(options.stations.length, 1);
    this.reducedMotion =
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const { background, accent, muted, faint } = options.palette;
    const bgColor = new THREE.Color(background);
    this.scene.background = bgColor;
    this.scene.fog = new THREE.FogExp2(bgColor.getHex(), 0.028);

    this.camera = new THREE.PerspectiveCamera(70, 1, 0.1, 160);
    this.camera.position.set(0, 0, 0);

    // Anéis do túnel — geometria e materiais compartilhados
    this.ringGeometry = new THREE.TorusGeometry(RING_RADIUS, 0.055, 6, 64);
    this.ringMaterials = [
      new THREE.MeshBasicMaterial({ color: new THREE.Color(faint), transparent: true, opacity: 0.35 }),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(muted), transparent: true, opacity: 0.5 }),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(accent),
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    ];
    for (let i = 0; i < RING_COUNT; i++) {
      const neon = i % 10 === 0 ? 2 : i % 5 === 0 ? 1 : 0;
      const ring = new THREE.Mesh(this.ringGeometry, this.ringMaterials[neon]);
      ring.position.z = -i * RING_SPACING;
      this.scene.add(ring);
      this.rings.push(ring);
    }

    // Trilhos longitudinais — dão a leitura de "tubo"
    this.railGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 2),
      new THREE.Vector3(0, 0, -TUNNEL_DEPTH)
    ]);
    this.railMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(muted),
      transparent: true,
      opacity: 0.18
    });
    const railCount = 12;
    for (let i = 0; i < railCount; i++) {
      const angle = (i / railCount) * Math.PI * 2;
      const rail = new THREE.Line(this.railGeometry, this.railMaterial);
      rail.position.set(
        Math.cos(angle) * RING_RADIUS,
        Math.sin(angle) * RING_RADIUS,
        0
      );
      this.scene.add(rail);
      this.rails.push(rail);
    }

    // Poeira estelar em volta do caminho da câmera
    const particleCount = 500;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.4 + Math.random() * 4.2;
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
      size: 0.06,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particles);

    // Portões de estação — um por station, reciclados infinitamente
    options.stations.forEach((station, index) => {
      const group = new THREE.Group();
      group.position.z = GATE_OFFSET - index * GATE_INTERVAL;

      const accentMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(accent),
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const gateRing = new THREE.Mesh(
        new THREE.TorusGeometry(RING_RADIUS + 0.9, 0.16, 8, 72),
        accentMat
      );
      const haloMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(muted),
        transparent: true,
        opacity: 0.3
      });
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(RING_RADIUS + 1.5, 0.03, 6, 72),
        haloMat
      );

      const { sprite, texture } = this.createLabel(station.title, station.subtitle);
      sprite.position.set(0, 1.9, -1.5);

      group.add(gateRing, halo, sprite);
      this.scene.add(group);
      this.gates.push({ group, passed: false, label: sprite, texture });
    });

    this.registerEvents();
    this.resize();
  }

  private createLabel(title: string, subtitle: string): {
    sprite: THREE.Sprite;
    texture: THREE.CanvasTexture;
  } {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 280;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const { accent, muted } = this.options.palette;
      ctx.textAlign = 'center';
      ctx.fillStyle = accent;
      ctx.font = '700 52px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillText(title.toUpperCase(), 320, 120);
      ctx.fillStyle = muted;
      ctx.font = '400 26px Inter, -apple-system, sans-serif';
      const words = subtitle.split(' ');
      let line = '';
      const lines: string[] = [];
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (ctx.measureText(candidate).width > 580 && line) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      }
      if (line) lines.push(line);
      lines.slice(0, 3).forEach((text, i) => ctx.fillText(text, 320, 168 + i * 34));
    }
    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
    );
    sprite.scale.set(8.4, 3.7, 1);
    return { sprite, texture };
  }

  private registerEvents(): void {
    const onPointerMove = (event: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      this.steerX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.steerY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    };
    const onPointerDown = () => {
      this.targetSpeed = this.boostSpeed();
    };
    const onPointerUp = () => {
      this.targetSpeed = this.baseSpeed();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'KeyW' || event.code === 'ArrowUp') this.targetSpeed = this.boostSpeed();
      if (event.code === 'KeyS' || event.code === 'ArrowDown') this.targetSpeed = BRAKE_SPEED;
    };
    const onKeyUp = () => {
      this.targetSpeed = this.baseSpeed();
    };
    const onVisibility = () => {
      if (document.hidden) {
        this.stop();
      } else if (!this.running) {
        this.start();
      }
    };

    this.canvas.addEventListener('pointermove', onPointerMove);
    this.canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    document.addEventListener('visibilitychange', onVisibility);
    this.disposeFns.push(
      () => this.canvas.removeEventListener('pointermove', onPointerMove),
      () => this.canvas.removeEventListener('pointerdown', onPointerDown),
      () => window.removeEventListener('pointerup', onPointerUp),
      () => window.removeEventListener('keydown', onKeyDown),
      () => window.removeEventListener('keyup', onKeyUp),
      () => document.removeEventListener('visibilitychange', onVisibility)
    );

    const observer = new ResizeObserver(() => this.resize());
    observer.observe(this.canvas);
    this.disposeFns.push(() => observer.disconnect());
  }

  private baseSpeed(): number {
    return this.reducedMotion ? BASE_SPEED / 2 : BASE_SPEED;
  }

  private boostSpeed(): number {
    return this.reducedMotion ? BOOST_SPEED / 3 : BOOST_SPEED;
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

    // Velocidade com amortecimento
    this.speed += (this.targetSpeed - this.speed) * Math.min(dt * 2.5, 1);
    this.cameraZ -= this.speed * dt;

    // Direção suave (mouse), com leve inclinação de rolagem
    const targetX = this.steerX * STEER_X;
    const targetY = this.steerY * STEER_Y;
    const prevX = this.posX;
    this.posX += (targetX - this.posX) * Math.min(dt * 4, 1);
    this.posY += (targetY - this.posY) * Math.min(dt * 4, 1);
    const lateralVelocity = this.posX - prevX;

    this.camera.position.set(this.posX, this.posY, this.cameraZ);
    this.camera.lookAt(this.posX * 0.35, this.posY * 0.35, this.cameraZ - 14);
    this.camera.rotation.z += -lateralVelocity * 6;

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

    // Portões: recicla e reporta passagem
    const lapDepth = this.stationCount * GATE_INTERVAL;
    let activeIndex = 0;
    let nearestAhead = Infinity;
    for (let i = 0; i < this.gates.length; i++) {
      const gate = this.gates[i];
      if (gate.group.position.z > this.cameraZ + 6) {
        gate.group.position.z -= lapDepth;
        gate.passed = false;
      }
      // signed > 0 ⇒ portão à frente da câmera
      const signed = this.cameraZ - gate.group.position.z;
      if (signed > 0 && signed < nearestAhead) {
        nearestAhead = signed;
        activeIndex = i;
      }
      if (signed <= 0) {
        gate.passed = true;
      }
    }

    // Progresso 0..100 da volta atual + velocidade normalizada
    const referenceGate = this.gates[0]?.group.position.z ?? GATE_OFFSET;
    const intoLap = (this.cameraZ - referenceGate) / -lapDepth;
    const progress = Math.round(((intoLap % 1) + 1) % 1 * 100);
    const speedNorm = Math.round(
      ((this.speed - BRAKE_SPEED) / (BOOST_SPEED - BRAKE_SPEED)) * 100
    );
    const reportKey = progress * 1000 + activeIndex;
    if (this.options.onProgress && reportKey !== this.lastReported) {
      this.lastReported = reportKey;
      this.options.onProgress({
        progress: Math.min(Math.max(progress, 0), 100),
        stationIndex: activeIndex,
        speed: Math.min(Math.max(speedNorm, 0), 100) / 100
      });
    }
  }

  dispose(): void {
    this.stop();
    for (const fn of this.disposeFns) fn();
    this.disposeFns.length = 0;

    for (const gate of this.gates) {
      gate.group.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
        if (object instanceof THREE.Sprite) object.material.dispose();
      });
      gate.texture.dispose();
    }
    this.ringGeometry.dispose();
    for (const material of this.ringMaterials) material.dispose();
    this.railGeometry.dispose();
    this.railMaterial.dispose();
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    this.renderer.dispose();
  }
}
