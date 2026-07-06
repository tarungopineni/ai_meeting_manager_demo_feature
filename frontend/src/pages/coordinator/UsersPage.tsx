import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Edit2, Trash2, KeyRound, Eye, Filter } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { DataTable } from '@/components/shared/DataTable'
import { RoleBadge } from '@/components/shared/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Drawer } from '@/components/ui/Drawer'
import { usersService } from '@/api/users.service'
import type { User, CreateUserPayload, UpdateUserPayload } from '@/types'

const ROLES: { value: string; label: string }[] = [
  { value: 'coordinator', label: 'Coordinator' },
  { value: 'manager',     label: 'Manager' },
  { value: 'employee',    label: 'Employee' },
  { value: 'dev',         label: 'Developer' },
]

// ─── Create User Form ─────────────────────────────────────────────────────────
const createSchema = z.object({
  name:       z.string().min(1, 'Name is required'),
  email:      z.string().email('Invalid email address'),
  username:   z.string().min(1, 'Username is required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name:  z.string().min(1, 'Last name is required'),
  password:   z.string().min(6, 'Password must be at least 6 characters'),
  role:       z.string().min(1, 'Role is required'),
  manager_id: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().nullable().optional()
  ),
})
type CreateForm = z.infer<typeof createSchema>

// ─── Edit User Form ───────────────────────────────────────────────────────────
const editSchema = z.object({
  name:       z.string().min(1, 'Name is required'),
  email:      z.string().email('Invalid email address'),
  first_name: z.string().min(1, 'First name is required'),
  last_name:  z.string().min(1, 'Last name is required'),
  role:       z.string().min(1, 'Role is required'),
  manager_id: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().nullable().optional()
  ),
})
type EditForm = z.infer<typeof editSchema>

// ─── Credentials Form ─────────────────────────────────────────────────────────
const credSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  retype_password: z.string().min(6, 'Please confirm your password'),
}).refine((data) => data.password === data.retype_password, {
  message: "Passwords do not match",
  path: ["retype_password"],
})
type CredForm = z.infer<typeof credSchema>

// ─── View Drawer ──────────────────────────────────────────────────────────────
function ViewDrawer({ user, onClose, managers }: { user: User; onClose: () => void; managers: User[] }) {
  const manager = managers.find((m) => m.id === user.manager_id)
  return (
    <Drawer open title="User Details" subtitle={`ID: #${user.id}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-xl uppercase">
            {user.name?.[0] ?? '?'}
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">{user.name}</h3>
            <RoleBadge role={user.role} />
          </div>
        </div>
        {[
          { label: 'Email',    value: user.email },
          { label: 'Username', value: user.username },
          { label: 'Role',     value: user.role },
          { label: 'Manager',  value: manager?.name ?? '—' },
          { label: 'ID',       value: `#${user.id}` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface-raised rounded-lg px-4 py-3">
            <p className="text-xs text-text-muted mb-0.5">{label}</p>
            <p className="text-sm text-text-primary font-medium">{value}</p>
          </div>
        ))}
      </div>
    </Drawer>
  )
}

// ─── Edit Drawer ──────────────────────────────────────────────────────────────
function EditDrawer({ user, onClose, managers }: { user: User; onClose: () => void; managers: User[] }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: user.name, email: user.email,
      first_name: user.first_name ?? '', last_name: user.last_name ?? '',
      role: user.role, manager_id: user.manager_id,
    },
  })

  async function onSubmit(data: EditForm) {
    try {
      await usersService.update(user.id, data as UpdateUserPayload)
      toast.success('User updated')
      qc.invalidateQueries({ queryKey: ['users'] })
      onClose()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Update failed'
      toast.error(msg)
    }
  }

  return (
    <Drawer open title="Edit User" subtitle={user.name} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Full Name"   {...register('name')}       error={errors.name?.message} />
        <Input label="Email"       {...register('email')}      error={errors.email?.message} type="email" />
        <Input label="First Name"  {...register('first_name')} error={errors.first_name?.message} />
        <Input label="Last Name"   {...register('last_name')}  error={errors.last_name?.message} />
        <Select
          label="Role"
          {...register('role')}
          options={ROLES}
          error={errors.role?.message}
        />
        <Select
          label="Manager (optional)"
          {...register('manager_id')}
          options={managers.map((m) => ({ value: m.id, label: m.name }))}
          placeholder="No manager"
        />
        <Button type="submit" loading={isSubmitting} className="w-full">Save Changes</Button>
      </form>
    </Drawer>
  )
}

// ─── Credentials Drawer ───────────────────────────────────────────────────────
function CredentialsDrawer({ user, onClose }: { user: User; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CredForm>({
    resolver: zodResolver(credSchema),
    defaultValues: { username: user.username, password: '', retype_password: '' },
  })

  async function onSubmit(data: CredForm) {
    try {
      await usersService.updateCredentials(user.id, {
        username: data.username,
        password: data.password,
      })
      toast.success('Credentials updated')
      qc.invalidateQueries({ queryKey: ['users'] })
      onClose()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed'
      toast.error(msg)
    }
  }

  return (
    <Drawer open title="Update Credentials" subtitle={user.name} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Username" {...register('username')} error={errors.username?.message} />
        <Input label="New Password" {...register('password')} error={errors.password?.message} type="password" />
        <Input label="Retype Password" {...register('retype_password')} error={errors.retype_password?.message} type="password" />
        <Button type="submit" loading={isSubmitting} className="w-full">Update Credentials</Button>
      </form>
    </Drawer>
  )
}

// ─── Create Modal ─────────────────────────────────────────────────────────────
function CreateModal({ onClose, managers }: { onClose: () => void; managers: User[] }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: 'employee' },
  })

  async function onSubmit(data: CreateForm) {
    try {
      await usersService.create(data as CreateUserPayload)
      toast.success('User created successfully')
      qc.invalidateQueries({ queryKey: ['users'] })
      onClose()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to create user'
      toast.error(msg)
    }
  }

  return (
    <Modal open onClose={onClose} title="Create New User" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Full Name"  {...register('name')}       error={errors.name?.message} />
          <Input label="Email"      {...register('email')}      error={errors.email?.message} type="email" />
          <Input label="First Name" {...register('first_name')} error={errors.first_name?.message} />
          <Input label="Last Name"  {...register('last_name')}  error={errors.last_name?.message} />
          <Input label="Username"   {...register('username')}   error={errors.username?.message} />
          <Input label="Password"   {...register('password')}   error={errors.password?.message} type="password" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Role" {...register('role')} options={ROLES} error={errors.role?.message} />
          <Select
            label="Manager (optional)"
            {...register('manager_id')}
            options={managers.map((m) => ({ value: m.id, label: m.name }))}
            placeholder="None"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting} className="flex-1">Create User</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ user, onClose }: { user: User; onClose: () => void }) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => usersService.delete(user.id),
    onSuccess: () => {
      toast.success('User deleted')
      qc.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Delete failed'
      toast.error(msg)
    },
  })

  return (
    <Modal open onClose={onClose} title="Delete User" size="sm">
      <p className="text-sm text-text-secondary mb-1">
        Are you sure you want to delete <span className="font-semibold text-text-primary">{user.name}</span>?
      </p>
      <p className="text-xs text-text-muted mb-5">This action cannot be undone.</p>
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button variant="danger" className="flex-1" loading={mutation.isPending} onClick={() => mutation.mutate()}>
          Delete User
        </Button>
      </div>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type DrawerMode = 'view' | 'edit' | 'credentials' | null

export default function UsersPage() {
  const [selected, setSelected] = useState<User | null>(null)
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [roleFilter, setRoleFilter] = useState('')

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: usersService.getAll })
  const managers = users.filter((u) => u.role === 'manager')

  const filteredUsers = roleFilter ? users.filter((u) => u.role === roleFilter) : users

  function open(user: User, mode: DrawerMode) { setSelected(user); setDrawerMode(mode) }
  function close() { setSelected(null); setDrawerMode(null) }

  const columns = [
    { key: 'id',       label: '#',        width: '60px', render: (u: User) => <span className="text-text-muted font-mono text-xs">#{u.id}</span>, sortable: true },
    { key: 'name',     label: 'Name',     sortable: true, render: (u: User) => (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center text-accent text-xs font-semibold uppercase">
          {u.name?.[0]}
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">{u.name}</p>
          <p className="text-xs text-text-muted">{u.email}</p>
        </div>
      </div>
    )},
    { key: 'username', label: 'Username', sortable: true, render: (u: User) => <span className="font-mono text-xs text-text-secondary">@{u.username}</span> },
    { key: 'role',     label: 'Role',     render: (u: User) => <RoleBadge role={u.role} /> },
    { key: 'manager_id', label: 'Manager', render: (u: User) => {
      const mgr = managers.find((m) => m.id === u.manager_id)
      return mgr ? <span className="text-sm text-text-secondary">{mgr.name}</span> : <span className="text-text-muted">—</span>
    }},
    { key: 'actions',  label: '', width: '120px', render: (u: User) => (
      <div className="flex items-center gap-1">
        <button onClick={() => open(u, 'view')}        className="p-1.5 rounded hover:bg-surface-overlay text-text-muted hover:text-text-primary transition-colors" title="View"><Eye size={14} /></button>
        <button onClick={() => open(u, 'edit')}        className="p-1.5 rounded hover:bg-surface-overlay text-text-muted hover:text-info transition-colors" title="Edit"><Edit2 size={14} /></button>
        <button onClick={() => open(u, 'credentials')} className="p-1.5 rounded hover:bg-surface-overlay text-text-muted hover:text-warning transition-colors" title="Credentials"><KeyRound size={14} /></button>
        <button onClick={() => { setSelected(u); setShowDelete(true) }} className="p-1.5 rounded hover:bg-danger/10 text-text-muted hover:text-danger transition-colors" title="Delete"><Trash2 size={14} /></button>
      </div>
    )},
  ]

  return (
    <AppShell title="Users" subtitle="Manage organisation members">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-text-muted" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input-base text-xs w-36"
          >
            <option value="">All Roles</option>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <Button icon={<UserPlus size={15} />} onClick={() => setShowCreate(true)}>New User</Button>
      </div>

      <DataTable
        data={filteredUsers}
        columns={columns}
        loading={isLoading}
        searchable
        searchKeys={['name', 'email', 'username', 'role']}
        emptyMessage="No users found"
      />

      {/* Drawers */}
      {selected && drawerMode === 'view'        && <ViewDrawer        user={selected} onClose={close} managers={managers} />}
      {selected && drawerMode === 'edit'        && <EditDrawer        user={selected} onClose={close} managers={managers} />}
      {selected && drawerMode === 'credentials' && <CredentialsDrawer user={selected} onClose={close} />}

      {/* Modals */}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} managers={managers} />}
      {showDelete && selected && <DeleteModal user={selected} onClose={() => { setShowDelete(false); setSelected(null) }} />}
    </AppShell>
  )
}
