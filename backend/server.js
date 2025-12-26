const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { getSystemInfo } = require('./services/system');

dotenv.config();
const app = express();
app.use(cors());

app.get('/api/system', async (req, res) => {
  try {
    const info = await getSystemInfo();
    res.json(info);
  } catch (e) {
    res.status(500).json({ error: 'Failed to get system info' });
  }
});

app.get('/api/files', (req, res) => {
  res.json({ message: 'File search coming soon' });
});

app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
