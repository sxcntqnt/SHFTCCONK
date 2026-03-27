import type { Role } from "$lib/features/auth/stores/roles"

export interface RoleComponentProps {
  role: Role
  isSelected: boolean
  isPro: boolean
  onSelect: () => void
  color: string
  label: string
  description: string
  group: string
  icon: string
}

export interface RoleMeta {
  id: Role
  label: string
  description: string
  color: string
  group: string
  icon: string
}

export interface OnboardingContext {
  step: number
  selectedRole: Role | null
  validationErr: string | null
  loading: boolean
  isPro: boolean
  totalSteps: number
  finalStep: number
  selectedMeta: RoleMeta | null
  groupedRoles: [string, RoleMeta[]][]
  validateRole: () => boolean
  advanceStep: () => void
  goBack: () => void
  submitForm: () => Promise<void>
}