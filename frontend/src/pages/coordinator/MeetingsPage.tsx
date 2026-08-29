import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload, Mic, CheckCircle, Loader2, Calendar, FileAudio, X, AlertCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/Button'
import { meetingsService } from '@/api/meetings.service'
import { formatDateTime } from '@/utils'
import type { Meeting } from '@/types'

type UploadStage = 'idle' | 'uploading' | 'transcribing' | 'analyzing' | 'done' | 'error'

const STAGES = [
  { key: 'uploading',   label: 'Uploading audio file' },
  { key: 'transcribing', label: 'Transcribing speech to text (Whisper AI)' },
  { key: 'analyzing',  label: 'Analysing with AI & generating tasks' },
  { key: 'done',       label: 'Meeting processed successfully' },
]

function UploadForm({ onSuccess }: { onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [stage, setStage] = useState<UploadStage>('idle')
  const [uploadPct, setUploadPct] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<{ title: string }>()

  const qc = useQueryClient()

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith('audio/')) {
      setFile(droppedFile)
    } else {
      toast.error('Please drop an audio file')
    }
  }, [])

  async function onSubmit({ title }: { title: string }) {
    if (!file) { toast.error('Please select an audio file'); return }
    setStage('uploading')
    setUploadPct(0)
    try {
      await meetingsService.create(title, file, (pct) => {
        setUploadPct(pct)
        if (pct === 100) setStage('transcribing')
        // Fake stage progression for visual feedback
        if (pct > 50) setTimeout(() => setStage('analyzing'), 2000)
      })
      setStage('done')
      toast.success('Meeting processed and tasks created!')
      qc.invalidateQueries({ queryKey: ['meetings'] })
      setTimeout(() => onSuccess(), 2000)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Processing failed'
      setStage('error')
      toast.error(msg)
    }
  }

  if (stage !== 'idle') {
    return (
      <div className="card p-4 sm:p-8 max-w-lg mx-auto text-center">
        {stage === 'error' ? (
          <>
            <AlertCircle size={48} className="text-danger mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-text-primary mb-2">Processing Failed</h3>
            <Button variant="secondary" onClick={() => setStage('idle')} className="w-full sm:w-auto">Try Again</Button>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-6">
              {stage === 'done'
                ? <CheckCircle size={48} className="text-success" />
                : <Loader2 size={48} className="text-accent animate-spin" />
              }
            </div>
            <div className="space-y-3 text-left">
              {STAGES.map((s) => {
                const stageIdx = STAGES.findIndex((x) => x.key === stage)
                const thisIdx = STAGES.findIndex((x) => x.key === s.key)
                const isDone = thisIdx < stageIdx || stage === 'done'
                const isCurrent = s.key === stage
                return (
                  <div key={s.key} className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-lg transition-all ${isCurrent ? 'bg-accent/10 border border-accent/20' : isDone ? 'opacity-60' : 'opacity-30'}`}>
                    {isDone
                      ? <CheckCircle size={16} className="text-success flex-shrink-0" />
                      : isCurrent
                        ? <Loader2 size={16} className="text-accent animate-spin flex-shrink-0" />
                        : <div className="w-4 h-4 rounded-full border border-surface-muted flex-shrink-0" />
                    }
                    <span className="text-xs sm:text-sm text-text-primary">{s.label}</span>
                  </div>
                )
              })}
            </div>
            {stage === 'uploading' && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-text-muted mb-1">
                  <span>Upload progress</span>
                  <span>{uploadPct}%</span>
                </div>
                <div className="h-1.5 bg-surface-raised rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${uploadPct}%` }} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
        <div className="card p-4 sm:p-6">
          <h3 className="text-xs sm:text-sm font-semibold text-text-primary mb-3 sm:mb-4">Meeting Details</h3>
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-medium text-text-secondary">Meeting Title</label>
            <input
              {...register('title', { required: 'Title is required' })}
              placeholder="e.g. Q3 Sprint Planning"
              className={`input-base text-xs sm:text-sm ${errors.title ? 'border-danger' : ''}`}
            />
            {errors.title && <p className="text-xs text-danger">{errors.title.message}</p>}
          </div>
        </div>

        {/* Drop zone */}
        <div
          className={`card p-5 sm:p-8 border-2 border-dashed transition-all duration-200 cursor-pointer ${
            isDragging ? 'border-accent bg-accent/5' : 'border-surface-muted hover:border-accent/50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('audio-input')?.click()}
        >
          <input
            id="audio-input"
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0">
                <FileAudio size={20} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-text-primary truncate">{file.name}</p>
                <p className="text-[11px] sm:text-xs text-text-muted">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null) }} className="text-text-muted hover:text-danger p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-surface-raised flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Upload size={22} className="text-text-muted" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-text-primary">Drop audio file here</p>
              <p className="text-[11px] sm:text-xs text-text-muted mt-1">or click to browse — MP3, WAV, M4A, OGG</p>
            </div>
          )}
        </div>

        <Button type="submit" className="w-full justify-center text-xs sm:text-sm font-medium" icon={<Mic size={16} />} size="lg">
          Process Meeting with AI
        </Button>
      </form>
    </div>
  )
}

// ─── Meetings Table ───────────────────────────────────────────────────────────
export default function MeetingsPage() {
  const [showUpload, setShowUpload] = useState(false)
  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: meetingsService.getAll,
  })

  const columns = [
    { key: 'id',         label: '#',             width: '60px', render: (m: Meeting) => <span className="font-mono text-xs text-text-muted">#{m.id}</span> },
    { key: 'title',      label: 'Meeting Title',  sortable: true, render: (m: Meeting) => (
      <div className="flex items-center gap-2">
        <Calendar size={14} className="text-accent flex-shrink-0" />
        <span className="text-xs sm:text-sm font-medium text-text-primary truncate max-w-[160px] sm:max-w-xs">{m.title}</span>
      </div>
    )},
    { key: 'created_at', label: 'Date',           sortable: true, render: (m: Meeting) => <span className="text-xs sm:text-sm text-text-secondary">{formatDateTime(m.created_at)}</span> },
    { key: 'summary',    label: 'Summary',        render: (m: Meeting) => (
      <span className="text-xs text-text-muted line-clamp-1 max-w-xs">
        {m.summary ? m.summary : '—'}
      </span>
    )},
  ]

  if (showUpload) {
    return (
      <AppShell title="New Meeting" subtitle="Upload audio for AI processing">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <Button variant="ghost" onClick={() => setShowUpload(false)} size="sm">← Back to Meetings</Button>
        </div>
        <UploadForm onSuccess={() => setShowUpload(false)} />
      </AppShell>
    )
  }

  return (
    <AppShell title="Meetings" subtitle="AI-powered meeting analysis">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 mb-4">
        <Button icon={<Mic size={15} />} onClick={() => setShowUpload(true)} className="w-full sm:w-auto justify-center">New Meeting</Button>
      </div>
      <DataTable
        data={meetings}
        columns={columns}
        loading={isLoading}
        searchable
        searchKeys={['title']}
        emptyMessage="No meetings yet. Upload a recording to get started."
      />
    </AppShell>
  )
}
