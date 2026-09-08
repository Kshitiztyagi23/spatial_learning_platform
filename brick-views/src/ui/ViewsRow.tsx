import { useSession } from '../state/session'
import type { ViewName } from '../core/types'
import { ViewCard } from './ViewCard'

const VIEW_ORDER: ViewName[] = ['front', 'right', 'top']

export function ViewsRow() {
  const viewGrids = useSession((state) => state.derived.viewGrids)
  const lastCheck = useSession((state) => state.lastCheck)

  return (
    <div className="views-container" role="region" aria-label="Orthographic target views">
      {VIEW_ORDER.map((name) => (
        <ViewCard
          key={name}
          name={name}
          grid={viewGrids[name]}
          isMatch={lastCheck ? lastCheck.views[name] : null}
        />
      ))}
    </div>
  )
}
