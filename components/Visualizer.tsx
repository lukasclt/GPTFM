import React from 'react';

interface VisualizerProps {
  isActive: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ isActive }) => {
  // Generate random heights for the bars to create variation
  const bars = Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    delay: Math.random() * 0.5,
    height: isActive ? '100%' : '10%'
  }));

  return (
    <div className="flex items-center justify-center gap-1 h-12 w-full max-w-[200px]">
      {bars.map((bar) => (
        <div
          key={bar.id}
          className={`w-2 bg-gradient-to-t from-green-500 to-emerald-300 rounded-full transition-all duration-300 ${
            isActive ? 'visualizer-bar' : 'h-[10%]'
          }`}
          style={{
            animationDelay: `${bar.delay}s`,
            animationPlayState: isActive ? 'running' : 'paused',
          }}
        />
      ))}
    </div>
  );
};