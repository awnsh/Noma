import { useEffect, useState } from 'react'
import type { WorkflowNotice as WorkflowNoticeData } from '@shared/types'
import { WorkflowNotice, type NoticeDismissReason } from '../components/WorkflowNotice'

/**
 * The whole application, for the notice window.
 *
 * It renders nothing at all until main sends a workflow, which matters more
 * than it looks: the window is created once and then kept, so most of its
 * life is spent hidden and empty. No shell, no sidebar, no stores. The
 * notice must not drag the app's state machinery into a surface that has to
 * stay cheap enough to sit permanently on top of everything else.
 */
export function NoticeSurface() {
  const [notice, setNotice] = useState<WorkflowNoticeData | null>(null)

  useEffect(() => {
    // Both halves are needed: the subscription catches every notice after
    // this window exists, and the ask catches the very first one, whose
    // push can arrive while this component is still mounting.
    const unsubscribe = window.flow.onWorkflowNoticeShown(setNotice)
    void window.flow.getPendingWorkflowNotice().then((pending) => {
      if (pending) setNotice((current) => current ?? pending)
    })
    return unsubscribe
  }, [])

  if (!notice) return null

  const dismiss = (reason: NoticeDismissReason): void => {
    setNotice(null)
    void window.flow.dismissWorkflowNotice(notice.suggestion.id, reason)
  }

  return (
    <WorkflowNotice
      notice={notice}
      onDismiss={dismiss}
      onAccept={() => {
        // Accepting is finished in the main window, because it ends in a
        // choice this card is the wrong size to ask for: which of the four
        // control slots the workflow should live on. Main decides whether
        // that is needed and either accepts outright or opens the app on
        // this suggestion. See the REVIEW handler.
        void window.flow.reviewWorkflowNoticeInApp(notice.suggestion.id)
        setNotice(null)
      }}
      onInteractiveChange={(interactive) => void window.flow.setWorkflowNoticeInteractive(interactive)}
    />
  )
}
