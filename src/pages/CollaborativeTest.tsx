import { useState } from 'react'
import { CollaborativeProjectBoard } from '@/components/collaboration'
import { Button } from '@/components/ui'
import { RequireAuth } from '@/components/auth'

export function CollaborativeTest() {
  // This would normally come from route params or context
  const [projectId] = useState('collaborative-test-project')

  return (
    <RequireAuth>
      <div className="h-screen flex flex-col">
        <div className="p-4 border-b border-border bg-card/50">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">Real-time Collaboration Test</h1>
              <p className="text-sm text-muted-foreground">
                Testing collaborative editing with live presence, cursors, and conflict resolution
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                Project ID: {projectId}
              </div>
              <Button variant="outline" size="sm">
                Switch Project
              </Button>
            </div>
          </div>
          
          {/* Instructions */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Testing Instructions:</h3>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Open this page in multiple browser tabs/windows to see collaboration</li>
              <li>• Create, edit, and move blocks to see real-time updates</li>
              <li>• Watch for presence indicators showing other users</li>
              <li>• Try editing the same block simultaneously to test conflict resolution</li>
              <li>• Move your cursor to see live cursor sharing</li>
            </ul>
          </div>
        </div>

        <div className="flex-1">
          <CollaborativeProjectBoard
            projectId={projectId}
            onBlockClick={(block) => console.log('Block clicked:', block)}
            onBlockEdit={(block) => console.log('Block edit:', block)}
            onAddBlock={(lane) => console.log('Add block to lane:', lane)}
            onLaneSettings={(lane) => console.log('Lane settings:', lane)}
          />
        </div>
      </div>
    </RequireAuth>
  )
}