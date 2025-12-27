const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { getSystemInfo } = require('./services/system');
const fs = require('fs').promises;

dotenv.config();
const app = express();
app.use(cors());

// Simple API key protection for file endpoints (optional)
const FILE_API_KEY = process.env.FILE_API_KEY || null;
function checkApiKey(req, res, next) {
  if (!FILE_API_KEY) return next();
  const key = req.header('x-api-key') || req.query.api_key || req.get('Authorization');
  if (!key) return res.status(401).json({ error: 'Missing API key' });
  // allow 'Bearer <key>' or raw
  const raw = (key || '').replace(/^Bearer\s+/i, '').trim();
  if (raw !== FILE_API_KEY) return res.status(403).json({ error: 'Invalid API key' });
  next();
}

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
  const baseDir = path.join(__dirname, '../frontend/src');
  try {
    const results = await findFiles(baseDir, q, baseDir, [], 500);
    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: 'Failed to search files' });
  }
});

// Directory listing with pagination and optional path parameter
app.get('/api/files/list', checkApiKey, async (req, res) => {
  const baseDir = path.join(__dirname, '../frontend/src');
  const dir = String(req.query.dir || '').replace(/\\/g, '/');
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const perPage = Math.min(200, Math.max(5, parseInt(req.query.per_page || '50', 10)));
  try {
    const safe = path.normalize(path.join(baseDir, dir));
    if (!safe.startsWith(baseDir)) return res.status(400).json({ error: 'Invalid directory' });
    const entries = await fs.readdir(safe, { withFileTypes: true });
    const mapped = entries.map(e => ({ name: e.name, isDirectory: e.isDirectory() }));
    const start = (page - 1) * perPage;
    const pageItems = mapped.slice(start, start + perPage);
    res.json({ dir: path.relative(baseDir, safe).replace(/\\/g, '/'), page, perPage, total: mapped.length, items: pageItems });
  } catch (e) {
    res.status(500).json({ error: 'Failed to list directory' });
  }
});

// Raw file download/preview (restricted)
app.get('/api/files/raw', checkApiKey, async (req, res) => {
  const baseDir = path.join(__dirname, '../frontend/src');
  const p = String(req.query.path || '');
  if (!p) return res.status(400).json({ error: 'Missing path' });
  const normalized = path.normalize(path.join(baseDir, p));
  if (!normalized.startsWith(baseDir)) return res.status(400).json({ error: 'Invalid path' });
  try {
    return res.sendFile(normalized);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to read file' });
  }
});

app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
