// applet/src/index.js
import { formatCurrency, logActivity } from './functions.js';

logActivity('Applet loaded successfully');

// Example: expose utility globally or run applet logic
window.ClientApplet = {
  formatCurrency,
};