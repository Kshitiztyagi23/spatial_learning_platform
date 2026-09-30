import { useEffect } from 'react'
import { useSession } from '../state/session'
import type { RejectReason } from '../core/types'

const REJECT_MESSAGES: Record<RejectReason, string> = {
  'out-of-bounds': 'That brick goes off the board.',
  overlap: 'Another brick is already there.',
  unsupported: 'That brick needs something under it.',
  'none-left': 'No more of that brick.',
  'load-bearing': 'Take off the brick on top first.',
}

export function Feedback() {
  const lastReject = useSession((state) => state.lastReject)
  const dismissFeedback = useSession((state) => state.dismissFeedback)

  useEffect(() => {
    if (!lastReject) return

    // Reject messages appear near the board for two seconds
    const timer = setTimeout(() => {
      dismissFeedback()
    }, 2000)

    return () => clearTimeout(timer)
  }, [lastReject, dismissFeedback])

  if (!lastReject) return null

  const message = REJECT_MESSAGES[lastReject] ?? lastReject

  return (
    <div className="board-reject-badge" role="alert" aria-live="assertive">
      {message}
    </div>
  )
}
