// File System Watcher Module for MCP Server
import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs/promises';
import { nanoid } from 'nanoid';

export class FileSystemWatcher {
  constructor(mcpServer, options = {}) {
    this.mcpServer = mcpServer;
    this.options = {
      projectRoot: options.projectRoot || process.cwd(),
      ignored: options.ignored || [
        /node_modules/,
        /\.git/,
        /\.vscode/,
        /dist/,
        /build/,
        /\.env/,
        /\.DS_Store/,
        /package-lock\.json/,
        /\.db$/
      ],
      debounceDelay: options.debounceDelay || 500
    };

    this.watcher = null;
    this.changeBuffer = new Map();
    this.debounceTimer = null;
  }

  start() {
    console.log(`Starting file watcher for: ${this.options.projectRoot}`);

    this.watcher = chokidar.watch(this.options.projectRoot, {
      ignored: this.options.ignored,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    });

    // Set up event handlers
    this.watcher
      .on('add', (filePath) => this.handleFileEvent('added', filePath))
      .on('change', (filePath) => this.handleFileEvent('modified', filePath))
      .on('unlink', (filePath) => this.handleFileEvent('deleted', filePath))
      .on('addDir', (dirPath) => this.handleDirEvent('added', dirPath))
      .on('unlinkDir', (dirPath) => this.handleDirEvent('deleted', dirPath))
      .on('error', (error) => console.error('Watcher error:', error));

    console.log('File watcher started successfully');
  }

  async handleFileEvent(eventType, filePath) {
    const relativePath = path.relative(this.options.projectRoot, filePath);
    const fileInfo = await this.getFileInfo(filePath, eventType);

    // Add to buffer for batch processing
    this.changeBuffer.set(relativePath, {
      id: nanoid(),
      type: 'file_change',
      action: eventType,
      path: relativePath,
      absolutePath: filePath,
      ...fileInfo,
      timestamp: Date.now()
    });

    this.debounceChanges();
  }

  async handleDirEvent(eventType, dirPath) {
    const relativePath = path.relative(this.options.projectRoot, dirPath);

    this.changeBuffer.set(relativePath, {
      id: nanoid(),
      type: 'directory_change',
      action: eventType,
      path: relativePath,
      absolutePath: dirPath,
      timestamp: Date.now()
    });

    this.debounceChanges();
  }

  async getFileInfo(filePath, eventType) {
    if (eventType === 'deleted') {
      return {
        exists: false,
        extension: path.extname(filePath)
      };
    }

    try {
      const stats = await fs.stat(filePath);
      const extension = path.extname(filePath);

      // Get file content for text files (with size limit)
      let content = null;
      let lines = 0;

      if (this.isTextFile(extension) && stats.size < 100000) { // 100KB limit
        try {
          const fileContent = await fs.readFile(filePath, 'utf-8');
          lines = fileContent.split('\n').length;

          // Only include snippets for small files
          if (stats.size < 10000) {
            content = fileContent.substring(0, 500); // First 500 chars
          }
        } catch (err) {
          // Ignore read errors
        }
      }

      return {
        exists: true,
        size: stats.size,
        extension,
        lines,
        language: this.detectLanguage(extension),
        lastModified: stats.mtime.toISOString(),
        content
      };
    } catch (error) {
      console.error(`Error getting file info for ${filePath}:`, error);
      return {
        exists: false,
        error: error.message
      };
    }
  }

  isTextFile(extension) {
    const textExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.txt',
      '.css', '.scss', '.html', '.xml', '.yaml', '.yml',
      '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp',
      '.h', '.hpp', '.cs', '.php', '.swift', '.kt', '.sql',
      '.sh', '.bash', '.zsh', '.fish', '.env', '.ini',
      '.toml', '.conf', '.cfg', '.gitignore', '.dockerignore'
    ];
    return textExtensions.includes(extension.toLowerCase());
  }

  detectLanguage(extension) {
    const languageMap = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.java': 'java',
      '.c': 'c',
      '.cpp': 'cpp',
      '.cs': 'csharp',
      '.php': 'php',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.sql': 'sql',
      '.css': 'css',
      '.scss': 'scss',
      '.html': 'html',
      '.xml': 'xml',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.md': 'markdown',
      '.sh': 'shell',
      '.bash': 'bash'
    };
    return languageMap[extension.toLowerCase()] || 'unknown';
  }

  debounceChanges() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.processChanges();
    }, this.options.debounceDelay);
  }

  processChanges() {
    if (this.changeBuffer.size === 0) return;

    const changes = Array.from(this.changeBuffer.values());
    this.changeBuffer.clear();

    // Calculate summary statistics
    const stats = {
      filesAdded: changes.filter(c => c.type === 'file_change' && c.action === 'added').length,
      filesModified: changes.filter(c => c.type === 'file_change' && c.action === 'modified').length,
      filesDeleted: changes.filter(c => c.type === 'file_change' && c.action === 'deleted').length,
      totalChanges: changes.length,
      languages: [...new Set(changes.map(c => c.language).filter(Boolean))]
    };

    // Group changes by directory
    const changesByDir = {};
    changes.forEach(change => {
      const dir = path.dirname(change.path);
      if (!changesByDir[dir]) {
        changesByDir[dir] = [];
      }
      changesByDir[dir].push(change);
    });

    // Send to MCP server
    const event = {
      type: 'file_system_changes',
      tool: 'file_watcher',
      data: {
        changes,
        stats,
        changesByDir,
        projectRoot: this.options.projectRoot
      },
      impact: this.calculateImpact(changes),
      tokensUsed: this.estimateTokens(changes)
    };

    // Broadcast to all connected clients
    this.mcpServer.broadcast({
      type: 'file_changes',
      timestamp: Date.now(),
      summary: `${stats.totalChanges} file${stats.totalChanges > 1 ? 's' : ''} changed`,
      stats,
      changes: changes.map(c => ({
        path: c.path,
        action: c.action,
        language: c.language,
        size: c.size,
        lines: c.lines
      }))
    });

    // Store in database
    if (this.mcpServer.db) {
      const activeSession = this.mcpServer.db.getActiveSession();
      if (activeSession) {
        this.mcpServer.db.createEvent({
          sessionId: activeSession.id,
          type: 'file_system_changes',
          tool: 'file_watcher',
          data: event.data,
          impact: event.impact,
          tokensUsed: event.tokensUsed
        });
      }
    }

    console.log(`Processed ${stats.totalChanges} file changes`);
  }

  calculateImpact(changes) {
    // Determine impact based on file types and number of changes
    const criticalFiles = changes.filter(c =>
      c.path.includes('package.json') ||
      c.path.includes('.env') ||
      c.path.includes('config') ||
      c.path.includes('database')
    );

    if (criticalFiles.length > 0) return 'high';
    if (changes.length > 10) return 'medium';
    return 'low';
  }

  estimateTokens(changes) {
    // Rough estimation of tokens used
    let tokens = 0;
    changes.forEach(change => {
      tokens += 10; // Base tokens for metadata
      if (change.content) {
        tokens += Math.ceil(change.content.length / 4);
      }
    });
    return tokens;
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      console.log('File watcher stopped');
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.changeBuffer.clear();
  }

  // Get file tree for a directory
  async getFileTree(dirPath = this.options.projectRoot, maxDepth = 3, currentDepth = 0) {
    if (currentDepth >= maxDepth) return null;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const tree = {
        name: path.basename(dirPath),
        path: path.relative(this.options.projectRoot, dirPath),
        type: 'directory',
        children: []
      };

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(this.options.projectRoot, fullPath);

        // Check if should be ignored
        const shouldIgnore = this.options.ignored.some(pattern => {
          if (pattern instanceof RegExp) {
            return pattern.test(relativePath);
          }
          return relativePath.includes(pattern);
        });

        if (shouldIgnore) continue;

        if (entry.isDirectory()) {
          const subTree = await this.getFileTree(fullPath, maxDepth, currentDepth + 1);
          if (subTree) {
            tree.children.push(subTree);
          }
        } else {
          const stats = await fs.stat(fullPath);
          tree.children.push({
            name: entry.name,
            path: relativePath,
            type: 'file',
            size: stats.size,
            extension: path.extname(entry.name),
            language: this.detectLanguage(path.extname(entry.name))
          });
        }
      }

      return tree;
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
      return null;
    }
  }
}

export default FileSystemWatcher;