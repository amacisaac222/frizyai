import { useState } from 'react'
import { Button, Card, CardContent, CardHeader } from '@/components/ui'
import { analyzeAndSuggestBlocks, createDemoSuggestions } from '@/lib/claude'
import { projectService } from '@/lib/services/projectService'
import { Brain, Zap, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

export function AITestComponent() {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [resultMessage, setResultMessage] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])

  const testAISuggestions = async () => {
    setTesting(true)
    setTestResult(null)
    setResultMessage('')
    setSuggestions([])

    try {
      // Test input
      const testInput = "I need to build a new feature for user authentication, set up CI/CD pipeline, write documentation, and fix the mobile responsive issues on the homepage. Also need to plan the next sprint and have a team meeting about the new design system."

      console.log('Testing AI suggestions with input:', testInput)

      // Check if we have Claude API key
      const hasApiKey = import.meta.env.VITE_ANTHROPIC_API_KEY && 
                       import.meta.env.VITE_ANTHROPIC_API_KEY !== 'your_anthropic_api_key'

      let result
      if (hasApiKey) {
        console.log('Using real Claude API')
        result = await analyzeAndSuggestBlocks(testInput, 'brain-dump')
        setResultMessage(`✅ Real Claude API: Generated ${result.suggestions.length} suggestions`)
      } else {
        console.log('Using demo suggestions')
        result = createDemoSuggestions(testInput, 'brain-dump')
        setResultMessage(`⚠️ Demo mode: Generated ${result.suggestions.length} demo suggestions`)
      }

      setSuggestions(result.suggestions)
      setTestResult('success')
      
      console.log('AI Test Result:', result)
    } catch (error) {
      console.error('AI Test Error:', error)
      setTestResult('error')
      setResultMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setTesting(false)
    }
  }

  const resetProjects = () => {
    projectService.resetToMockData()
    window.location.reload()
  }

  const debugStorage = () => {
    projectService.debugStorage()
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-purple-600" />
          <div>
            <h3 className="text-lg font-semibold">AI Block Suggestions Test</h3>
            <p className="text-sm text-muted-foreground">
              Test the Claude API integration for generating project blocks
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={testAISuggestions} 
            disabled={testing}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
          >
            {testing ? (
              <>
                <Zap className="w-4 h-4 mr-2 animate-spin" />
                Testing AI Suggestions...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Test AI Block Suggestions
              </>
            )}
          </Button>
          
          <Button 
            onClick={resetProjects}
            variant="outline"
            className="px-4"
            title="Reset to demo projects"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          
          <Button 
            onClick={debugStorage}
            variant="outline"
            className="px-4"
            title="Debug localStorage (check console)"
          >
            🐛
          </Button>
        </div>

        {testResult && (
          <div className={`p-4 rounded-lg border flex items-start gap-3 ${
            testResult === 'success' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            {testResult === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
            )}
            <div>
              <p className={`text-sm font-medium ${
                testResult === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {resultMessage}
              </p>
            </div>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Generated Suggestions:</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{suggestion.title}</span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`px-2 py-1 rounded capitalize ${
                        suggestion.priority === 'high' 
                          ? 'bg-red-100 text-red-700'
                          : suggestion.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {suggestion.priority}
                      </span>
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded capitalize">
                        {suggestion.lane}
                      </span>
                    </div>
                  </div>
                  <p className="text-muted-foreground">{suggestion.description}</p>
                  {suggestion.effort && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Effort: {suggestion.effort}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}