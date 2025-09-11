import { useState } from 'react'
import { 
  Button, 
  Input, 
  Textarea,
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  Badge,
  StatusBadge,
  PriorityBadge,
  EnergyBadge,
  ComplexityBadge,
  MoodBadge
} from '@/components/ui'
import { 
  BlockStatus, 
  Priority, 
  EnergyLevel, 
  Complexity, 
  ProjectMood 
} from '@/lib/types'

export function DesignSystem() {
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLoadingDemo = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 2000)
  }

  return (
    <div className="container mx-auto py-8 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Frizy.AI Design System</h1>
        <p className="text-xl text-muted-foreground">
          Claude-inspired components for clean, focused interfaces
        </p>
      </div>

      {/* Color Palette */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Color Palette</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Primary Orange</CardTitle>
              <CardDescription>Claude-inspired primary color</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="w-12 h-12 rounded-md bg-orange-500 flex items-center justify-center text-white text-xs font-mono">
                  500
                </div>
                <div className="w-12 h-12 rounded-md bg-orange-400 flex items-center justify-center text-white text-xs font-mono">
                  400
                </div>
                <div className="w-12 h-12 rounded-md bg-orange-600 flex items-center justify-center text-white text-xs font-mono">
                  600
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Grays</CardTitle>
              <CardDescription>Subtle backgrounds and text</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="w-12 h-12 rounded-md bg-gray-100 flex items-center justify-center text-gray-800 text-xs font-mono">
                  100
                </div>
                <div className="w-12 h-12 rounded-md bg-gray-200 flex items-center justify-center text-gray-800 text-xs font-mono">
                  200
                </div>
                <div className="w-12 h-12 rounded-md bg-gray-500 flex items-center justify-center text-white text-xs font-mono">
                  500
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Typography */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Typography</h2>
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="text-4xl font-bold">Heading 1</div>
            <div className="text-3xl font-bold">Heading 2</div>
            <div className="text-2xl font-semibold">Heading 3</div>
            <div className="text-xl font-semibold">Heading 4</div>
            <div className="text-lg font-medium">Heading 5</div>
            <p className="text-base">Body text with proper line height and Inter font.</p>
            <p className="text-sm text-muted-foreground">Small muted text for secondary information.</p>
          </CardContent>
        </Card>
      </section>

      {/* Buttons */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Buttons</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Variants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sizes & States</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button disabled>Disabled</Button>
                <Button loading={loading} onClick={handleLoadingDemo}>
                  {loading ? 'Loading...' : 'Click for Loading'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Inputs */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Text Inputs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input 
                label="Default Input"
                placeholder="Enter some text..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <Input 
                label="With Helper Text"
                placeholder="Email address"
                helperText="We'll never share your email"
              />
              <Input 
                label="Error State"
                placeholder="This will show an error"
                error="This field is required"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Textarea</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea 
                label="Message"
                placeholder="Enter your message..."
                helperText="Maximum 500 characters"
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Cards */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="default">
            <CardHeader>
              <CardTitle>Default Card</CardTitle>
              <CardDescription>Standard card with border and shadow</CardDescription>
            </CardHeader>
            <CardContent>
              <p>This is the default card variant with subtle styling.</p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Elevated Card</CardTitle>
              <CardDescription>Enhanced shadow with hover effect</CardDescription>
            </CardHeader>
            <CardContent>
              <p>This card has more prominent shadows and hover effects.</p>
            </CardContent>
          </Card>

          <Card variant="ghost">
            <CardHeader>
              <CardTitle>Ghost Card</CardTitle>
              <CardDescription>Minimal styling, no borders</CardDescription>
            </CardHeader>
            <CardContent>
              <p>This card is transparent with no borders or shadows.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Badges */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Badges</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Status Badges</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <StatusBadge status={BlockStatus.NOT_STARTED} />
              <StatusBadge status={BlockStatus.IN_PROGRESS} />
              <StatusBadge status={BlockStatus.BLOCKED} />
              <StatusBadge status={BlockStatus.COMPLETED} />
              <StatusBadge status={BlockStatus.ON_HOLD} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Priority Badges</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <PriorityBadge priority={Priority.LOW} />
              <PriorityBadge priority={Priority.MEDIUM} />
              <PriorityBadge priority={Priority.HIGH} />
              <PriorityBadge priority={Priority.URGENT} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Energy Badges</CardTitle>
              <CardDescription>For vibe coders</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <EnergyBadge energy={EnergyLevel.LOW} />
              <EnergyBadge energy={EnergyLevel.MEDIUM} />
              <EnergyBadge energy={EnergyLevel.HIGH} />
              <EnergyBadge energy={EnergyLevel.PEAK} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Complexity Badges</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <ComplexityBadge complexity={Complexity.SIMPLE} />
              <ComplexityBadge complexity={Complexity.MODERATE} />
              <ComplexityBadge complexity={Complexity.COMPLEX} />
              <ComplexityBadge complexity={Complexity.UNKNOWN} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mood Badges</CardTitle>
              <CardDescription>Project mood tracking</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <MoodBadge mood={ProjectMood.EXCITED} />
              <MoodBadge mood={ProjectMood.FOCUSED} />
              <MoodBadge mood={ProjectMood.STRUGGLING} />
              <MoodBadge mood={ProjectMood.BURNOUT} />
              <MoodBadge mood={ProjectMood.EXPLORING} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Basic Badges</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}