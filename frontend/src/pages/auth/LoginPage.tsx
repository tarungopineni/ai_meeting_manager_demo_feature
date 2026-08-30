import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, User, Sparkles } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { authService } from '@/api/auth.service'
import { useAuthStore } from '@/store/authStore'
import { getRoleDashboard } from '@/utils'
import { Button } from '@/components/ui/Button'
import { Plasma } from '@/components/ui/Plasma'

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean(),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isDemoLoading, setIsDemoLoading] = useState(false)
  const { setToken } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '', remember: false },
  })

  async function onSubmit(data: FormData) {
    try {
      const { access_token } = await authService.login(data.username, data.password)
      setToken(access_token)
      const user = useAuthStore.getState().user
      toast.success('Welcome back!')
      navigate(getRoleDashboard(user?.role ?? ''))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Invalid credentials'
      toast.error(msg)
    }
  }

  async function handleStartDemo() {
    if (isDemoLoading || isSubmitting) return
    setIsDemoLoading(true)
    try {
      const { access_token } = await authService.startDemo('manager')
      setToken(access_token)
      const user = useAuthStore.getState().user
      toast.success('Isolated demo environment ready!')
      navigate(getRoleDashboard(user?.role ?? 'manager'))
    } catch (err: unknown) {
      useAuthStore.getState().logout()
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to initialize demo session. Please try again.'
      toast.error(msg)
    } finally {
      setIsDemoLoading(false)
    }
  }

  return (
    <div className="dark min-h-screen bg-surface-base flex items-center justify-center p-3 sm:p-6 relative max-w-full overflow-x-hidden">
      {/* Background Plasma effect */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <Plasma 
          color="#6366f1"
          speed={0.2}
          direction="pingpong"
          scale={1.15}
          opacity={0.45}
          mouseInteractive={true}
        />
      </div>

      <div className="w-full max-w-[340px] sm:max-w-sm relative z-10 my-auto">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-accent items-center justify-center mb-3 sm:mb-4 glow-accent">
            <span className="text-white font-bold text-lg">EM</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Welcome back</h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">Sign in to your account or try instant demo</p>
        </div>

        {/* Card */}
        <div className="card p-4 sm:p-6 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-medium text-text-secondary">Username</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  {...register('username')}
                  id="username"
                  autoComplete="username"
                  placeholder="Enter your username"
                  className={`input-base pl-9 text-xs sm:text-sm ${errors.username ? 'border-danger focus:ring-danger' : ''}`}
                />
              </div>
              {errors.username && <p className="text-xs text-danger">{errors.username.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-medium text-text-secondary">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  {...register('password')}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className={`input-base pl-9 pr-10 text-xs sm:text-sm ${errors.password ? 'border-danger focus:ring-danger' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2">
              <input
                {...register('remember')}
                id="remember"
                type="checkbox"
                className="w-4 h-4 rounded border-surface-border bg-surface-raised accent-accent cursor-pointer"
              />
              <label htmlFor="remember" className="text-xs sm:text-sm text-text-secondary cursor-pointer">Remember me</label>
            </div>

            <Button type="submit" loading={isSubmitting} disabled={isDemoLoading} className="w-full h-10 text-xs sm:text-sm font-medium">
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="w-full border-t border-surface-border" />
            <span className="absolute bg-surface-card px-2 text-[10px] uppercase font-semibold text-text-muted">Or Recruiter Access</span>
          </div>

          {/* Try Demo Button */}
          <button
            type="button"
            onClick={handleStartDemo}
            disabled={isDemoLoading || isSubmitting}
            className="w-full h-10 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent font-semibold text-xs sm:text-sm
                       border border-accent/30 transition-all flex items-center justify-center gap-2 cursor-pointer
                       disabled:opacity-50 disabled:cursor-not-allowed glow-accent"
          >
            <Sparkles size={16} className={isDemoLoading ? 'animate-spin' : ''} />
            {isDemoLoading ? 'Initializing Demo...' : 'Try Demo'}
          </button>
        </div>

        <p className="text-center text-[11px] sm:text-xs text-text-muted mt-6">
          Employee Management System • Multi-User Isolated Demo
        </p>
      </div>
    </div>
  )
}

