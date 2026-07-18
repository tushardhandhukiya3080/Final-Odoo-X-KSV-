import { useRef, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Mesh } from "three";

// A single floating, slowly-rotating 3D solid.
function Shape({
  position,
  color,
  speed,
  factor,
  children,
}: {
  position: [number, number, number];
  color: string;
  speed: number;
  factor: number;
  children: ReactNode;
}) {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const m = ref.current;
    if (!m) return;
    m.rotation.x = t * speed;
    m.rotation.y = t * speed * 0.7;
    m.position.y = position[1] + Math.sin(t * factor) * 0.45;
    m.position.x = position[0] + Math.cos(t * factor * 0.6) * 0.2;
  });
  return (
    <mesh ref={ref} position={position}>
      {children}
      <meshStandardMaterial color={color} roughness={0.2} metalness={0.7} emissive={color} emissiveIntensity={0.15} transparent opacity={0.7} />
    </mesh>
  );
}

// Ocean-palette 3D objects drifting over the shader gradient. Transparent
// canvas, pointer-events disabled by the parent. Lazy-loaded on the landing.
export default function FloatingScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 50 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 1.5]}
      style={{ position: "absolute", inset: 0 }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 5, 5]} intensity={1.1} />
      <pointLight position={[-6, -3, 2]} intensity={2.4} color="#2dd4bf" />
      <pointLight position={[6, 4, 3]} intensity={1.6} color="#3b82f6" />

      {/* Sparse accents pushed to the corners/edges so they frame the layout */}
      <Shape position={[-4.4, 2.1, -2.5]} color="#3b82f6" speed={0.24} factor={0.7}>
        <icosahedronGeometry args={[0.6, 0]} />
      </Shape>
      <Shape position={[4.6, -2, -3]} color="#2dd4bf" speed={0.2} factor={0.6}>
        <torusKnotGeometry args={[0.42, 0.15, 128, 16]} />
      </Shape>
      <Shape position={[4.2, 2.4, -3.5]} color="#60a5fa" speed={0.3} factor={0.9}>
        <octahedronGeometry args={[0.5, 0]} />
      </Shape>
      <Shape position={[-4.2, -2.4, -3]} color="#1e3a8a" speed={0.18} factor={0.7}>
        <dodecahedronGeometry args={[0.5, 0]} />
      </Shape>
    </Canvas>
  );
}
