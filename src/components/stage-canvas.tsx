"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

function createWordTexture(word: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 192;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(212,175,55,.92)";
    context.font = "900 112px Arial Narrow, Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(word, canvas.width / 2, canvas.height / 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function WordPlane({
  word,
  position,
  rotation,
}: {
  word: string;
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  const texture = useMemo(() => createWordTexture(word), [word]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[2.3, 0.58]} />
      <meshBasicMaterial
        map={texture}
        opacity={0.16}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

function Atmosphere() {
  const dustRef = useRef<THREE.Points>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const positions = useMemo(() => {
    const values = new Float32Array(210 * 3);
    for (let index = 0; index < 210; index += 1) {
      const seed = index + 1;
      values[index * 3] = Math.sin(seed * 91.7) * 5.4;
      values[index * 3 + 1] = Math.abs(Math.cos(seed * 47.3)) * 4.4 - 0.2;
      values[index * 3 + 2] = Math.sin(seed * 13.9) * 5 - 2;
    }
    return values;
  }, []);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (dustRef.current) {
      dustRef.current.rotation.y = time * 0.018;
      dustRef.current.position.y = Math.sin(time * 0.18) * 0.05;
    }
    if (beamRef.current) {
      beamRef.current.rotation.z = Math.sin(time * 0.16) * 0.035;
    }
  });

  return (
    <>
      <fog attach="fog" args={["#050505", 3.8, 12]} />
      <ambientLight intensity={0.12} />
      <spotLight
        angle={0.32}
        color="#e8c75b"
        decay={1.7}
        distance={14}
        intensity={34}
        penumbra={0.8}
        position={[2.8, 5.5, 1.2]}
      />
      <mesh
        position={[0.4, -1.3, -1.4]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[13, 10]} />
        <meshStandardMaterial
          color="#111111"
          metalness={0.46}
          roughness={0.55}
        />
      </mesh>
      <mesh
        position={[2.4, 1.6, -1.5]}
        ref={beamRef}
        rotation={[0, 0, -0.14]}
      >
        <coneGeometry args={[1.6, 7, 40, 1, true]} />
        <meshBasicMaterial
          color="#d4af37"
          opacity={0.035}
          side={THREE.DoubleSide}
          transparent
          depthWrite={false}
        />
      </mesh>
      <points ref={dustRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#f1df9c"
          opacity={0.32}
          size={0.025}
          transparent
          sizeAttenuation
          depthWrite={false}
        />
      </points>
      <WordPlane
        position={[2.6, 2.4, -3.6]}
        rotation={[0, -0.22, 0]}
        word="PURPOSE"
      />
      <WordPlane
        position={[-2.7, 1.2, -4.4]}
        rotation={[0, 0.25, 0]}
        word="STRENGTH"
      />
      <WordPlane
        position={[1.5, 0.1, -5.2]}
        rotation={[0, -0.12, 0]}
        word="DESTINY"
      />
    </>
  );
}

export function StageCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 1.05, 5.2], fov: 48 }}
      dpr={[1, 1.5]}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      }}
    >
      <Atmosphere />
    </Canvas>
  );
}

