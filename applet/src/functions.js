// applet/src/functions.js
export function formatCurrency(amount) {
  return `$${amount.toFixed(2)}`;
}

export function logActivity(action) {
  console.log(`[ClientEngineering]: ${action}`);
}