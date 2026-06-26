const http = require('http');
const { parse } = require('url');
const next = require('next');
const pino = require('pino');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const logger = pino({ base: { service: 'bridge-app', component: 'server-bootstrap' } });

logger.info(
  { nodeEnv: process.env.NODE_ENV, appEnv: process.env.NEXT_PUBLIC_APP_ENV },
  'Bridge server starting'
);

// Common request handler
const requestHandler = (req, res) => {
  const parsedUrl = parse(req.url, true);

  if (parsedUrl.pathname === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  handle(req, res, parsedUrl);
};

app.prepare().then(() => {
  // HTTP Server (port 9000)
  http.createServer(requestHandler).listen(9000, '0.0.0.0', err => {
    if (err) throw err;
    logger.info('Server started on http://localhost:9000');
  });
});
