import Anthropic from '@anthropic-ai/sdk'
import type { BlockLane, Priority, EnergyLevel, Complexity, BlockInsert } from './database.types'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, use a backend proxy
})

// Import modes for different types of content
export type ImportMode = 
  | 'brain-dump'     // Chaotic thoughts, random ideas
  | 'stuck-help'     // When user is stuck and needs direction
  | 'inspiration'    // Creative ideas, brainstorming
  | 'meeting-notes'  // Meeting or call notes
  | 'research'       // Research findings, articles
  | 'goals-planning' // Goal setting and planning

export interface ImportModeConfig {
  name: string
  description: string
  icon: string
  systemPrompt: string
  focusAreas: string[]
}

export const IMPORT_MODES: Record<ImportMode, ImportModeConfig> = {
  'brain-dump': {
    name: 'Brain Dump',
    description: 'Turn scattered thoughts into organized blocks',
    icon: '🧠',
    systemPrompt: `You are an expert project organizer. Break down chaotic, scattered thoughts into clear, actionable blocks. Focus on:
- Extracting concrete tasks and actions
- Identifying underlying goals and priorities
- Organizing thoughts by urgency and importance
- Suggesting realistic effort estimates`,
    focusAreas: ['Actionable tasks', 'Goals extraction', 'Priority organization']
  },
  'stuck-help': {
    name: 'Stuck & Need Help',
    description: 'Get unstuck with AI-suggested next steps',
    icon: '🤔',
    systemPrompt: `You are a helpful problem-solving assistant. When someone is stuck, provide:
- Clear next steps to move forward
- Breaking down overwhelming tasks into smaller pieces
- Identifying blockers and how to address them
- Suggesting quick wins to build momentum`,
    focusAreas: ['Next steps', 'Breaking down tasks', 'Quick wins']
  },
  'inspiration': {
    name: 'Creative Ideas',
    description: 'Organize creative thoughts and inspirations',
    icon: '💡',
    systemPrompt: `You are a creative project organizer. Transform creative ideas into structured plans:
- Capture the essence and vision of ideas
- Suggest experimental approaches and prototypes
- Balance creative exploration with practical execution
- Identify inspiration-driven tasks`,
    focusAreas: ['Vision capture', 'Creative experiments', 'Inspiration tasks']
  },
  'meeting-notes': {
    name: 'Meeting Notes',
    description: 'Extract action items from meeting notes',
    icon: '📝',
    systemPrompt: `You are an expert at extracting actionable insights from meeting notes:
- Identify action items and owners
- Extract decisions and agreements
- Organize follow-up tasks by priority
- Capture important context and references`,
    focusAreas: ['Action items', 'Decisions', 'Follow-ups']
  },
  'research': {
    name: 'Research & Learning',
    description: 'Organize research findings and learnings',
    icon: '📚',
    systemPrompt: `You are a research organizer. Structure research findings into actionable knowledge:
- Organize key insights and learnings
- Identify knowledge gaps and further research needed
- Suggest practical applications of research
- Create reference materials for future use`,
    focusAreas: ['Key insights', 'Knowledge gaps', 'Applications']
  },
  'goals-planning': {
    name: 'Goals & Planning',
    description: 'Structure goals into actionable plans',
    icon: '🎯',
    systemPrompt: `You are a strategic planning assistant. Transform goals into structured execution plans:
- Break down large goals into smaller milestones
- Suggest realistic timelines and priorities
- Identify dependencies and prerequisites
- Balance aspirational vision with practical next steps`,
    focusAreas: ['Goal breakdown', 'Milestones', 'Strategic planning']
  }
}

// Suggested block structure from AI
export interface SuggestedBlock {
  id: string
  title: string
  content: string
  lane: BlockLane
  priority: Priority
  energy_level: EnergyLevel
  complexity: Complexity
  effort: number
  inspiration: number
  tags: string[]
  reasoning: string // Why AI suggested these attributes
  confidence: number // 0-1 confidence score
}

export interface AnalysisResult {
  suggestions: SuggestedBlock[]
  summary: string
  mode: ImportMode
  originalText: string
  processingTime: number
}

// Main analysis function
export async function analyzeAndSuggestBlocks(
  text: string,
  mode: ImportMode,
  projectContext?: string
): Promise<AnalysisResult> {
  const startTime = Date.now()
  
  if (!text.trim()) {
    throw new Error('Please provide some text to analyze')
  }

  if (!import.meta.env.VITE_ANTHROPIC_API_KEY) {
    throw new Error('Claude API key not configured')
  }

  const modeConfig = IMPORT_MODES[mode]
  
  const systemPrompt = `${modeConfig.systemPrompt}

IMPORTANT: You must respond with valid JSON only. No markdown, no explanations, just JSON.

Project Context: ${projectContext || 'No additional context provided'}

Analyze the following text and suggest 3-8 blocks. For each block, determine:

1. **lane** (where it belongs):
   - "vision": Long-term goals, aspirations, big picture thinking
   - "goals": Concrete objectives, measurable outcomes, milestones
   - "current": Active work, immediate tasks, things to do now
   - "next": Upcoming tasks, next sprint items, queued work
   - "context": Reference material, notes, knowledge, documentation

2. **priority**: "low", "medium", "high", "urgent"
3. **energy_level**: "low" (simple tasks), "medium" (standard work), "high" (challenging), "peak" (complex/creative)
4. **complexity**: "simple" (quick wins), "moderate" (standard work), "complex" (research/multi-step), "unknown" (needs investigation)
5. **effort**: Estimated hours (0.5 to 40)
6. **inspiration**: How inspiring/motivating is this task? (1-10)
7. **tags**: 2-4 relevant tags

Response format (JSON only):
{
  "suggestions": [
    {
      "title": "Clear, actionable title",
      "content": "Detailed description with context",
      "lane": "current",
      "priority": "high",
      "energy_level": "medium",
      "complexity": "moderate",
      "effort": 2,
      "inspiration": 7,
      "tags": ["tag1", "tag2"],
      "reasoning": "Why these attributes were chosen",
      "confidence": 0.85
    }
  ],
  "summary": "Brief summary of the analysis and approach taken"
}`

  try {
    const message = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022", // Using Claude 3.5 Haiku for speed and efficiency
      max_tokens: 2000,
      temperature: 0.7,
      messages: [
        { 
          role: "user", 
          content: `${systemPrompt}\n\nText to analyze:\n${text}` 
        }
      ]
    })

    const response = message.content[0]?.type === 'text' ? message.content[0].text : null
    if (!response) {
      throw new Error('No response from Claude')
    }

    let parsed: any
    try {
      parsed = JSON.parse(response)
    } catch (parseError) {
      console.error('Failed to parse Claude response:', response)
      throw new Error('Invalid response format from AI')
    }

    if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
      throw new Error('Invalid suggestions format from AI')
    }

    // Add IDs and validate suggestions
    const suggestions: SuggestedBlock[] = parsed.suggestions.map((suggestion: any, index: number) => ({
      id: `suggestion-${Date.now()}-${index}`,
      title: suggestion.title || `Untitled Block ${index + 1}`,
      content: suggestion.content || '',
      lane: validateLane(suggestion.lane) || 'current',
      priority: validatePriority(suggestion.priority) || 'medium',
      energy_level: validateEnergyLevel(suggestion.energy_level) || 'medium',
      complexity: validateComplexity(suggestion.complexity) || 'moderate',
      effort: Math.max(0.5, Math.min(40, Number(suggestion.effort) || 1)),
      inspiration: Math.max(1, Math.min(10, Number(suggestion.inspiration) || 5)),
      tags: Array.isArray(suggestion.tags) ? suggestion.tags.slice(0, 4) : [],
      reasoning: suggestion.reasoning || 'AI analysis',
      confidence: Math.max(0, Math.min(1, Number(suggestion.confidence) || 0.8))
    }))

    return {
      suggestions,
      summary: parsed.summary || 'AI analysis completed',
      mode,
      originalText: text,
      processingTime: Date.now() - startTime
    }

  } catch (error) {
    console.error('Claude analysis error:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('authentication')) {
        throw new Error('Invalid Claude API key. Please check your configuration.')
      }
      if (error.message.includes('quota') || error.message.includes('credits')) {
        throw new Error('Claude API quota exceeded. Please try again later.')
      }
      if (error.message.includes('rate limit')) {
        throw new Error('Too many requests. Please wait a moment and try again.')
      }
      throw error
    }
    
    throw new Error('Failed to analyze text with AI')
  }
}

// Validation helpers
function validateLane(lane: any): BlockLane | null {
  const validLanes: BlockLane[] = ['vision', 'goals', 'current', 'next', 'context']
  return validLanes.includes(lane) ? lane : null
}

function validatePriority(priority: any): Priority | null {
  const validPriorities: Priority[] = ['low', 'medium', 'high', 'urgent']
  return validPriorities.includes(priority) ? priority : null
}

function validateEnergyLevel(energy: any): EnergyLevel | null {
  const validEnergy: EnergyLevel[] = ['low', 'medium', 'high', 'peak']
  return validEnergy.includes(energy) ? energy : null
}

function validateComplexity(complexity: any): Complexity | null {
  const validComplexity: Complexity[] = ['simple', 'moderate', 'complex', 'unknown']
  return validComplexity.includes(complexity) ? complexity : null
}

// Convert suggested blocks to database format
export function convertSuggestedBlocksToInserts(
  suggestions: SuggestedBlock[],
  projectId: string
): BlockInsert[] {
  return suggestions.map(suggestion => ({
    project_id: projectId,
    title: suggestion.title,
    content: suggestion.content,
    lane: suggestion.lane,
    priority: suggestion.priority,
    energy_level: suggestion.energy_level,
    complexity: suggestion.complexity,
    effort: suggestion.effort,
    inspiration: suggestion.inspiration,
    tags: suggestion.tags,
    status: 'not_started' as const
  }))
}

// Demo function for testing without API key
export function createDemoSuggestions(text: string, mode: ImportMode): AnalysisResult {
  const suggestions: SuggestedBlock[] = [
    {
      id: 'demo-1',
      title: 'Research competitor pricing strategies',
      content: 'Analyze how competitors price their products and identify opportunities for our pricing model.',
      lane: 'current',
      priority: 'high',
      energy_level: 'medium',
      complexity: 'moderate',
      effort: 3,
      inspiration: 6,
      tags: ['research', 'pricing', 'competition'],
      reasoning: 'This seems like immediate research needed for strategic decisions',
      confidence: 0.85
    },
    {
      id: 'demo-2',
      title: 'Define long-term product vision',
      content: 'Create a comprehensive vision document outlining where we want the product to be in 2-3 years.',
      lane: 'vision',
      priority: 'medium',
      energy_level: 'high',
      complexity: 'complex',
      effort: 8,
      inspiration: 9,
      tags: ['vision', 'strategy', 'planning'],
      reasoning: 'Vision-related content that requires deep thinking and creativity',
      confidence: 0.90
    },
    {
      id: 'demo-3',
      title: 'Update team on pricing research findings',
      content: 'Schedule a meeting to share pricing research results and get team feedback.',
      lane: 'next',
      priority: 'medium',
      energy_level: 'low',
      complexity: 'simple',
      effort: 1,
      inspiration: 4,
      tags: ['communication', 'team', 'meeting'],
      reasoning: 'Follow-up task that depends on completing the research first',
      confidence: 0.75
    }
  ]

  return {
    suggestions,
    summary: `Analyzed your ${mode} content and found ${suggestions.length} actionable items focusing on research, vision, and communication.`,
    mode,
    originalText: text,
    processingTime: 500 // Demo processing time
  }
}