import { createRoute, useParams, Link, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Upload, Users, Music, Activity, Loader, UserMinus } from 'lucide-react'
import { RootRoute } from './__root'
import { projects, tracks, activity } from '../lib/api'
import { useAuthStore } from '../stores/auth.store'
import { TrackCard } from '../components/TrackCard'
import { InviteModal } from '../components/InviteModal'
import type { ActivityType } from '@gwenn/shared'

type Tab = 'tracks' | 'members' | 'activity'

function ActivityItem({ type, payload, createdAt }: { type: ActivityType; payload: Record<string, unknown> | null; createdAt: string }) {
  const labels: Record<ActivityType, string> = {
    uploaded: 'uploaded a file',
    commented: 'left a comment',
    invited: 'was invited',
    joined: 'joined the project',
    new_version: 'uploaded a new version',
  }
  return (
    <div className="flex items-start gap-3 py-3 border-b border-base-300 last:border-0">
      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{(payload?.['actor_name'] as string | undefined) ?? 'Someone'}</span>{' '}
          {labels[type]}
          {payload?.['track_name'] ? (
            <span className="text-base-content/60"> — {payload['track_name'] as string}</span>
          ) : null}
        </p>
        <p className="text-xs text-base-content/50 mt-0.5">
          {new Date(createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  )
}

function ProjectDetailPage() {
  const { id } = useParams({ from: '/projects/$id' })
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('tracks')
  const [showInviteModal, setShowInviteModal] = useState(false)

  const projectQuery = useQuery({
    queryKey: ['projects', id],
    queryFn: () => projects.get(id),
  })

  const tracksQuery = useQuery({
    queryKey: ['tracks', id],
    queryFn: () => tracks.list(id),
    enabled: activeTab === 'tracks',
  })

  const activityQuery = useQuery({
    queryKey: ['activity', id],
    queryFn: () => activity.get(id),
    enabled: activeTab === 'activity',
  })

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => projects.removeMember(id, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects', id] })
    },
  })

  const project = projectQuery.data
  const isOwner = project?.owner_id === user?.id
  const canManage = user?.role === 'admin' || user?.role === 'manager' || isOwner

  if (projectQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (projectQuery.error || !project) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="alert alert-error max-w-md">
          <span>Project not found or you don&apos;t have access.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/dashboard" className="btn btn-ghost btn-sm btn-circle flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">{project.title}</h1>
            {project.description && (
              <p className="text-base-content/60 text-sm mt-0.5 line-clamp-2">
                {project.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {canManage && (
            <Link
              to="/projects/$id/settings"
              params={{ id }}
              className="btn btn-ghost btn-sm"
            >
              Settings
            </Link>
          )}
          <Link
            to="/projects/$id/upload"
            params={{ id }}
            className="btn btn-primary btn-sm gap-2"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload</span>
          </Link>
        </div>
      </div>

      <div role="tablist" className="tabs tabs-bordered">
        <button
          role="tab"
          className={`tab gap-2 ${activeTab === 'tracks' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('tracks')}
        >
          <Music className="w-4 h-4" />
          Tracks
        </button>
        <button
          role="tab"
          className={`tab gap-2 ${activeTab === 'members' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          <Users className="w-4 h-4" />
          Members{' '}
          <span className="badge badge-sm">{project.members?.length ?? 0}</span>
        </button>
        <button
          role="tab"
          className={`tab gap-2 ${activeTab === 'activity' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <Activity className="w-4 h-4" />
          Activity
        </button>
      </div>

      {activeTab === 'tracks' && (
        <div className="flex flex-col gap-4">
          {tracksQuery.isLoading && (
            <div className="flex justify-center py-10">
              <Loader className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          {tracksQuery.data?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-base-content/40">
              <Music className="w-12 h-12" />
              <p className="text-lg font-medium">No tracks yet</p>
              <p className="text-sm">Upload your first file to get started.</p>
              <Link
                to="/projects/$id/upload"
                params={{ id }}
                className="btn btn-primary btn-sm gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload file
              </Link>
            </div>
          )}
          {tracksQuery.data?.map((track) => (
            <TrackCard key={track.id} track={track} projectId={id} />
          ))}
        </div>
      )}

      {activeTab === 'members' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            {canManage && (
              <button
                className="btn btn-outline btn-sm gap-2"
                onClick={() => setShowInviteModal(true)}
              >
                <Users className="w-4 h-4" />
                Invite member
              </button>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {project.members?.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-base-200 rounded-box border border-base-300"
              >
                <div className="flex items-center gap-3">
                  {member.user.avatar_url ? (
                    <img
                      src={member.user.avatar_url}
                      alt={member.user.display_name ?? ''}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                      {(member.user.display_name ?? '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {member.user.display_name ?? 'Unknown'}
                      {member.user.id === project.owner_id && (
                        <span className="badge badge-sm badge-primary ml-2">Owner</span>
                      )}
                    </p>
                    <p className="text-xs text-base-content/50">
                      {member.permission}
                    </p>
                  </div>
                </div>
                {canManage && member.user.id !== project.owner_id && member.user.id !== user?.id && (
                  <button
                    className="btn btn-ghost btn-sm text-error"
                    onClick={() => removeMemberMutation.mutate(member.user.id)}
                    disabled={removeMemberMutation.isPending}
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="card bg-base-200 border border-base-300">
          <div className="card-body p-4">
            {activityQuery.isLoading && (
              <div className="flex justify-center py-6">
                <Loader className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
            {activityQuery.data?.length === 0 && (
              <p className="text-center text-base-content/50 py-6">No activity yet.</p>
            )}
            {activityQuery.data?.map((item) => (
              <ActivityItem
                key={item.id}
                type={item.type}
                payload={item.payload}
                createdAt={item.created_at}
              />
            ))}
          </div>
        </div>
      )}

      {showInviteModal && (
        <InviteModal
          projectId={id}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  )
}

export const ProjectDetailRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/projects/$id',
  beforeLoad: () => {
    const { user } = useAuthStore.getState()
    if (!user) throw redirect({ to: '/login' })
  },
  component: ProjectDetailPage,
})
