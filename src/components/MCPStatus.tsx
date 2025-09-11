import { Circle, Wifi, WifiOff, AlertTriangle } from 'lucide-react'
import { Badge } from './ui'
import { MCPConnectionStatus } from '@/lib/types'

interface MCPStatusProps {
  status: MCPConnectionStatus
  port?: number
  lastConnected?: Date
  onClick?: () => void
}

export function MCPStatus({ status, port, lastConnected, onClick }: MCPStatusProps) {
  const statusConfig = {
    [MCPConnectionStatus.DISCONNECTED]: {
      label: 'Disconnected',
      icon: WifiOff,
      className: 'bg-gray-100 text-gray-700 border-gray-200',
      color: 'text-gray-500'
    },
    [MCPConnectionStatus.CONNECTING]: {
      label: 'Connecting',
      icon: Wifi,
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      color: 'text-yellow-600'
    },
    [MCPConnectionStatus.CONNECTED]: {
      label: 'Connected',
      icon: Wifi,
      className: 'bg-green-100 text-green-800 border-green-200',
      color: 'text-green-600'
    },
    [MCPConnectionStatus.ERROR]: {
      label: 'Error',
      icon: AlertTriangle,
      className: 'bg-red-100 text-red-800 border-red-200',
      color: 'text-red-600'
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div 
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer hover:bg-accent/50 transition-colors ${
        onClick ? 'cursor-pointer' : 'cursor-default'
      }`}
      onClick={onClick}
      title={`MCP Status: ${config.label}${port ? ` (Port ${port})` : ''}${
        lastConnected ? ` • Last: ${lastConnected.toLocaleTimeString()}` : ''
      }`}
    >
      <div className="relative">
        <Icon className={`w-4 h-4 ${config.color}`} />
        {status === MCPConnectionStatus.CONNECTING && (
          <Circle className="w-4 h-4 absolute inset-0 animate-ping text-yellow-400 opacity-75" />
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          MCP
        </span>
        <Badge 
          size="sm" 
          className={config.className}
        >
          {config.label}
        </Badge>
      </div>
      
      {port && status === MCPConnectionStatus.CONNECTED && (
        <span className="text-xs text-muted-foreground">
          :{port}
        </span>
      )}
    </div>
  )
}