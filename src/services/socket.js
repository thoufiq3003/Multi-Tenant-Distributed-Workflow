import { io } from 'socket.io-client';
import { getActiveTenant } from './api';

let socket = null;

export function getSocket() {
  const tenantId = getActiveTenant();
  if (!socket || socket.auth?.tenantId !== tenantId) {
    if (socket) socket.disconnect();
    const wsUrl = import.meta.env.VITE_WS_URL || window.location.origin.replace(/^http/, 'ws').replace(/:5173$/, ':4000');
    socket = io(wsUrl, {
      auth: { tenantId },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      timeout: 10000
    });
  }
  return socket;
}

export function subscribeToTenantEvents(callbacks = {}) {
  const s = getSocket();
  const handlers = [];

  const bind = (event, fn) => {
    if (typeof fn === 'function') {
      s.on(event, fn);
      handlers.push([event, fn]);
    }
  };

  bind('execution:progress', callbacks.onProgress);
  bind('execution:updated', callbacks.onExecutionUpdated);
  bind('workflow:published', callbacks.onWorkflowPublished);

  return () => {
    handlers.forEach(([event, fn]) => s.off(event, fn));
  };
}
