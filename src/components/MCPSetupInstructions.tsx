import React, { useState } from 'react';
import { Terminal, Copy, CheckCircle, ChevronRight, Server, GitBranch, Database, Activity, Zap, Info, ExternalLink, Bot, AlertTriangle } from 'lucide-react';

interface MCPSetupInstructionsProps {
  onClose?: () => void;
}

export const MCPSetupInstructions: React.FC<MCPSetupInstructionsProps> = ({ onClose }) => {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'quick' | 'production' | 'features' | 'claude'>('claude');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const copyToClipboard = (text: string, commandId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(commandId);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const QuickStartTab = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-1">Quick Start</h4>
            <p className="text-sm text-gray-300">
              Get started with <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Frizy's</span> MCP server in under 2 minutes. The MCP server tracks your Claude conversations,
              monitors file changes, and provides analytics.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Step 1: Navigate to MCP Server Directory</h3>
          <div className="bg-gray-800 rounded-lg p-3 flex items-center justify-between group">
            <code className="text-sm text-green-400">cd mcp-server</code>
            <button
              onClick={() => copyToClipboard('cd mcp-server', 'cd')}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {copiedCommand === 'cd' ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4 text-gray-400 hover:text-white" />
              )}
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Step 2: Install Dependencies</h3>
          <div className="bg-gray-800 rounded-lg p-3 flex items-center justify-between group">
            <code className="text-sm text-green-400">npm install</code>
            <button
              onClick={() => copyToClipboard('npm install', 'install')}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {copiedCommand === 'install' ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4 text-gray-400 hover:text-white" />
              )}
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Step 3: Start the MCP Server</h3>
          <div className="bg-gray-800 rounded-lg p-3 flex items-center justify-between group">
            <code className="text-sm text-green-400">node index.js</code>
            <button
              onClick={() => copyToClipboard('node index.js', 'start')}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {copiedCommand === 'start' ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4 text-gray-400 hover:text-white" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Server will start on port 3333. You'll see "Ready for connections!" when it's running.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Step 4: Connect Claude Desktop</h3>
          <div className="bg-gray-900 rounded-lg p-4 space-y-3">
            <p className="text-sm text-gray-300">
              Add this to your Claude Desktop config file:
            </p>
            <div className="bg-gray-800 rounded-lg p-3 font-mono text-xs overflow-x-auto">
              <pre className="text-gray-300">
{`{
  "mcpServers": {
    "frizy": {
      "command": "node",
      "args": ["C:/Users/YOUR_USERNAME/Desktop/frizyai/mcp-server/index.js"]
    }
  }
}`}
              </pre>
            </div>
            <p className="text-xs text-gray-500">
              Config location: <code className="bg-gray-800 px-1 py-0.5 rounded">%APPDATA%/Claude/claude_desktop_config.json</code> (Windows)
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const ProductionTab = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Server className="h-5 w-5 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-1">Production Setup</h4>
            <p className="text-sm text-gray-300">
              Advanced configuration with cloud sync, Git integration, and analytics.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Environment Variables</h3>
          <div className="bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-300 mb-3">Create a <code className="bg-gray-800 px-1 py-0.5 rounded">.env</code> file in the mcp-server directory:</p>
            <div className="bg-gray-800 rounded-lg p-3 font-mono text-xs space-y-1">
              <div className="text-gray-400"># Supabase Configuration (Optional)</div>
              <div>VITE_SUPABASE_URL=<span className="text-yellow-400">your-supabase-url</span></div>
              <div>VITE_SUPABASE_ANON_KEY=<span className="text-yellow-400">your-anon-key</span></div>
              <div className="mt-2 text-gray-400"># Server Configuration</div>
              <div>MCP_PORT=<span className="text-blue-400">3333</span></div>
              <div>MCP_DB=<span className="text-blue-400">./frizy-mcp.db</span></div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Start with PM2 (Recommended)</h3>
          <div className="space-y-2">
            <div className="bg-gray-800 rounded-lg p-3 flex items-center justify-between group">
              <code className="text-sm text-green-400">npm install -g pm2</code>
              <button
                onClick={() => copyToClipboard('npm install -g pm2', 'pm2-install')}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copiedCommand === 'pm2-install' ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-400 hover:text-white" />
                )}
              </button>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 flex items-center justify-between group">
              <code className="text-sm text-green-400">pm2 start index.js --name frizy-mcp</code>
              <button
                onClick={() => copyToClipboard('pm2 start index.js --name frizy-mcp', 'pm2-start')}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copiedCommand === 'pm2-start' ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-400 hover:text-white" />
                )}
              </button>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 flex items-center justify-between group">
              <code className="text-sm text-green-400">pm2 save && pm2 startup</code>
              <button
                onClick={() => copyToClipboard('pm2 save && pm2 startup', 'pm2-persist')}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copiedCommand === 'pm2-persist' ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-400 hover:text-white" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Monitoring</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Health Check</div>
              <a href="http://localhost:3333/health" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline flex items-center gap-1">
                localhost:3333/health
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Analytics API</div>
              <a href="http://localhost:3333/analytics" target="_blank" rel="noopener noreferrer" className="text-sm text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 hover:underline flex items-center gap-1">
                localhost:3333/analytics
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const ClaudePromptTab = () => {
    const claudePrompt = `Please help me set up the Frizy MCP (Model Context Protocol) server for tracking Claude conversations and development context.

Here's what I need:

1. First, navigate to the mcp-server directory:
   cd mcp-server

2. Install the required dependencies:
   npm install

3. Create the production MCP server with these features:
   - SQLite database for local storage (sessions, blocks, traces, events)
   - WebSocket server for real-time communication
   - File system watcher using Chokidar for monitoring code changes
   - Git integration for tracking commits and branches
   - Supabase sync for optional cloud storage
   - Analytics dashboard for metrics and monitoring
   - Context usage tracking with warnings at 80% threshold
   - Event batching for efficiency

4. Set up environment variables in a .env file:
   - MCP_PORT=3333
   - MCP_DB=./frizy-mcp.db
   - VITE_SUPABASE_URL=<optional>
   - VITE_SUPABASE_ANON_KEY=<optional>

5. Configure Claude Desktop to connect to the MCP server:
   - Add configuration to %APPDATA%/Claude/claude_desktop_config.json (Windows)
   - Use this config structure:
   {
     "mcpServers": {
       "frizy": {
         "command": "node",
         "args": ["<full-path-to>/mcp-server/index.js"]
       }
     }
   }

6. For production deployment, set up PM2:
   - Install PM2 globally: npm install -g pm2
   - Start server: pm2 start index.js --name frizy-mcp
   - Enable auto-restart: pm2 save && pm2 startup

7. Verify the server is running:
   - Health check: http://localhost:3333/health
   - Analytics API: http://localhost:3333/analytics
   - Check WebSocket connection status

The MCP server should track:
- All Claude conversation sessions
- Work blocks (tasks, explorations, debugging, implementations)
- Tool usage traces and sequences
- Raw events with timestamps and impact levels
- File system changes in real-time
- Git commits and branch changes
- Context usage to prevent exceeding limits

Please set this up step by step and let me know when each component is ready.`;

    const copyPrompt = () => {
      navigator.clipboard.writeText(claudePrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 3000);
    };

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-1">Claude Code Prompt</h4>
              <p className="text-sm text-gray-300">
                Copy this prompt and paste it into Claude Code to have it automatically set up your MCP server.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-400">Setup Prompt for Claude Code</h3>
            <button
              onClick={copyPrompt}
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg text-sm transition-all"
            >
              {copiedPrompt ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy Prompt</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 max-h-96 overflow-y-auto">
            <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
              {claudePrompt}
            </pre>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-400" />
              What Claude Will Do
            </h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Install all dependencies</li>
              <li>• Create necessary files</li>
              <li>• Configure environment</li>
              <li>• Set up PM2 process manager</li>
              <li>• Test connections</li>
              <li>• Verify everything works</li>
            </ul>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              What You'll Get
            </h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Production-ready MCP server</li>
              <li>• Real-time context tracking</li>
              <li>• File system monitoring</li>
              <li>• Git integration</li>
              <li>• Analytics dashboard</li>
              <li>• Cloud sync capability</li>
            </ul>
          </div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-400 mb-1">After Setup</h4>
              <p className="text-sm text-gray-300">
                Remember to restart Claude Desktop after updating the configuration file to establish the MCP connection.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const FeaturesTab = () => (
    <div className="space-y-6">
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-purple-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-purple-400 mb-1">MCP Server Features</h4>
            <p className="text-sm text-gray-300">
              Everything included in your production-ready MCP server.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-blue-400" />
            <h4 className="font-medium">SQLite Database</h4>
          </div>
          <p className="text-sm text-gray-400">
            Local storage for sessions, blocks, traces, and events with automatic indexing.
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-green-400" />
            <h4 className="font-medium">File System Watcher</h4>
          </div>
          <p className="text-sm text-gray-400">
            Monitors code changes in real-time with intelligent debouncing.
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <GitBranch className="h-4 w-4 text-orange-400" />
            <h4 className="font-medium">Git Integration</h4>
          </div>
          <p className="text-sm text-gray-400">
            Tracks commits, branches, and repository status automatically.
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-purple-400" />
            <h4 className="font-medium">Supabase Sync</h4>
          </div>
          <p className="text-sm text-gray-400">
            Optional cloud synchronization with real-time updates.
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            <h4 className="font-medium">Analytics Dashboard</h4>
          </div>
          <p className="text-sm text-gray-400">
            Real-time metrics, performance monitoring, and usage statistics.
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-yellow-400" />
            <h4 className="font-medium">WebSocket Server</h4>
          </div>
          <p className="text-sm text-gray-400">
            Live updates and event streaming to connected clients.
          </p>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-4">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Terminal className="h-4 w-4 text-gray-400" />
          Useful Commands
        </h4>
        <div className="space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between group">
            <code className="text-green-400">pm2 logs frizy-mcp</code>
            <span className="text-gray-500">View server logs</span>
          </div>
          <div className="flex items-center justify-between group">
            <code className="text-green-400">pm2 restart frizy-mcp</code>
            <span className="text-gray-500">Restart server</span>
          </div>
          <div className="flex items-center justify-between group">
            <code className="text-green-400">pm2 status</code>
            <span className="text-gray-500">Check server status</span>
          </div>
          <div className="flex items-center justify-between group">
            <code className="text-green-400">pm2 monit</code>
            <span className="text-gray-500">Real-time monitoring</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Server className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold"><span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Frizy</span> MCP Server Setup</h2>
              <p className="text-sm text-gray-400">Get your Model Context Protocol server running</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <div className="flex gap-6 px-4">
          <button
            onClick={() => setActiveTab('quick')}
            className={`py-3 px-1 border-b-2 transition-colors ${
              activeTab === 'quick'
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4" />
              Quick Start
            </div>
          </button>
          <button
            onClick={() => setActiveTab('production')}
            className={`py-3 px-1 border-b-2 transition-colors ${
              activeTab === 'production'
                ? 'border-green-400 text-green-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              Production
            </div>
          </button>
          <button
            onClick={() => setActiveTab('claude')}
            className={`py-3 px-1 border-b-2 transition-colors ${
              activeTab === 'claude'
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Claude Prompt
            </div>
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`py-3 px-1 border-b-2 transition-colors ${
              activeTab === 'features'
                ? 'border-purple-400 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Features
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-h-[70vh] overflow-y-auto">
        {activeTab === 'claude' && <ClaudePromptTab />}
        {activeTab === 'quick' && <QuickStartTab />}
        {activeTab === 'production' && <ProductionTab />}
        {activeTab === 'features' && <FeaturesTab />}
      </div>
    </div>
  );
};

export default MCPSetupInstructions;