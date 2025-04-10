import { AddressManagerInit, createLibp2p, Libp2p } from 'libp2p';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { identify } from '@libp2p/identify';
import { gossipsub, GossipsubEvents } from '@chainsafe/libp2p-gossipsub';
import { mdns } from '@libp2p/mdns';
import { bootstrap } from '@libp2p/bootstrap';
import { logger as createLogger, Logger } from './logging';
import { webSockets } from '@libp2p/websockets';
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery';
import { uPnPNAT } from '@libp2p/upnp-nat';
import { Counter, Gauge } from 'prom-client';
import { Components } from 'libp2p/dist/src/components';
import { PeerDiscovery, PubSub } from '@libp2p/interface';

// Mapping of topic to message handler
type Listener = { [id: string]: (message: Uint8Array) => void };

/**
 * Implementation of a libp2p node that can be used to send and receive messages. The latter can be subscribed to by adding listeners.
 */
export class Node {
    node: Promise<Libp2p>;
    listeners: Listener[];
    logger: Logger;

    /**
     *
     * @param bootstrapNode optional multiaddress of a node to bootstrap peers from
     * @param port optional port to listen on (default: random open port)
     * @param multiaddress: optional own multiaddress to announce to peers for connection (e.g. if this node is behind a NAT)
     */
    constructor(bootstrapNode?: string, port?: number, multiaddress?: string) {
        // local variable needed for .then() callbacks
        this.logger = createLogger('libp2p');
        const logger = this.logger;

        this.listeners = [];

        // Set up peer discovery
        const peerDiscovery: Array<(components: Components) => PeerDiscovery> =
            [mdns(), pubsubPeerDiscovery()];
        if (bootstrapNode) {
            peerDiscovery.push(
                bootstrap({
                    list: [bootstrapNode],
                }),
            );
        }

        // Set up incoming connections
        const addresses: AddressManagerInit = {
            listen: [`/ip4/0.0.0.0/tcp/${port}/ws`],
        };
        if (multiaddress) {
            addresses.announce = [multiaddress];
        }

        this.node = createLibp2p({
            transports: [webSockets()],
            streamMuxers: [yamux()],
            addresses,
            connectionEncrypters: [noise()],
            peerDiscovery,
            services: {
                pubsub: gossipsub({allowPublishToZeroTopicPeers: true}),
                identify: identify(),
                upnpNAT: uPnPNAT({
                    autoConfirmAddress: true,
                }),
            },
            
        }).then((node) => {
            logger.info(
                `Node started, peers can connect via: [${node.getMultiaddrs()}]`,
            );

            node.addEventListener('peer:discovery', (evt) => {
                const peer = evt.detail.id;
                logger.info(`Discovered: ${peer}, connecting...`);
                Metrics.discoveries.inc();

                node.dial(peer)
                    .then(() => {
                        Metrics.dials.labels('success').inc();
                    })
                    .catch((err) => {
                        logger.warn(`Failed dialing ${peer}, err: ${err}`);
                        Metrics.dials.labels('error').inc();
                    });
            });

            node.addEventListener('peer:connect', (evt) => {
                const peer = evt.detail;
                logger.info(`Connected to: ${peer}`);
                Metrics.connections.inc();
            });

            setInterval(function () {
                logger.info(`Connected to ${node.getPeers().length} peers`);
                Metrics.connectedPeers.set(node.getPeers().length);
            }, 10000);
            return node;
        });
    }

    /**
     * Add a listener. The message handler for a given topic will be called when a message is received on that topic.
     *
     * @param listener mapping of topic to message handler
     */
    public async addListener(listener: Listener) {
        const logger = this.logger;
        this.node
            .then((node) => {
                for (const topic in listener) {
                    const handler = listener[topic];
                    const pubsub = node.services
                        .pubsub as PubSub<GossipsubEvents>;
                    pubsub.subscribe(topic);
                    pubsub.addEventListener('message', (message) => {
                        if (message.detail.topic === topic) {
                            handler(message.detail.data);
                        }
                        Metrics.incomingMessages.labels(topic).inc();
                    });
                }
            })
            .catch((err) => {
                logger.warn(`Failed to add listener, err: ${err}`);
            });
    }

    /**
     * Publish a message on a topic.
     *
     * @param topic the topic to publish on
     * @param payload the message to publish
     */
    public async publish(topic: string, payload: Uint8Array) {
        const node = await this.node;
        const logger = this.logger;
        await (node.services.pubsub as PubSub<GossipsubEvents>)
            .publish(topic, payload)
            .then(() => {
                Metrics.outgoingMessages.labels(topic, 'success').inc();
            })
            .catch((err: Error) => {
                logger.warn(
                    `Failed to publish message on topic ${topic}, err: ${err}`,
                );
                Metrics.outgoingMessages.labels(topic, 'error').inc();
            });
    }
}

namespace Metrics {
    export const connectedPeers = new Gauge({
        name: 'libp2p_connected_peers',
        help: 'Total number of connected peers',
    });

    export const discoveries = new Counter({
        name: 'libp2p_discoveries',
        help: 'Counter when a new peer is discovered',
    });

    export const connections = new Counter({
        name: 'libp2p_connections',
        help: 'Counter when a new peer is connected',
    });

    export const dials = new Counter({
        name: 'libp2p_dials',
        help: 'Counter when a new peer is dialed',
        labelNames: ['result'],
    });

    export const incomingMessages = new Counter({
        name: 'libp2p_incoming_messages',
        help: 'Counter when a new message is received',
        labelNames: ['topic'],
    });

    export const outgoingMessages = new Counter({
        name: 'libp2p_outgoing_messages',
        help: 'Counter when a message is published',
        labelNames: ['topic', 'result'],
    });
}
