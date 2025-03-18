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

    metricsServer.listen(port, () => {
        const address = metricsServer.address();
        if (address && typeof address !== 'string') {
            logger('metrics').info(`Serving metrics on port ${address.port}`);
        } else {
            logger('metrics').info(`Serving metrics via path: ${address}`);
        }
    });
}
