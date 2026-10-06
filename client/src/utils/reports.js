import { useState } from 'react'
import { downloadFile } from '../api'

// SQLite stores UTC without a zone marker, so add 'Z' before converting to local time
export const formatDate = (sqliteDate, locale) =>
  new Date(sqliteDate + 'Z').toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })

// Downloads a report's PDF and tracks which one is in progress
export function usePdfDownload() {
  const [downloading, setDownloading] = useState(null)
  const [downloadError, setDownloadError] = useState(null)

  async function download(report) {
    setDownloadError(null)
    setDownloading(report.id)
    try {
      await downloadFile(`/reports/${report.id}/pdf`, `${report.reportId}.pdf`)
    } catch (err) {
      setDownloadError(err)
    } finally {
      setDownloading(null)
    }
  }

  return { downloading, downloadError, download }
}
