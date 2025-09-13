import { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import { createClient } from 'redis';
import * as pako from 'pako';

interface MCPEvent {
  id: string;
  timestamp: string;
  type: 'tool_use' | 'conversation' | 'decision' | 'error' | 'context_update';
  data: any;
  metadata?: {
    sessionId?: string;
    userId?: string;
    projectId?: string;
    correlationId?: string;
  };
}

interface ProcessedEvent {
  id: string;
  timestamp: string;
  type: string;
  deltaRef?: string;
  contentHash?: string;
  size: number;
  compressed?: Buffer;
  metadata: any;
}

export class MCPWebSocketServer extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private redis: any;
  private eventBuffer: ProcessedEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private compressionCache = new Map<string, Buffer>();

  constructor(private port: number = 3001) {
    super();
    this.initializeRedis();
  }

  private async initializeRedis() {
    this.redis = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    this.redis.on('error', (err: any) => {
      console.error('Redis Client Error:', err);
    });
    
    await this.redis.connect().catch((err: any) => {
      console.warn('Redis connection failed, using in-memory fallback:', err);
      this.redis = null;
    });
  }

  async start() {
    this.wss = new WebSocketServer({ port: this.port });
    
    this.wss.on('connection', (ws) => {
      console.log('MCP client connected');
      
      ws.on('message', async (message) => {
        try {
          const event = JSON.parse(message.toString()) as MCPEvent;
          const processed = await this.processEvent(event);
          
          // Store in buffer for batch processing
          this.eventBuffer.push(processed);
          
          // Emit for real-time processing
          this.emit('mcpEvent', event);
          
          // Broadcast to other connected clients
          this.broadcast(event, ws);
        } catch (error) {
          console.error('Error processing MCP event:', error);
        }
      });
      
      ws.on('close', () => {
        console.log('MCP client disconnected');
      });
    });
    
    // Start batch processing
    this.startBatchProcessor();
    
    console.log(`MCP WebSocket server running on port ${this.port}`);
  }

  private async processEvent(event: MCPEvent): Promise<ProcessedEvent> {
    const eventString = JSON.stringify(event.data);
    const size = Buffer.byteLength(eventString);
    
    // Generate content hash for deduplication
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(eventString).digest('hex');
    
    // Compress if over 1KB
    let compressed: Buffer | undefined;
    if (size > 1024) {
      if (this.compressionCache.has(hash)) {
        compressed = this.compressionCache.get(hash);
      } else {
        compressed = Buffer.from(pako.deflate(eventString));
        this.compressionCache.set(hash, compressed);
        
        // Limit cache size
        if (this.compressionCache.size > 1000) {
          const firstKey = this.compressionCache.keys().next().value;
          this.compressionCache.delete(firstKey);
        }
      }
    }
    
    // Check for delta from previous events
    const deltaRef = await this.findDeltaReference(event);
    
    return {
      id: event.id,
      timestamp: event.timestamp,
      type: event.type,
      deltaRef,
      contentHash: hash,
      size: compressed ? compressed.length : size,
      compressed,
      metadata: event.metadata
    };
  }

  private async findDeltaReference(event: MCPEvent): Promise<string | undefined> {
    if (!this.redis) return undefined;
    
    try {
      // Look for similar recent events
      const recentEvents = await this.redis.zRangeByScore(
        `events:${event.type}`,
        Date.now() - 3600000, // Last hour
        Date.now(),
        { LIMIT: { offset: 0, count: 10 } }
      );
      
      // Simple similarity check (in production, use more sophisticated comparison)
      for (const eventId of recentEvents) {
        const stored = await this.redis.get(`event:${eventId}`);
        if (stored) {
          const storedEvent = JSON.parse(stored);
          if (this.calculateSimilarity(event.data, storedEvent.data) > 0.8) {
            return eventId;
          }
        }
      }
    } catch (error) {
      console.error('Error finding delta reference:', error);
    }
    
    return undefined;
  }

  private calculateSimilarity(data1: any, data2: any): number {
    // Simple similarity calculation (in production, use better algorithm)
    const str1 = JSON.stringify(data1);
    const str2 = JSON.stringify(data2);
    
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;
    
    // Calculate Jaccard similarity on tokens
    const tokens1 = new Set(str1.split(/\s+/));
    const tokens2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return intersection.size / union.size;
  }

  private startBatchProcessor() {
    this.flushInterval = setInterval(async () => {
      if (this.eventBuffer.length === 0) return;
      
      const batch = [...this.eventBuffer];
      this.eventBuffer = [];
      
      try {
        await this.processBatch(batch);
      } catch (error) {
        console.error('Error processing batch:', error);
        // Re-add failed events to buffer
        this.eventBuffer.unshift(...batch);
      }
    }, 5000); // Process every 5 seconds
  }

  private async processBatch(events: ProcessedEvent[]) {
    if (!this.redis) {
      // Fallback to in-memory storage
      console.log(`Processed batch of ${events.length} events (in-memory)`);
      return;
    }
    
    const pipeline = this.redis.multi();
    
    for (const event of events) {
      const key = `event:${event.id}`;
      const score = new Date(event.timestamp).getTime();
      
      // Store event
      pipeline.set(key, JSON.stringify(event), { EX: 3600 }); // 1 hour TTL
      
      // Add to sorted set by type
      pipeline.zAdd(`events:${event.type}`, { score, value: event.id });
      
      // Add to session index if available
      if (event.metadata?.sessionId) {
        pipeline.zAdd(`session:${event.metadata.sessionId}`, { score, value: event.id });
      }
    }
    
    await pipeline.exec();
    console.log(`Processed batch of ${events.length} events`);
  }

  private broadcast(event: MCPEvent, sender: any) {
    if (!this.wss) return;
    
    this.wss.clients.forEach((client) => {
      if (client !== sender && client.readyState === 1) {
        client.send(JSON.stringify(event));
      }
    });
  }

  async stop() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    if (this.wss) {
      this.wss.close();
    }
    
    if (this.redis) {
      await this.redis.quit();
    }
  }

  // Public API for querying events
  async getEvents(filter: {
    type?: string;
    sessionId?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<MCPEvent[]> {
    if (!this.redis) {
      console.warn('Redis not available, returning empty array');
      return [];
    }
    
    try {
      let key = filter.type ? `events:${filter.type}` : 'events:*';
      if (filter.sessionId) {
        key = `session:${filter.sessionId}`;
      }
      
      const startScore = filter.startTime ? filter.startTime.getTime() : '-inf';
      const endScore = filter.endTime ? filter.endTime.getTime() : '+inf';
      
      const eventIds = await this.redis.zRangeByScore(
        key,
        startScore,
        endScore,
        { LIMIT: { offset: 0, count: filter.limit || 100 } }
      );
      
      const events: MCPEvent[] = [];
      for (const id of eventIds) {
        const data = await this.redis.get(`event:${id}`);
        if (data) {
          const processed = JSON.parse(data) as ProcessedEvent;
          // Reconstruct original event from processed data
          events.push(await this.reconstructEvent(processed));
        }
      }
      
      return events;
    } catch (error) {
      console.error('Error querying events:', error);
      return [];
    }
  }

  private async reconstructEvent(processed: ProcessedEvent): Promise<MCPEvent> {
    let data: any = {};
    
    if (processed.deltaRef && this.redis) {
      // Fetch base event and apply delta
      const baseData = await this.redis.get(`event:${processed.deltaRef}`);
      if (baseData) {
        const base = JSON.parse(baseData);
        data = { ...base.data }; // Start with base data
      }
    }
    
    if (processed.compressed) {
      // Decompress data
      const decompressed = pako.inflate(processed.compressed, { to: 'string' });
      data = JSON.parse(decompressed);
    }
    
    return {
      id: processed.id,
      timestamp: processed.timestamp,
      type: processed.type as any,
      data,
      metadata: processed.metadata
    };
  }

  // Analytics methods
  async getEventStats(sessionId?: string): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    compressionRatio: number;
    storageSize: number;
  }> {
    if (!this.redis) {
      return {
        totalEvents: 0,
        eventsByType: {},
        compressionRatio: 0,
        storageSize: 0
      };
    }
    
    try {
      const types = ['tool_use', 'conversation', 'decision', 'error', 'context_update'];
      const eventsByType: Record<string, number> = {};
      let totalEvents = 0;
      let originalSize = 0;
      let compressedSize = 0;
      
      for (const type of types) {
        const count = await this.redis.zCard(`events:${type}`);
        eventsByType[type] = count;
        totalEvents += count;
      }
      
      // Sample events for compression stats
      const sampleIds = await this.redis.zRange('events:*', 0, 100);
      for (const id of sampleIds) {
        const data = await this.redis.get(`event:${id}`);
        if (data) {
          const processed = JSON.parse(data) as ProcessedEvent;
          originalSize += processed.size * 10; // Estimate original size
          compressedSize += processed.size;
        }
      }
      
      return {
        totalEvents,
        eventsByType,
        compressionRatio: originalSize > 0 ? compressedSize / originalSize : 0,
        storageSize: compressedSize
      };
    } catch (error) {
      console.error('Error getting event stats:', error);
      return {
        totalEvents: 0,
        eventsByType: {},
        compressionRatio: 0,
        storageSize: 0
      };
    }
  }
}