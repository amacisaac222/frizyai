import { useState, useEffect } from 'react'
import { Button, Input, Textarea, Select, SelectOption } from './ui'
import { Block, BlockLane, Priority, EnergyLevel, Complexity, BlockStatus } from '@/lib/types'
import { generateId } from '@/utils'

interface BlockFormProps {
  block?: Block // For editing existing block
  initialLane?: BlockLane // For creating new block
  onSubmit: (block: Block) => void
  onCancel: () => void
  isLoading?: boolean
}

interface FormData {
  title: string
  content: string
  lane: BlockLane
  priority: Priority
  energyLevel: EnergyLevel
  complexity: Complexity
  effort: number
  inspiration: number
  tags: string
}

interface FormErrors {
  title?: string
  content?: string
  lane?: string
  priority?: string
  energyLevel?: string
  complexity?: string
  effort?: string
  inspiration?: string
}

const laneOptions: SelectOption[] = [
  { value: BlockLane.VISION, label: 'Vision', description: 'Long-term goals and aspirations' },
  { value: BlockLane.GOALS, label: 'Goals', description: 'Concrete objectives to achieve' },
  { value: BlockLane.CURRENT, label: 'Current Sprint', description: 'Active work in progress' },
  { value: BlockLane.NEXT, label: 'Next Sprint', description: 'Upcoming tasks and priorities' },
  { value: BlockLane.CONTEXT, label: 'Context', description: 'Important information and references' },
]

const priorityOptions: SelectOption[] = [
  { value: Priority.LOW, label: 'Low', description: 'Nice to have, no rush' },
  { value: Priority.MEDIUM, label: 'Medium', description: 'Standard priority' },
  { value: Priority.HIGH, label: 'High', description: 'Important, prioritize this' },
  { value: Priority.URGENT, label: 'Urgent', description: 'Critical, needs immediate attention' },
]

const energyOptions: SelectOption[] = [
  { value: EnergyLevel.LOW, label: 'Low Energy', description: 'For simple, routine tasks' },
  { value: EnergyLevel.MEDIUM, label: 'Medium Energy', description: 'For moderate complexity work' },
  { value: EnergyLevel.HIGH, label: 'High Energy', description: 'For challenging tasks' },
  { value: EnergyLevel.PEAK, label: 'Peak Energy', description: 'For complex, creative work' },
]

const complexityOptions: SelectOption[] = [
  { value: Complexity.SIMPLE, label: 'Quick Win', description: 'Clear, straightforward tasks' },
  { value: Complexity.MODERATE, label: 'Deep Work', description: 'Some complexity, may need research' },
  { value: Complexity.COMPLEX, label: 'Research', description: 'Multi-step, requires deep thinking' },
  { value: Complexity.UNKNOWN, label: 'Unknown', description: 'Requires investigation first' },
]

export function BlockForm({ block, initialLane, onSubmit, onCancel, isLoading }: BlockFormProps) {
  const [formData, setFormData] = useState<FormData>({
    title: block?.title || '',
    content: block?.content || '',
    lane: block?.lane || initialLane || BlockLane.GOALS,
    priority: block?.priority || Priority.MEDIUM,
    energyLevel: block?.energyLevel || EnergyLevel.MEDIUM,
    complexity: block?.complexity || Complexity.MODERATE,
    effort: block?.effort || 1,
    inspiration: block?.inspiration || 5,
    tags: block?.tags?.join(', ') || '',
  })

  const [errors, setErrors] = useState<FormErrors>({})

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be 100 characters or less'
    }

    // Content validation
    if (formData.content.length > 5000) {
      newErrors.content = 'Content must be 5000 characters or less'
    }

    // Effort validation
    if (formData.effort < 0 || formData.effort > 1000) {
      newErrors.effort = 'Effort must be between 0 and 1000 hours'
    }

    // Inspiration validation
    if (formData.inspiration < 1 || formData.inspiration > 10) {
      newErrors.inspiration = 'Inspiration must be between 1 and 10'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const tags = formData.tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .slice(0, 10) // Limit to 10 tags

    const now = new Date()
    const submittedBlock: Block = {
      id: block?.id || generateId(),
      projectId: block?.projectId || 'current-project', // Will be set by parent
      title: formData.title.trim(),
      content: formData.content.trim(),
      lane: formData.lane,
      status: block?.status || BlockStatus.NOT_STARTED,
      progress: block?.progress || 0,
      effort: formData.effort,
      priority: formData.priority,
      claudeSessions: block?.claudeSessions || 0,
      lastWorked: block?.lastWorked || null,
      relatedSessionIds: block?.relatedSessionIds || [],
      energyLevel: formData.energyLevel,
      complexity: formData.complexity,
      inspiration: formData.inspiration,
      mood: block?.mood,
      createdAt: block?.createdAt || now,
      updatedAt: now,
      createdBy: block?.createdBy || 'user1', // Will be set by parent
      tags,
      dependencies: block?.dependencies || [],
      blockedBy: block?.blockedBy || [],
      subtasks: block?.subtasks,
      aiSuggestions: block?.aiSuggestions,
    }

    onSubmit(submittedBlock)
  }

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <Input
        label="Title *"
        value={formData.title}
        onChange={(e) => handleInputChange('title', e.target.value)}
        placeholder="Enter block title..."
        error={errors.title}
        maxLength={100}
      />

      {/* Content */}
      <Textarea
        label="Description"
        value={formData.content}
        onChange={(e) => handleInputChange('content', e.target.value)}
        placeholder="Describe what needs to be done..."
        error={errors.content}
        className="min-h-[100px]"
        maxLength={5000}
      />

      {/* Lane and Priority Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Lane *"
          options={laneOptions}
          value={formData.lane}
          onChange={(value) => handleInputChange('lane', value)}
          error={errors.lane}
        />

        <Select
          label="Priority *"
          options={priorityOptions}
          value={formData.priority}
          onChange={(value) => handleInputChange('priority', value)}
          error={errors.priority}
        />
      </div>

      {/* Energy and Complexity Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Energy Level *"
          options={energyOptions}
          value={formData.energyLevel}
          onChange={(value) => handleInputChange('energyLevel', value)}
          error={errors.energyLevel}
          helperText="Match tasks to your energy level"
        />

        <Select
          label="Complexity *"
          options={complexityOptions}
          value={formData.complexity}
          onChange={(value) => handleInputChange('complexity', value)}
          error={errors.complexity}
          helperText="How complex is this work?"
        />
      </div>

      {/* Effort and Inspiration Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Effort (hours)"
          type="number"
          value={formData.effort}
          onChange={(e) => handleInputChange('effort', Number(e.target.value))}
          placeholder="1"
          error={errors.effort}
          helperText="Estimated time to complete"
          min={0}
          max={1000}
          step={0.5}
        />

        <Input
          label="Inspiration Level"
          type="number"
          value={formData.inspiration}
          onChange={(e) => handleInputChange('inspiration', Number(e.target.value))}
          placeholder="5"
          error={errors.inspiration}
          helperText="How inspiring is this work? (1-10)"
          min={1}
          max={10}
        />
      </div>

      {/* Tags */}
      <Input
        label="Tags"
        value={formData.tags}
        onChange={(e) => handleInputChange('tags', e.target.value)}
        placeholder="tag1, tag2, tag3"
        helperText="Separate tags with commas (max 10 tags)"
      />

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={isLoading}
          disabled={isLoading}
        >
          {block ? 'Update Block' : 'Create Block'}
        </Button>
      </div>
    </form>
  )
}