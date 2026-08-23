import type { ObjectGroup } from '../lib/groupObjects'

interface SidebarProps {
  groups: ObjectGroup[]
  totalCount: number
  selectedCatalog: string | null
  onSelect: (catalog: string | null) => void
}

export function Sidebar({ groups, totalCount, selectedCatalog, onSelect }: SidebarProps) {
  return (
    <nav className="w-48 shrink-0 space-y-1">
      <SidebarItem label="All Objects" count={totalCount} active={selectedCatalog === null} onClick={() => onSelect(null)} />
      {groups.map((group) => (
        <SidebarItem
          key={group.catalog}
          label={group.catalog}
          count={group.objects.length}
          active={selectedCatalog === group.catalog}
          onClick={() => onSelect(group.catalog)}
        />
      ))}
    </nav>
  )
}

interface SidebarItemProps {
  label: string
  count: number
  active: boolean
  onClick: () => void
}

function SidebarItem({ label, count, active, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
        active ? 'bg-white/10 text-slate-100' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
      }`}
    >
      <span>{label}</span>
      <span className="text-xs text-slate-500">({count})</span>
    </button>
  )
}
