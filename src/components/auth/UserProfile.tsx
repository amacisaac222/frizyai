import { useState } from 'react'
import { User, Mail, Clock, Settings, LogOut } from 'lucide-react'
import { Button, Input, Card, CardContent, CardHeader, Badge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import type { User as DBUser } from '@/lib/database.types'

interface UserProfileProps {
  onClose?: () => void
}

export function UserProfile({ onClose }: UserProfileProps) {
  const { user, dbUser, updateProfile, signOut, loading } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    full_name: dbUser?.full_name || '',
    timezone: dbUser?.timezone || 'UTC',
    default_energy_level: dbUser?.default_energy_level || 'medium',
    preferred_complexity: dbUser?.preferred_complexity || 'moderate'
  })

  const handleSave = async () => {
    setError(null)
    setSuccess(null)
    setIsSaving(true)

    try {
      const result = await updateProfile(formData)
      
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess('Profile updated successfully')
        setIsEditing(false)
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err) {
      setError('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    // Reset form data
    setFormData({
      full_name: dbUser?.full_name || '',
      timezone: dbUser?.timezone || 'UTC',
      default_energy_level: dbUser?.default_energy_level || 'medium',
      preferred_complexity: dbUser?.preferred_complexity || 'moderate'
    })
    setIsEditing(false)
    setError(null)
    setSuccess(null)
  }

  const handleSignOut = async () => {
    await signOut()
    onClose?.()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading || !user || !dbUser) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Profile</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}
      
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Profile Information</h2>
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                icon={Settings}
              >
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  loading={isSaving}
                  disabled={isSaving}
                >
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email (read-only) */}
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-sm">{user.email}</p>
            </div>
          </div>

          {/* Full Name */}
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              {isEditing ? (
                <Input
                  label="Full name"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter your full name"
                  disabled={isSaving}
                />
              ) : (
                <>
                  <label className="text-sm font-medium text-muted-foreground">Full name</label>
                  <p className="text-sm">{dbUser.full_name || 'Not set'}</p>
                </>
              )}
            </div>
          </div>

          {/* Member Since */}
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground">Member since</label>
              <p className="text-sm">{formatDate(dbUser.created_at)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Preferences</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Timezone */}
          <div>
            {isEditing ? (
              <Input
                label="Timezone"
                value={formData.timezone}
                onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                placeholder="UTC"
                disabled={isSaving}
                helperText="Enter your timezone (e.g., America/New_York, Europe/London)"
              />
            ) : (
              <>
                <label className="text-sm font-medium text-muted-foreground">Timezone</label>
                <p className="text-sm">{dbUser.timezone}</p>
              </>
            )}
          </div>

          {/* Default Energy Level */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Default energy level</label>
            {isEditing ? (
              <select
                className="w-full mt-1 px-3 py-2 border border-border rounded-md text-sm"
                value={formData.default_energy_level}
                onChange={(e) => setFormData(prev => ({ ...prev, default_energy_level: e.target.value as any }))}
                disabled={isSaving}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="peak">Peak</option>
              </select>
            ) : (
              <p className="text-sm capitalize">{dbUser.default_energy_level}</p>
            )}
          </div>

          {/* Preferred Complexity */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Preferred complexity</label>
            {isEditing ? (
              <select
                className="w-full mt-1 px-3 py-2 border border-border rounded-md text-sm"
                value={formData.preferred_complexity}
                onChange={(e) => setFormData(prev => ({ ...prev, preferred_complexity: e.target.value as any }))}
                disabled={isSaving}
              >
                <option value="simple">Quick Win</option>
                <option value="moderate">Deep Work</option>
                <option value="complex">Research</option>
                <option value="unknown">Unknown</option>
              </select>
            ) : (
              <p className="text-sm capitalize">{dbUser.preferred_complexity}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Statistics</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{dbUser.total_projects}</p>
              <p className="text-sm text-muted-foreground">Projects</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{dbUser.total_blocks}</p>
              <p className="text-sm text-muted-foreground">Blocks</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{dbUser.total_claude_sessions}</p>
              <p className="text-sm text-muted-foreground">Claude Sessions</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Account</h2>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleSignOut}
            icon={LogOut}
            className="w-full md:w-auto"
          >
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}