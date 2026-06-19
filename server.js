// server.js
import './build/instrumentation.server.js';
import { handler } from './build/handler.js';
import http from 'node:http';

const port = process.env.PORT || 4173;
const host = process.env.HOST || '0.0.0.0';

const server = http.createServer(handler);

server.listen(port, host, () => {
  console.log(`Listening on http://${host}:${port}`);
});
