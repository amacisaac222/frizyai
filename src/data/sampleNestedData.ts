export const sampleContainers = [
  {
    id: '1',
    name: 'E-Commerce Platform Migration',
    status: 'active' as const,
    progress: 65,
    lastActivity: '2 hours ago',
    contexts: [
      {
        id: 'ctx-1',
        title: 'Database Schema Migration',
        type: 'action' as const,
        summary: 'Migrating from PostgreSQL 12 to 15 with updated indexing strategy',
        timestamp: '10:30 AM',
        traces: [
          {
            id: 'trace-1',
            name: 'Schema Analysis',
            nodes: [
              {
                id: 'node-1',
                name: 'Table Scanner',
                type: 'input' as const,
                streams: [
                  {
                    id: 'stream-1',
                    timestamp: '10:30:15',
                    content: `SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;`,
                    tokens: 127
                  },
                  {
                    id: 'stream-2',
                    timestamp: '10:30:18',
                    content: `-- Found 47 tables with 312 columns
-- 15 tables require index optimization
-- 3 deprecated column types detected`,
                    tokens: 89
                  }
                ]
              },
              {
                id: 'node-2',
                name: 'Index Optimizer',
                type: 'process' as const,
                streams: [
                  {
                    id: 'stream-3',
                    timestamp: '10:30:45',
                    content: `CREATE INDEX CONCURRENTLY idx_users_email_lower 
ON users(LOWER(email)) 
WHERE deleted_at IS NULL;`,
                    tokens: 95
                  }
                ]
              },
              {
                id: 'node-3',
                name: 'Migration Script',
                type: 'output' as const,
                streams: [
                  {
                    id: 'stream-4',
                    timestamp: '10:31:02',
                    content: `-- Migration completed successfully
-- 47 tables migrated
-- 15 new indexes created
-- Estimated 40% query performance improvement`,
                    tokens: 112
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'ctx-2',
        title: 'API Gateway Configuration',
        type: 'memory' as const,
        summary: 'Storing rate limiting rules and authentication middleware setup',
        timestamp: '11:15 AM',
        traces: [
          {
            id: 'trace-2',
            name: 'Rate Limiter Setup',
            nodes: [
              {
                id: 'node-4',
                name: 'Config Reader',
                type: 'input' as const,
                streams: [
                  {
                    id: 'stream-5',
                    timestamp: '11:15:30',
                    content: `{
  "rateLimits": {
    "api": { "requests": 1000, "window": "1m" },
    "auth": { "requests": 5, "window": "15m" },
    "webhook": { "requests": 100, "window": "1s" }
  }
}`,
                    tokens: 156
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'ctx-3',
        title: 'Load Balancer Decision Tree',
        type: 'decision' as const,
        summary: 'Choosing between ALB vs NLB based on traffic patterns',
        timestamp: '2:00 PM',
        traces: [
          {
            id: 'trace-3',
            name: 'Traffic Analysis',
            nodes: [
              {
                id: 'node-5',
                name: 'Metrics Collector',
                type: 'input' as const,
                streams: [
                  {
                    id: 'stream-6',
                    timestamp: '14:00:12',
                    content: `Average RPS: 10,000
Peak RPS: 45,000
WebSocket connections: 5,000 concurrent
HTTP/2 required: Yes
Sticky sessions: Required for cart`,
                    tokens: 143
                  }
                ]
              },
              {
                id: 'node-6',
                name: 'Decision Engine',
                type: 'process' as const,
                streams: [
                  {
                    id: 'stream-7',
                    timestamp: '14:00:45',
                    content: `Recommendation: Application Load Balancer (ALB)
Reasons:
- HTTP/2 support required
- WebSocket support needed
- Content-based routing for microservices
- Sticky sessions for cart functionality`,
                    tokens: 187
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: '2',
    name: 'ML Model Training Pipeline',
    status: 'completed' as const,
    progress: 100,
    lastActivity: '1 day ago',
    contexts: [
      {
        id: 'ctx-4',
        title: 'Feature Engineering',
        type: 'action' as const,
        summary: 'Created 127 features from raw customer data with PCA reduction',
        timestamp: 'Yesterday 3:00 PM',
        traces: [
          {
            id: 'trace-4',
            name: 'Feature Pipeline',
            nodes: [
              {
                id: 'node-7',
                name: 'Data Preprocessor',
                type: 'input' as const,
                streams: [
                  {
                    id: 'stream-8',
                    timestamp: '15:00:00',
                    content: `import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA

# Load customer data
df = pd.read_parquet('s3://data-lake/customers.parquet')
print(f"Loaded {len(df)} records with {df.shape[1]} columns")`,
                    tokens: 234
                  }
                ]
              },
              {
                id: 'node-8',
                name: 'Feature Creator',
                type: 'process' as const,
                streams: [
                  {
                    id: 'stream-9',
                    timestamp: '15:02:30',
                    content: `# Creating temporal features
df['days_since_signup'] = (pd.Timestamp.now() - df['signup_date']).dt.days
df['purchase_frequency'] = df['total_purchases'] / df['days_since_signup']
df['avg_order_value'] = df['total_spent'] / df['total_purchases'].clip(lower=1)`,
                    tokens: 298
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'ctx-5',
        title: 'Model Selection Results',
        type: 'memory' as const,
        summary: 'XGBoost outperformed RandomForest with 0.89 AUC score',
        timestamp: 'Yesterday 6:00 PM',
        traces: [
          {
            id: 'trace-5',
            name: 'Model Comparison',
            nodes: [
              {
                id: 'node-9',
                name: 'Training Results',
                type: 'output' as const,
                streams: [
                  {
                    id: 'stream-10',
                    timestamp: '18:00:00',
                    content: `Model Performance Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
XGBoost:      AUC: 0.89 | F1: 0.85
RandomForest: AUC: 0.86 | F1: 0.82  
LightGBM:     AUC: 0.88 | F1: 0.84
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                    tokens: 176
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: '3',
    name: 'Security Audit Implementation',
    status: 'pending' as const,
    progress: 15,
    lastActivity: '5 days ago',
    contexts: [
      {
        id: 'ctx-6',
        title: 'Vulnerability Assessment',
        type: 'decision' as const,
        summary: 'Identified 3 critical, 7 high, 15 medium security issues',
        timestamp: '5 days ago',
        traces: [
          {
            id: 'trace-6',
            name: 'Security Scan',
            nodes: [
              {
                id: 'node-10',
                name: 'OWASP Scanner',
                type: 'input' as const,
                streams: [
                  {
                    id: 'stream-11',
                    timestamp: '09:00:00',
                    content: `Starting OWASP ZAP security scan...
Target: https://api.example.com
Profile: Full scan with authentication
Threads: 10`,
                    tokens: 98
                  }
                ]
              },
              {
                id: 'node-11',
                name: 'Report Generator',
                type: 'output' as const,
                streams: [
                  {
                    id: 'stream-12',
                    timestamp: '09:45:00',
                    content: `CRITICAL: SQL Injection in /api/search endpoint
CRITICAL: Exposed API keys in JavaScript bundle
CRITICAL: Missing rate limiting on authentication
HIGH: XSS vulnerability in user comments
HIGH: Insecure direct object references`,
                    tokens: 245
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
];