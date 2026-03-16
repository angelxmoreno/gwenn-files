import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { X, Mail, Send } from 'lucide-react'
import { invites } from '../lib/api'

interface InviteModalProps {
  projectId: string
  onClose: () => void
}

export function InviteModal({ projectId, onClose }: InviteModalProps) {
  const [email, setEmail] = useState('')

  const inviteMutation = useMutation({
    mutationFn: () => invites.create({ project_id: projectId, email }),
    onSuccess: () => {
      setEmail('')
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    inviteMutation.mutate()
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box border border-base-300">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Invite a collaborator</h3>
          <button className="btn btn-ghost btn-sm btn-circle" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-base-content/60 mb-4">
          Enter the email address of the person you&apos;d like to invite. They&apos;ll receive a
          link to join this project.
        </p>

        {inviteMutation.error && (
          <div className="alert alert-error text-sm mb-4">
            <span>{inviteMutation.error.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="form-control">
            <div className="label">
              <span className="label-text">Email address</span>
            </div>
            <div className="input input-bordered flex items-center gap-2">
              <Mail className="w-4 h-4 opacity-50" />
              <input
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="grow"
              />
            </div>
          </label>

          <div className="modal-action mt-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary gap-2"
              disabled={!email.trim() || inviteMutation.isPending}
            >
              {inviteMutation.isPending ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send invite
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  )
}
