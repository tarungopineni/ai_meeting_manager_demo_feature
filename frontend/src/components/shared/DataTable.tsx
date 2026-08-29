import { useState, useMemo } from 'react'
import { Search, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/utils'

interface Column<T> {
  key: string
  label: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  width?: string
}

interface DataTableProps<T extends { id?: number }> {
  data: T[]
  columns: Column<T>[]
  searchable?: boolean
  searchKeys?: (keyof T)[]
  pageSize?: number
  emptyMessage?: string
  loading?: boolean
}

function Skeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-10 bg-surface-raised rounded animate-pulse" />
      ))}
    </div>
  )
}

export function DataTable<T extends { id?: number }>({
  data,
  columns,
  searchable = true,
  searchKeys = [],
  pageSize = 10,
  emptyMessage = 'No data found',
  loading = false,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const filtered = useMemo(() => {
    let items = [...data]
    if (search && searchKeys.length) {
      const q = search.toLowerCase()
      items = items.filter((row) =>
        searchKeys.some((k) => String(row[k] ?? '').toLowerCase().includes(q))
      )
    }
    if (sortKey) {
      items.sort((a, b) => {
        const av = String((a as Record<string, unknown>)[sortKey] ?? '')
        const bv = String((b as Record<string, unknown>)[sortKey] ?? '')
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      })
    }
    return items
  }, [data, search, searchKeys, sortKey, sortDir])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const pageData = filtered.slice(page * pageSize, (page + 1) * pageSize)

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
    setPage(0)
  }

  return (
    <div className="card overflow-hidden w-full max-w-full">
      {searchable && (
        <div className="px-3 sm:px-4 py-3 border-b border-surface-border">
          <div className="relative w-full sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              placeholder="Search..."
              className="input-base pl-8 text-xs sm:text-sm w-full"
            />
          </div>
        </div>
      )}

      {loading ? (
        <Skeleton />
      ) : (
        <div className="overflow-x-auto w-full max-w-full touch-pan-x">
          <table className="data-table w-full">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={col.width ? { width: col.width } : undefined}
                    className={cn(col.sortable && 'cursor-pointer hover:text-text-primary select-none', 'text-xs whitespace-nowrap')}
                    onClick={() => col.sortable && toggleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && sortKey === col.key && (
                        sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-12 text-xs sm:text-sm text-text-muted">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                pageData.map((row, idx) => (
                  <tr key={(row as { id?: number }).id ?? idx} className="transition-colors">
                    {columns.map((col) => (
                      <td key={col.key} className="text-xs sm:text-sm">
                        {col.render
                          ? col.render(row)
                          : String((row as Record<string, unknown>)[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-surface-border">
          <span className="text-xs text-text-muted">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="w-8 h-8 rounded flex items-center justify-center text-text-muted hover:bg-surface-raised disabled:opacity-30 transition-colors min-w-[32px] min-h-[32px] cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="w-8 h-8 rounded flex items-center justify-center text-text-muted hover:bg-surface-raised disabled:opacity-30 transition-colors min-w-[32px] min-h-[32px] cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
