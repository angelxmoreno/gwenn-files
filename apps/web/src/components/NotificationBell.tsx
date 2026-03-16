import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Check } from 'lucide-react'
import { notifications } from '../lib/api'
import { useAuthStore } from '../stores/auth.store'
import type { Notification, NotificationType } from '@gwenn/shared'

function notificationLabel(type: NotificationType, payload: Record<string, unknown> | null): string {
  const labels: Record<NotificationType, string> = {
    file_uploaded: `New file uploaded${payload?.['track_name'] ? `: ${payload['track_name'] as string}` : ''}`,
    invite_accepted: `${(payload?.['user_name'] as string | undefined) ?? 'Someone'} accepted your invite`,
    comment_added: `New comment on ${(payload?.['track_name'] as string | undefined) ?? 'a track'}`,
    added_to_project: `You were added to ${(payload?.['project_title'] as string | undefined) ?? 'a project'}`,
    new_version_uploaded: `New version uploaded for ${(payload?.['track_name'] as string | undefined) ?? 'a track'}`,
  }
  return labels[type]
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(dateStr).toLocaleDateString()
}

export function NotificationBell() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const notifQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notifications.list(1, 10),
    enabled: !!user,
    refetchInterval: 30000,
  })

  const markReadMutation = useMutation({
    mutationFn: (ids?: string[]) => notifications.markRead(ids),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const allNotifs = notifQuery.data?.data ?? []
  const unread = allNotifs.filter((n) => !n.read_at)
  const unreadCount = unread.length

  const handleOpen = () => {
    setIsOpen((v) => !v)
    if (!isOpen && unreadCount > 0) {
      // Mark all as read after a brief delay so user sees the badge
      setTimeout(() => markReadMutation.mutate(undefined), 800)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="btn btn-ghost btn-sm btn-circle relative"
        onClick={handleOpen}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-error text-error-content text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-base-200 border border-base-300 rounded-box shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                className="btn btn-ghost btn-xs gap-1"
                onClick={() => markReadMutation.mutate(unread.map((n) => n.id))}
                disabled={markReadMutation.isPending}
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifQuery.isLoading && (
              <div className="flex justify-center py-6">
                <span className="loading loading-spinner loading-sm" />
              </div>
            )}

            {allNotifs.length === 0 && !notifQuery.isLoading && (
              <p className="text-center text-sm text-base-content/40 py-6">
                No notifications yet.
              </p>
            )}

            {allNotifs.map((notif) => (
              <div
                key={notif.id}
                className={`px-4 py-3 border-b border-base-300 last:border-0 text-sm ${
                  !notif.read_at ? 'bg-primary/5' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  {!notif.read_at && (
                    <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                  )}
                  <div className={!notif.read_at ? '' : 'ml-4'}>
                    <p className={!notif.read_at ? 'font-medium' : 'text-base-content/70'}>
                      {notificationLabel(notif.type, notif.payload)}
                    </p>
                    <p className="text-xs text-base-content/40 mt-0.5">
                      {timeAgo(notif.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
