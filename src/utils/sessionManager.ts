/**
 * Session Management Utilities for Frizy AI
 *
 * Sessions are created based on these triggers:
 * 1. Daily - New session each day
 * 2. Context Limit - When approaching 200k token limit
 * 3. Inactivity - After 2+ hours of no activity
 * 4. Manual - User explicitly starts new session
 * 5. Project Switch - When switching between projects
 * 6. Critical Error - After system crash/recovery
 */

export interface SessionTrigger {
  type: 'daily' | 'context_limit' | 'inactivity' | 'manual' | 'project_switch' | 'error_recovery';
  reason: string;
  timestamp: string;
}

export class SessionManager {
  private static readonly MAX_CONTEXT_TOKENS = 200000;
  private static readonly CONTEXT_WARNING_THRESHOLD = 0.8; // 80% of limit
  private static readonly INACTIVITY_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

  /**
   * Determine if a new session should be created
   */
  static shouldCreateNewSession(
    currentSession: any | null,
    lastEventTime: Date | null,
    contextUsage: number,
    currentProjectId?: string
  ): { shouldCreate: boolean; trigger?: SessionTrigger } {
    const now = new Date();

    // No current session - create new
    if (!currentSession) {
      return {
        shouldCreate: true,
        trigger: {
          type: 'manual',
          reason: 'No active session found',
          timestamp: now.toISOString()
        }
      };
    }

    // Check 1: Daily session (new day)
    const sessionDate = new Date(currentSession.startTime).toDateString();
    const todayDate = now.toDateString();
    if (sessionDate !== todayDate) {
      return {
        shouldCreate: true,
        trigger: {
          type: 'daily',
          reason: `New day started (was ${sessionDate}, now ${todayDate})`,
          timestamp: now.toISOString()
        }
      };
    }

    // Check 2: Context limit approaching
    if (contextUsage > this.MAX_CONTEXT_TOKENS * this.CONTEXT_WARNING_THRESHOLD) {
      return {
        shouldCreate: true,
        trigger: {
          type: 'context_limit',
          reason: `Context usage at ${Math.round(contextUsage / this.MAX_CONTEXT_TOKENS * 100)}% of limit`,
          timestamp: now.toISOString()
        }
      };
    }

    // Check 3: Inactivity timeout
    if (lastEventTime) {
      const timeSinceLastEvent = now.getTime() - lastEventTime.getTime();
      if (timeSinceLastEvent > this.INACTIVITY_THRESHOLD_MS) {
        return {
          shouldCreate: true,
          trigger: {
            type: 'inactivity',
            reason: `No activity for ${Math.round(timeSinceLastEvent / 1000 / 60)} minutes`,
            timestamp: now.toISOString()
          }
        };
      }
    }

    // Check 4: Project switch
    if (currentProjectId && currentSession.projectId && currentSession.projectId !== currentProjectId) {
      return {
        shouldCreate: true,
        trigger: {
          type: 'project_switch',
          reason: `Switched from project ${currentSession.projectId} to ${currentProjectId}`,
          timestamp: now.toISOString()
        }
      };
    }

    // Check 5: Error recovery (session marked as crashed)
    if (currentSession.status === 'crashed' || currentSession.status === 'error') {
      return {
        shouldCreate: true,
        trigger: {
          type: 'error_recovery',
          reason: 'Recovering from previous session error',
          timestamp: now.toISOString()
        }
      };
    }

    return { shouldCreate: false };
  }

  /**
   * Generate a unique session ID based on trigger type
   */
  static generateSessionId(trigger: SessionTrigger, projectId?: string): string {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const hour = now.getHours();

    switch (trigger.type) {
      case 'daily':
        return `mcp-session-${date}-${hour}`;
      case 'context_limit':
        return `mcp-session-${date}-${hour}-ctx${Date.now()}`;
      case 'inactivity':
        return `mcp-session-${date}-${hour}-idle${Date.now()}`;
      case 'manual':
        return `mcp-session-${date}-${hour}-manual${Date.now()}`;
      case 'project_switch':
        return `mcp-session-${date}-${projectId || 'default'}-${Date.now()}`;
      case 'error_recovery':
        return `mcp-session-${date}-recovery-${Date.now()}`;
      default:
        return `mcp-session-${date}-${Date.now()}`;
    }
  }

  /**
   * Calculate context usage from events
   */
  static calculateContextUsage(events: any[]): number {
    // Rough estimation: ~4 chars per token
    let totalChars = 0;

    events.forEach(event => {
      // Count characters in event data
      totalChars += JSON.stringify(event).length;
    });

    return Math.round(totalChars / 4); // Convert to approximate tokens
  }

  /**
   * Archive old sessions to prevent memory bloat
   */
  static archiveSessions(sessions: any[], maxActive: number = 10): {
    active: any[];
    archived: any[];
  } {
    // Sort by start time, newest first
    const sorted = [...sessions].sort((a, b) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    return {
      active: sorted.slice(0, maxActive),
      archived: sorted.slice(maxActive)
    };
  }

  /**
   * Get session statistics for analytics
   */
  static getSessionStats(session: any): {
    duration: number;
    eventsPerMinute: number;
    blocksPerHour: number;
    averageBlockSize: number;
    peakActivityTime: string;
  } {
    const startTime = new Date(session.startTime);
    const endTime = session.endTime ? new Date(session.endTime) : new Date();
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / 1000 / 60;

    return {
      duration: durationMinutes,
      eventsPerMinute: session.metadata.totalEvents / durationMinutes,
      blocksPerHour: (session.metadata.totalBlocks / durationMinutes) * 60,
      averageBlockSize: session.metadata.totalEvents / session.metadata.totalBlocks,
      peakActivityTime: session.metadata.peakTime || 'Unknown'
    };
  }

  /**
   * Merge sessions if they should be combined (e.g., after brief disconnect)
   */
  static shouldMergeSessions(session1: any, session2: any): boolean {
    const gap = Math.abs(
      new Date(session2.startTime).getTime() -
      new Date(session1.endTime || session1.startTime).getTime()
    );

    // Merge if gap is less than 5 minutes and same project
    return gap < 5 * 60 * 1000 &&
           session1.projectId === session2.projectId &&
           session1.status !== 'crashed';
  }
}

export default SessionManager;