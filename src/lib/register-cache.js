export function registerPublicCache() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  let workspaceReady = false, activeWorker;
  const warm = () => {
    if (!workspaceReady || !activeWorker || navigator.connection?.saveData || ['slow-2g', '2g'].includes(navigator.connection?.effectiveType)) return;
    activeWorker.postMessage({ type: 'WARM_PUBLIC_FILES' });
  };
  window.addEventListener('studentos-workspace-ready', () => {
    workspaceReady = true;
    window.setTimeout(warm, 2000);
  }, { once: true });
  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
      const ready = () => {
        if (!registration.waiting || !navigator.serviceWorker.controller) return;
        window.dispatchEvent(new CustomEvent('studentos-app-update', { detail: () => {
          navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
          registration.waiting?.postMessage({ type: 'ACTIVATE_UPDATE' });
        } }));
      };
      ready();
      registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', ready));
      const active = await navigator.serviceWorker.ready;
      activeWorker = active.active;
      if (workspaceReady) window.setTimeout(warm, 2000);
    } catch { /* Browser caching is optional; network access stays functional. */ }
  };
  // Avoid competing with the initial workspace request or critical images.
  window.setTimeout(register, 1800);
}
