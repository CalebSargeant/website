import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Float, OrbitControls, Text } from "@react-three/drei";
import type { Work } from "../types";

// Interactive 3D timeline of roles — drag to orbit. The hero "wow".
export function Timeline3D({ work }: { work: Work[] }) {
  const span = Math.max(work.length - 1, 1);
  return (
    <div className="h-72 w-full overflow-hidden rounded-2xl border border-slate-200 bg-brand shadow-inner">
      <Canvas camera={{ position: [0, 1.5, 7], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Suspense fallback={null}>
          {work.map((w, i) => {
            const x = (i - span / 2) * 2.6;
            return (
              <Float key={`${w.name}-${i}`} speed={2} rotationIntensity={0.4} floatIntensity={0.7}>
                <mesh position={[x, 0, 0]}>
                  <boxGeometry args={[1.7, 1, 0.3]} />
                  <meshStandardMaterial color="#6366f1" />
                </mesh>
                <Text position={[x, 1.05, 0]} fontSize={0.26} color="white" anchorX="center">
                  {w.position}
                </Text>
                <Text position={[x, -1, 0]} fontSize={0.2} color="#c7d2fe" anchorX="center">
                  {w.name}
                </Text>
                <Text position={[x, -1.34, 0]} fontSize={0.16} color="#94a3b8" anchorX="center">
                  {(w.startDate ?? "") + " – " + (w.endDate || "Now")}
                </Text>
              </Float>
            );
          })}
          <OrbitControls enablePan={false} enableZoom={false} />
        </Suspense>
      </Canvas>
    </div>
  );
}
