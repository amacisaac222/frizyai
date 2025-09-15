import SessionManager from './sessionManager';

export const handleConnectedMessageLogic = (
  data: any,
  existingEvents: any[],
  contextPercentage: number,
  setSessions: any,  // Renamed from setPreviousSessions
  setCurrentSession: any,
  setMcpEvents: any,
  setSessionStateMessage: any,
  currentProjectId: string | null
) => {
  // Load previous sessions from localStorage
  const previousSessions: any[] = [];
  try {
    const storedSessions = localStorage.getItem('mcp-sessions');
    if (storedSessions) {
      const parsed = JSON.parse(storedSessions);
      previousSessions.push(...parsed);
    }

    // Also check for archived events and create a session for them
    const archivedEvents = localStorage.getItem('mcp-archived-events');
    if (archivedEvents) {
      const parsed = JSON.parse(archivedEvents);
      if (parsed && Array.isArray(parsed) && parsed.length > 0) {
        // Group archived events by date
        const eventsByDate: { [date: string]: any[] } = {};
        parsed.forEach((event: any) => {
          const date = new Date(event.timestamp).toDateString();
          if (!eventsByDate[date]) {
            eventsByDate[date] = [];
          }
          eventsByDate[date].push(event);
        });

        // Create archived sessions for each date
        Object.entries(eventsByDate).forEach(([date, events]) => {
          if (!previousSessions.some(s => s.id.includes(date.replace(/\s/g, '-')))) {
            const archivedSession = {
              id: `mcp-session-archived-${date.replace(/\s/g, '-')}`,
              title: `Session - ${date}`,
              status: 'completed',
              startTime: events[0].timestamp,
              endTime: events[events.length - 1].timestamp,
              metadata: {
                totalEvents: events.length,
                totalBlocks: Math.ceil(events.length / 10),
                contextUsage: 50,
                duration: (new Date(events[events.length - 1].timestamp).getTime() -
                          new Date(events[0].timestamp).getTime()) / 1000 / 60
              },
              blocks: []
            };
            previousSessions.push(archivedSession);
          }
        });
      }
    }
  } catch (err) {
    console.error('Failed to load previous sessions:', err);
  }

  // Find the current active session (may not be from today)
  const activeSession = previousSessions.find(s => s.status === 'active');

  // Check if we need a new session using SessionManager
  const lastEventTime = existingEvents.length > 0 && existingEvents[existingEvents.length - 1]?.timestamp
    ? new Date(existingEvents[existingEvents.length - 1].timestamp)
    : null;

  const sessionCheck = SessionManager.shouldCreateNewSession(
    activeSession,
    lastEventTime,
    contextPercentage * 2000, // Convert percentage to approximate tokens
    currentProjectId || undefined
  );

  // Determine if we should create a new session or update existing
  let shouldCreateNewSession = false;
  let sessionTrigger = sessionCheck.trigger;

  if (activeSession) {
    // We have an active session, but should we create a new one?
    // The sessionCheck already told us if we should based on all triggers
    shouldCreateNewSession = sessionCheck.shouldCreate;
  } else {
    // No active session found, we need to create one
    shouldCreateNewSession = true;
    if (!sessionTrigger) {
      sessionTrigger = {
        type: 'manual',
        reason: 'No active session found',
        timestamp: new Date().toISOString()
      };
    }
  }

  if (!shouldCreateNewSession && activeSession) {
    // Continue with existing active session
    const updatedSession = {
      ...activeSession,
      metadata: {
        ...activeSession.metadata,
        totalEvents: existingEvents.length,
        contextUsage: contextPercentage
      }
    };

    const updatedSessions = previousSessions.map(s =>
      s.id === activeSession.id ? updatedSession : s
    );

    setSessions(updatedSessions);
    setCurrentSession(updatedSession);

    try {
      localStorage.setItem('mcp-sessions', JSON.stringify(updatedSessions));
    } catch (err) {
      console.error('Failed to save sessions:', err);
    }

    console.log('Continuing active session:', activeSession.id);
    setSessionStateMessage({ text: `Session continued: ${activeSession.title}`, type: 'success' });
    setTimeout(() => setSessionStateMessage(null), 3000);
  } else {
    // Create a new session based on the trigger
    const sessionId = sessionTrigger
      ? SessionManager.generateSessionId(sessionTrigger, currentProjectId || undefined)
      : `mcp-session-${Date.now()}`;

    const sessionTitle = `Session - ${new Date().toLocaleString()}`;

    const newSession = {
      id: sessionId,
      title: sessionTitle,
      status: 'active',
      startTime: new Date().toISOString(),
      metadata: {
        totalEvents: existingEvents.length,
        contextUsage: contextPercentage,
        trigger: sessionTrigger
      },
      blocks: []
    };

    // Mark any existing active sessions as completed
    const updatedPreviousSessions = previousSessions.map(s => {
      if (s.status === 'active') {
        return {
          ...s,
          status: 'completed',
          endTime: new Date().toISOString(),
          metadata: {
            ...s.metadata,
            endReason: sessionTrigger?.type || 'session_restart'
          }
        };
      }
      return s;
    });

    const allSessions = [...updatedPreviousSessions, newSession];
    setSessions(allSessions);
    setCurrentSession(newSession);
    setMcpEvents(existingEvents);

    try {
      localStorage.setItem('mcp-sessions', JSON.stringify(allSessions));
    } catch (err) {
      console.error('Failed to save sessions:', err);
    }

    // Show appropriate message based on trigger
    let message = '🎯 New session started';
    let messageType = 'info';

    if (sessionTrigger) {
      switch (sessionTrigger.type) {
        case 'daily':
          message = '📅 New daily session started';
          messageType = 'info';
          break;
        case 'context_limit':
          message = '⚠️ Context limit reached - new session started';
          messageType = 'warning';
          break;
        case 'inactivity':
          message = '⏰ Inactivity detected - new session started';
          messageType = 'info';
          break;
        case 'project_switch':
          message = '🔄 Project switched - new session started';
          messageType = 'info';
          break;
        case 'error_recovery':
          message = '🔧 Recovering from error - new session started';
          messageType = 'warning';
          break;
        default:
          message = '✨ New session started';
      }
    }

    console.log('Created new session:', sessionId, 'Reason:', sessionTrigger?.reason);
    setSessionStateMessage({ text: message, type: messageType });
    setTimeout(() => setSessionStateMessage(null), 5000);
  }
};