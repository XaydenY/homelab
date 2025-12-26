const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
    res.send('Homelab backend is running!');
});

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
