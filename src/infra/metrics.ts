import * as http from 'http';
import { register } from 'prom-client';
import { logger } from './logging';

export function serve(port?: number) {
  const metricsServer = http.createServer(async (req, res) => {
    if (req.url === '/metrics') {
      res.writeHead(200, { 'Content-Type': register.contentType });
      res.end(await register.metrics());
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });
  
  metricsServer.listen( () => {
    logger('metrics').info(`Serving metrics on port ${metricsServer.address()?.port}`);
  }); 
}
