import React, { useState, useEffect } from 'react';
import { X, Server, Check, Copy, Terminal, AlertCircle, ChevronRight, Loader } from 'lucide-react';

interface MCPSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (config: MCPConfig) => void;
}

interface MCPConfig {
  serverUrl?: string;
  serverPort?: number;
  autoConnect: boolean;
  saveCredentials: boolean;
}

export function MCPSetupWizard({ isOpen, onClose, onComplete }: MCPSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<MCPConfig>({
    serverUrl: 'localhost',
    serverPort: 3333,
    autoConnect: true,
    saveCredentials: true
  });
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Load saved config if exists
    const savedConfig = localStorage.getItem('mcp_config');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  }, []);

  const testConnection = async () => {
    setIsTesting(true);
    setTestStatus('idle');

    try {
      // Simulate connection test - replace with actual test
      await new Promise(resolve => setTimeout(resolve, 1500));

      // In real implementation, this would test the MCP server
      const response = await fetch(`http://${config.serverUrl}:${config.serverPort}/health`)
        .catch(() => null);

      if (response && response.ok) {
        setTestStatus('success');
      } else {
        setTestStatus('error');
      }
    } catch (error) {
      setTestStatus('error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleComplete = () => {
    if (config.saveCredentials) {
      localStorage.setItem('mcp_config', JSON.stringify(config));
    }
    onComplete(config);
    onClose();
  };

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Server className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold">MCP Server Setup</h2>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-gray-800 p-1 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-3 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-400' : 'text-gray-500'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                step >= 1 ? 'bg-blue-500' : 'bg-gray-700'
              }`}>
                1
              </div>
              <span className="text-sm">Start Server</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-600" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-400' : 'text-gray-500'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                step >= 2 ? 'bg-blue-500' : 'bg-gray-700'
              }`}>
                2
              </div>
              <span className="text-sm">Configure</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-600" />
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-400' : 'text-gray-500'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                step >= 3 ? 'bg-blue-500' : 'bg-gray-700'
              }`}>
                3
              </div>
              <span className="text-sm">Test & Save</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-2">Start Your MCP Server</h3>
                <p className="text-sm text-gray-400 mb-4">
                  First, ensure your MCP server is running. Run this command in your terminal:
                </p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">Terminal Command</span>
                  <button
                    onClick={() => copyCommand('node mcp-mock-server.cjs')}
                    className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-1"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="font-mono text-sm text-green-400 flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  <span>node mcp-mock-server.cjs</span>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-300">
                    <p className="font-semibold mb-1">Mock Server for Testing</p>
                    <p className="text-xs text-gray-400">
                      This mock server will start on port 3333. It simulates MCP functionality for testing the dashboard.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-400">Alternative: Custom Port</h4>
                <div className="bg-gray-800 rounded p-3 font-mono text-xs">
                  <div className="text-gray-400"># With custom port</div>
                  <div className="text-green-400">MCP_PORT=3001 node mcp-mock-server.cjs</div>
                  <div className="text-gray-400 mt-2"># Real MCP server (coming soon)</div>
                  <div className="text-green-400">npx @anthropic/mcp-server</div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-2">Configure Connection</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Configure how Frizy connects to your MCP server.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Server URL</label>
                  <input
                    type="text"
                    value={config.serverUrl}
                    onChange={(e) => setConfig({ ...config, serverUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-blue-400 focus:outline-none text-sm"
                    placeholder="localhost"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Server Port</label>
                  <input
                    type="number"
                    value={config.serverPort}
                    onChange={(e) => setConfig({ ...config, serverPort: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-blue-400 focus:outline-none text-sm"
                    placeholder="3000"
                  />
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.autoConnect}
                      onChange={(e) => setConfig({ ...config, autoConnect: e.target.checked })}
                      className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm">Automatically connect on startup</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.saveCredentials}
                      onChange={(e) => setConfig({ ...config, saveCredentials: e.target.checked })}
                      className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm">Save configuration for next time</span>
                  </label>
                </div>

                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-400">
                    <p className="font-semibold mb-1">Connection URL Preview:</p>
                    <code className="text-blue-400">http://{config.serverUrl}:{config.serverPort}</code>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-2">Test Connection</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Let's test your MCP server connection before saving.
                </p>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <div className="text-center space-y-4">
                  {isTesting && (
                    <>
                      <Loader className="h-8 w-8 text-blue-400 animate-spin mx-auto" />
                      <p className="text-sm text-gray-400">Testing connection...</p>
                    </>
                  )}

                  {!isTesting && testStatus === 'idle' && (
                    <>
                      <Server className="h-8 w-8 text-gray-400 mx-auto" />
                      <p className="text-sm text-gray-400">Click below to test your connection</p>
                    </>
                  )}

                  {!isTesting && testStatus === 'success' && (
                    <>
                      <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                        <Check className="h-6 w-6 text-green-400" />
                      </div>
                      <p className="text-sm text-green-400 font-semibold">Connection Successful!</p>
                      <p className="text-xs text-gray-400">Your MCP server is ready to use</p>
                    </>
                  )}

                  {!isTesting && testStatus === 'error' && (
                    <>
                      <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                        <X className="h-6 w-6 text-red-400" />
                      </div>
                      <p className="text-sm text-red-400 font-semibold">Connection Failed</p>
                      <p className="text-xs text-gray-400">
                        Please check that your MCP server is running on {config.serverUrl}:{config.serverPort}
                      </p>
                    </>
                  )}

                  {!isTesting && (
                    <button
                      onClick={testConnection}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded text-sm font-medium"
                    >
                      {testStatus === 'error' ? 'Retry Test' : 'Test Connection'}
                    </button>
                  )}
                </div>
              </div>

              {testStatus === 'success' && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <p className="text-sm text-green-400 font-semibold mb-2">Ready to Save!</p>
                  <p className="text-xs text-gray-400">
                    Your configuration will be saved and Frizy will automatically connect to your MCP server.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white"
            >
              Cancel
            </button>

            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded text-sm font-medium"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={testStatus !== 'success'}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm font-medium"
              >
                Save & Connect
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}