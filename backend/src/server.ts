import app from './app';
import { env } from './config/env';

const server = app.listen(env.port, () => {
  console.log(`TaskFlow API listening on http://localhost:${env.port} (${env.nodeEnv})`);
});

export default server;

