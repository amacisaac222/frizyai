# Scalable & Data-Efficient Architecture for Frizy.ai

## Current Issues with Initial Design

### Problems:
1. **Data Volume**: 50-200 events per session × thousands of users = millions of events/day
2. **Storage Cost**: Storing full tool outputs and patches = ~10-50KB per event
3. **Query Performance**: Searching through nested JSON structures is slow
4. **Real-time Processing**: WebSocket connections don't scale horizontally
5. **Memory Usage**: Keeping 100 events in React state per component is wasteful

## Optimized Architecture

### 1. Event Stream Processing (Write Path)

```typescript
// Use event sourcing with CQRS pattern
interface CompressedEvent {
  id: string;          // 8 bytes (UUID)
  timestamp: number;   // 8 bytes (Unix timestamp)
  type: EventType;     // 1 byte (enum)
  projectId: string;   // 8 bytes
  sessionId: string;   // 8 bytes
  // Compressed payload - only deltas and references
  payload: Buffer;     // Variable, avg 200 bytes after compression
}

// Event compression pipeline
class EventCompressor {
  compress(event: MCPStreamEvent): CompressedEvent {
    // 1. Extract only changed data (deltas)
    const delta = this.extractDelta(event);
    
    // 2. Use reference IDs for repeated data
    const refs = this.extractReferences(event);
    
    // 3. Compress with zstd (better than gzip for small data)
    const compressed = zstd.compress(JSON.stringify({ delta, refs }));
    
    return {
      id: generateId(),
      timestamp: Date.now(),
      type: event.type,
      projectId: event.projectId,
      sessionId: event.sessionId,
      payload: compressed
    };
  }
}
```

### 2. Tiered Storage Strategy

```yaml
# Data lifecycle management
tiers:
  hot:  # Last 24 hours - Redis
    storage: Redis
    format: JSON
    access: <10ms
    cost: $$$
    
  warm: # 1-30 days - PostgreSQL
    storage: PostgreSQL + TimescaleDB
    format: JSONB with indexes
    access: <100ms
    cost: $$
    
  cold: # 30+ days - S3
    storage: S3 + Parquet files
    format: Columnar compression
    access: 1-5s
    cost: $
    
  frozen: # 1+ year - Glacier
    storage: AWS Glacier
    format: Archived Parquet
    access: Hours
    cost: ¢
```

### 3. Smart Aggregation & Summarization

```typescript
// Instead of storing every event, create smart summaries
interface ContextSummary {
  sessionId: string;
  timeWindow: { start: Date; end: Date };
  
  // Aggregated metrics instead of raw events
  metrics: {
    toolCalls: Map<ToolType, number>;
    tokensUsed: number;
    filesModified: Set<string>;
    decisionsMode: DecisionType[];
    errorRate: number;
  };
  
  // Only keep important events
  keyEvents: CompressedEvent[]; // Max 10 per session
  
  // Vector embedding for semantic search
  embedding: Float32Array; // 384 dimensions (using all-MiniLM-L6-v2)
}

// Real-time aggregation using sliding windows
class StreamAggregator {
  private windows = new Map<string, SlidingWindow>();
  
  process(event: CompressedEvent) {
    const window = this.getOrCreateWindow(event.sessionId);
    
    // Update metrics (O(1) operation)
    window.updateMetrics(event);
    
    // Only store if important (score > threshold)
    if (this.calculateImportance(event) > 0.7) {
      window.addKeyEvent(event);
    }
    
    // Flush to storage every 1000 events or 5 minutes
    if (window.shouldFlush()) {
      this.flushToStorage(window);
    }
  }
}
```

### 4. Efficient Query Patterns

```typescript
// Use materialized views for common queries
CREATE MATERIALIZED VIEW context_graph AS
SELECT 
  c.project_id,
  c.session_id,
  c.timestamp,
  -- Pre-computed aggregations
  jsonb_build_object(
    'tool_distribution', 
    jsonb_object_agg(tool_type, count),
    'top_files',
    array_agg(DISTINCT file_path) FILTER (WHERE file_path IS NOT NULL),
    'decision_chain',
    array_agg(decision ORDER BY timestamp) FILTER (WHERE decision IS NOT NULL)
  ) as summary,
  -- Use GIN index for fast full-text search
  to_tsvector('english', content) as search_vector,
  -- Store embedding for similarity search
  embedding::vector(384) as embedding
FROM contexts c
GROUP BY c.project_id, c.session_id, c.timestamp;

CREATE INDEX idx_context_search ON context_graph USING GIN(search_vector);
CREATE INDEX idx_context_embedding ON context_graph USING ivfflat(embedding);
```

### 5. Client-Side Optimization

```typescript
// Virtual scrolling for large datasets
import { FixedSizeList } from 'react-window';

// Lazy loading with intersection observer
const LazyContextBlock = ({ contextId }) => {
  const [data, setData] = useState(null);
  const ref = useRef();
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !data) {
          // Only load when visible
          fetchContext(contextId).then(setData);
        }
      }
    );
    
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [contextId, data]);
  
  return <div ref={ref}>{data ? <ContextBlock {...data} /> : <Skeleton />}</div>;
};

// Use React Query for intelligent caching
const useContexts = (projectId) => {
  return useQuery({
    queryKey: ['contexts', projectId],
    queryFn: () => fetchContexts(projectId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    // Only fetch what's needed
    select: (data) => data.slice(0, 50) // Initial load limit
  });
};
```

### 6. Distributed Processing with Edge Functions

```typescript
// Process events at the edge before they hit main servers
export default {
  async fetch(request: Request, env: Env) {
    const event = await request.json();
    
    // 1. Validate and sanitize at edge
    if (!isValidEvent(event)) {
      return new Response('Invalid event', { status: 400 });
    }
    
    // 2. Compress and batch at edge
    const compressed = compress(event);
    env.BATCH_QUEUE.push(compressed);
    
    // 3. If batch full, send to main processing
    if (env.BATCH_QUEUE.length >= 100) {
      await sendBatch(env.BATCH_QUEUE);
      env.BATCH_QUEUE = [];
    }
    
    // 4. Return immediately (don't wait for processing)
    return new Response('Accepted', { status: 202 });
  }
};
```

## Performance Metrics

### Before Optimization:
- **Storage**: ~50KB per event × 200 events = 10MB per session
- **Query Time**: 500ms-2s for complex searches
- **Memory**: 100 events × 10KB = 1MB per component
- **Network**: Continuous WebSocket streams
- **Cost**: ~$0.10 per user session

### After Optimization:
- **Storage**: ~200 bytes per event (compressed) + 2KB summary = 42KB per session (95% reduction)
- **Query Time**: <100ms using materialized views and indexes
- **Memory**: 10 key events × 200 bytes = 2KB per component (99% reduction)
- **Network**: Batched updates every 5 seconds
- **Cost**: ~$0.001 per user session (99% reduction)

## Scalability Targets

- **Users**: 100,000 concurrent
- **Events**: 10M events/day
- **Storage**: 1TB hot, 10TB warm, unlimited cold
- **Latency**: p50 < 50ms, p99 < 200ms
- **Cost**: < $1000/month for infrastructure

## Implementation Priority

1. **Phase 1**: Event compression and batching (Week 1)
2. **Phase 2**: Tiered storage with TimescaleDB (Week 2)
3. **Phase 3**: Materialized views and indexes (Week 3)
4. **Phase 4**: Client-side optimizations (Week 4)
5. **Phase 5**: Edge processing with Cloudflare Workers (Week 5)

## Monitoring & Alerts

```yaml
metrics:
  - event_processing_lag: < 1s
  - storage_usage_by_tier: track migration between tiers
  - query_performance_p99: < 200ms
  - compression_ratio: > 90%
  - cost_per_session: < $0.01

alerts:
  - event_backlog > 10000: Scale up processors
  - storage_hot_tier > 80%: Migrate to warm
  - query_time > 500ms: Check indexes
  - error_rate > 1%: Check event validation
```