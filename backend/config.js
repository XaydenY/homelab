const path = require('path');

// Centralized configuration for the backend. Values may be overridden via environment variables.
module.exports = {
  // System password used to enable full-drive access when provided by a request.
  // Change this in environment with SYSTEM_PASS, or edit this file if you accept the risk.
  SYSTEM_PASS: process.env.SYSTEM_PASS || 'password',

  // When true, file endpoints allow full system access without providing the pass.
  ALLOW_FULL_SYSTEM_ACCESS: String(process.env.ALLOW_FULL_SYSTEM_ACCESS || '').toLowerCase() === 'true',

  // Default storage directory (relative to project).
  STORAGE_DIR: path.join(__dirname, '../storage')
};
