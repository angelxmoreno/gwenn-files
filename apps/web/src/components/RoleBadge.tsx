import type { UserRole } from '@gwenn/shared'

interface RoleBadgeProps {
  role: UserRole
}

const roleConfig: Record<UserRole, { label: string; className: string }> = {
  admin: { label: 'Admin', className: 'badge-error' },
  manager: { label: 'Manager', className: 'badge-warning' },
  contributor: { label: 'Contributor', className: 'badge-info' },
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const config = roleConfig[role]
  return (
    <span className={`badge badge-sm ${config.className}`}>
      {config.label}
    </span>
  )
}
