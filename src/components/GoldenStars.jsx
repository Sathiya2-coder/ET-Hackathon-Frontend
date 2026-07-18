import React, { useEffect, useRef } from 'react';

export function GoldenStars() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize 80 golden stars
    const stars = [];
    const starCount = 80;
    const colors = [
      'rgba(234, 179, 8, ',   // Gold / Yellow-500
      'rgba(250, 204, 21, ',  // Bright Yellow-400
      'rgba(217, 119, 6, ',   // Amber-600
    ];

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random(),
        twinkleSpeed: Math.random() * 0.015 + 0.005,
        twinkleDirection: Math.random() > 0.5 ? 1 : -1,
        // Slow upward drift
        driftSpeedY: Math.random() * 0.1 + 0.03,
        driftSpeedX: (Math.random() - 0.5) * 0.05,
      });
    }

    // Animation Loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      stars.forEach(star => {
        // Update twinkling opacity
        star.alpha += star.twinkleSpeed * star.twinkleDirection;
        if (star.alpha >= 1) {
          star.alpha = 1;
          star.twinkleDirection = -1;
        } else if (star.alpha <= 0.1) {
          star.alpha = 0.1;
          star.twinkleDirection = 1;
        }

        // Update positions (drift)
        star.y -= star.driftSpeedY;
        star.x += star.driftSpeedX;

        // Wrap around screen edges
        if (star.y < 0) {
          star.y = canvas.height;
          star.x = Math.random() * canvas.width;
        }
        if (star.x < 0) star.x = canvas.width;
        if (star.x > canvas.width) star.x = 0;

        // Draw star
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${star.color}${star.alpha})`;
        ctx.shadowBlur = star.radius * 3;
        ctx.shadowColor = 'rgba(234, 179, 8, 0.5)';
        ctx.fill();
      });

      // Reset shadow fields for performance
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full pointer-events-none z-1 opacity-70"
    />
  );
}

export default GoldenStars;
