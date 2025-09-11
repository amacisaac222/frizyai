# Frizy.AI Design System

A Claude-inspired design system built with Tailwind CSS and React components.

## 🎨 Design Principles

- **Clean & Minimal**: Inspired by Claude's interface with plenty of whitespace
- **Orange Primary**: Using `#f97316` as the primary color, matching Claude's brand
- **Inter Typography**: Clean, readable font with proper font weights
- **Subtle Interactions**: Smooth transitions and hover effects
- **Accessibility First**: Proper focus states and semantic HTML

## 🎯 Color Palette

### Primary Orange
- `orange-500` (#f97316) - Primary actions and branding
- `orange-400` (#fb923c) - Hover states
- `orange-600` (#ea580c) - Pressed states

### Grays
- `gray-50` (#fafafa) - Light backgrounds
- `gray-100` (#f4f4f5) - Card backgrounds
- `gray-500` (#71717a) - Muted text
- `gray-900` (#18181b) - Primary text

### Semantic Colors
- `destructive` - Error states and destructive actions
- `muted` - Secondary text and disabled states
- `border` - Subtle borders and dividers

## 🔤 Typography

Built with Inter font family:
- **Headings**: Bold weights (600-700) with tight letter spacing
- **Body**: Regular weight (400) with comfortable line height
- **Small text**: Medium weight (500) for better readability

## 🧩 Components

### Button
```tsx
<Button variant="primary" size="md">Primary Action</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="outline">Outline</Button>
```

**Variants:**
- `primary` - Orange background, white text
- `secondary` - Gray background, dark text
- `ghost` - Transparent with hover effects
- `outline` - Border only with hover fill
- `destructive` - Red for dangerous actions

**Sizes:**
- `sm` - 36px height, compact padding
- `md` - 40px height, standard padding
- `lg` - 44px height, generous padding

### Input
```tsx
<Input 
  label="Email Address"
  placeholder="Enter your email"
  helperText="We'll never share your email"
/>

<Textarea 
  label="Message"
  placeholder="Your message..."
/>
```

**Features:**
- Built-in label and helper text
- Error state with validation messages
- Focus rings using primary color
- Proper accessibility attributes

### Card
```tsx
<Card variant="default">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Supporting text</CardDescription>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
</Card>
```

**Variants:**
- `default` - Standard card with border and shadow
- `elevated` - Enhanced shadow with hover effects
- `ghost` - Minimal styling, no borders

### Badges

#### Status Badge
```tsx
<StatusBadge status={BlockStatus.IN_PROGRESS} />
```
Shows block status with colored dots and labels.

#### Priority Badge
```tsx
<PriorityBadge priority={Priority.HIGH} />
```
Color-coded priority levels from low to urgent.

#### Energy Badge
```tsx
<EnergyBadge energy={EnergyLevel.HIGH} />
```
For vibe coders - shows energy levels with emojis.

#### Complexity Badge
```tsx
<ComplexityBadge complexity={Complexity.MODERATE} />
```
Indicates task complexity levels.

#### Mood Badge
```tsx
<MoodBadge mood={ProjectMood.FOCUSED} />
```
Project mood tracking with emojis and colors.

## 🎭 Animations

Subtle animations throughout:
- `fade-in` - Smooth opacity transitions
- `slide-in-from-bottom` - Content appearing from bottom
- `slide-in-from-top` - Content appearing from top
- `scale-in` - Gentle scale effect for modals/popovers

## 📱 Responsive Design

- Mobile-first approach with Tailwind breakpoints
- Flexible grid layouts that adapt to screen size
- Touch-friendly button sizes (minimum 44px)
- Readable text scales across devices

## ♿ Accessibility

- Focus rings on all interactive elements
- Semantic HTML structure
- Proper ARIA labels and descriptions
- Color contrast ratios meet WCAG guidelines
- Screen reader friendly

## 🛠 Usage

Import components from the UI directory:

```tsx
import { Button, Input, Card, Badge } from '@/components/ui'
```

Use the `cn` utility for conditional classes:

```tsx
import { cn } from '@/utils'

<div className={cn(
  'base-styles',
  { 'conditional-class': condition }
)} />
```

## 📖 Demo

Visit `/design-system` to see all components in action with live examples and variations.

## 🎯 Component Guidelines

1. **Composition over Configuration**: Use compound components (Card + CardHeader + CardTitle)
2. **Variant Props**: Use semantic variant names, not colors
3. **Size Consistency**: Stick to sm/md/lg size scale
4. **Focus States**: Always include proper focus rings
5. **Loading States**: Show loading spinners for async actions

## 🔮 Future Enhancements

- Dark mode support
- Additional component variants
- Animation library integration
- More complex form components
- Data visualization components