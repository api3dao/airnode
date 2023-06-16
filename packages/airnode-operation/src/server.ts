import express from 'express';
import morgan from 'morgan';
import { logger } from '@api3/airnode-utilities';

const PORT = 5000;

const app = express();

app.use(morgan('combined'));

app.get('/', (req, res) => res.send('Airnode mock web API is running!'));

app.get('/convert', (req, res) => {
  const { from, to } = req.query;

  if (from === 'ETH' && to === 'USD') {
    res.status(200).send({ result: '723.39202' });
    return;
  }

  res.status(404).send({ error: 'Unknown price pair' });
});

app.listen(PORT, () => {
  logger.log(`Server is running at http://localhost:${PORT}`);
});
