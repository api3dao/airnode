import express from 'express';

const app = express();
const PORT = 5000;

app.get('/', (req, res) => res.send('Airnode mock web API is running!'));

app.get('/convert', (req, res) => {
  const { from, to } = req.query;

  if (from === 'ETH' && to === 'USD') {
    res.status(200).send({ success: true, result: '723.392028' });
    return;
  }

  res.status(500).send({ success: false, error: 'Unknown price pair' });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
