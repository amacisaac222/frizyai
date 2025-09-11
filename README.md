# Frizy.AI

A project management tool designed to solve context loss between Claude sessions.

## Features

- **Project Tracking**: Keep all your project information, goals, and progress organized
- **Session Continuity**: Maintain context between Claude conversations with smart project summaries
- **Team Collaboration**: Share project context with team members and collaborators

## Tech Stack

- **React 18** with TypeScript for type safety
- **Vite** for fast development and building
- **Tailwind CSS** for modern styling
- **React Router** for navigation
- **Lucide React** for beautiful icons
- **DND Kit** for drag & drop functionality

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd frizyai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── hooks/         # Custom React hooks
├── utils/         # Utility functions
├── types/         # TypeScript type definitions
└── styles/        # Global styles and Tailwind config
```

## Design System

The project uses a clean, modern design inspired by Claude's interface:

- **Font**: Inter (Google Fonts)
- **Color Scheme**: Clean, professional palette with proper contrast
- **Components**: Built with Tailwind CSS utility classes
- **Icons**: Lucide React icon set

## Contributing

1. Create a feature branch
2. Make your changes
3. Ensure TypeScript compilation passes
4. Test your changes
5. Submit a pull request

## License

MIT License