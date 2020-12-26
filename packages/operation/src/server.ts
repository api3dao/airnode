import express from 'express';

const app = express();
const PORT = 5000;

app.get('/', (req, res) => res.send('Airnode mock web API is running!'));

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
