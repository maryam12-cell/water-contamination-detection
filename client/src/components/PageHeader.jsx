export default function PageHeader({ title, description }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
      {description && <p className="mt-1 text-slate-600">{description}</p>}
    </div>
  )
}
