const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { getSystemInfo } = require('./services/system');
const fs = require('fs').promises;
const config = require('./config');
const { SYSTEM_PASS, ALLOW_FULL_SYSTEM_ACCESS, STORAGE_DIR } = config;

dotenv.config();
const app = express();
app.use(cors());

// System pass handling. If a request supplies the correct pass, `req.systemAuth` will be true
// and routes will grant full-drive access. The canonical values are read from `backend/config.js`.
function attachSystemAuth(req, res, next) {
  const key = req.header('x-system-pass') || req.query.system_pass || req.get('Authorization');
  const raw = (key || '').replace(/^Bearer\s+/i, '').trim();
  req.systemAuth = raw && (raw === SYSTEM_PASS);
  next();
}
app.use(attachSystemAuth);

app.get('/api/system', async (req, res) => {
  try {
    const info = await getSystemInfo();
    res.json(info);
  } catch (e) {
    res.status(500).json({ error: 'Failed to get system info' });
  }
});

async function findFiles(dir, q, baseDir, results = [], limit = 200) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (results.length >= limit) break;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await findFiles(full, q, baseDir, results, limit);
      } else if (entry.isFile()) {
        const rel = path.relative(baseDir, full).replace(/\\\\/g, '/');
        if (!q || rel.toLowerCase().includes(q.toLowerCase())) {
          results.push({ path: rel, name: entry.name });
        }
      }
    }
  } catch (e) {
    // ignore permission errors etc.
  }
  return results;
}

app.get('/api/files', async (req, res) => {
  const q = (req.query.q || '').trim();
  const allowFull = req.systemAuth || ALLOW_FULL_SYSTEM_ACCESS;
  const baseDir = allowFull ? path.parse(process.cwd()).root : STORAGE_DIR;
  try {
    const results = await findFiles(baseDir, q, baseDir, [], 500);
    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: 'Failed to search files' });
  }
});

// Directory listing endpoint (non-recursive) for folder browsing
app.get('/api/files/list', async (req, res) => {
  const dir = String(req.query.dir || '').replace(/\\/g, '/');
  const allowFull = req.systemAuth || ALLOW_FULL_SYSTEM_ACCESS;
  const baseDir = allowFull ? path.parse(process.cwd()).root : STORAGE_DIR;
  const target = path.normalize(path.join(baseDir, dir));
  if (!target.startsWith(baseDir)) return res.status(400).json({ error: 'Invalid path' });
  try {
    const entries = await fs.readdir(target, { withFileTypes: true });
    const items = entries.map(e => ({ name: e.name, isDirectory: e.isDirectory() }));
    res.json({ dir: path.relative(baseDir, target).replace(/\\/g,'/') || '', items, total: items.length });
  } catch (e) {
    res.status(500).json({ error: 'Failed to list directory' });
  }
});

// Simple auth-check endpoint: returns whether the provided system_pass is valid
app.get('/api/auth/check', (req, res) => {
  // req.systemAuth is set by middleware attachSystemAuth
  res.json({ authenticated: !!req.systemAuth });
});

// Serve a raw file from storage with path normalization
app.get('/api/files/raw', async (req, res) => {
  const p = String(req.query.path || '');
  if (!p) return res.status(400).json({ error: 'Missing path' });
  const allowFull = req.systemAuth || ALLOW_FULL_SYSTEM_ACCESS;
  const baseDir = allowFull ? path.parse(process.cwd()).root : STORAGE_DIR;
  const normalized = path.normalize(path.join(baseDir, p));
  if (!normalized.startsWith(baseDir)) return res.status(400).json({ error: 'Invalid path' });
  try {
    return res.sendFile(normalized);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to read file' });
  }
});

// Friendly URL for serving storage files: /files/storage/<encoded path>
app.get('/files/storage/*', async (req, res) => {
  const raw = req.params[0] || '';
  if (!raw) return res.status(400).send('Missing file path');
  // decode URI component segments
  let p;
  try { p = decodeURIComponent(raw); } catch (e) { p = raw; }
  const allowFull = req.systemAuth || ALLOW_FULL_SYSTEM_ACCESS;
  const baseDir = allowFull ? path.parse(process.cwd()).root : STORAGE_DIR;
  const normalized = path.normalize(path.join(baseDir, p));
  if (!normalized.startsWith(baseDir)) return res.status(400).send('Invalid path');
  try {
    return res.sendFile(normalized);
  } catch (e) {
    return res.status(500).send('Failed to read file');
  }
});

app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
