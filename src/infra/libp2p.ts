import { createLibp2p, Libp2p } from "libp2p";
import { tcp } from "@libp2p/tcp";
import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { identify } from "@libp2p/identify";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { mdns } from "@libp2p/mdns";
import { logger } from "./logging";

// Mapping of topic to message handler
type Listener = { [id: string]: (message: Uint8Array) => void };

export class Node {
  node: Promise<Libp2p>;
  listeners: Listener[];

  constructor() {
    this.node = createLibp2p({
      transports: [tcp()],
      streamMuxers: [yamux()],
      addresses: {
        listen: ["/ip4/127.0.0.1/tcp/0"],
      },
      connectionEncrypters: [noise()],
      peerDiscovery: [mdns()],
      services: {
        pubsub: gossipsub(),
        identify: identify(),
      },
    }).then((node) => {
      logger.info(`Started ${node.getMultiaddrs()}`);

      node.addEventListener("peer:discovery", (evt) => {
        const peer = evt.detail.id;
        logger.info(`Discovered: ${peer}, connecting...`);
        node.dial(peer).catch((err) => {
          logger.warn(`Failed dialing ${peer}, err: ${err}`);
        });
      });

      node.addEventListener("peer:connect", (evt) => {
        const peer = evt.detail;
        logger.info(`Connected to: ${peer}`);
      });

      setInterval(function () {
        logger.debug(`Connected to ${node.getPeers().length} peers`);
      }, 10000);

      return node;
    });
  }

  public async addListener(listener: Listener) {
    this.node
      .then((node) => {
        for (const topic in listener) {
          const handler = listener[topic];
          node.services.pubsub.subscribe(topic);
          node.services.pubsub.addEventListener("message", (message) => {
            if (message.detail.topic === topic) {
              handler(message.detail.data);
            }
          });
        }
      })
      .catch((err) => {
        logger.warn(`Failed to add listener, err: ${err}`);
      });
  }

  public async publish(topic: string, payload: Uint8Array) {
    const node = await this.node;
    await (node.services.pubsub as PubSub<GossipSubEvents>)
      .publish(topic, payload)
      .catch((err) => {
        logger.warn(`Failed to publish message on topic ${topic}, err: ${err}`);
      });
  }
}
