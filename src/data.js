export const workflows = [
  { id: "WF-001", name: "Order Processing", description: "Process new orders from store to warehouse and notify customers", status: "Active", trigger: "Webhook", runs: "2,480", success: "98.2%", updated: "2 min ago" },
  { id: "WF-002", name: "Payment Verification", description: "Verify payment status before fulfilment", status: "Active", trigger: "Webhook", runs: "1,892", success: "96.7%", updated: "5 min ago" },
  { id: "WF-003", name: "Shipping Update", description: "Notify warehouse and customer about shipping", status: "Active", trigger: "Event", runs: "1,245", success: "95.4%", updated: "12 min ago" },
  { id: "WF-004", name: "Customer Notification", description: "Send email and SMS updates to customers", status: "Paused", trigger: "Schedule", runs: "892", success: "92.1%", updated: "1 hour ago" },
  { id: "WF-005", name: "Invoice Generation", description: "Generate invoice documents for completed orders", status: "Active", trigger: "Event", runs: "756", success: "97.8%", updated: "3 min ago" },
  { id: "WF-006", name: "Inventory Sync", description: "Synchronize stock levels with warehouse system", status: "Active", trigger: "Schedule", runs: "623", success: "94.2%", updated: "8 min ago" }
];

export const executions = [
  { id: "EX-1001", name: "Order Processing", status: "Completed", started: "Oct 7, 2024 14:32", duration: "2.4s", ago: "2 min ago" },
  { id: "EX-1002", name: "Payment Processing", status: "Running", started: "Oct 7, 2024 14:28", duration: "1.8s", ago: "6 min ago" },
  { id: "EX-1003", name: "User Registration", status: "Failed", started: "Oct 7, 2024 14:21", duration: "3.2s", ago: "13 min ago" },
  { id: "EX-1004", name: "Email Notification", status: "Completed", started: "Oct 7, 2024 14:15", duration: "1.5s", ago: "19 min ago" },
  { id: "EX-1005", name: "Inventory Update", status: "Completed", started: "Oct 7, 2024 14:10", duration: "2.1s", ago: "24 min ago" },
  { id: "EX-1006", name: "Shipping Update", status: "Failed", started: "Oct 7, 2024 14:02", duration: "3.2s", ago: "32 min ago" },
  { id: "EX-1007", name: "Payment Verification", status: "Running", started: "Oct 7, 2024 13:58", duration: "1.8s", ago: "36 min ago" }
];

export const chartData = [
  { date: "Oct 1", failed: 12, running: 18, successful: 30 },
  { date: "Oct 2", failed: 10, running: 20, successful: 35 },
  { date: "Oct 3", failed: 8, running: 15, successful: 28 },
  { date: "Oct 4", failed: 14, running: 22, successful: 40 },
  { date: "Oct 5", failed: 9, running: 17, successful: 32 },
  { date: "Oct 6", failed: 11, running: 25, successful: 45 },
  { date: "Oct 7", failed: 7, running: 19, successful: 38 }
];

export const integrations = [
  { name: "Stripe", category: "Payment Gateway", status: "Connected", icon: "S" },
  { name: "AWS S3", category: "File Storage", status: "Connected", icon: "A" },
  { name: "SendGrid", category: "Email Service", status: "Connected", icon: "S" },
  { name: "Slack", category: "Communication", status: "Connected", icon: "#" },
  { name: "Shopify", category: "E-commerce", status: "Connected", icon: "S" },
  { name: "Warehouse API", category: "Inventory Management", status: "Needs attention", icon: "W" }
];
