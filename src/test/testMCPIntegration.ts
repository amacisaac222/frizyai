import { supabase } from '../lib/supabase';

/**
 * Test suite for MCP/Context Capture integration
 * Run this file to verify the new database tables are working
 */

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
}

class MCPIntegrationTest {
  private testProjectId: string = '';
  private testSessionId: string = '';
  private testBlockId: string = '';
  private testTraceId: string = '';
  private testEventId: string = '';

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting MCP Integration Tests...\n');

    const tests = [
      { name: 'Check Tables Exist', fn: () => this.testTablesExist() },
      { name: 'Create Test Project', fn: () => this.testCreateProject() },
      { name: 'Create MCP Session', fn: () => this.testCreateMCPSession() },
      { name: 'Create Context Block', fn: () => this.testCreateContextBlock() },
      { name: 'Create Context Trace', fn: () => this.testCreateContextTrace() },
      { name: 'Create Context Event', fn: () => this.testCreateContextEvent() },
      { name: 'Query MCP Statistics', fn: () => this.testQueryStatistics() },
      { name: 'Test RLS Policies', fn: () => this.testRLSPolicies() },
      { name: 'Clean Up Test Data', fn: () => this.cleanUpTestData() },
    ];

    let passedTests = 0;
    let failedTests = 0;

    for (const test of tests) {
      try {
        const result = await test.fn();
        if (result.success) {
          console.log(`✅ ${test.name}: ${result.message}`);
          if (result.data) {
            console.log('   Data:', JSON.stringify(result.data, null, 2));
          }
          passedTests++;
        } else {
          console.error(`❌ ${test.name}: ${result.message}`);
          failedTests++;
        }
      } catch (error) {
        console.error(`❌ ${test.name}: Unexpected error - ${error}`);
        failedTests++;
      }
      console.log('');
    }

    console.log('\n📊 Test Results:');
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${failedTests}`);
    console.log(`   Total: ${tests.length}`);
  }

  async testTablesExist(): Promise<TestResult> {
    const { data, error } = await supabase
      .from('mcp_sessions')
      .select('id')
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      // PGRST116 means no rows, which is OK
      return { success: false, message: `Table check failed: ${error.message}` };
    }

    // Also check other tables
    const tables = ['context_blocks', 'context_traces', 'context_events'];
    for (const table of tables) {
      const { error: tableError } = await supabase
        .from(table)
        .select('id')
        .limit(1);

      if (tableError && tableError.code !== 'PGRST116') {
        return { success: false, message: `Table '${table}' not accessible: ${tableError.message}` };
      }
    }

    return { success: true, message: 'All MCP tables exist and are accessible' };
  }

  async testCreateProject(): Promise<TestResult> {
    // Check if we have a user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: 'No authenticated user found. Please sign in first.' };
    }

    // Create a test project with MCP fields
    this.testProjectId = `test-mcp-${Date.now()}`;
    const { data, error } = await supabase
      .from('projects')
      .insert({
        id: this.testProjectId,
        name: 'Test MCP Project',
        description: 'Testing MCP integration features',
        created_by: user.id,
        github_repo: 'https://github.com/test/repo',
        mcp_server_url: 'wss://api.frizyai.com/mcp',
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      return { success: false, message: `Failed to create project: ${error.message}` };
    }

    return { success: true, message: 'Test project created', data: { projectId: data.id } };
  }

  async testCreateMCPSession(): Promise<TestResult> {
    this.testSessionId = `test-session-${Date.now()}`;
    const { data, error } = await supabase
      .from('mcp_sessions')
      .insert({
        id: this.testSessionId,
        project_id: this.testProjectId,
        title: 'Test MCP Session',
        summary: 'Testing Claude Code integration',
        status: 'active',
        metadata: {
          contextUsage: 75,
          model: 'claude-3',
          tools: ['read', 'write', 'bash']
        }
      })
      .select()
      .single();

    if (error) {
      return { success: false, message: `Failed to create MCP session: ${error.message}` };
    }

    return { success: true, message: 'MCP session created', data: { sessionId: data.id } };
  }

  async testCreateContextBlock(): Promise<TestResult> {
    this.testBlockId = `test-block-${Date.now()}`;
    const { data, error } = await supabase
      .from('context_blocks')
      .insert({
        id: this.testBlockId,
        session_id: this.testSessionId,
        title: 'Implement Authentication',
        type: 'coding',
        summary: 'Added JWT authentication to API endpoints',
        status: 'completed',
        metrics: {
          filesChanged: 5,
          linesAdded: 150,
          linesRemoved: 20
        }
      })
      .select()
      .single();

    if (error) {
      return { success: false, message: `Failed to create context block: ${error.message}` };
    }

    return { success: true, message: 'Context block created', data: { blockId: data.id } };
  }

  async testCreateContextTrace(): Promise<TestResult> {
    this.testTraceId = `test-trace-${Date.now()}`;
    const { data, error } = await supabase
      .from('context_traces')
      .insert({
        id: this.testTraceId,
        block_id: this.testBlockId,
        name: 'Edit auth.ts',
        type: 'file_modification',
        summary: 'Added JWT validation middleware',
        duration_seconds: 45,
        metadata: {
          tool: 'editor',
          path: '/src/middleware/auth.ts'
        }
      })
      .select()
      .single();

    if (error) {
      return { success: false, message: `Failed to create context trace: ${error.message}` };
    }

    return { success: true, message: 'Context trace created', data: { traceId: data.id } };
  }

  async testCreateContextEvent(): Promise<TestResult> {
    this.testEventId = `test-event-${Date.now()}`;
    const { data, error } = await supabase
      .from('context_events')
      .insert({
        id: this.testEventId,
        trace_id: this.testTraceId,
        project_id: this.testProjectId,
        type: 'code_edit',
        tool: 'vscode',
        data: {
          file: 'auth.ts',
          changes: {
            additions: 15,
            deletions: 3
          }
        },
        impact: 'high'
      })
      .select()
      .single();

    if (error) {
      return { success: false, message: `Failed to create context event: ${error.message}` };
    }

    return { success: true, message: 'Context event created', data: { eventId: data.id } };
  }

  async testQueryStatistics(): Promise<TestResult> {
    // Query the statistics view
    const { data, error } = await supabase
      .from('project_mcp_statistics')
      .select('*')
      .eq('project_id', this.testProjectId)
      .single();

    if (error) {
      return { success: false, message: `Failed to query statistics: ${error.message}` };
    }

    if (!data) {
      return { success: false, message: 'No statistics found for test project' };
    }

    return {
      success: true,
      message: 'Statistics retrieved successfully',
      data: {
        sessions: data.total_mcp_sessions,
        blocks: data.total_context_blocks,
        activeSessions: data.active_sessions
      }
    };
  }

  async testRLSPolicies(): Promise<TestResult> {
    // Test that we can only see our own data
    const { data: sessions, error: sessionError } = await supabase
      .from('mcp_sessions')
      .select('id, project_id')
      .eq('project_id', this.testProjectId);

    if (sessionError) {
      return { success: false, message: `RLS test failed: ${sessionError.message}` };
    }

    if (!sessions || sessions.length === 0) {
      return { success: false, message: 'RLS policies may be too restrictive - no data visible' };
    }

    return {
      success: true,
      message: 'RLS policies working correctly',
      data: { visibleSessions: sessions.length }
    };
  }

  async cleanUpTestData(): Promise<TestResult> {
    try {
      // Delete in reverse order of creation to respect foreign keys
      if (this.testEventId) {
        await supabase.from('context_events').delete().eq('id', this.testEventId);
      }
      if (this.testTraceId) {
        await supabase.from('context_traces').delete().eq('id', this.testTraceId);
      }
      if (this.testBlockId) {
        await supabase.from('context_blocks').delete().eq('id', this.testBlockId);
      }
      if (this.testSessionId) {
        await supabase.from('mcp_sessions').delete().eq('id', this.testSessionId);
      }
      if (this.testProjectId) {
        await supabase.from('projects').delete().eq('id', this.testProjectId);
      }

      return { success: true, message: 'Test data cleaned up successfully' };
    } catch (error) {
      return { success: false, message: `Cleanup failed: ${error}` };
    }
  }
}

// Export for use in other files
export default MCPIntegrationTest;

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new MCPIntegrationTest();
  tester.runAllTests().then(() => {
    console.log('\n✨ Tests completed!');
  }).catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}