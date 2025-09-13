import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { Container, ContainerType, Connection, ViewConfig, ContextSelection } from '@/types/container'

interface ContainerState {
  // Core container data
  containers: Container[]
  selectedContainerId: string | null
  expandedContainerIds: string[]
  
  // View state
  viewConfig: ViewConfig
  searchQuery: string
  
  // Graph state
  graphNodes: Record<string, { x: number; y: number; fixed?: boolean }>
  
  // Context selection for MCP
  contextSelection: ContextSelection | null
  
  // Actions
  createContainer: (container: Omit<Container, 'id' | 'createdAt' | 'updatedAt'>) => Container
  updateContainer: (id: string, updates: Partial<Container>) => void
  deleteContainer: (id: string) => void
  duplicateContainer: (id: string) => Container
  
  // Connection management
  addConnection: (fromId: string, connection: Omit<Connection, 'createdAt'>) => void
  removeConnection: (fromId: string, targetId: string, connectionType?: Connection['type']) => void
  updateConnection: (fromId: string, targetId: string, updates: Partial<Connection>) => void
  
  // Query and filtering
  getContainer: (id: string) => Container | undefined
  getContainersByType: (type: ContainerType) => Container[]
  getConnectedContainers: (id: string, maxDepth?: number) => Container[]
  searchContainers: (query: string) => Container[]
  getFilteredContainers: () => Container[]
  
  // Context selection for MCP
  selectContextContainers: (currentWorkId: string, maxContainers?: number) => ContextSelection
  
  // UI state management
  setSelectedContainer: (id: string | null) => void
  toggleExpandedContainer: (id: string) => void
  setViewConfig: (config: Partial<ViewConfig>) => void
  setSearchQuery: (query: string) => void
  
  // Graph positioning
  setGraphNodePosition: (nodeId: string, x: number, y: number, fixed?: boolean) => void
  
  // Bulk operations
  bulkUpdateContainers: (updates: Array<{ id: string; updates: Partial<Container> }>) => void
  importContainers: (containers: Container[]) => void
  exportContainers: (containerIds?: string[]) => Container[]
}

const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

const defaultViewConfig: ViewConfig = {
  mode: 'board',
  filters: {},
  groupBy: 'type',
  sortBy: 'updated',
  sortOrder: 'desc'
}

export const useContainerStore = create<ContainerState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        containers: [],
        selectedContainerId: null,
        expandedContainerIds: [],
        viewConfig: defaultViewConfig,
        searchQuery: '',
        graphNodes: {},
        contextSelection: null,

        // Core CRUD operations
        createContainer: (containerData) => {
          const container: Container = {
            ...containerData,
            id: generateId(),
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          
          set((state) => ({
            containers: [...state.containers, container]
          }))
          
          return container
        },

        updateContainer: (id, updates) => {
          set((state) => ({
            containers: state.containers.map(container =>
              container.id === id
                ? { ...container, ...updates, updatedAt: new Date() }
                : container
            )
          }))
        },

        deleteContainer: (id) => {
          set((state) => ({
            containers: state.containers.filter(container => container.id !== id),
            selectedContainerId: state.selectedContainerId === id ? null : state.selectedContainerId,
            expandedContainerIds: state.expandedContainerIds.filter(expandedId => expandedId !== id)
          }))
          
          // Remove connections to this container from other containers
          const { containers } = get()
          containers.forEach(container => {
            const connectionsToRemove = container.connections.filter(conn => conn.targetId === id)
            if (connectionsToRemove.length > 0) {
              get().updateContainer(container.id, {
                connections: container.connections.filter(conn => conn.targetId !== id)
              })
            }
          })
        },

        duplicateContainer: (id) => {
          const original = get().getContainer(id)
          if (!original) throw new Error(`Container ${id} not found`)
          
          const duplicate = get().createContainer({
            ...original,
            title: `${original.title} (Copy)`,
            connections: [], // Don't duplicate connections
            status: 'planned'
          })
          
          return duplicate
        },

        // Connection management
        addConnection: (fromId, connectionData) => {
          const connection: Connection = {
            ...connectionData,
            createdAt: new Date()
          }
          
          set((state) => ({
            containers: state.containers.map(container =>
              container.id === fromId
                ? {
                    ...container,
                    connections: [...container.connections, connection],
                    updatedAt: new Date()
                  }
                : container
            )
          }))
        },

        removeConnection: (fromId, targetId, connectionType) => {
          set((state) => ({
            containers: state.containers.map(container =>
              container.id === fromId
                ? {
                    ...container,
                    connections: container.connections.filter(conn => 
                      !(conn.targetId === targetId && 
                        (!connectionType || conn.type === connectionType))
                    ),
                    updatedAt: new Date()
                  }
                : container
            )
          }))
        },

        updateConnection: (fromId, targetId, updates) => {
          set((state) => ({
            containers: state.containers.map(container =>
              container.id === fromId
                ? {
                    ...container,
                    connections: container.connections.map(conn =>
                      conn.targetId === targetId ? { ...conn, ...updates } : conn
                    ),
                    updatedAt: new Date()
                  }
                : container
            )
          }))
        },

        // Query methods
        getContainer: (id) => {
          return get().containers.find(container => container.id === id)
        },

        getContainersByType: (type) => {
          return get().containers.filter(container => container.type === type)
        },

        getConnectedContainers: (id, maxDepth = 2) => {
          const { containers } = get()
          const visited = new Set<string>()
          const result: Container[] = []
          
          const traverse = (currentId: string, depth: number) => {
            if (depth > maxDepth || visited.has(currentId)) return
            
            visited.add(currentId)
            const container = containers.find(c => c.id === currentId)
            if (!container) return
            
            if (currentId !== id) {
              result.push(container)
            }
            
            // Follow connections
            container.connections.forEach(conn => {
              traverse(conn.targetId, depth + 1)
            })
            
            // Follow reverse connections
            containers.forEach(c => {
              c.connections.forEach(conn => {
                if (conn.targetId === currentId) {
                  traverse(c.id, depth + 1)
                }
              })
            })
          }
          
          traverse(id, 0)
          return result
        },

        searchContainers: (query) => {
          if (!query.trim()) return get().containers
          
          const lowerQuery = query.toLowerCase()
          return get().containers.filter(container =>
            container.title.toLowerCase().includes(lowerQuery) ||
            container.description?.toLowerCase().includes(lowerQuery) ||
            container.metadata.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
          )
        },

        getFilteredContainers: () => {
          const { containers, viewConfig, searchQuery } = get()
          let filtered = containers
          
          // Apply search
          if (searchQuery.trim()) {
            filtered = get().searchContainers(searchQuery)
          }
          
          // Apply filters
          const { filters } = viewConfig
          if (filters.types?.length) {
            filtered = filtered.filter(c => filters.types!.includes(c.type))
          }
          if (filters.statuses?.length) {
            filtered = filtered.filter(c => filters.statuses!.includes(c.status))
          }
          if (filters.tags?.length) {
            filtered = filtered.filter(c =>
              filters.tags!.some(tag => c.metadata.tags?.includes(tag))
            )
          }
          if (filters.dateRange) {
            filtered = filtered.filter(c => {
              const createdAt = new Date(c.createdAt)
              return createdAt >= filters.dateRange!.start &&
                     createdAt <= filters.dateRange!.end
            })
          }
          
          // Apply sorting
          filtered.sort((a, b) => {
            let aValue: any, bValue: any
            
            switch (viewConfig.sortBy) {
              case 'created':
                aValue = new Date(a.createdAt).getTime()
                bValue = new Date(b.createdAt).getTime()
                break
              case 'updated':
                aValue = new Date(a.updatedAt).getTime()
                bValue = new Date(b.updatedAt).getTime()
                break
              case 'importance':
                aValue = a.importance
                bValue = b.importance
                break
              case 'progress':
                aValue = a.progress
                bValue = b.progress
                break
              case 'title':
                aValue = a.title.toLowerCase()
                bValue = b.title.toLowerCase()
                break
              default:
                return 0
            }
            
            const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
            return viewConfig.sortOrder === 'desc' ? -comparison : comparison
          })
          
          return filtered
        },

        selectContextContainers: (currentWorkId, maxContainers = 10) => {
          const connectedContainers = get().getConnectedContainers(currentWorkId, 2)
          
          // Sort by importance and connection strength
          const sortedContainers = connectedContainers
            .sort((a, b) => b.importance - a.importance)
            .slice(0, maxContainers)
          
          const totalImportance = sortedContainers.reduce((sum, c) => sum + c.importance, 0)
          
          const contextSelection: ContextSelection = {
            containers: sortedContainers,
            totalImportance,
            selectionReason: `Selected ${sortedContainers.length} most important connected containers`,
            maxDepth: 2
          }
          
          set({ contextSelection })
          return contextSelection
        },

        // UI state management
        setSelectedContainer: (id) => {
          set({ selectedContainerId: id })
        },

        toggleExpandedContainer: (id) => {
          set((state) => ({
            expandedContainerIds: state.expandedContainerIds.includes(id)
              ? state.expandedContainerIds.filter(expandedId => expandedId !== id)
              : [...state.expandedContainerIds, id]
          }))
        },

        setViewConfig: (config) => {
          set((state) => ({
            viewConfig: { ...state.viewConfig, ...config }
          }))
        },

        setSearchQuery: (query) => {
          set({ searchQuery: query })
        },

        setGraphNodePosition: (nodeId, x, y, fixed) => {
          set((state) => ({
            graphNodes: {
              ...state.graphNodes,
              [nodeId]: { x, y, fixed }
            }
          }))
        },

        // Bulk operations
        bulkUpdateContainers: (updates) => {
          set((state) => ({
            containers: state.containers.map(container => {
              const update = updates.find(u => u.id === container.id)
              return update
                ? { ...container, ...update.updates, updatedAt: new Date() }
                : container
            })
          }))
        },

        importContainers: (containers) => {
          set((state) => ({
            containers: [...state.containers, ...containers]
          }))
        },

        exportContainers: (containerIds) => {
          const { containers } = get()
          return containerIds
            ? containers.filter(c => containerIds.includes(c.id))
            : containers
        }
      }),
      {
        name: 'container-storage',
        version: 1,
        serialize: (state) => JSON.stringify(state),
        deserialize: (str) => {
          const parsed = JSON.parse(str)
          // Convert date strings back to Date objects
          if (parsed.state?.containers) {
            parsed.state.containers = parsed.state.containers.map((container: any) => ({
              ...container,
              createdAt: new Date(container.createdAt),
              updatedAt: new Date(container.updatedAt),
              connections: container.connections?.map((conn: any) => ({
                ...conn,
                createdAt: new Date(conn.createdAt)
              })) || []
            }))
          }
          return parsed
        }
      }
    ),
    { name: 'ContainerStore' }
  )
)