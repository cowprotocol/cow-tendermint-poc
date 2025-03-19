import * as http from 'http';
import { register } from 'prom-client';
import { logger } from './logging';

/**
 * Serves Prometheus metrics on the given port.
 *
 * @param port to serve metrics on, defaults to a random open port
 */
export function serve(port?: number) {
    const metricsServer = http.createServer(async (req, res) => {
        res.writeHead(200, { 'Content-Type': register.contentType });
        res.end(await register.metrics());
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
