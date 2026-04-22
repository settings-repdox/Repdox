import LightPillar from './LightPillar';

export default function LightPillarBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-50 bg-[#09090b]">
      <LightPillar
        topColor="#5227FF"
        bottomColor="#FF9FFC"
        intensity={1}
        rotationSpeed={0.3}
        glowAmount={0.002}
        pillarWidth={3}
        pillarHeight={0.4}
        noiseIntensity={0.5}
        pillarRotation={25}
        interactive={false}
        mixBlendMode="screen"
        quality="low"
      />
    </div>
  );
}
