import * as mqtt from 'mqtt';
import { EventEmitter } from 'events';

export interface MqttOptions {
  host: string;
  port?: number;
  username?: string;
  password?: string;
  clientId?: string;
}

export class DirectMqttClient extends EventEmitter {
  private client?: mqtt.MqttClient;
  private options?: MqttOptions;
  private connected: boolean = false;
  private log: (...args: any[]) => void;
  private subscriptions: Set<string> = new Set();

  constructor(logger: (...args: any[]) => void = console.log) {
    super();
    this.log = logger;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public connect(options: MqttOptions): void {
    if (this.client) {
      this.disconnect();
    }

    this.options = options;
    const port = options.port || 1883;
    let url = options.host;
    if (!url.startsWith('mqtt://') && !url.startsWith('tcp://') && !url.startsWith('ws://') && !url.startsWith('wss://')) {
      url = `mqtt://${url}:${port}`;
    }

    this.log(`Connecting directly to MQTT broker: ${url}`);

    const connectOptions: mqtt.IClientOptions = {
      clientId: options.clientId || `homey_nspanel_${Math.random().toString(16).substring(2, 8)}`,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
    };

    if (options.username) {
      connectOptions.username = options.username;
    }
    if (options.password) {
      connectOptions.password = options.password;
    }

    try {
      this.client = mqtt.connect(url, connectOptions);

      this.client.on('connect', () => {
        this.connected = true;
        this.log(`Direct MQTT connected to ${url}`);
        this.emit('connect');

        // Resubscribe to existing subscriptions
        for (const sub of this.subscriptions) {
          this.client?.subscribe(sub);
        }
      });

      this.client.on('message', (topic: string, payload: Buffer) => {
        const msgStr = payload.toString();
        this.emit('message', topic, msgStr);
      });

      this.client.on('error', (err) => {
        this.log(`Direct MQTT error: ${err.message}`);
        this.emit('error', err);
      });

      this.client.on('offline', () => {
        this.connected = false;
        this.log('Direct MQTT went offline');
        this.emit('offline');
      });

      this.client.on('close', () => {
        this.connected = false;
        this.emit('close');
      });
    } catch (err: any) {
      this.log(`Failed to initiate direct MQTT connection: ${err.message}`);
    }
  }

  public subscribe(topic: string): void {
    this.subscriptions.add(topic);
    if (this.client && this.connected) {
      this.client.subscribe(topic, (err) => {
        if (err) this.log(`Error subscribing to ${topic}: ${err.message}`);
        else this.log(`Direct MQTT subscribed to ${topic}`);
      });
    }
  }

  public unsubscribe(topic: string): void {
    this.subscriptions.delete(topic);
    if (this.client && this.connected) {
      this.client.unsubscribe(topic);
    }
  }

  public publish(topic: string, message: string): void {
    if (this.client && this.connected) {
      this.client.publish(topic, message, { qos: 0, retain: false }, (err) => {
        if (err) this.log(`Error publishing to ${topic}: ${err.message}`);
      });
    } else {
      this.log(`Cannot publish to ${topic}: MQTT not connected`);
    }
  }

  public disconnect(): void {
    if (this.client) {
      this.subscriptions.clear();
      this.client.end(true);
      this.client = undefined;
      this.connected = false;
    }
  }
}
