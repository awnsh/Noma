import { APP_LOGOS } from '../lib/appLogos'

/**
 * A small icon next to a software name — the real application logo when
 * Noma has one (see `lib/appLogos.ts`), otherwise a plain monogram (the
 * first letter of the name) so the spot never renders empty. Used
 * everywhere a specific application's name is shown: `WorkflowChain`,
 * Home/Controls' "for {app}" line, Demo's live device state, learned
 * actions' context line.
 */
export function AppLogo({
  applicationId,
  name,
  className = 'h-4 w-4'
}: {
  applicationId: string | null | undefined
  name: string
  className?: string
}) {
  const logo = applicationId ? APP_LOGOS[applicationId] : undefined

  if (logo) {
    return <img src={logo} alt="" className={`${className} shrink-0`} />
  }

  return (
    <span
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-neutral-200 text-[9px] font-semibold text-neutral-100`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
