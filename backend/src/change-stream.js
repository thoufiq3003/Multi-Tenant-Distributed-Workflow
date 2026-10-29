import { EventEmitter } from 'node:events';
import crypto from 'node:crypto';

// In-Memory Change Stream Event Emitter implementing MongoDB Change Stream Specification
export const changeStreamEmitter = new EventEmitter();

/**
 * Emits a change event matching official MongoDB Change Stream document structure
 * @param {Object} document - The full document inserted or updated
 * @param {string} operationType - 'insert' | 'update' | 'delete'
 * @returns {Object} MongoDB Change Stream Event Payload
 */
export function emitChangeEvent(document, operationType = 'insert') {
  const token = `82${Buffer.from(String(document.id || document._id || Date.now())).toString('hex')}`;
  const changeEvent = {
    _id: { _data: token },
    operationType,
    clusterTime: new Date().toISOString(),
    wallTime: new Date().toISOString(),
    ns: { db: 'flowpilot', coll: 'events' },
    documentKey: { _id: document.id || document._id },
    fullDocument: { ...document }
  };

  changeStreamEmitter.emit('change', changeEvent);
  return changeEvent;
}

/**
 * Initializes the Reactive Change Stream Listener.
 * Reactively detects event document inserts and automatically triggers matching workflows.
 */
export function initChangeStreamListener({ listWorkflows, executeWorkflow, storeExecution, io }) {
  const changeHandler = async (change) => {
    if (change.operationType !== 'insert') return;

    const doc = change.fullDocument;
    if (!doc || !doc.tenantId) return;

    const tenantId = doc.tenantId;
    const eventType = String(doc.eventType || 'webhook.event').toLowerCase();
    const payload = doc.payload || {};

    try {
      // Find active workflows for this tenant
      const allWorkflows = await listWorkflows(tenantId);
      const activeWorkflows = allWorkflows.filter(w => w.status === 'Active');

      // Match workflows that have a trigger node or match eventType
      const matchingWorkflows = activeWorkflows.filter(w => {
        const trigger = (w.nodes || []).find(n =>
          /trigger|start|webhook|event/i.test(`${n.data?.sub || ''} ${n.data?.label || ''}`) ||
          n.type === 'input'
        );
        if (!trigger) return false;
        // If trigger specifies an eventType config, match it; otherwise match any incoming trigger
        const triggerEvent = trigger.data?.config?.eventType;
        if (triggerEvent) {
          return String(triggerEvent).toLowerCase() === eventType;
        }
        return true;
      });

      for (const wf of matchingWorkflows) {
        // Execute workflow reactively with event payload in context
        const execution = await executeWorkflow(wf, {
          retryCount: 2,
          backoffMs: 100,
          context: {
            event: { id: doc.id, eventType, ...payload },
            ...payload
          },
          onStepProgress: (progress) => {
            if (io) {
              io.to(`tenant:${tenantId}`).emit('execution:progress', progress);
            }
          }
        });

        const stored = await storeExecution(tenantId, execution);
        if (io) {
          io.to(`tenant:${tenantId}`).emit('execution:updated', stored);
          io.to(`tenant:${tenantId}`).emit('change-stream:triggered', {
            changeEventId: change._id?._data,
            eventId: doc.id,
            eventType,
            workflowId: wf.id,
            workflowName: wf.name,
            executionId: stored.id
          });
        }
      }
    } catch (err) {
      console.error('[ChangeStream] Error reactively executing workflow:', err.message);
    }
  };

  changeStreamEmitter.on('change', changeHandler);

  // Return unsubscribe helper
  return () => {
    changeStreamEmitter.off('change', changeHandler);
  };
}
