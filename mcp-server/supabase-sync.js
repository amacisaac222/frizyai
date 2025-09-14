// Supabase Cloud Sync Module for MCP Server
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

export class SupabaseSync {
  constructor(mcpServer, options = {}) {
    this.mcpServer = mcpServer;
    this.options = {
      url: options.url || process.env.VITE_SUPABASE_URL,
      key: options.key || process.env.VITE_SUPABASE_ANON_KEY,
      syncInterval: options.syncInterval || 60000, // 1 minute
      batchSize: options.batchSize || 100,
      enableRealtime: options.enableRealtime !== false,
      autoSync: options.autoSync !== false
    };

    this.supabase = null;
    this.syncTimer = null;
    this.syncQueue = [];
    this.lastSyncTime = null;
    this.isConnected = false;
  }

  async initialize() {
    if (!this.options.url || !this.options.key) {
      console.warn('Supabase credentials not provided. Cloud sync disabled.');
      return false;
    }

    try {
      this.supabase = createClient(this.options.url, this.options.key);

      // Test connection
      const { data, error } = await this.supabase
        .from('sessions')
        .select('id')
        .limit(1);

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      this.isConnected = true;
      console.log('Supabase connection established');

      // Set up realtime subscriptions if enabled
      if (this.options.enableRealtime) {
        await this.setupRealtimeSubscriptions();
      }

      // Start auto-sync if enabled
      if (this.options.autoSync) {
        this.startAutoSync();
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
      this.isConnected = false;
      return false;
    }
  }

  async setupRealtimeSubscriptions() {
    try {
      // Subscribe to session changes
      const sessionChannel = this.supabase
        .channel('sessions')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'sessions'
        }, (payload) => {
          this.handleRealtimeChange('sessions', payload);
        })
        .subscribe();

      // Subscribe to event changes
      const eventChannel = this.supabase
        .channel('events')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'events'
        }, (payload) => {
          this.handleRealtimeChange('events', payload);
        })
        .subscribe();

      console.log('Realtime subscriptions set up');
    } catch (error) {
      console.error('Error setting up realtime subscriptions:', error);
    }
  }

  handleRealtimeChange(table, payload) {
    console.log(`Realtime change in ${table}:`, payload.eventType);

    // Broadcast to connected clients
    this.mcpServer.broadcast({
      type: 'cloud_sync',
      subtype: 'realtime_update',
      table,
      event: payload.eventType,
      data: payload.new || payload.old,
      timestamp: Date.now()
    });
  }

  async syncSession(session) {
    if (!this.isConnected) return null;

    try {
      // Prepare session data for Supabase
      const sessionData = {
        id: session.id,
        project_id: session.project_id,
        title: session.title,
        summary: session.summary,
        started_at: new Date(session.started_at * 1000).toISOString(),
        ended_at: session.ended_at ? new Date(session.ended_at * 1000).toISOString() : null,
        status: session.status,
        context_usage: session.context_usage,
        metadata: session.metadata
      };

      const { data, error } = await this.supabase
        .from('mcp_sessions')
        .upsert(sessionData, {
          onConflict: 'id'
        })
        .select();

      if (error) throw error;

      console.log(`Synced session ${session.id} to cloud`);
      return data[0];
    } catch (error) {
      console.error(`Error syncing session ${session.id}:`, error);
      return null;
    }
  }

  async syncEvents(events) {
    if (!this.isConnected || !events.length) return [];

    try {
      // Batch events for efficient sync
      const eventBatches = [];
      for (let i = 0; i < events.length; i += this.options.batchSize) {
        eventBatches.push(events.slice(i, i + this.options.batchSize));
      }

      const syncedEvents = [];

      for (const batch of eventBatches) {
        const eventData = batch.map(event => ({
          id: event.id,
          trace_id: event.trace_id,
          session_id: event.session_id,
          timestamp: new Date(event.timestamp * 1000).toISOString(),
          type: event.type,
          tool: event.tool,
          data: event.data,
          impact: event.impact,
          tokens_used: event.tokens_used
        }));

        const { data, error } = await this.supabase
          .from('mcp_events')
          .upsert(eventData, {
            onConflict: 'id'
          })
          .select();

        if (error) {
          console.error('Error syncing event batch:', error);
        } else {
          syncedEvents.push(...data);
        }
      }

      console.log(`Synced ${syncedEvents.length} events to cloud`);
      return syncedEvents;
    } catch (error) {
      console.error('Error syncing events:', error);
      return [];
    }
  }

  async syncBlocks(blocks) {
    if (!this.isConnected || !blocks.length) return [];

    try {
      const blockData = blocks.map(block => ({
        id: block.id,
        session_id: block.session_id,
        title: block.title,
        type: block.type,
        summary: block.summary,
        started_at: new Date(block.started_at * 1000).toISOString(),
        ended_at: block.ended_at ? new Date(block.ended_at * 1000).toISOString() : null,
        status: block.status,
        metrics: block.metrics
      }));

      const { data, error } = await this.supabase
        .from('mcp_blocks')
        .upsert(blockData, {
          onConflict: 'id'
        })
        .select();

      if (error) throw error;

      console.log(`Synced ${blocks.length} blocks to cloud`);
      return data;
    } catch (error) {
      console.error('Error syncing blocks:', error);
      return [];
    }
  }

  async syncTraces(traces) {
    if (!this.isConnected || !traces.length) return [];

    try {
      const traceData = traces.map(trace => ({
        id: trace.id,
        block_id: trace.block_id,
        name: trace.name,
        type: trace.type,
        summary: trace.summary,
        duration: trace.duration,
        started_at: new Date(trace.started_at * 1000).toISOString(),
        metadata: trace.metadata
      }));

      const { data, error } = await this.supabase
        .from('mcp_traces')
        .upsert(traceData, {
          onConflict: 'id'
        })
        .select();

      if (error) throw error;

      console.log(`Synced ${traces.length} traces to cloud`);
      return data;
    } catch (error) {
      console.error('Error syncing traces:', error);
      return [];
    }
  }

  async performFullSync() {
    if (!this.isConnected || !this.mcpServer.db) return;

    console.log('Starting full sync to Supabase...');
    const startTime = Date.now();

    try {
      // Get all local data since last sync
      const lastSync = this.lastSyncTime || 0;

      // Get sessions
      const sessions = this.mcpServer.db.db
        .prepare(`SELECT * FROM sessions WHERE started_at > ?`)
        .all(lastSync);

      // Get blocks
      const blocks = this.mcpServer.db.db
        .prepare(`SELECT * FROM blocks WHERE started_at > ?`)
        .all(lastSync);

      // Get traces
      const traces = this.mcpServer.db.db
        .prepare(`SELECT * FROM traces WHERE started_at > ?`)
        .all(lastSync);

      // Get events
      const events = this.mcpServer.db.db
        .prepare(`SELECT * FROM events WHERE timestamp > ?`)
        .all(lastSync);

      // Sync all data
      const results = await Promise.all([
        Promise.all(sessions.map(s => this.syncSession(s))),
        this.syncBlocks(blocks),
        this.syncTraces(traces),
        this.syncEvents(events)
      ]);

      const syncedCount = {
        sessions: results[0].filter(Boolean).length,
        blocks: results[1].length,
        traces: results[2].length,
        events: results[3].length
      };

      this.lastSyncTime = Math.floor(Date.now() / 1000);
      const duration = Date.now() - startTime;

      console.log(`Full sync completed in ${duration}ms:`, syncedCount);

      // Broadcast sync status
      this.mcpServer.broadcast({
        type: 'cloud_sync',
        subtype: 'sync_complete',
        stats: syncedCount,
        duration,
        timestamp: Date.now()
      });

      return syncedCount;
    } catch (error) {
      console.error('Error during full sync:', error);
      return null;
    }
  }

  addToSyncQueue(type, data) {
    this.syncQueue.push({
      id: nanoid(),
      type,
      data,
      timestamp: Date.now()
    });

    // Trigger sync if queue is getting large
    if (this.syncQueue.length >= this.options.batchSize) {
      this.processSyncQueue();
    }
  }

  async processSyncQueue() {
    if (!this.isConnected || this.syncQueue.length === 0) return;

    const itemsToSync = this.syncQueue.splice(0, this.options.batchSize);

    // Group by type
    const grouped = itemsToSync.reduce((acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item.data);
      return acc;
    }, {});

    // Sync each type
    for (const [type, items] of Object.entries(grouped)) {
      switch (type) {
        case 'session':
          await Promise.all(items.map(s => this.syncSession(s)));
          break;
        case 'block':
          await this.syncBlocks(items);
          break;
        case 'trace':
          await this.syncTraces(items);
          break;
        case 'event':
          await this.syncEvents(items);
          break;
      }
    }
  }

  startAutoSync() {
    if (this.syncTimer) return;

    this.syncTimer = setInterval(async () => {
      await this.performFullSync();
      await this.processSyncQueue();
    }, this.options.syncInterval);

    console.log(`Auto-sync started (interval: ${this.options.syncInterval}ms)`);
  }

  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('Auto-sync stopped');
    }
  }

  async fetchRemoteData(type, filters = {}) {
    if (!this.isConnected) return null;

    try {
      let query = this.supabase.from(`mcp_${type}`);

      // Apply filters
      if (filters.sessionId) {
        query = query.eq('session_id', filters.sessionId);
      }
      if (filters.since) {
        query = query.gte('timestamp', new Date(filters.since).toISOString());
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query.select();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error(`Error fetching remote ${type}:`, error);
      return null;
    }
  }

  async getCloudStatus() {
    if (!this.isConnected) {
      return {
        connected: false,
        message: 'Not connected to Supabase'
      };
    }

    try {
      // Get counts from cloud
      const [sessions, events] = await Promise.all([
        this.supabase.from('mcp_sessions').select('id', { count: 'exact', head: true }),
        this.supabase.from('mcp_events').select('id', { count: 'exact', head: true })
      ]);

      return {
        connected: true,
        url: this.options.url,
        lastSync: this.lastSyncTime ? new Date(this.lastSyncTime * 1000).toISOString() : null,
        queueSize: this.syncQueue.length,
        cloudData: {
          sessions: sessions.count || 0,
          events: events.count || 0
        }
      };
    } catch (error) {
      console.error('Error getting cloud status:', error);
      return {
        connected: false,
        error: error.message
      };
    }
  }

  stop() {
    this.stopAutoSync();
    if (this.supabase) {
      this.supabase.removeAllChannels();
    }
    console.log('Supabase sync stopped');
  }
}

export default SupabaseSync;