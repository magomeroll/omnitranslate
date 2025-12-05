import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  isActive: boolean;
  volume: number; // 0 to 1
  color?: string;
}

export const Visualizer: React.FC<VisualizerProps> = ({ isActive, volume, color = '#3b82f6' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let offset = 0;

    const draw = () => {
      if (!isActive) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw a flat line
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.strokeStyle = '#334155';
        ctx.stroke();
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;

      // Draw sine wave modulated by volume
      for (let x = 0; x < width; x++) {
        // Create a wave that moves
        const wave = Math.sin((x * 0.05) + offset) * (height / 2.5) * volume;
        const y = centerY + wave;
        
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      
      ctx.stroke();
      
      offset += 0.2;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isActive, volume, color]);

  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={100} 
      className="w-full h-24 rounded-lg bg-slate-900/50 backdrop-blur-sm"
    />
  );
};