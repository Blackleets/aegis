'use client';

import { motion, type PanInfo } from 'framer-motion';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

export type PlanetWebGLBody = {
  id: 'earth' | 'moon' | 'mars' | 'venus' | 'jupiter' | 'saturn' | 'neptune';
  name: string;
  texture: string;
  accent: string;
  glow: string;
  rotationDuration: number;
  rotationDirection?: 1 | -1;
};

function fract(value: number) {
  return value - Math.floor(value);
}

function hash2(x: number, y: number, seed: number) {
  return fract(Math.sin(x * 127.1 + y * 311.7 + seed * 19.19) * 43758.5453123);
}

function smoothNoise(x: number, y: number, seed: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const xf = x - x0;
  const yf = y - y0;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);

  const n00 = hash2(x0, y0, seed);
  const n10 = hash2(x0 + 1, y0, seed);
  const n01 = hash2(x0, y0 + 1, seed);
  const n11 = hash2(x0 + 1, y0 + 1, seed);

  const nx0 = n00 * (1 - u) + n10 * u;
  const nx1 = n01 * (1 - u) + n11 * u;

  return nx0 * (1 - v) + nx1 * v;
}

function fbm(x: number, y: number, seed: number, octaves = 5) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let normalizer = 0;

  for (let i = 0; i < octaves; i += 1) {
    value += smoothNoise(x * frequency, y * frequency, seed + i * 13.7) * amplitude;
    normalizer += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / normalizer;
}

function makeCanvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createBumpTexture(bodyId: PlanetWebGLBody['id']) {
  const seedMap: Record<PlanetWebGLBody['id'], number> = {
    earth: 11,
    moon: 17,
    mars: 23,
    venus: 29,
    jupiter: 31,
    saturn: 37,
    neptune: 41,
  };

  return makeCanvasTexture(512, (ctx, size) => {
    const image = ctx.createImageData(size, size);
    const data = image.data;
    const seed = seedMap[bodyId];

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const nx = x / size;
        const ny = y / size;
        let height = fbm(nx * 6, ny * 6, seed, 5);

        if (bodyId === 'jupiter' || bodyId === 'saturn' || bodyId === 'neptune') {
          const bands = 0.5 + 0.5 * Math.sin(ny * Math.PI * (bodyId === 'neptune' ? 10 : 18) + height * 4);
          height = bands * 0.65 + height * 0.35;
        }

        if (bodyId === 'moon' || bodyId === 'mars') {
          const crater = fbm(nx * 14, ny * 14, seed + 9, 3);
          height = height * 0.72 + crater * 0.28;
        }

        if (bodyId === 'venus') {
          height = height * 0.35 + fbm(nx * 3, ny * 11, seed + 3, 4) * 0.65;
        }

        const tone = Math.max(0, Math.min(255, Math.round(height * 255)));
        const idx = (y * size + x) * 4;
        data[idx] = tone;
        data[idx + 1] = tone;
        data[idx + 2] = tone;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(image, 0, 0);
  });
}

function createCloudTexture(bodyId: PlanetWebGLBody['id']) {
  return makeCanvasTexture(512, (ctx, size) => {
    ctx.clearRect(0, 0, size, size);
    const image = ctx.createImageData(size, size);
    const data = image.data;
    const seed = bodyId === 'earth' ? 7 : bodyId === 'venus' ? 13 : bodyId === 'jupiter' ? 19 : bodyId === 'saturn' ? 29 : bodyId === 'neptune' ? 41 : 47;

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const nx = x / size;
        const ny = y / size;
        let alpha = 0;

        if (bodyId === 'earth') {
          alpha = Math.pow(Math.max(0, fbm(nx * 7, ny * 7, seed, 5) - 0.54) / 0.46, 1.5);
        } else if (bodyId === 'venus') {
          alpha = Math.pow(Math.max(0, fbm(nx * 4, ny * 14, seed, 4) - 0.42) / 0.58, 1.2) * 0.85;
        } else {
          const bands = 0.5 + 0.5 * Math.sin(ny * Math.PI * (bodyId === 'neptune' ? 10 : 20) + fbm(nx * 5, ny * 5, seed, 3) * 3);
          alpha = Math.max(0, bands - 0.45) * 0.75;
        }

        const idx = (y * size + x) * 4;
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = Math.round(Math.min(1, alpha) * 255);
      }
    }

    ctx.putImageData(image, 0, 0);
  });
}

function createRingTexture() {
  return makeCanvasTexture(1024, (ctx, size) => {
    const center = size / 2;
    const image = ctx.createImageData(size, size);
    const data = image.data;

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const dx = (x - center) / center;
        const dy = (y - center) / center;
        const radius = Math.sqrt(dx * dx + dy * dy);
        const ringBand = Math.sin(radius * 180) * 0.5 + 0.5;
        const noise = fbm(x / size * 20, y / size * 8, 53, 4);
        const mask = radius > 0.33 && radius < 0.98 ? 1 : 0;
        const alpha = mask * Math.max(0, 0.18 + ringBand * 0.55 + noise * 0.18 - Math.abs(radius - 0.66) * 1.1);
        const tone = Math.round(180 + ringBand * 55 + noise * 12);
        const idx = (y * size + x) * 4;
        data[idx] = tone;
        data[idx + 1] = Math.round(tone * 0.92);
        data[idx + 2] = Math.round(tone * 0.74);
        data[idx + 3] = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
      }
    }

    ctx.putImageData(image, 0, 0);
  });
}

function PlanetMesh({
  body,
  rotationOffset,
  autoRotate,
}: {
  body: PlanetWebGLBody;
  rotationOffset: number;
  autoRotate: boolean;
}) {
  const loadedTexture = useLoader(THREE.TextureLoader, body.texture);
  const sphereRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const stormRef = useRef<THREE.Mesh>(null);
  const ringGroupRef = useRef<THREE.Group>(null);
  const moonOrbitRef = useRef<THREE.Group>(null);

  const texture = useMemo(() => {
    const next = loadedTexture.clone();
    next.colorSpace = THREE.SRGBColorSpace;
    next.wrapS = THREE.RepeatWrapping;
    next.wrapT = THREE.ClampToEdgeWrapping;
    next.anisotropy = 8;
    next.needsUpdate = true;
    return next;
  }, [loadedTexture]);

  const bumpMap = useMemo(() => createBumpTexture(body.id), [body.id]);
  const cloudMap = useMemo(() => createCloudTexture(body.id), [body.id]);
  const ringMap = useMemo(() => (body.id === 'saturn' ? createRingTexture() : null), [body.id]);
  const accent = useMemo(() => new THREE.Color(body.accent), [body.accent]);
  const glow = useMemo(() => new THREE.Color(body.accent), [body.accent]);

  const tilt = useMemo(() => {
    switch (body.id) {
      case 'mars':
        return [0.22, -0.2, -0.08] as const;
      case 'venus':
        return [0.08, -0.35, 0.12] as const;
      case 'jupiter':
        return [0.05, -0.18, -0.12] as const;
      case 'saturn':
        return [0.38, -0.12, -0.08] as const;
      case 'neptune':
        return [0.48, -0.3, 0.03] as const;
      case 'moon':
        return [0.12, -0.22, 0.02] as const;
      default:
        return [0.41, -0.28, -0.05] as const;
    }
  }, [body.id]);

  const scale = useMemo(() => {
    switch (body.id) {
      case 'jupiter':
        return 1.16;
      case 'saturn':
        return 1.12;
      case 'moon':
        return 0.94;
      case 'mars':
        return 1.04;
      case 'venus':
        return 1.03;
      case 'neptune':
        return 1.06;
      default:
        return 1.02;
    }
  }, [body.id]);

  const bumpScale = useMemo(() => {
    switch (body.id) {
      case 'moon':
        return 0.11;
      case 'mars':
        return 0.085;
      case 'earth':
        return 0.06;
      case 'venus':
        return 0.03;
      case 'jupiter':
        return 0.018;
      case 'saturn':
        return 0.022;
      case 'neptune':
        return 0.016;
      default:
        return 0.04;
    }
  }, [body.id]);

  useFrame((_state, delta) => {
    const targetY = (rotationOffset / 100) * Math.PI * 2;
    const targetX = Math.sin(targetY * 0.3) * 0.08;
    const direction = body.rotationDirection === -1 ? -1 : 1;
    const autoSpin = autoRotate ? delta * ((Math.PI * 2) / Math.max(body.rotationDuration, 24)) * direction : 0;

    if (sphereRef.current) {
      sphereRef.current.rotation.y += autoSpin;
      sphereRef.current.rotation.y += (targetY - sphereRef.current.rotation.y) * 0.08;
      sphereRef.current.rotation.x += (targetX - sphereRef.current.rotation.x) * 0.08;
    }

    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y += autoSpin * 1.03;
      atmosphereRef.current.rotation.y += (targetY - atmosphereRef.current.rotation.y) * 0.055;
      atmosphereRef.current.rotation.x += (targetX - atmosphereRef.current.rotation.x) * 0.04;
    }

    if (cloudRef.current) {
      cloudRef.current.rotation.y += autoSpin * 1.18;
      cloudRef.current.rotation.y += (targetY - cloudRef.current.rotation.y) * 0.035;
      cloudRef.current.rotation.x += (targetX - cloudRef.current.rotation.x) * 0.025;
    }

    if (stormRef.current) {
      stormRef.current.rotation.z += delta * 0.08;
    }

    if (ringGroupRef.current) {
      ringGroupRef.current.rotation.z += delta * 0.01;
    }

    if (moonOrbitRef.current) {
      moonOrbitRef.current.rotation.y += delta * (body.id === 'mars' ? 0.24 : 0.09);
      moonOrbitRef.current.rotation.z += delta * 0.03;
    }
  });

  return (
    <group rotation={[tilt[0], tilt[1], tilt[2]]} scale={scale}>
      <mesh ref={sphereRef} castShadow receiveShadow>
        <sphereGeometry args={[1.54, 128, 128]} />
        <meshPhysicalMaterial
          map={texture}
          bumpMap={bumpMap ?? undefined}
          bumpScale={bumpScale}
          roughness={body.id === 'venus' ? 0.98 : body.id === 'neptune' ? 0.84 : 0.9}
          metalness={0.02}
          clearcoat={body.id === 'venus' ? 0.18 : 0.08}
          clearcoatRoughness={0.88}
          sheen={0.18}
          sheenColor={accent}
          emissive={body.id === 'mars' ? '#2a1208' : body.id === 'neptune' ? '#061a3d' : '#05070c'}
          emissiveIntensity={body.id === 'moon' ? 0.04 : 0.08}
        />
      </mesh>

      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[1.61, 64, 64]} />
        <meshPhysicalMaterial
          color={accent}
          transparent
          opacity={body.id === 'venus' ? 0.2 : body.id === 'earth' ? 0.12 : 0.09}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
          transmission={0.06}
          clearcoat={0.2}
        />
      </mesh>

      {body.id !== 'moon' && cloudMap && (
        <mesh ref={cloudRef}>
          <sphereGeometry args={[1.575, 64, 64]} />
          <meshPhysicalMaterial
            alphaMap={cloudMap}
            transparent
            color={body.id === 'venus' ? '#f8e7b8' : body.id === 'neptune' ? '#bddbff' : '#f8fbff'}
            opacity={body.id === 'venus' ? 0.28 : body.id === 'earth' ? 0.24 : 0.16}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      {body.id === 'jupiter' && (
        <mesh ref={stormRef} position={[0.72, -0.2, 1.16]} rotation={[0.25, 0, 0.5]}>
          <sphereGeometry args={[0.13, 32, 32]} />
          <meshStandardMaterial color="#b64d29" emissive="#7d2f19" emissiveIntensity={0.5} transparent opacity={0.9} />
        </mesh>
      )}

      {body.id === 'saturn' && ringMap && (
        <group ref={ringGroupRef} rotation={[1.18, 0.22, -0.4]}>
          <mesh>
            <ringGeometry args={[1.92, 3.02, 256]} />
            <meshPhysicalMaterial
              map={ringMap}
              alphaMap={ringMap}
              color="#f4d88a"
              transparent
              opacity={0.8}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, 0, -0.03]}>
            <ringGeometry args={[2.08, 2.84, 256]} />
            <meshPhysicalMaterial
              map={ringMap}
              alphaMap={ringMap}
              color="#7d6331"
              transparent
              opacity={0.32}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {(body.id === 'mars' || body.id === 'saturn') && (
        <group ref={moonOrbitRef}>
          <mesh position={body.id === 'mars' ? [2.18, 0.12, 0.34] : [3.44, 0.3, -0.18]}>
            <sphereGeometry args={[body.id === 'mars' ? 0.08 : 0.11, 18, 18]} />
            <meshStandardMaterial color={body.id === 'mars' ? '#b9aa96' : '#dfc58a'} roughness={1} />
          </mesh>
          {body.id === 'mars' && (
            <mesh position={[-2.54, -0.14, -0.42]}>
              <sphereGeometry args={[0.05, 18, 18]} />
              <meshStandardMaterial color="#8f7f69" roughness={1} />
            </mesh>
          )}
        </group>
      )}

      <mesh position={[-2.3, 1.9, 2.8]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshBasicMaterial color={glow} />
      </mesh>
    </group>
  );
}

export function PlanetWebGL({
  body,
  zoom,
  rotationOffset,
  resetKey,
  autoRotate,
  onRotateDrag,
}: {
  body: PlanetWebGLBody;
  zoom: number;
  rotationOffset: number;
  resetKey: number;
  autoRotate: boolean;
  onRotateDrag?: (deltaX: number) => void;
}) {
  return (
    <motion.div
      key={`${body.id}-${resetKey}`}
      className="relative z-10 h-[min(54vh,620px)] w-[min(54vh,620px)] max-h-[74vw] max-w-[74vw] shrink-0 overflow-hidden rounded-full cursor-grab pointer-events-auto active:cursor-grabbing md:max-h-none md:max-w-none"
      drag
      dragMomentum={false}
      dragElastic={0.12}
      dragConstraints={{ left: -220, right: 220, top: -120, bottom: 120 }}
      style={{ scale: zoom, filter: `drop-shadow(0 0 96px ${body.glow}) drop-shadow(0 0 42px rgba(255,255,255,0.08))` }}
      whileDrag={{ scale: zoom * 1.018 }}
      onDrag={(_event, info: PanInfo) => onRotateDrag?.(info.delta.x * 0.28)}
      onDoubleClick={() => onRotateDrag?.(-rotationOffset)}
      title="Drag to move and rotate planet."
    >
      <div className="pointer-events-none absolute inset-[-10%] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.07),transparent_48%,rgba(74,144,255,0.08)_62%,transparent_76%)] blur-2xl" />
      <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.04),transparent_56%,rgba(2,7,18,0.36)_80%,rgba(2,7,18,0.82)_100%)]" />
      <Canvas
        className="absolute inset-0 h-full w-full"
        dpr={[1, 2]}
        camera={{ position: [0, 0, 5.35], fov: 24 }}
        gl={{ antialias: true, alpha: true }}
        shadows
      >
        <ambientLight intensity={0.34} />
        <hemisphereLight position={[0, 2.5, 0]} intensity={0.74} groundColor="#02040a" color="#eef6ff" />
        <directionalLight position={[5.6, 3.2, 7.1]} intensity={3.1} color="#ffffff" />
        <directionalLight position={[-5.4, -2.5, -4.8]} intensity={0.34} color="#7db7ff" />
        <pointLight position={[-2.8, 2.4, 3.2]} intensity={1.18} color={body.accent} />
        <pointLight position={[2.6, -1.8, 4.2]} intensity={0.42} color="#ffffff" />
        <PlanetMesh body={body} rotationOffset={rotationOffset} autoRotate={autoRotate} />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.2),transparent_18%,transparent_100%)]" />
      <div className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(112deg,transparent_0%,transparent_44%,rgba(1,4,12,0.08)_56%,rgba(1,4,12,0.38)_72%,rgba(1,4,12,0.76)_100%)]" />
      <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/10 shadow-[inset_-52px_-28px_96px_rgba(0,0,0,0.5),inset_24px_16px_48px_rgba(255,255,255,0.1)]" />
      <div className="pointer-events-none absolute inset-x-[14%] bottom-[-8%] h-[18%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.42),transparent_72%)] blur-xl" />
      <div className="pointer-events-none absolute left-1/2 top-[calc(100%-0.15rem)] z-20 -translate-x-1/2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[7px] font-mono tracking-[0.18em] text-[var(--text-secondary)] backdrop-blur-md">
        DRAG PLANET · REAL 3D ORBITAL MESH
      </div>
    </motion.div>
  );
}
