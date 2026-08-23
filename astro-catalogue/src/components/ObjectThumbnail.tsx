import { useEffect, useState } from 'react'
import type { ObjectInfo } from '../../electron/shared-types'

interface ObjectThumbnailProps {
  object: ObjectInfo
}

export function ObjectThumbnail({ object }: ObjectThumbnailProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    setThumbnailUrl(null)
    window.astroCatalogue
      .getObjectSummary(object.name, object.catalog, object.catalogNumber)
      .then((result) => {
        if (!cancelled) setThumbnailUrl(result?.thumbnailUrl ?? null)
      })
      .catch(() => {
        if (!cancelled) setThumbnailUrl(null)
      })

    return () => {
      cancelled = true
    }
  }, [object.name, object.catalog, object.catalogNumber])

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-black/30">
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt={object.name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-[10px] text-slate-600">—</span>
      )}
    </div>
  )
}
