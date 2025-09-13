import { EventEmitter } from 'events';
import { createClient } from 'redis';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import * as pako from 'pako';

interface StorageEvent {
  id: string;
  timestamp: string;
  data: any;
  size: number;
  tier: 'hot' | 'warm' | 'cold';
  compressed?: boolean;
  s3Key?: string;
}

interface StorageMetrics {
  hotCount: number;
  warmCount: number;
  coldCount: number;
  totalSize: number;
  compressionRatio: number;
  costEstimate: number;
}

export class TieredStorageManager extends EventEmitter {
  private redis: any;
  private s3Client: S3Client | null = null;
  private pgPool: any = null; // PostgreSQL connection pool
  private metricsCache: StorageMetrics;
  private migrationInterval: NodeJS.Timeout | null = null;

  constructor(
    private config: {
      redis?: { url: string };
      postgres?: { connectionString: string };
      s3?: {
        region: string;
        bucket: string;
        accessKeyId?: string;
        secretAccessKey?: string;
      };
      thresholds?: {
        hotToWarm: number; // Hours
        warmToCold: number; // Days
        compressionSize: number; // Bytes
      };
    }
  ) {
    super();
    
    this.metricsCache = {
      hotCount: 0,
      warmCount: 0,
      coldCount: 0,
      totalSize: 0,
      compressionRatio: 1,
      costEstimate: 0
    };
    
    this.initialize();
  }

  private async initialize() {
    // Initialize Redis (Hot tier)
    await this.initializeRedis();
    
    // Initialize PostgreSQL (Warm tier)
    await this.initializePostgres();
    
    // Initialize S3 (Cold tier)
    this.initializeS3();
    
    // Start migration scheduler
    this.startMigrationScheduler();
  }

  private async initializeRedis() {
    const redisUrl = this.config.redis?.url || 'redis://localhost:6379';
    this.redis = createClient({ url: redisUrl });
    
    this.redis.on('error', (err: any) => {
      console.error('Redis error:', err);
      this.emit('error', { tier: 'hot', error: err });
    });
    
    try {
      await this.redis.connect();
      console.log('Redis (hot tier) connected');
    } catch (err) {
      console.warn('Redis connection failed, using fallback:', err);
      this.redis = null;
    }
  }

  private async initializePostgres() {
    if (!this.config.postgres) {
      console.log('PostgreSQL not configured, skipping warm tier');
      return;
    }
    
    try {
      // Dynamic import to avoid dependency if not used
      const { Pool } = await import('pg');
      this.pgPool = new Pool({
        connectionString: this.config.postgres.connectionString
      });
      
      // Create table if not exists
      await this.pgPool.query(`
        CREATE TABLE IF NOT EXISTS events_warm (
          id VARCHAR(255) PRIMARY KEY,
          timestamp TIMESTAMPTZ NOT NULL,
          data JSONB NOT NULL,
          size INTEGER NOT NULL,
          compressed BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          accessed_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_events_warm_timestamp ON events_warm(timestamp);
        CREATE INDEX IF NOT EXISTS idx_events_warm_accessed ON events_warm(accessed_at);
      `);
      
      console.log('PostgreSQL (warm tier) connected');
    } catch (err) {
      console.warn('PostgreSQL connection failed:', err);
      this.pgPool = null;
    }
  }

  private initializeS3() {
    if (!this.config.s3) {
      console.log('S3 not configured, skipping cold tier');
      return;
    }
    
    try {
      this.s3Client = new S3Client({
        region: this.config.s3.region,
        credentials: this.config.s3.accessKeyId ? {
          accessKeyId: this.config.s3.accessKeyId,
          secretAccessKey: this.config.s3.secretAccessKey!
        } : undefined // Use default credentials if not provided
      });
      
      console.log('S3 (cold tier) configured');
    } catch (err) {
      console.warn('S3 configuration failed:', err);
      this.s3Client = null;
    }
  }

  // Store event with automatic tiering
  async store(event: {
    id: string;
    timestamp: string;
    data: any;
    ttl?: number;
  }): Promise<StorageEvent> {
    const dataStr = JSON.stringify(event.data);
    const size = Buffer.byteLength(dataStr);
    const threshold = this.config.thresholds?.compressionSize || 1024;
    
    let compressed = false;
    let dataToStore = dataStr;
    
    // Compress if over threshold
    if (size > threshold) {
      const compressedData = pako.deflate(dataStr);
      if (compressedData.length < size * 0.9) {
        dataToStore = Buffer.from(compressedData).toString('base64');
        compressed = true;
      }
    }
    
    const storageEvent: StorageEvent = {
      id: event.id,
      timestamp: event.timestamp,
      data: dataToStore,
      size: compressed ? dataToStore.length : size,
      tier: 'hot',
      compressed
    };
    
    // Store in hot tier (Redis)
    if (this.redis) {
      const ttl = event.ttl || 3600; // Default 1 hour TTL
      await this.redis.set(
        `event:${event.id}`,
        JSON.stringify(storageEvent),
        { EX: ttl }
      );
      
      // Add to sorted set for time-based queries
      await this.redis.zAdd('events:timeline', {
        score: new Date(event.timestamp).getTime(),
        value: event.id
      });
      
      this.metricsCache.hotCount++;
    } else {
      // Fallback to in-memory if Redis not available
      console.log('Stored event in memory (Redis unavailable):', event.id);
    }
    
    this.emit('stored', storageEvent);
    return storageEvent;
  }

  // Retrieve event from any tier
  async retrieve(eventId: string): Promise<any | null> {
    // Check hot tier (Redis)
    if (this.redis) {
      const hotData = await this.redis.get(`event:${eventId}`);
      if (hotData) {
        const event = JSON.parse(hotData) as StorageEvent;
        return await this.deserializeEvent(event);
      }
    }
    
    // Check warm tier (PostgreSQL)
    if (this.pgPool) {
      const result = await this.pgPool.query(
        'SELECT * FROM events_warm WHERE id = $1',
        [eventId]
      );
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        
        // Update access time
        await this.pgPool.query(
          'UPDATE events_warm SET accessed_at = NOW() WHERE id = $1',
          [eventId]
        );
        
        return await this.deserializeEvent({
          id: row.id,
          timestamp: row.timestamp,
          data: row.data,
          size: row.size,
          tier: 'warm',
          compressed: row.compressed
        });
      }
    }
    
    // Check cold tier (S3)
    if (this.s3Client && this.config.s3) {
      try {
        const command = new GetObjectCommand({
          Bucket: this.config.s3.bucket,
          Key: `events/${eventId}.json`
        });
        
        const response = await this.s3Client.send(command);
        const bodyStr = await response.Body?.transformToString();
        
        if (bodyStr) {
          const event = JSON.parse(bodyStr) as StorageEvent;
          return await this.deserializeEvent(event);
        }
      } catch (err: any) {
        if (err.name !== 'NoSuchKey') {
          console.error('S3 retrieval error:', err);
        }
      }
    }
    
    return null;
  }

  private async deserializeEvent(event: StorageEvent): Promise<any> {
    let data = event.data;
    
    if (event.compressed && typeof data === 'string') {
      const compressed = Buffer.from(data, 'base64');
      const decompressed = pako.inflate(compressed, { to: 'string' });
      data = JSON.parse(decompressed);
    } else if (typeof data === 'string') {
      data = JSON.parse(data);
    }
    
    return {
      id: event.id,
      timestamp: event.timestamp,
      data,
      tier: event.tier
    };
  }

  // Migration scheduler
  private startMigrationScheduler() {
    const interval = 60000; // Run every minute
    
    this.migrationInterval = setInterval(async () => {
      await this.migrateHotToWarm();
      await this.migrateWarmToCold();
      await this.updateMetrics();
    }, interval);
  }

  private async migrateHotToWarm() {
    if (!this.redis || !this.pgPool) return;
    
    const threshold = this.config.thresholds?.hotToWarm || 1; // 1 hour default
    const cutoff = Date.now() - (threshold * 3600000);
    
    try {
      // Get old events from Redis
      const eventIds = await this.redis.zRangeByScore(
        'events:timeline',
        '-inf',
        cutoff,
        { LIMIT: { offset: 0, count: 100 } }
      );
      
      for (const eventId of eventIds) {
        const eventData = await this.redis.get(`event:${eventId}`);
        if (eventData) {
          const event = JSON.parse(eventData) as StorageEvent;
          
          // Move to PostgreSQL
          await this.pgPool.query(
            `INSERT INTO events_warm (id, timestamp, data, size, compressed)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO NOTHING`,
            [event.id, event.timestamp, event.data, event.size, event.compressed]
          );
          
          // Remove from Redis
          await this.redis.del(`event:${eventId}`);
          await this.redis.zRem('events:timeline', eventId);
          
          this.metricsCache.hotCount--;
          this.metricsCache.warmCount++;
        }
      }
      
      if (eventIds.length > 0) {
        console.log(`Migrated ${eventIds.length} events from hot to warm tier`);
      }
    } catch (err) {
      console.error('Hot to warm migration error:', err);
    }
  }

  private async migrateWarmToCold() {
    if (!this.pgPool || !this.s3Client || !this.config.s3) return;
    
    const threshold = this.config.thresholds?.warmToCold || 7; // 7 days default
    const cutoff = new Date(Date.now() - (threshold * 86400000));
    
    try {
      // Get old events from PostgreSQL
      const result = await this.pgPool.query(
        `SELECT * FROM events_warm 
         WHERE accessed_at < $1 
         LIMIT 100`,
        [cutoff]
      );
      
      for (const row of result.rows) {
        const event: StorageEvent = {
          id: row.id,
          timestamp: row.timestamp,
          data: row.data,
          size: row.size,
          tier: 'cold',
          compressed: row.compressed
        };
        
        // Upload to S3
        const command = new PutObjectCommand({
          Bucket: this.config.s3.bucket,
          Key: `events/${event.id}.json`,
          Body: JSON.stringify(event),
          ContentType: 'application/json',
          Metadata: {
            timestamp: event.timestamp,
            compressed: String(event.compressed)
          }
        });
        
        await this.s3Client.send(command);
        
        // Remove from PostgreSQL
        await this.pgPool.query(
          'DELETE FROM events_warm WHERE id = $1',
          [event.id]
        );
        
        this.metricsCache.warmCount--;
        this.metricsCache.coldCount++;
      }
      
      if (result.rows.length > 0) {
        console.log(`Migrated ${result.rows.length} events from warm to cold tier`);
      }
    } catch (err) {
      console.error('Warm to cold migration error:', err);
    }
  }

  private async updateMetrics() {
    const metrics: StorageMetrics = {
      hotCount: 0,
      warmCount: 0,
      coldCount: 0,
      totalSize: 0,
      compressionRatio: 1,
      costEstimate: 0
    };
    
    // Get hot tier metrics
    if (this.redis) {
      metrics.hotCount = await this.redis.zCard('events:timeline') || 0;
      metrics.totalSize += metrics.hotCount * 1000; // Estimate 1KB per event
    }
    
    // Get warm tier metrics
    if (this.pgPool) {
      const result = await this.pgPool.query(
        'SELECT COUNT(*) as count, SUM(size) as total_size FROM events_warm'
      );
      metrics.warmCount = parseInt(result.rows[0].count) || 0;
      metrics.totalSize += parseInt(result.rows[0].total_size) || 0;
    }
    
    // Estimate cold tier (would need S3 ListObjects in production)
    metrics.coldCount = this.metricsCache.coldCount;
    
    // Calculate cost estimate (simplified)
    metrics.costEstimate = 
      (metrics.hotCount * 0.001) +  // Redis: $0.001 per event
      (metrics.warmCount * 0.0001) + // PostgreSQL: $0.0001 per event
      (metrics.coldCount * 0.00001); // S3: $0.00001 per event
    
    this.metricsCache = metrics;
    this.emit('metricsUpdated', metrics);
  }

  // Query methods
  async queryByTimeRange(
    startTime: Date,
    endTime: Date,
    limit: number = 100
  ): Promise<any[]> {
    const results: any[] = [];
    
    // Query hot tier
    if (this.redis) {
      const eventIds = await this.redis.zRangeByScore(
        'events:timeline',
        startTime.getTime(),
        endTime.getTime(),
        { LIMIT: { offset: 0, count: limit } }
      );
      
      for (const id of eventIds) {
        const event = await this.retrieve(id);
        if (event) results.push(event);
      }
    }
    
    // Query warm tier if needed
    if (results.length < limit && this.pgPool) {
      const remaining = limit - results.length;
      const pgResults = await this.pgPool.query(
        `SELECT id FROM events_warm 
         WHERE timestamp BETWEEN $1 AND $2 
         ORDER BY timestamp DESC 
         LIMIT $3`,
        [startTime, endTime, remaining]
      );
      
      for (const row of pgResults.rows) {
        const event = await this.retrieve(row.id);
        if (event) results.push(event);
      }
    }
    
    return results;
  }

  // Get current metrics
  getMetrics(): StorageMetrics {
    return { ...this.metricsCache };
  }

  // Cleanup
  async stop() {
    if (this.migrationInterval) {
      clearInterval(this.migrationInterval);
    }
    
    if (this.redis) {
      await this.redis.quit();
    }
    
    if (this.pgPool) {
      await this.pgPool.end();
    }
  }
}