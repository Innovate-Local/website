'use client'

import { useRef, useState, useTransition } from 'react'
import { uploadResume, getResumeUrl } from '@/app/dashboard/resume/actions'
import { primaryButtonClass } from './styles'

export type ResumeItem = {
  id: string
  filename: string
  sizeBytes: number
  createdAt: string // ISO
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ResumeManager({ resumes }: { resumes: ResumeItem[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isUploading, startUpload] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startUpload(async () => {
      const result = await uploadResume(formData)
      if (result.ok) formRef.current?.reset()
      else setError(result.error)
    })
  }

  async function onDownload(id: string) {
    setError(null)
    setDownloadingId(id)
    const result = await getResumeUrl(id)
    setDownloadingId(null)
    if (result.ok) window.open(result.url, '_blank', 'noopener,noreferrer')
    else setError(result.error)
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h2 className="font-headline text-2xl text-on-surface">
          Your resumes <span className="text-on-surface-variant">({resumes.length})</span>
        </h2>

        {resumes.length === 0 ? (
          <p className="font-body text-on-surface-variant">
            No resume on file yet. Upload one below so hub staff can match you to projects.
          </p>
        ) : (
          <ul className="flex flex-col gap-px bg-outline-variant/30 border border-outline-variant/30">
            {resumes.map((r) => (
              <li key={r.id} className="bg-surface flex items-center justify-between gap-4 px-5 py-4">
                <span className="flex flex-col min-w-0">
                  <span className="font-body text-on-surface truncate">{r.filename}</span>
                  <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
                    {formatSize(r.sizeBytes)} · {r.createdAt.slice(0, 10)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onDownload(r.id)}
                  disabled={downloadingId === r.id}
                  className="font-label text-xs uppercase tracking-widest text-primary hover:text-primary-container transition-colors disabled:opacity-60"
                >
                  {downloadingId === r.id ? 'Opening...' : 'Download'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4 border-t border-outline-variant/30 pt-8">
        <h2 className="font-headline text-2xl text-on-surface">Upload a resume</h2>
        <form ref={formRef} onSubmit={onUpload} className="flex flex-col gap-5 max-w-xl">
          <input
            type="file"
            name="resume"
            required
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            disabled={isUploading}
            className="font-body text-sm text-on-surface-variant file:mr-4 file:border-0 file:bg-surface-container-high file:px-4 file:py-3 file:font-label file:text-xs file:uppercase file:tracking-widest file:text-on-surface file:cursor-pointer disabled:opacity-60"
          />
          <p className="font-label text-xs text-on-surface-variant">PDF or Word, up to 5 MB.</p>

          {error && (
            <div className="bg-error-container text-on-error-container p-4">
              <p className="font-label text-xs uppercase tracking-widest">{error}</p>
            </div>
          )}

          <button type="submit" disabled={isUploading} className={`${primaryButtonClass} self-start`}>
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
      </section>
    </div>
  )
}
