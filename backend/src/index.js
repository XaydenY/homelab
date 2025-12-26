const exspress = require('express');
const app = exspress();
app.get('/', (req, res) => {
    res.send('Home Lab Backend Running!!!');
});
app.listen(3001, () => {
    console.log('Backend server is running on port 3001');
});
