import { createRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader, Search } from 'lucide-react'
import { useState } from 'react'
import { AdminRoute } from './admin'
import { admin } from '../lib/api'
import { RoleBadge } from '../components/RoleBadge'
import { useAuthStore } from '../stores/auth.store'
import type { UserRole } from '@gwenn/shared'

function AdminUsersPage() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuthStore()
  const [search, setSearch] = useState('')

  const usersQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: admin.getUsers,
  })

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      admin.changeRole(userId, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })

  const filteredUsers = usersQuery.data?.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.display_name ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  if (usersQuery.isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-base-content/60 text-sm">
          {usersQuery.data?.length ?? 0} total users
        </p>
        <label className="input input-bordered input-sm flex items-center gap-2 w-64">
          <Search className="w-3.5 h-3.5 opacity-50" />
          <input
            type="search"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="grow"
          />
        </label>
      </div>

      {usersQuery.error && (
        <div className="alert alert-error text-sm">
          <span>Failed to load users: {usersQuery.error.message}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers?.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="flex items-center gap-3">
                    {u.avatar_url ? (
                      <img
                        src={u.avatar_url}
                        alt={u.display_name ?? u.email}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                        {(u.display_name ?? u.email).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-sm">
                      {u.display_name ?? '—'}
                      {u.id === currentUser?.id && (
                        <span className="badge badge-xs badge-neutral ml-1">you</span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="text-sm text-base-content/70">{u.email}</td>
                <td>
                  <RoleBadge role={u.role} />
                </td>
                <td className="text-sm text-base-content/50">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td>
                  {u.id !== currentUser?.id && (
                    <select
                      className="select select-bordered select-xs"
                      value={u.role}
                      onChange={(e) =>
                        changeRoleMutation.mutate({
                          userId: u.id,
                          role: e.target.value as UserRole,
                        })
                      }
                      disabled={changeRoleMutation.isPending}
                    >
                      <option value="contributor">contributor</option>
                      <option value="manager">manager</option>
                      <option value="admin">admin</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers?.length === 0 && (
        <div className="text-center py-8 text-base-content/40">
          No users found.
        </div>
      )}
    </div>
  )
}

export const AdminUsersRoute = createRoute({
  getParentRoute: () => AdminRoute,
  path: '/users',
  component: AdminUsersPage,
})
