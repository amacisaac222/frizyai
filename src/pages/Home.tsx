import { Link } from 'react-router-dom'
import { ArrowRight, Target, Clock, Users } from 'lucide-react'

export function Home() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-8">
        <h1 className="text-5xl font-bold tracking-tight">
          Solve Context Loss in
          <span className="text-primary block">Claude Sessions</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Keep your projects organized and maintain context across Claude conversations. 
          Never lose track of your progress again.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/vertical-flow"
            className="inline-flex items-center gap-2 bg-white text-gray-900 border border-gray-200 px-8 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Try Demo
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-8">
        <div className="text-center space-y-4">
          <Target className="w-12 h-12 text-primary mx-auto" />
          <h3 className="text-xl font-semibold">Project Tracking</h3>
          <p className="text-muted-foreground">
            Keep all your project information, goals, and progress in one place.
          </p>
        </div>
        
        <div className="text-center space-y-4">
          <Clock className="w-12 h-12 text-primary mx-auto" />
          <h3 className="text-xl font-semibold">Session Continuity</h3>
          <p className="text-muted-foreground">
            Maintain context between Claude sessions with smart project summaries.
          </p>
        </div>
        
        <div className="text-center space-y-4">
          <Users className="w-12 h-12 text-primary mx-auto" />
          <h3 className="text-xl font-semibold">Team Collaboration</h3>
          <p className="text-muted-foreground">
            Share project context with team members and collaborators.
          </p>
        </div>
      </section>
    </div>
  )
}