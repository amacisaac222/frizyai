# Frizy.AI Swim Lane Board

A comprehensive project management interface with five swim lanes designed for Claude-integrated workflows.

## 🏊‍♀️ Architecture Overview

The swim lane board is the core interface for organizing and visualizing project work across five distinct lanes:

```
┌─────────────────────────────────────────────────────────────────┐
│                      Project Board Header                       │
├──────────┬──────────┬──────────┬──────────┬──────────────────────┤
│  Vision  │  Goals   │ Current  │   Next   │       Context        │
│  🎯      │  📋      │ Sprint   │ Sprint   │        📚            │
│          │          │   ⚡     │   📅     │                      │
│  3 blocks│  5 blocks│  2 blocks│  4 blocks│      8 blocks        │
│ (no limit│ (max 10) │ (max 5)  │ (max 8)  │     (no limit)       │
│          │          │          │          │                      │
│ [blocks] │ [blocks] │ [blocks] │ [blocks] │      [blocks]        │
│    ...   │    ...   │    ...   │    ...   │        ...           │
└──────────┴──────────┴──────────┴──────────┴──────────────────────┘
```

## 🎯 The Five Swim Lanes

### 1. Vision Lane (🎯)
**Purpose**: Long-term goals and aspirations
- **Color**: Purple theme
- **Max Blocks**: No limit
- **Content**: High-level project vision, product goals, user outcomes
- **Example**: "Create the ultimate project management tool for Claude users"

### 2. Goals Lane (📋)  
**Purpose**: Concrete objectives to achieve
- **Color**: Blue theme
- **Max Blocks**: 10 (with warning if exceeded)
- **Content**: Specific, measurable objectives that support the vision
- **Example**: "Implement swim lane board interface"

### 3. Current Sprint Lane (⚡)
**Purpose**: Active work in progress
- **Color**: Green theme  
- **Max Blocks**: 5 (with warning if exceeded)
- **Content**: Tasks currently being worked on
- **Example**: "Fix responsive layout issues"

### 4. Next Sprint Lane (📅)
**Purpose**: Upcoming tasks and priorities
- **Color**: Orange theme
- **Max Blocks**: 8 (with warning if exceeded)
- **Content**: Ready-to-start tasks for the next work cycle
- **Example**: "Implement drag-and-drop between lanes"

### 5. Context Lane (📚)
**Purpose**: Important information and references
- **Color**: Gray theme
- **Max Blocks**: No limit
- **Content**: Documentation, research, decisions, technical debt
- **Example**: "Design System Documentation"

## 🃏 Block Cards

Each block is represented by a rich card containing:

### Core Information
- **Title**: Clear, actionable task description
- **Content**: Detailed description or notes
- **Progress Bar**: Visual completion percentage (0-100%)
- **Status Badge**: Not Started, In Progress, Blocked, Completed, On Hold

### Priority & Effort
- **Priority Badge**: Low, Medium, High, Urgent (color-coded)
- **Effort Estimation**: Hours required (with clock icon)
- **Complexity Badge**: Simple, Moderate, Complex, Unknown

### Claude Integration
- **Claude Sessions Count**: Number of Claude Code sessions (⚡ icon)
- **Recent Work Indicator**: Green dot for blocks worked on in last 24h
- **Last Worked Date**: When the block was last touched

### Vibe Coder Features
- **Energy Level**: Low, Medium, High, Peak (with emoji indicators)
- **Inspiration Meter**: 1-10 scale with ✨ icon
- **Mood Context**: Free-form mood descriptions

### Relationships & Dependencies
- **Dependencies**: Shows dependency count with ⚡ icon
- **Blocked By**: Red badge showing blocking relationships
- **AI Suggestions**: Blue indicator for available AI recommendations

### Visual Indicators
- **Orange Ring**: Blocks with Claude sessions get subtle orange highlighting
- **Recent Badge**: Green indicator for recently worked blocks
- **Tags**: Up to 3 visible tags with "+N" for overflow

## 📱 Responsive Design

### Desktop (≥1280px)
```css
grid-cols-5  /* All 5 lanes visible side-by-side */
```

### Large Tablet (1024px-1279px)
```css
grid-cols-2  /* 2x3 grid layout */
```

### Mobile (≤1023px)
```css
grid-cols-1  /* Single column, scroll between lanes */
```

## 🎨 Visual Design

### Color Palette
- **Vision**: Purple (`bg-purple-100 text-purple-800`)
- **Goals**: Blue (`bg-blue-100 text-blue-800`)
- **Current**: Green (`bg-green-100 text-green-800`)
- **Next**: Orange (`bg-orange-100 text-orange-800`)
- **Context**: Gray (`bg-gray-100 text-gray-800`)

### Typography
- **Lane Titles**: Semibold, 14px
- **Block Titles**: Medium, 14px, line-clamp-2
- **Block Content**: Regular, 12px, line-clamp-3, muted
- **Metadata**: 12px, muted foreground

### Spacing & Layout
- **Lane Gap**: 24px between lanes
- **Block Gap**: 12px between blocks within lanes
- **Card Padding**: 16px internal padding
- **Border Radius**: 8px for lanes, 6px for cards

## 🔧 Component Structure

### ProjectBoard.tsx
**Main orchestrator component**
```typescript
interface ProjectBoardProps {
  blocks: Block[]
  onBlockClick: (block: Block) => void
  onBlockEdit: (block: Block) => void
  onAddBlock: (lane: BlockLane) => void
  onLaneSettings: (lane: BlockLane) => void
}
```

**Features**:
- Groups blocks by lane
- Sorts blocks by priority and recency
- Handles drag-and-drop state
- Responsive grid layout

### SwimLane.tsx
**Individual lane component**
```typescript
interface SwimLaneProps {
  lane: BlockLane
  title: string
  description: string
  count: number
  maxCount?: number | null
  color: string
  icon: string
  children?: ReactNode
  onAddBlock: (lane: BlockLane) => void
  onLaneSettings: (lane: BlockLane) => void
}
```

**Features**:
- Lane header with icon and description
- Block count badge with limit warnings
- "Add Block" button with dashed border
- Empty state with call-to-action
- Scrollable content area

### BlockCard.tsx
**Individual block representation**
```typescript
interface BlockCardProps {
  block: Block
  onClick?: (block: Block) => void
  onEdit?: (block: Block) => void
  isDragging?: boolean
}
```

**Features**:
- Rich metadata display
- Priority and status indicators
- Progress visualization
- Claude session integration
- Vibe coder properties
- Hover and interaction states

## 🎛️ Interaction Design

### Block Interactions
- **Click**: View detailed block information
- **Drag**: Move blocks between lanes (visual feedback)
- **Hover**: Subtle shadow and ring enhancement
- **Recent Work**: Automatic highlighting for active blocks

### Lane Interactions
- **Add Block**: Prominent "+" button with dashed styling
- **Settings**: Hidden gear icon (visible on hover)
- **Overflow Warning**: Red badge when exceeding recommended limits

### Empty States
- **Visual Icon**: Large, subtle lane icon
- **Helpful Message**: "No blocks in [lane]"
- **Call to Action**: "Create your first block" button

## 📊 Block Sorting Logic

Blocks within each lane are automatically sorted by:

1. **Priority** (highest first): Urgent > High > Medium > Low
2. **Recent Work** (most recent first): Blocks worked on recently
3. **Created Date** (newest first): Fallback for equal priority/recency

This ensures the most important and active work surfaces to the top of each lane.

## 🚀 Performance Features

- **Efficient Rendering**: Memoized components prevent unnecessary re-renders
- **Virtual Scrolling Ready**: Lane structure supports virtualization for large datasets
- **Optimized Sorting**: Sorting logic cached with useMemo
- **Responsive Images**: User avatars and icons optimized for different densities

## 🎯 Usage Examples

### Basic Implementation
```typescript
import { ProjectBoard } from '@/components/ProjectBoard'
import { sampleBlocks } from '@/data/sampleBlocks'

function MyApp() {
  const [blocks, setBlocks] = useState(sampleBlocks)

  return (
    <ProjectBoard
      blocks={blocks}
      onBlockClick={(block) => openBlockDetail(block)}
      onBlockEdit={(block) => openBlockEditor(block)}
      onAddBlock={(lane) => createNewBlock(lane)}
      onLaneSettings={(lane) => openLaneSettings(lane)}
    />
  )
}
```

### Event Handlers
```typescript
const handleBlockClick = (block: Block) => {
  // Open block detail modal/panel
  setSelectedBlock(block)
  setDetailModalOpen(true)
}

const handleAddBlock = (lane: BlockLane) => {
  // Create new block in specific lane
  const newBlock = createDefaultBlock(projectId, lane)
  setBlocks(prev => [...prev, newBlock])
}

const handleBlockEdit = (block: Block) => {
  // Open block editor
  setEditingBlock(block)
  setEditorModalOpen(true)
}
```

## 🔮 Future Enhancements

### Drag & Drop
- Inter-lane drag and drop with visual drop zones
- Bulk selection and multi-drag capabilities
- Drag preview with block thumbnail

### Advanced Filtering
- Filter by priority, status, energy level
- Search within block titles and content
- Smart filters based on Claude sessions

### Collaboration Features
- Real-time block updates with WebSocket
- User avatars on blocks being worked on
- Comments and collaboration indicators

### Analytics Integration
- Time spent per lane visualization
- Completion rate trends
- Productivity heatmaps

## 🌐 Demo

Visit `http://localhost:5174/app` to see the swim lane board in action with:
- 15 sample blocks across all lanes
- Realistic metadata and Claude session data
- All interactive features and responsive layout
- Empty state demonstrations

## 📚 Related Documentation

- [Application Layout](./APPLICATION_LAYOUT.md) - Three-panel layout architecture
- [Design System](./DESIGN_SYSTEM.md) - Component library and styling
- [Type System](./src/lib/types.ts) - TypeScript interfaces and definitions