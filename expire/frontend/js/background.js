/* ============================================================
   PRPCEM NOTES – NoteBridge | Interactive Canvas Background
   Animated dotted grid that reacts to mouse movement
   ============================================================ */

(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const config = {
    dotSpacing: 28,
    dotBaseRadius: 1.4,
    dotColor: [59, 130, 246],      // RGB of --primary
    dotColorAlt: [99, 102, 241],   // RGB of --accent
    mouseRadius: 130,
    repelStrength: 0.38,
    baseOpacity: 0.22,
    hoverOpacity: 0.85,
    glowRadius: 180,
  };

  let W, H, dots = [], mouse = { x: -9999, y: -9999 };
  let animId;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    buildDots();
  }

  function buildDots() {
    dots = [];
    const cols = Math.ceil(W / config.dotSpacing) + 1;
    const rows = Math.ceil(H / config.dotSpacing) + 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        dots.push({
          ox: c * config.dotSpacing,
          oy: r * config.dotSpacing,
          x:  c * config.dotSpacing,
          y:  r * config.dotSpacing,
          vx: 0, vy: 0,
          alt: (r + c) % 7 === 0,
        });
      }
    }
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function tick() {
    ctx.clearRect(0, 0, W, H);

    for (const d of dots) {
      const dx = mouse.x - d.ox;
      const dy = mouse.y - d.oy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Repel from cursor
      if (dist < config.mouseRadius) {
        const force = (1 - dist / config.mouseRadius) * config.repelStrength;
        d.vx -= dx / dist * force * 12;
        d.vy -= dy / dist * force * 12;
      }

      // Spring back to origin
      d.vx += (d.ox - d.x) * 0.08;
      d.vy += (d.oy - d.y) * 0.08;

      // Damping
      d.vx *= 0.78;
      d.vy *= 0.78;

      d.x += d.vx;
      d.y += d.vy;

      // Opacity & size based on distance to mouse
      const glowDist = Math.sqrt(
        (mouse.x - d.x) * (mouse.x - d.x) +
        (mouse.y - d.y) * (mouse.y - d.y)
      );
      const t = Math.max(0, 1 - glowDist / config.glowRadius);
      const opacity = lerp(config.baseOpacity, config.hoverOpacity, t * t);
      const radius  = lerp(config.dotBaseRadius, config.dotBaseRadius * 2.8, t * t);

      const color = d.alt ? config.dotColorAlt : config.dotColor;
      ctx.beginPath();
      ctx.arc(d.x, d.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${opacity})`;
      ctx.fill();
    }

    animId = requestAnimationFrame(tick);
  }

  // Events
  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  window.addEventListener('mouseleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });
  window.addEventListener('touchmove', e => {
    const t = e.touches[0];
    mouse.x = t.clientX;
    mouse.y = t.clientY;
  }, { passive: true });
  window.addEventListener('resize', () => {
    cancelAnimationFrame(animId);
    resize();
    tick();
  });

  resize();
  tick();
})();
