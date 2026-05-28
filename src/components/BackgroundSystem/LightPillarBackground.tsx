import { useTheme } from '@/contexts/ThemeContext';
import LightPillar from './LightPillar';

export default function LightPillarBackground() {
  const { theme } = useTheme();

  return (
    <div className={`fixed inset-0 overflow-hidden pointer-events-none -z-50 transition-colors duration-300 ${theme === 'dark' ? 'bg-[#09090b]' : 'bg-[#f8fafc]'}`}>
      <LightPillar
        topColor={theme === 'dark' ? "#5227FF" : "#7c3aed"}
        bottomColor={theme === 'dark' ? "#FF9FFC" : "#db2777"}
        intensity={theme === 'dark' ? 1 : 0.3}
        rotationSpeed={0.3}
        glowAmount={theme === 'dark' ? 0.002 : 0.0005}
        pillarWidth={3}
        pillarHeight={0.4}
        noiseIntensity={0.5}
        pillarRotation={25}
        interactive={false}
        mixBlendMode={theme === 'dark' ? "screen" : "multiply"}
        quality="low"
      />
    </div>
  );
}
