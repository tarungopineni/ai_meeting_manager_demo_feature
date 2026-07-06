import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { User, Key, Shield } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { RoleBadge } from '@/components/shared/Badge'
import { useAuthStore } from '@/store/authStore'
import { usersService } from '@/api/users.service'

const passSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6, 'Minimum 6 characters'),
  confirm:  z.string(),
}).refine(d => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })

type PassForm = z.infer<typeof passSchema>

export default function ProfilePage() {
  const { user } = useAuthStore()
  const [section, setSection] = useState<'info' | 'credentials'>('info')

  const { register, handleSubmit, formState: { errors }, reset } = useForm<PassForm>({
    resolver: zodResolver(passSchema),
    defaultValues: { username: user?.username ?? '' },
  })

  const mutation = useMutation({
    mutationFn: (data: PassForm) =>
      usersService.updateCredentials(user!.id, { username: data.username, password: data.password }),
    onSuccess: () => {
      toast.success('Credentials updated!')
      reset()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Update failed'
      toast.error(msg)
    },
  })

  return (
    <AppShell title="Profile" subtitle="Your account details">
      <div className="max-w-2xl space-y-6">
        {/* Profile card */}
        <div className="card p-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center text-accent font-bold text-2xl uppercase">
              {user?.username?.[0] ?? '?'}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">{user?.username}</h2>
              <RoleBadge role={user?.role ?? 'employee'} />
              <p className="text-xs text-text-muted mt-1">ID: #{user?.id}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-surface-raised rounded-lg w-fit">
          {[
            { key: 'info',        label: 'Account Info',   icon: <User size={14} /> },
            { key: 'credentials', label: 'Update Login',   icon: <Key size={14} /> },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setSection(key as typeof section)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                section === key
                  ? 'bg-surface-card text-text-primary shadow-sm border border-surface-border'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {icon}{label}
            </button>
          ))}
        </div>

        {section === 'info' && (
          <div className="card p-6 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Shield size={14} className="text-accent" />
              Account Information
            </h3>
            {[
              { label: 'Username', value: user?.username },
              { label: 'Role',     value: user?.role },
              { label: 'User ID',  value: `#${user?.id}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-3 border-b border-surface-border/50 last:border-0">
                <span className="text-sm text-text-muted">{label}</span>
                <span className="text-sm font-medium text-text-primary">{value}</span>
              </div>
            ))}
          </div>
        )}

        {section === 'credentials' && (
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Key size={14} className="text-accent" />
              Update Login Credentials
            </h3>
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
              <Input label="Username" {...register('username')} error={errors.username?.message} />
              <Input label="New Password" {...register('password')} error={errors.password?.message} type="password" />
              <Input label="Confirm Password" {...register('confirm')} error={errors.confirm?.message} type="password" />
              <Button type="submit" loading={mutation.isPending} className="w-full">
                Update Credentials
              </Button>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  )
}
