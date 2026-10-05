import { Clock } from 'lucide-react'
import PageHeader from '../components/PageHeader'

// Placeholder for pages that are not built yet
export default function ComingSoon({ title, description }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <Clock className="h-10 w-10 text-slate-400" />
        <p className="mt-3 font-medium text-slate-700">This section is coming soon</p>
      </div>
    </>
  )
}
