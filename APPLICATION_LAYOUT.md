# Frizy.AI Application Layout

A comprehensive three-panel application layout designed for project management and Claude Code integration.

## 🏗️ Architecture Overview

The application uses a sophisticated three-panel layout optimized for project management workflows:

```
┌─────────────────────────────────────────────────────────────┐
│                        AppHeader                            │
├─────────────┬─────────────────────────────┬─────────────────┤
│ LeftSidebar │      Main Content Area      │  RightSidebar   │
│   (240px)   │        (flex-1)             │ (320px/48px)    │
│             │                             │   collapsible   │
│             │                             │                 │
│             │                             │                 │
│             │                             │                 │
└─────────────┴─────────────────────────────┴─────────────────┘
```

## 🎯 Component Structure

### AppHeader (56px height)
**Location**: `src/components/AppHeader.tsx`

**Features**:
- **Logo & Branding**: Frizy.AI with brain icon
- **Project Switcher**: Dropdown to switch between projects
- **MCP Status**: Real-time Model Context Protocol connection status
- **Claude Code Button**: Quick access to open project in Claude Code
- **User Avatar**: User profile and settings access

**Props Interface**:
```typescript
interface AppHeaderProps {
  currentProject?: Project
  projects: Project[]
  mcpStatus: MCPConnectionStatus
  mcpPort?: number
  mcpLastConnected?: Date
  onProjectChange: (project: Project) => void
  onCreateProject: () => void
  onOpenInClaudeCode: () => void
  onMCPStatusClick: () => void
  userName?: string
  userAvatar?: string
}
```

### LeftSidebar (240px width)
**Location**: `src/components/LeftSidebar.tsx`

**Features**:
- **Project Overview**: Current project info, mood, and completion
- **Quick Actions**: New Block button and filter toggle
- **Lane Navigation**: Navigate between Vision, Goals, Current, Next, Context
- **Block Counts**: Real-time count badges for each lane
- **Tools Section**: Analytics and Settings access

**Responsive**: Hidden on screens smaller than 1024px (`hidden lg:flex`)

### RightSidebar (320px width, collapsible)
**Location**: `src/components/RightSidebar.tsx`

**Features**:
- **Context Panel**: Captured insights from Claude sessions
- **Session History**: Recent Claude Code sessions with summaries
- **AI Suggestions**: Smart recommendations for blocks and content
- **Tabbed Interface**: Easy switching between different data types
- **Collapsible**: Can collapse to 48px width to maximize main content

**Tabs**:
- **Context**: Decision, insights, roadblocks, solutions, references
- **Sessions**: Recent Claude Code session history
- **AI**: Smart suggestions with confidence scores

### AppLayout (Main Container)
**Location**: `src/components/AppLayout.tsx`

**Responsibilities**:
- Orchestrates all layout components
- Manages responsive behavior
- Handles state coordination between panels
- Provides consistent spacing and overflow handling

## 🎨 Design Specifications

### Dimensions
- **Header Height**: 56px (14 Tailwind units)
- **Left Sidebar Width**: 240px (60 Tailwind units)
- **Right Sidebar Width**: 320px (80 Tailwind units) / 48px (12 units) collapsed
- **Main Content**: Flexible width using `flex-1`

### Colors & Theming
- **Background**: `bg-background` (white)
- **Sidebar Background**: `bg-card/50` (semi-transparent white)
- **Header Background**: `bg-background/95 backdrop-blur-sm` (translucent with blur)
- **Borders**: `border-border` (subtle gray)

### Typography
- **Inter Font Family**: Clean, professional typography
- **Font Weights**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- **Text Colors**: Semantic color system with proper contrast

## 📱 Responsive Design

### Desktop (≥1024px)
- Full three-panel layout
- All sidebars visible
- Optimal for project management workflows

### Tablet (768px-1023px)  
- Left sidebar hidden (`hidden lg:flex`)
- Header remains functional with project switcher
- Right sidebar collapsible for space

### Mobile (≤767px)
- Both sidebars hidden/overlay
- Header adapts with responsive navigation
- Focus on main content area

## 🔧 Key Features

### Project Switcher
- **Dropdown Interface**: Clean project selection
- **Recent Projects**: Shows recent activity and session counts
- **Create New**: Quick project creation action
- **Rich Metadata**: Project descriptions and status info

### MCP Connection Status
- **Real-time Status**: Live connection monitoring
- **Visual Indicators**: Color-coded status badges
- **Port Information**: Shows active MCP port
- **Click Handler**: Quick access to connection settings

### Context Management
- **Session Capture**: Automatic context extraction from Claude sessions
- **Manual Addition**: User can add custom context items
- **Type Classification**: Decision, insight, roadblock, solution, reference
- **Importance Rating**: 1-10 scale with bookmark support

### AI Integration
- **Smart Suggestions**: Content enhancement, task breakdown, priority adjustment
- **Confidence Scoring**: 0-1 confidence levels
- **One-click Apply**: Easy suggestion application
- **Context Aware**: Based on current block and project data

## 🛠️ Usage Examples

### Basic Implementation
```typescript
import { AppLayout } from '@/components/AppLayout'
import { Project, MCPConnectionStatus } from '@/lib/types'

function MyApp() {
  const [currentProject, setCurrentProject] = useState<Project>()
  const [projects, setProjects] = useState<Project[]>([])

  return (
    <AppLayout
      currentProject={currentProject}
      projects={projects}
      mcpStatus={MCPConnectionStatus.CONNECTED}
      mcpPort={3000}
      contextItems={[]}
      recentSessions={[]}
      aiSuggestions={[]}
      currentView="overview"
      onProjectChange={setCurrentProject}
      onCreateProject={handleCreateProject}
      // ... other handlers
    >
      {/* Your main content here */}
      <div className="p-6">
        <SwimLaneBoard />
      </div>
    </AppLayout>
  )
}
```

### Event Handlers
```typescript
const handlers = {
  onProjectChange: (project: Project) => {
    setCurrentProject(project)
    // Update URL, load project data, etc.
  },
  
  onOpenInClaudeCode: () => {
    // Send MCP command to open project
    window.postMessage({ type: 'OPEN_CLAUDE_CODE', port: mcpPort }, '*')
  },
  
  onApplySuggestion: (suggestion: AISuggestion) => {
    // Apply AI suggestion to block
    updateBlock(suggestion.blockId, suggestion.suggestedContent)
  }
}
```

## 🎯 State Management

The layout components are designed to be controlled - they don't manage their own state but receive data and callbacks from parent components. This allows for:

- **Centralized State**: All data flows through the main app
- **Predictable Updates**: Changes flow down through props
- **Easy Testing**: Components are pure and testable
- **Flexible Integration**: Works with any state management solution

## 🚀 Performance Considerations

- **Virtualization Ready**: Main content area prepared for large datasets
- **Lazy Loading**: Sidebar content can be loaded on demand
- **Efficient Renders**: Memoized components prevent unnecessary re-renders
- **Responsive Images**: User avatars and project images optimized
- **Backdrop Blur**: Hardware-accelerated header background

## 🔮 Future Enhancements

- **Mobile Overlay Sidebars**: Slide-out panels for mobile
- **Keyboard Shortcuts**: Navigation and quick actions
- **Drag & Drop**: Between lanes and sidebar interactions
- **Theme Switching**: Dark mode support
- **Custom Layouts**: User-configurable panel sizes
- **Multi-project**: Tabs or workspace switching

## 🌐 Demo

Visit `/app` in the development server to see the full layout in action with sample data demonstrating all features and interactions.