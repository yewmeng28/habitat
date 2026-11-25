import { useRef, useState } from 'react'
import { exportBackup, importBackup, parseBackup, type Backup, type ImportSummary } from '../../persistence/backup'

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export function SettingsPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Backup | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  async function onExport() {
    try {
      const backup = await exportBackup()
      download(`habitat-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup, null, 2))
      setMessage({ kind: 'ok', text: 'Backup downloaded.' })
    } catch {
      setMessage({ kind: 'error', text: 'Could not create the backup.' })
    }
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setMessage(null)
    const result = parseBackup(await file.text())
    if (!result.ok) {
      setPending(null)
      setMessage({ kind: 'error', text: result.error })
    } else setPending(result.backup)
  }

  async function onImport(mode: 'replace' | 'merge') {
    if (!pending) return
    try {
      const s: ImportSummary = await importBackup(pending, mode)
      setMessage({
        kind: 'ok',
        text: mode === 'replace' ? 'Backup restored. Your previous local data was replaced.' : `Merged: ${s.added} added, ${s.updated} updated, ${s.skipped} unchanged.`,
      })
    } catch {
      setMessage({ kind: 'error', text: 'Import failed. Your existing data was not changed.' })
    }
    setPending(null)
  }

  const counts = pending?.data
  return (
    <section className="page">
      <h1>Settings</h1>

      <div className="card">
        <h2>Guest mode</h2>
        <p>You're using Habitat as a guest. Everything is stored privately on this device and works offline. Cloud sync and accounts are planned for a later phase.</p>
      </div>

      <div className="card">
        <h2>Backup</h2>
        <p className="muted">Your data lives only on this device, so export a backup now and then, especially before clearing browser data.</p>
        <div className="row">
          <button className="btn primary" onClick={onExport}>Export JSON</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Import JSON…</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onPick} />
        </div>

        {pending && counts && (
          <div className="confirm" role="alertdialog" aria-label="Confirm import">
            <p>
              <strong>Backup from {new Date(pending.exportedAt).toLocaleString()}</strong>
              <br />
              {counts.habits.length} habits, {counts.completions.length} completions, {counts.challenges.length} challenges, {counts.challengeRecords.length} challenge entries.
            </p>
            <p><strong>Merge</strong> keeps your current data and adds or updates records from the file (newest wins). <strong>Replace</strong> deletes everything currently on this device first.</p>
            <div className="row">
              <button className="btn primary" onClick={() => onImport('merge')}>Merge</button>
              <button className="btn danger" onClick={() => onImport('replace')}>Replace all local data</button>
              <button className="btn" onClick={() => setPending(null)}>Cancel</button>
            </div>
          </div>
        )}
        {message && <p className={message.kind === 'error' ? 'error' : 'ok'} role="status">{message.text}</p>}
      </div>
    </section>
  )
}
