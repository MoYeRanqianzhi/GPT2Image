const routes = {};
let currentCleanup = null;

export function registerRoute(hash, handler) {
  routes[hash] = handler;
}

export function navigate(hash, params = {}) {
  navigate._params = params;
  if (window.location.hash === '#' + hash) {
    render();
  } else {
    window.location.hash = hash;
  }
}

let render = () => {};

navigate._params = {};

export function getParams() {
  const p = navigate._params;
  navigate._params = {};
  return p;
}

export function startRouter(container) {
  render = function() {
    const hash = window.location.hash.slice(1) || 'create';
    const handler = routes[hash];
    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }
    if (handler) {
      container.innerHTML = '';
      const result = handler(container);
      currentCleanup = typeof result === 'function' ? result : null;
    }
  };

  window.addEventListener('hashchange', render);
  render();
}
