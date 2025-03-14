import { createLibp2p, Libp2p } from "libp2p";
import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { identify } from "@libp2p/identify";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { mdns } from "@libp2p/mdns";
import { bootstrap } from '@libp2p/bootstrap'
import { logger as createLogger, Logger } from "./logging";
import { webSockets } from "@libp2p/websockets";
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery'
import { uPnPNAT } from '@libp2p/upnp-nat'
import { Counter, Gauge } from "prom-client";

// Mapping of topic to message handler
type Listener = { [id: string]: (message: Uint8Array) => void };

export class Node {
  node: Promise<Libp2p>;
  listeners: Listener[];
  logger: Logger;

  constructor(bootstapNode?: string, port?: number, multiaddress?: string) {
    // local variable needed for .then() callbacks
    this.logger = createLogger("libp2p");
    const logger = this.logger;

    // Set up peer discovery
    const peerDiscovery = [mdns(), pubsubPeerDiscovery()];
    if (bootstapNode) {
      peerDiscovery.push(bootstrap({
        list: [bootstapNode]
      }))
    }

    // Set up incoming connections
    const addresses = {
      listen: [
        `/ip4/0.0.0.0/tcp/${port}/ws`
      ],
    }
    if (multiaddress) {
      addresses.announce = [multiaddress]
    }

    this.node = createLibp2p({
      transports: [webSockets()],
      streamMuxers: [yamux()],
      addresses,
      connectionEncrypters: [noise()],
      peerDiscovery,
      services: {
        pubsub: gossipsub(),
        identify: identify(),
        upnpNAT: uPnPNAT({
          autoConfirmAddress: true
        }),
      },
    }).then((node) => {
      logger.info(`Node started, peers can connect via: [${node.getMultiaddrs()}]`);

      node.addEventListener("peer:discovery", (evt) => {
        const peer = evt.detail.id;
        logger.info(`Discovered: ${peer}, connecting...`);
        Metrics.discoveries.inc();

        node.dial(peer).then(() => {
          Metrics.dials.labels("success").inc();
        }).catch((err) => {
          logger.warn(`Failed dialing ${peer}, err: ${err}`);
          Metrics.dials.labels("error").inc();
        });
      });

      node.addEventListener("peer:connect", (evt) => {
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

  public async addListener(listener: Listener) {
    const logger = this.logger;
    this.node
      .then((node) => {
        for (const topic in listener) {
          const handler = listener[topic];
          node.services.pubsub.subscribe(topic);
          node.services.pubsub.addEventListener("message", (message) => {
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

  public async publish(topic: string, payload: Uint8Array) {
    const node = await this.node;
    const logger = this.logger;
    await (node.services.pubsub as PubSub<GossipSubEvents>)
      .publish(topic, payload)
      .then(() => {
        Metrics.outgoingMessages.labels(topic, "success").inc();
      })
      .catch((err) => {
        logger.warn(`Failed to publish message on topic ${topic}, err: ${err}`);
        Metrics.outgoingMessages.labels(topic, "error").inc();
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
