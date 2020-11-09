import dotenv from 'dotenv';
import fs from 'fs';
import * as aws from '../src/aws/handler';

dotenv.config();

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

async function invoke() {
  await aws.startCoordinator({ parameters: { config } });
}

invoke();
