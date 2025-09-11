import { useState } from 'react'
import { DraggableProjectBoardDB } from '@/components/DraggableProjectBoardDB'
import { Button } from '@/components/ui'

export function TestDB() {
  // This would normally come from route params or context
  const [projectId] = useState('test-project-id')

  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 border-b border-border bg-card/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Database Integration Test</h1>
            <p className="text-sm text-muted-foreground">
              Testing the new database-powered project board
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
              Project ID: {projectId}
            </div>
            <Button variant="outline" size="sm">
              Switch Project
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <DraggableProjectBoardDB
          projectId={projectId}
          onBlockClick={(block) => console.log('Block clicked:', block)}
          onBlockEdit={(block) => console.log('Block edit:', block)}
          onAddBlock={(lane) => console.log('Add block to lane:', lane)}
          onLaneSettings={(lane) => console.log('Lane settings:', lane)}
        />
      </div>
    </div>
  )
}