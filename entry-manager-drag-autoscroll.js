(() => {
  let active = false;
  let pointerId = null;
  let clientY = 0;
  let raf = 0;

  function stop() {
    active = false;
    pointerId = null;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function tick() {
    if (!active) return;
    const edge = Math.max(70, Math.min(120, window.innerHeight * 0.16));
    let delta = 0;

    if (clientY < edge) {
      const strength = (edge - clientY) / edge;
      delta = -Math.max(5, Math.round(22 * strength));
    } else if (clientY > window.innerHeight - edge) {
      const strength = (clientY - (window.innerHeight - edge)) / edge;
      delta = Math.max(5, Math.round(22 * strength));
    }

    if (delta) window.scrollBy(0, delta);
    raf = requestAnimationFrame(tick);
  }

  document.addEventListener('pointerdown', event => {
    const handle = event.target.closest?.('[data-drag-handle]');
    if (!handle || event.button > 0) return;
    active = true;
    pointerId = event.pointerId;
    clientY = event.clientY;
    if (!raf) raf = requestAnimationFrame(tick);
  }, true);

  window.addEventListener('pointermove', event => {
    if (!active || event.pointerId !== pointerId) return;
    clientY = event.clientY;
  }, { passive: true, capture: true });

  window.addEventListener('pointerup', event => {
    if (active && event.pointerId === pointerId) stop();
  }, true);

  window.addEventListener('pointercancel', event => {
    if (active && event.pointerId === pointerId) stop();
  }, true);
})();
