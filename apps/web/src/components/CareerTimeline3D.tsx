import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Float, OrbitControls, Text } from "@react-three/drei";
import type { Work } from "@app/schemas";

// An interactive 3D timeline of roles — drag to orbit. The "wow" hero.
export function CareerTimeline3D({ work }: { work: Work[] }) {
  const span = Math.max(work.length - 1, 1);
  return (
    <div className="h-72 w-full overflow-hidden rounded-xl border bg-brand">
      <Canvas camera={{ position: [0, 1.5, 7], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Suspense fallback={null}>
          {work.map((w, i) => {
            const x = (i - span / 2) * 2.4;
            return (
              <Float key={`${w.name}-${i}`} speed={2} rotationIntensity={0.4} floatIntensity={0.6}>
                <mesh position={[x, 0, 0]}>
                  <boxGeometry args={[1.6, 1, 0.3]} />
                  <meshStandardMaterial color="#6366f1" />
                </mesh>
                <Text position={[x, 1, 0]} fontSize={0.26} color="white" anchorX="center">
                  {w.position}
                </Text>
                <Text position={[x, -0.95, 0]} fontSize={0.2} color="#c7d2fe" anchorX="center">
                  {w.name}
                </Text>
                <Text position={[x, -1.3, 0]} fontSize={0.16} color="#94a3b8" anchorX="center">
                  {w.startDate ?? ""} – {w.endDate ?? "Now"}
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
