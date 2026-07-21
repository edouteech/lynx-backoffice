import type { ReactNode } from 'react'

export default function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: ReactNode
  description?: string
  action?: ReactNode
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-semibold text-gray-900">{title}</h1>
        {description ? (
          <p className="mt-1 text-gray-600">{description}</p>
        ) : null}
      </div>
      {action ? <div className="w-fit">{action}</div> : null}
    </header>
  )
}
