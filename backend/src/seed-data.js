/**
 * Aegisflow — Enterprise Seed Data (50 Workflows & Realistic Execution History)
 * 
 * Provides a comprehensive, production-grade dataset covering:
 * - 25 E-Commerce & Retail Workflows (demo-tenant / Acme Ltd.)
 * - 15 Global Supply Chain & FinTech Workflows (globex-corp / Globex Corp.)
 * - 10 Cloud-Native, DevOps & AI Workflows (stark-tech / Stark Industries)
 */

import crypto from 'node:crypto';

export const DEMO_KEY_RAW = 'fp_demo_7f8a9b0c1d2e3f4a5b6c7d8e';
export const DEMO_KEY_ID = 'demo-key-01';

export const SEEDED_DEMO_KEYS = {
  'demo-tenant': { id: DEMO_KEY_ID, key: DEMO_KEY_RAW, label: 'Default Demo Key' },
  'globex-corp': { id: 'demo-key-globex', key: 'fp_globex_7f8a9b0c1d2e3f4a5b6c7d8e', label: 'Globex Demo Key' },
  'stark-tech': { id: 'demo-key-stark', key: 'fp_stark_7f8a9b0c1d2e3f4a5b6c7d8e', label: 'Stark Demo Key' }
};

export function hashApiKey(rawKey) {
  const pepper = process.env.API_KEY_PEPPER || 'flowpilot-secret-pepper-2026';
  return crypto.createHash('sha256').update(String(rawKey) + pepper).digest('hex');
}

export const WORKFLOW_DEFINITIONS = [
  // ==========================================
  // DEMO-TENANT: ACME LTD. (25 Workflows)
  // ==========================================
  {
    id: 'WF-ACME-001',
    tenantId: 'demo-tenant',
    name: 'E-Commerce Order Fulfillment (Saga)',
    description: 'Process incoming web orders with inventory reservation, payment authorization, shipping label creation, and Saga reverse rollback.',
    status: 'Active',
    executionCount: 42,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Order Received', sub: 'Trigger · Webhook', icon: 'webhook', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Reserve Stock', sub: 'Action · Inventory', icon: 'cart', tone: 'blue', config: { compensatable: true, compensationLabel: 'Release Reserved Stock' } } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Charge Card', sub: 'Action · Stripe API', icon: 'credit-card', tone: 'blue', config: { url: 'https://httpbin.org/post', method: 'POST' } } },
      { id: '4', type: 'flowNode', position: { x: 100, y: 400 }, data: { label: 'Payment OK?', sub: 'Condition', icon: 'branch', tone: 'purple', config: { branchResult: 'yes' } } },
      { id: '5', type: 'flowNode', position: { x: -20, y: 530 }, data: { label: 'Create Shipment', sub: 'Action · FedEx API', icon: 'truck', tone: 'blue' } },
      { id: '6', type: 'flowNode', position: { x: 220, y: 530 }, data: { label: 'Compensate Stock', sub: 'Saga Compensation', icon: 'rotate-ccw', tone: 'red' } },
      { id: '7', type: 'flowNode', position: { x: -20, y: 650 }, data: { label: 'Send Confirmation', sub: 'Action · Email', icon: 'mail', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true },
      { id: 'e3', source: '3', target: '4', animated: true },
      { id: 'e4', source: '4', target: '5', label: 'yes', style: { stroke: '#20a36b' }, labelStyle: { fill: '#20a36b' } },
      { id: 'e5', source: '4', target: '6', label: 'no', style: { stroke: '#e4545b' }, labelStyle: { fill: '#e4545b' } },
      { id: 'e6', source: '5', target: '7', animated: true }
    ],
    settings: { timeoutMinutes: 5, failureBehavior: 'retry-then-compensate' }
  },
  {
    id: 'WF-ACME-002',
    tenantId: 'demo-tenant',
    name: 'Customer Instant Refund Dispatch',
    description: 'Validates customer return items, reverses payment, updates accounting ledger, and issues customer credit notice.',
    status: 'Active',
    executionCount: 28,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Refund Requested', sub: 'Trigger · Event', icon: 'file-text', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Check Eligibility', sub: 'Condition · Policy', icon: 'shield-check', tone: 'purple', config: { branchResult: 'yes' } } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Process Gateway Refund', sub: 'Action · Stripe', icon: 'credit-card', tone: 'blue', config: { compensatable: true } } },
      { id: '4', type: 'flowNode', position: { x: 100, y: 400 }, data: { label: 'Update ERP Ledger', sub: 'Action · NetSuite', icon: 'database', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', label: 'yes', animated: true },
      { id: 'e3', source: '3', target: '4', animated: true }
    ],
    settings: { timeoutMinutes: 3, failureBehavior: 'retry-then-compensate' }
  },
  {
    id: 'WF-ACME-003',
    tenantId: 'demo-tenant',
    name: 'Abandoned Cart Recovery Campaign',
    description: 'Detects cart inactivity after 60 minutes, computes custom incentive discount via isolated JS Sandbox, and sends email notification.',
    status: 'Active',
    executionCount: 65,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Cart Inactive 1hr', sub: 'Trigger · Change Stream', icon: 'clock', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Calculate Discount', sub: 'Transform · JS Sandbox', icon: 'code', tone: 'blue', config: { script: 'return { coupon: "SAVE10", discountedPrice: input.subtotal * 0.9 };' } } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Send Recovery Email', sub: 'Action · Klaviyo', icon: 'mail', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 5, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-ACME-004',
    tenantId: 'demo-tenant',
    name: 'Subscription Tier Upgrade & Billing',
    description: 'Prorates billing cycle, provisions tenant compute quota, updates Stripe subscription, and notifies Slack sales channel.',
    status: 'Active',
    executionCount: 19,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Plan Upgraded', sub: 'Trigger · Webhook', icon: 'zap', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Prorate Invoice', sub: 'Action · Stripe API', icon: 'credit-card', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Expand Quota', sub: 'Action · Rate Limiter', icon: 'gauge', tone: 'blue' } },
      { id: '4', type: 'flowNode', position: { x: 100, y: 400 }, data: { label: 'Post to Slack', sub: 'Action · Slack Webhook', icon: 'message-square', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true },
      { id: 'e3', source: '3', target: '4', animated: true }
    ],
    settings: { timeoutMinutes: 5, failureBehavior: 'retry-then-compensate' }
  },
  {
    id: 'WF-ACME-005',
    tenantId: 'demo-tenant',
    name: 'Flash Sale High-Velocity Inventory Lock',
    description: 'High-throughput stock reservation engine running 500+ requests/min under atomic Redis distributed locks.',
    status: 'Active',
    executionCount: 120,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Flash Checkout', sub: 'Trigger · Event', icon: 'zap', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Acquire SKU Lock', sub: 'Action · Redis', icon: 'lock', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Commit Reservation', sub: 'Action · Database', icon: 'database', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 2, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-ACME-006',
    tenantId: 'demo-tenant',
    name: 'User Registration & Tenant Onboarding',
    description: 'Provisions isolated tenant workspace, generates primary SHA-256 API key, and emails workspace credentials.',
    status: 'Active',
    executionCount: 34,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'User Signed Up', sub: 'Trigger · Auth', icon: 'user-plus', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Provision Tenant DB', sub: 'Action · Mongoose', icon: 'database', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Mint API Key', sub: 'Action · Crypto', icon: 'key', tone: 'blue' } },
      { id: '4', type: 'flowNode', position: { x: 100, y: 400 }, data: { label: 'Send Welcome Email', sub: 'Action · SendGrid', icon: 'mail', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true },
      { id: 'e3', source: '3', target: '4', animated: true }
    ],
    settings: { timeoutMinutes: 5, failureBehavior: 'retry-then-compensate' }
  },
  {
    id: 'WF-ACME-007',
    tenantId: 'demo-tenant',
    name: 'B2B Invoice Tax & VAT Calculation',
    description: 'Executes regional tax rules in secure Node.js VM sandbox, formats compliant tax invoice, and syncs with ERP.',
    status: 'Active',
    executionCount: 15,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Invoice Generated', sub: 'Trigger · Webhook', icon: 'file-text', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Calculate VAT/GST', sub: 'Transform · JS Sandbox', icon: 'code', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Sync NetSuite', sub: 'Action · HTTP POST', icon: 'database', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 3, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-ACME-008',
    tenantId: 'demo-tenant',
    name: 'Automated Return Merchandise Auth (RMA)',
    description: 'Generates prepaid return label via carrier API and alerts receiving warehouse inspection team.',
    status: 'Active',
    executionCount: 22,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'RMA Filed', sub: 'Trigger · Webhook', icon: 'corner-down-left', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Generate Shipping Label', sub: 'Action · UPS API', icon: 'truck', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Notify Warehouse', sub: 'Action · Webhook', icon: 'bell', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 5, failureBehavior: 'retry-then-compensate' }
  },
  {
    id: 'WF-ACME-009',
    tenantId: 'demo-tenant',
    name: 'Customer Loyalty Points Accrual',
    description: 'Aggregates monthly order totals via MongoDB Change Streams and updates customer loyalty rewards tier.',
    status: 'Active',
    executionCount: 58,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Order Completed', sub: 'Trigger · Change Stream', icon: 'database', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Calculate Tier Points', sub: 'Transform · JS Sandbox', icon: 'code', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Update Wallet Balance', sub: 'Action · Database', icon: 'credit-card', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 5, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-ACME-010',
    tenantId: 'demo-tenant',
    name: 'Order Delivery Address Geocoding & Sanitization',
    description: 'Normalizes street address formatting and verifies delivery zone accessibility using Maps API.',
    status: 'Active',
    executionCount: 88,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Address Submitted', sub: 'Trigger · Form', icon: 'map-pin', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Call Geocoder API', sub: 'Action · HTTP GET', icon: 'globe', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Verify Service Area', sub: 'Condition', icon: 'shield-check', tone: 'purple' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 2, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-ACME-011',
    tenantId: 'demo-tenant',
    name: 'Supplier Purchase Order Auto-Restock',
    description: 'Triggered when warehouse SKU falls below safety threshold; dispatches purchase order EDI to manufacturer.',
    status: 'Active',
    executionCount: 14,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Low Stock Alert', sub: 'Trigger · Change Stream', icon: 'alert-triangle', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Generate PO Payload', sub: 'Transform · JS Sandbox', icon: 'code', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Send EDI Order', sub: 'Action · Supplier API', icon: 'truck', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 10, failureBehavior: 'retry-then-compensate' }
  },
  {
    id: 'WF-ACME-012',
    tenantId: 'demo-tenant',
    name: 'Multi-Carrier Shipping Rate Optimization',
    description: 'Queries FedEx, UPS, and DHL APIs in parallel, evaluates delivery ETA, and reserves the lowest cost carrier.',
    status: 'Active',
    executionCount: 73,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Fulfillment Ready', sub: 'Trigger · Event', icon: 'package', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Compare Carrier Rates', sub: 'Action · Multi-HTTP', icon: 'trending-down', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Book Best Carrier', sub: 'Action · Carrier API', icon: 'check-circle', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 3, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-ACME-013',
    tenantId: 'demo-tenant',
    name: 'Customer Support SLA Ticket Escalation',
    description: 'Evaluates ticket priority, checks customer VIP status, and escalates to tier-2 team if unresolved for >4 hours.',
    status: 'Active',
    executionCount: 31,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Zendesk Ticket Webhook', sub: 'Trigger · Webhook', icon: 'help-circle', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Score Urgency', sub: 'Transform · JS Sandbox', icon: 'activity', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Route to On-Call Agent', sub: 'Action · PagerDuty', icon: 'phone-call', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 5, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-ACME-014',
    tenantId: 'demo-tenant',
    name: 'Digital Gift Card Redemption & Hold',
    description: 'Atomic hold on digital gift card balance with rollback compensation if checkout fails.',
    status: 'Active',
    executionCount: 46,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Redeem Gift Card', sub: 'Trigger · Checkout', icon: 'gift', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Hold Balance', sub: 'Action · Ledger', icon: 'lock', tone: 'blue', config: { compensatable: true } } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Burn Card Code', sub: 'Action · Database', icon: 'check', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 2, failureBehavior: 'retry-then-compensate' }
  },
  {
    id: 'WF-ACME-015',
    tenantId: 'demo-tenant',
    name: 'Customer Product Review Moderation',
    description: 'Automated profanity and spam filter via isolated sandbox before publishing review to catalog.',
    status: 'Active',
    executionCount: 61,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'New Review Posted', sub: 'Trigger · Webhook', icon: 'star', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Filter Text Content', sub: 'Transform · JS Sandbox', icon: 'code', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Publish to Storefront', sub: 'Action · Database', icon: 'globe', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 3, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-ACME-016',
    tenantId: 'demo-tenant',
    name: 'Dynamic Pricing & Margin Adjustment',
    description: 'Inspects market price changes and adjusts catalog prices within safe profit margin thresholds.',
    status: 'Paused',
    executionCount: 12,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Price Feed Updated', sub: 'Trigger · Cron', icon: 'clock', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Calculate Price Elasticity', sub: 'Transform · JS Sandbox', icon: 'code', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Update Shopify Catalog', sub: 'Action · REST API', icon: 'tag', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 5, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-ACME-017',
    tenantId: 'demo-tenant',
    name: 'Real-Time Fraud & Chargeback Risk Scoring',
    description: 'Inspects customer IP reputation, purchase velocity, and routes suspicious orders to security triage.',
    status: 'Active',
    executionCount: 94,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Pre-Auth Request', sub: 'Trigger · Event', icon: 'shield-alert', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Compute Risk Score', sub: 'Transform · JS Sandbox', icon: 'code', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'High Risk?', sub: 'Condition', icon: 'branch', tone: 'purple' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 2, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-ACME-018',
    tenantId: 'demo-tenant',
    name: 'Drop-Shipping Vendor Order Splitting',
    description: 'Splits multi-vendor orders and dispatches sub-orders to appropriate drop-ship suppliers.',
    status: 'Active',
    executionCount: 29,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Order Confirmed', sub: 'Trigger · Webhook', icon: 'shopping-bag', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Split Vendor Packages', sub: 'Transform · JS Sandbox', icon: 'scissors', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Notify Drop-Shippers', sub: 'Action · Webhook', icon: 'send', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 5, failureBehavior: 'retry-then-compensate' }
  },
  {
    id: 'WF-ACME-019',
    tenantId: 'demo-tenant',
    name: 'Net Promoter Score (NPS) Survey Dispatch',
    description: 'Delivers targeted customer satisfaction survey 48 hours post-package delivery.',
    status: 'Active',
    executionCount: 38,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Delivery Confirmed', sub: 'Trigger · Carrier Event', icon: 'check-circle-2', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Schedule Delay (48h)', sub: 'Action · Timer', icon: 'clock', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Dispatch Survey SMS', sub: 'Action · Twilio API', icon: 'smartphone', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 10, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-ACME-020',
    tenantId: 'demo-tenant',
    name: 'Dispute & Chargeback Defense Triage',
    description: 'Gathers order evidence and tracking numbers automatically to fight merchant chargebacks.',
    status: 'Active',
    executionCount: 16,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Chargeback Received', sub: 'Trigger · Stripe Webhook', icon: 'alert-octagon', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Compile Order Evidence', sub: 'Action · Database', icon: 'archive', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Submit Dispute Packet', sub: 'Action · Stripe API', icon: 'file-text', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 5, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-ACME-021',
    tenantId: 'demo-tenant',
    name: 'Warehouse Bin Route Optimization',
    description: 'Sequences warehouse picking items by physical aisle coordinates to minimize picker travel time.',
    status: 'Active',
    executionCount: 50,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Wave Picking Batch', sub: 'Trigger · WMS', icon: 'layers', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Calculate TSP Route', sub: 'Transform · JS Sandbox', icon: 'code', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Push to Handhelds', sub: 'Action · Webhook', icon: 'tablet', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 5, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-ACME-022',
    tenantId: 'demo-tenant',
    name: 'Affiliate Commission Settlement & Payout',
    description: 'Computes monthly attribution commission shares and prepares batch ACH direct deposit payments.',
    status: 'Draft',
    executionCount: 0,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Month End Cycle', sub: 'Trigger · Schedule', icon: 'calendar', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Calculate Referral Payouts', sub: 'Transform · JS Sandbox', icon: 'code', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true }
    ],
    settings: { timeoutMinutes: 15, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-ACME-023',
    tenantId: 'demo-tenant',
    name: 'Cross-Border Customs Duty Calculator',
    description: 'Evaluates HS commodity codes and calculates destination import tariffs in compliance with EU regulations.',
    status: 'Active',
    executionCount: 27,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'International Order', sub: 'Trigger · Event', icon: 'globe', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Tariff Code Lookup', sub: 'Action · Customs DB', icon: 'book', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Attach CN22 Form', sub: 'Action · Document Service', icon: 'file', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 5, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-ACME-024',
    tenantId: 'demo-tenant',
    name: 'Failed Payment Dunning & Smart Retry',
    description: 'Handles declined credit card attempts with smart retry intervals and dunning email notices.',
    status: 'Active',
    executionCount: 35,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Card Declined', sub: 'Trigger · Stripe Event', icon: 'x-circle', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Schedule Smart Retry', sub: 'Action · Retry Engine', icon: 'clock', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Send Update Payment Email', sub: 'Action · Email', icon: 'mail', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 5, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-ACME-025',
    tenantId: 'demo-tenant',
    name: 'Weekly Inventory Write-Down & Depreciation',
    description: 'Calculates dead inventory write-offs and synchronizes journal entries with financial books.',
    status: 'Active',
    executionCount: 8,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Weekly Schedule', sub: 'Trigger · Cron', icon: 'calendar', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Compute Aging SKUs', sub: 'Transform · JS Sandbox', icon: 'code', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Post ERP Journal', sub: 'Action · NetSuite API', icon: 'file-text', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 15, failureBehavior: 'retry-then-fail' }
  },

  // ==========================================
  // GLOBEX-CORP: GLOBEX CORP. (15 Workflows)
  // ==========================================
  {
    id: 'WF-GLOBEX-001',
    tenantId: 'globex-corp',
    name: 'Global Ocean Freight AIS Telemetry Tracking',
    description: 'Streams satellite GPS coordinates of cargo vessels, monitors ETA variations, and alerts receiving port authorities.',
    status: 'Active',
    executionCount: 64,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'AIS Position Ping', sub: 'Trigger · MQTT Stream', icon: 'radio', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Compute Port ETA Delta', sub: 'Transform · JS Sandbox', icon: 'code', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Notify Terminal Ops', sub: 'Action · Port Webhook', icon: 'anchor', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 5, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-GLOBEX-002',
    tenantId: 'globex-corp',
    name: 'Anti-Money Laundering (AML) Sanctions Screening',
    description: 'Cross-checks international wire recipients against OFAC/EU watchlists and freezes suspicious transactions.',
    status: 'Active',
    executionCount: 92,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Wire Transfer Initiated', sub: 'Trigger · SWIFT Webhook', icon: 'dollar-sign', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Query OFAC Watchlist', sub: 'Action · Compliance API', icon: 'shield-alert', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Sanctions Match?', sub: 'Condition', icon: 'branch', tone: 'purple' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 2, failureBehavior: 'retry-then-compensate' }
  },
  {
    id: 'WF-GLOBEX-003',
    tenantId: 'globex-corp',
    name: 'Cross-Border FX Hedging & Forward Settlement',
    description: 'Real-time currency rate evaluation executing algorithmic hedge contracts on corporate treasury transactions.',
    status: 'Active',
    executionCount: 45,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'FX Threshold Reached', sub: 'Trigger · Rate Stream', icon: 'trending-up', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Execute Forward Contract', sub: 'Action · Treasury API', icon: 'lock', tone: 'blue', config: { compensatable: true } } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Update Balance Sheet', sub: 'Action · SAP ERP', icon: 'database', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 3, failureBehavior: 'retry-then-compensate' }
  },
  {
    id: 'WF-GLOBEX-004',
    tenantId: 'globex-corp',
    name: 'Cold-Chain Pharma IoT Temperature Excursion Alert',
    description: 'Captures IoT sensor telemetry; dispatches emergency refrigeration response if vaccine temperature rises above 4°C.',
    status: 'Active',
    executionCount: 110,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Temp Sensor Stream', sub: 'Trigger · IoT MQTT', icon: 'thermometer', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Evaluate Temperature Delta', sub: 'Transform · JS Sandbox', icon: 'code', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Exceeds 4°C Threshold?', sub: 'Condition', icon: 'alert-triangle', tone: 'purple' } },
      { id: '4', type: 'flowNode', position: { x: 100, y: 400 }, data: { label: 'Dispatch Field Tech', sub: 'Action · Twilio SMS', icon: 'phone-call', tone: 'red' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true },
      { id: 'e3', source: '3', target: '4', label: 'yes', animated: true }
    ],
    settings: { timeoutMinutes: 1, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-GLOBEX-005',
    tenantId: 'globex-corp',
    name: 'Supplier ESG & Sustainability Compliance Verification',
    description: 'Verifies carbon offset and labor compliance audits before approving vendor payment disbursements.',
    status: 'Active',
    executionCount: 20,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Audit Uploaded', sub: 'Trigger · Document', icon: 'file-check', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Verify ISO 14001 Hash', sub: 'Action · Certificate API', icon: 'shield-check', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Release Invoice Hold', sub: 'Action · SAP Finance', icon: 'unlock', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 5, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-GLOBEX-006',
    tenantId: 'globex-corp',
    name: 'Trade Finance Letter of Credit (LoC) Verification',
    description: 'Verifies digital bill of lading cryptographic signatures and releases escrowed trade capital.',
    status: 'Active',
    executionCount: 18,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Bill of Lading Signed', sub: 'Trigger · Blockchain', icon: 'file-text', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Verify Issuing Bank', sub: 'Action · Banking API', icon: 'shield', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Release Escrow Wire', sub: 'Action · SWIFT', icon: 'dollar-sign', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 5, failureBehavior: 'retry-then-compensate' }
  },
  {
    id: 'WF-GLOBEX-007',
    tenantId: 'globex-corp',
    name: 'Customs Clearance Automated Filing',
    description: 'Compiles manifest documents and submits electronic declarations to maritime customs portals.',
    status: 'Active',
    executionCount: 39,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Container Discharged', sub: 'Trigger · Port Event', icon: 'anchor', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Assemble Manifest XML', sub: 'Transform · JS Sandbox', icon: 'code', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Submit to Customs EDI', sub: 'Action · Government API', icon: 'send', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 5, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-GLOBEX-008',
    tenantId: 'globex-corp',
    name: 'Bulk SWIFT Wire Batch Reconciliation',
    description: 'Matches incoming international MT103 wire messages against outstanding enterprise commercial invoices.',
    status: 'Active',
    executionCount: 54,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'SWIFT File Ingestion', sub: 'Trigger · SFTP', icon: 'download', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Reconcile Invoice Numbers', sub: 'Transform · JS Sandbox', icon: 'check-square', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Update Oracle Financials', sub: 'Action · ERP API', icon: 'database', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 10, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-GLOBEX-009',
    tenantId: 'globex-corp',
    name: 'Fleet Telematics Fuel Card Fraud Detection',
    description: 'Compares delivery vehicle GPS telemetry with fuel pump transaction locations to catch fuel theft.',
    status: 'Active',
    executionCount: 82,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Fuel Card Swiped', sub: 'Trigger · Webhook', icon: 'credit-card', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Check Proximity <50m', sub: 'Transform · JS Sandbox', icon: 'map-pin', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Authorize / Decline', sub: 'Condition', icon: 'shield', tone: 'purple' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 1, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-GLOBEX-010',
    tenantId: 'globex-corp',
    name: 'Cross-Docking Logistics Trailer Transfer',
    description: 'Synchronizes inbound freight trailers with departing outbound trucks to eliminate depot storage costs.',
    status: 'Active',
    executionCount: 47,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Inbound Trailer Gate In', sub: 'Trigger · RFID', icon: 'truck', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Assign Outbound Dock Door', sub: 'Action · WMS', icon: 'navigation', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Alert Forklift Team', sub: 'Action · Paging API', icon: 'bell', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 5, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-GLOBEX-011',
    tenantId: 'globex-corp',
    name: 'Vendor SLA Delay Penalty Deduction',
    description: 'Calculates contractual late shipment penalties and deducts liquidated damages from invoice remittances.',
    status: 'Active',
    executionCount: 23,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Late Delivery Logged', sub: 'Trigger · Event', icon: 'clock', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Calculate Contract Penalty', sub: 'Transform · JS Sandbox', icon: 'code', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Adjust Accounts Payable', sub: 'Action · ERP', icon: 'dollar-sign', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 5, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-GLOBEX-012',
    tenantId: 'globex-corp',
    name: 'Dangerous Goods HazMat Transport Compliance',
    description: 'Inspects chemical UN commodity codes against maritime safety rules and issues ADR transport declaration.',
    status: 'Active',
    executionCount: 17,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Chemical Cargo Manifest', sub: 'Trigger · Webhook', icon: 'alert-triangle', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Validate UN / ADR Code', sub: 'Action · Safety Database', icon: 'shield-check', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Issue Placarding Certificate', sub: 'Action · Document API', icon: 'file', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 5, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-GLOBEX-013',
    tenantId: 'globex-corp',
    name: 'European Cross-Border Input VAT Reclaim',
    description: 'Aggregates multi-country EU expense receipts and files automated VAT reclaim forms with fiscal authorities.',
    status: 'Paused',
    executionCount: 9,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Quarterly Reclaim Batch', sub: 'Trigger · Schedule', icon: 'calendar', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Parse Receipts & Tax IDs', sub: 'Transform · JS Sandbox', icon: 'code', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Submit to Tax Authority', sub: 'Action · Tax Portal', icon: 'send', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 10, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-GLOBEX-014',
    tenantId: 'globex-corp',
    name: 'Warehouse Pallet Spot Capacity Forecast',
    description: 'Machine learning forecast of warehouse storage capacity; re-routes overflow shipping containers dynamically.',
    status: 'Active',
    executionCount: 31,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Daily Capacity Poll', sub: 'Trigger · Cron', icon: 'pie-chart', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Capacity <15% Remaining?', sub: 'Condition', icon: 'branch', tone: 'purple' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Divert to Secondary Hub', sub: 'Action · TMS API', icon: 'navigation', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 5, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-GLOBEX-015',
    tenantId: 'globex-corp',
    name: 'Third-Party Logistics (3PL) Surcharge Audit',
    description: 'Audits freight invoices against contract rate cards and automatically flags unauthorized accessorial surcharges.',
    status: 'Draft',
    executionCount: 0,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Carrier EDI 210 Invoice', sub: 'Trigger · EDI Stream', icon: 'file-text', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Audit Line Item Surcharges', sub: 'Transform · JS Sandbox', icon: 'code', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true }
    ],
    settings: { timeoutMinutes: 5, failureBehavior: 'retry-then-fail' }
  },

  // ==========================================
  // STARK-TECH: STARK INDUSTRIES (10 Workflows)
  // ==========================================
  {
    id: 'WF-STARK-001',
    tenantId: 'stark-tech',
    name: 'Autonomous Canary Deployment & Auto-Rollback',
    description: 'Deploys new microservice image to 10% traffic canary pod, monitors error metrics for 5m, auto-rolls back on error budget breach.',
    status: 'Active',
    executionCount: 52,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Release Triggered', sub: 'Trigger · GitHub Action', icon: 'git-commit', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Deploy Canary (10%)', sub: 'Action · Kubernetes API', icon: 'box', tone: 'blue', config: { compensatable: true, compensationLabel: 'Rollback Canary Pods' } } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Monitor Latency (5m)', sub: 'Action · Prometheus', icon: 'activity', tone: 'blue' } },
      { id: '4', type: 'flowNode', position: { x: 100, y: 400 }, data: { label: 'Error Rate < 0.1%?', sub: 'Condition', icon: 'shield-check', tone: 'purple', config: { branchResult: 'yes' } } },
      { id: '5', type: 'flowNode', position: { x: -20, y: 530 }, data: { label: 'Promote 100% Traffic', sub: 'Action · Ingress', icon: 'check-circle', tone: 'blue' } },
      { id: '6', type: 'flowNode', position: { x: 220, y: 530 }, data: { label: 'Saga Rollback Pods', sub: 'Saga Compensation', icon: 'rotate-ccw', tone: 'red' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true },
      { id: 'e3', source: '3', target: '4', animated: true },
      { id: 'e4', source: '4', target: '5', label: 'yes', style: { stroke: '#20a36b' } },
      { id: 'e5', source: '4', target: '6', label: 'no', style: { stroke: '#e4545b' } }
    ],
    settings: { timeoutMinutes: 10, failureBehavior: 'retry-then-compensate' }
  },
  {
    id: 'WF-STARK-002',
    tenantId: 'stark-tech',
    name: 'Distributed LLM Fine-Tuning & Evaluation Pipeline',
    description: 'Preprocesses training corpora in isolated sandbox, launches GPU spot instances, and evaluates validation perplexity.',
    status: 'Active',
    executionCount: 26,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Dataset Committed', sub: 'Trigger · DVC Webhook', icon: 'database', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Tokenize in Sandbox', sub: 'Transform · JS Sandbox', icon: 'cpu', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Launch GPU Cluster', sub: 'Action · Cloud Compute', icon: 'server', tone: 'blue' } },
      { id: '4', type: 'flowNode', position: { x: 100, y: 400 }, data: { label: 'Register Model Weights', sub: 'Action · MLflow', icon: 'box', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true },
      { id: 'e3', source: '3', target: '4', animated: true }
    ],
    settings: { timeoutMinutes: 60, failureBehavior: 'retry-then-compensate' }
  },
  {
    id: 'WF-STARK-003',
    tenantId: 'stark-tech',
    name: 'Zero-Day Vulnerability Auto-Patch & Scan',
    description: 'Triggered by CVE bulletin stream; inspects container image dependencies, applies security patch, and re-scans.',
    status: 'Active',
    executionCount: 37,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'CVE Alert Ingested', sub: 'Trigger · Change Stream', icon: 'shield-alert', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Scan Image Layers', sub: 'Action · Trivy Security', icon: 'search', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Bump Dependency Version', sub: 'Transform · JS Sandbox', icon: 'code', tone: 'blue' } },
      { id: '4', type: 'flowNode', position: { x: 100, y: 400 }, data: { label: 'Push Hardened Image', sub: 'Action · Docker Registry', icon: 'upload-cloud', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true },
      { id: 'e3', source: '3', target: '4', animated: true }
    ],
    settings: { timeoutMinutes: 15, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-STARK-004',
    tenantId: 'stark-tech',
    name: 'IoT Telemetry Pressure Emergency Shutdown',
    description: 'Evaluates real-time sensor streams; trips safety valves immediately upon detecting hydraulic pressure spikes.',
    status: 'Active',
    executionCount: 105,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Hydraulic Sensor Influx', sub: 'Trigger · Socket.IO', icon: 'activity', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Pressure > 3500 PSI?', sub: 'Condition', icon: 'alert-triangle', tone: 'purple' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Trip Emergency Solenoid', sub: 'Action · SCADA Webhook', icon: 'power', tone: 'red' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', label: 'yes', animated: true }
    ],
    settings: { timeoutMinutes: 1, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-STARK-005',
    tenantId: 'stark-tech',
    name: 'Multi-Region Disaster Recovery (DR) Automated Failover',
    description: 'Detects primary region heartbeat loss, promotes read-replica database, and redirects global Cloudflare traffic.',
    status: 'Active',
    executionCount: 14,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Health Check Failed (3x)', sub: 'Trigger · Synthetic Ping', icon: 'heart', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Promote Atlas Secondary', sub: 'Action · MongoDB API', icon: 'database', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Update DNS Anycast', sub: 'Action · Cloudflare API', icon: 'globe', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 5, failureBehavior: 'retry-then-compensate' }
  },
  {
    id: 'WF-STARK-006',
    tenantId: 'stark-tech',
    name: 'Kubernetes Pod Autoscaling & Spot Eviction Rebalance',
    description: 'Handles AWS EC2 spot termination notice (2m warning), cordons node, and drains pods gracefully.',
    status: 'Active',
    executionCount: 78,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Spot Termination Event', sub: 'Trigger · CloudWatch', icon: 'alert-circle', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Cordon & Drain Node', sub: 'Action · K8s kubectl', icon: 'server', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Spin Up Replacement Pods', sub: 'Action · K8s Deployment', icon: 'refresh-cw', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 2, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-STARK-007',
    tenantId: 'stark-tech',
    name: 'Automated Security Penetration & DAST Scan',
    description: 'Weekly scheduled dynamic security scan testing endpoints against OWASP Top 10 vulnerabilities.',
    status: 'Active',
    executionCount: 11,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Weekly Schedule (Sun 2AM)', sub: 'Trigger · Cron', icon: 'clock', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Run OWASP ZAP DAST', sub: 'Action · Security Scanner', icon: 'shield', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Create Jira Security Tickets', sub: 'Action · Jira API', icon: 'check-square', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 30, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-STARK-008',
    tenantId: 'stark-tech',
    name: 'TLS Certificate Expiration & Let\'s Encrypt Auto-Renewal',
    description: 'Monitors TLS certificates expiring within 14 days, issues ACME challenge, and reloads NGINX ingress proxies.',
    status: 'Active',
    executionCount: 24,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Cert Expiry <14 Days', sub: 'Trigger · Certbot', icon: 'lock', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Solve DNS-01 ACME Challenge', sub: 'Action · Let\'s Encrypt', icon: 'key', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Reload Ingress Controllers', sub: 'Action · K8s Reload', icon: 'refresh-ccw', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 5, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-STARK-009',
    tenantId: 'stark-tech',
    name: 'OpenTelemetry P99 Latency Anomaly Alerting',
    description: 'Analyzes distributed trace spans; opens incident if 99th percentile response time degrades beyond 200ms.',
    status: 'Active',
    executionCount: 68,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Latency Spike Trigger', sub: 'Trigger · Jaeger Span', icon: 'activity', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Identify Slow Database Query', sub: 'Transform · JS Sandbox', icon: 'code', tone: 'blue' } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Notify Engineering On-Call', sub: 'Action · PagerDuty', icon: 'bell', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 3, failureBehavior: 'retry-then-fail' }
  },
  {
    id: 'WF-STARK-010',
    tenantId: 'stark-tech',
    name: 'Dead-Letter Queue (DLQ) Auto-Triage & Recovery',
    description: 'Inspects poison-pill failed executions in the DLQ, applies data sanitization transform, and triggers automated replay.',
    status: 'Active',
    executionCount: 41,
    nodes: [
      { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Poison Pill Landed in DLQ', sub: 'Trigger · DLQ Listener', icon: 'alert-triangle', tone: 'green' } },
      { id: '2', type: 'flowNode', position: { x: 100, y: 160 }, data: { label: 'Sanitize Payload Formatting', sub: 'Transform · JS Sandbox', icon: 'code', tone: 'blue', config: { script: 'return { ...input, retryAttempt: (input.retryAttempt || 0) + 1, sanitized: true };' } } },
      { id: '3', type: 'flowNode', position: { x: 100, y: 280 }, data: { label: 'Replay Pipeline Execution', sub: 'Action · Orchestrator API', icon: 'rotate-cw', tone: 'blue' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', animated: true },
      { id: 'e2', source: '2', target: '3', animated: true }
    ],
    settings: { timeoutMinutes: 5, failureBehavior: 'retry-then-fail' }
  }
];

export function generateSeedExecutions() {
  const executions = [];
  const dlqItems = [];

  const now = Date.now();
  let execIndex = 1;

  for (const wf of WORKFLOW_DEFINITIONS) {
    const runsForThisWf = wf.executionCount > 50 ? 5 : wf.executionCount > 20 ? 3 : 2;

    for (let r = 0; r < runsForThisWf; r++) {
      const execId = `EX-${wf.tenantId.slice(0, 4).toUpperCase()}-${String(execIndex).padStart(4, '0')}`;
      execIndex++;

      const isCompensated = r === 1 && wf.nodes.some(n => n.data?.config?.compensatable);
      const isRunning = r === 0 && wf.status === 'Active' && execIndex % 7 === 0;
      const isFailed = r === 2 && !isCompensated && execIndex % 5 === 0;
      const status = isRunning ? 'Running' : isCompensated ? 'Compensated' : isFailed ? 'Failed' : 'Completed';

      const startedAt = new Date(now - (execIndex * 3600 * 1000 * 2) - (r * 15 * 60 * 1000));
      const durationMs = isRunning ? 450 : Math.floor(Math.random() * 800) + 180;
      const finishedAt = isRunning ? null : new Date(startedAt.getTime() + durationMs);

      const steps = wf.nodes.map((n, idx) => {
        const stepStatus = isRunning && idx === wf.nodes.length - 1 ? 'Running'
          : isCompensated && idx === 3 ? 'Failed'
          : isCompensated && idx > 3 ? 'Compensated'
          : isFailed && idx === wf.nodes.length - 1 ? 'Failed'
          : 'Completed';

        return {
          nodeId: n.id,
          name: n.data?.label || `Step ${n.id}`,
          status: stepStatus,
          startedAt: new Date(startedAt.getTime() + idx * 60),
          finishedAt: stepStatus === 'Running' ? null : new Date(startedAt.getTime() + (idx + 1) * 60),
          durationMs: 60,
          output: { status: 'OK', nodeId: n.id, data: { processed: true } }
        };
      });

      const logs = [
        { level: 'INFO', message: `Execution initialized for workflow ${wf.name}`, time: startedAt.toISOString() },
        { level: 'INFO', message: `Tenant isolation context established for ${wf.tenantId}`, time: startedAt.toISOString() }
      ];

      if (status === 'Completed') {
        logs.push({ level: 'INFO', message: `All DAG steps completed successfully in ${durationMs}ms`, time: finishedAt.toISOString() });
      } else if (status === 'Compensated') {
        logs.push({ level: 'WARN', message: `Step execution encountered simulated condition failure; initiating Saga rollback`, time: new Date(startedAt.getTime() + 180).toISOString() });
        logs.push({ level: 'INFO', message: `Saga compensation: Compensating action executed in reverse order successfully`, time: finishedAt.toISOString() });
      } else if (status === 'Failed') {
        logs.push({ level: 'ERROR', message: `Step execution failed: downstream service returned 502 Bad Gateway`, time: finishedAt.toISOString() });
        logs.push({ level: 'WARN', message: `Retry budget exhausted (2 retries). Routing execution to Dead-Letter Queue (DLQ)`, time: finishedAt.toISOString() });

        dlqItems.push({
          id: `DLQ-${execId.slice(3)}`,
          tenantId: wf.tenantId,
          executionId: execId,
          workflowId: wf.id,
          workflowName: wf.name,
          failedStepId: steps[steps.length - 1]?.nodeId || '1',
          failedStepName: steps[steps.length - 1]?.name || 'Downstream Dispatch',
          error: 'HTTP 502 Bad Gateway: downstream service unavailable',
          payload: { orderId: `ORD-${execIndex}`, tenant: wf.tenantId },
          retryCount: 2,
          status: 'dead',
          createdAt: finishedAt
        });
      }

      executions.push({
        id: execId,
        tenantId: wf.tenantId,
        workflowId: wf.id,
        workflowName: wf.name,
        status,
        startedAt,
        finishedAt,
        durationMs,
        retryCount: isCompensated || isFailed ? 2 : 0,
        steps,
        logs,
        error: isFailed ? 'HTTP 502 Bad Gateway: downstream service unavailable' : undefined
      });
    }
  }

  return { executions, dlqItems };
}

