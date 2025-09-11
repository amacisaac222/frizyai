import { useState } from 'react'
import { Trash2, Edit3 } from 'lucide-react'
import { Modal, Button, ConfirmDialog } from './ui'
import { BlockForm } from './BlockForm'
import { Block, BlockLane } from '@/lib/types'

interface BlockModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  block?: Block
  initialLane?: BlockLane
  onSave: (block: Block) => void
  onDelete?: (blockId: string) => void
}

export function BlockModal({
  isOpen,
  onClose,
  mode,
  block,
  initialLane,
  onSave,
  onDelete
}: BlockModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSave = async (updatedBlock: Block) => {
    setIsLoading(true)
    try {
      await onSave(updatedBlock)
      onClose()
    } catch (error) {
      console.error('Failed to save block:', error)
      // TODO: Show error toast/notification
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!block || !onDelete) return
    
    setIsDeleting(true)
    try {
      await onDelete(block.id)
      setShowDeleteConfirm(false)
      onClose()
    } catch (error) {
      console.error('Failed to delete block:', error)
      // TODO: Show error toast/notification
    } finally {
      setIsDeleting(false)
    }
  }

  const modalTitle = mode === 'create' 
    ? `New Block${initialLane ? ` - ${initialLane.charAt(0).toUpperCase() + initialLane.slice(1)}` : ''}` 
    : 'Edit Block'

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={modalTitle}
        size="lg"
        className="max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-6">
          {/* Header Actions (for edit mode) */}
          {mode === 'edit' && block && (
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Edit3 className="w-4 h-4" />
                <span className="text-sm">
                  Created {new Date(block.createdAt).toLocaleDateString()}
                </span>
                {block.updatedAt && block.updatedAt !== block.createdAt && (
                  <span className="text-sm">
                    • Updated {new Date(block.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          )}

          {/* Form */}
          <BlockForm
            block={block}
            initialLane={initialLane}
            onSubmit={handleSave}
            onCancel={onClose}
            isLoading={isLoading}
          />
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Block"
        description={`Are you sure you want to delete "${block?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        isLoading={isDeleting}
      />
    </>
  )
}