/**
 * Brief section 11 — kept concise and factual on purpose. "AI-powered" is
 * deliberately never said here; the intelligence is meant to be
 * demonstrated in the Workspace, not marketed on this page.
 */
export function WhyNomaContent() {
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-base-50 sm:text-3xl">
        Noma isn't a keyboard with a screen.
      </h2>
      <p className="mt-4 text-base text-base-300">
        It's an adaptive interface. The physical keys stay exactly where they are — what changes
        is the small set of controls Noma surfaces around them, based on:
      </p>
      <ul className="mt-4 space-y-2.5 text-sm text-base-300">
        <li className="flex gap-2.5">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
          What you're doing right now
        </li>
        <li className="flex gap-2.5">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
          Which application is in focus
        </li>
        <li className="flex gap-2.5">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
          What actions you use most
        </li>
        <li className="flex gap-2.5">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
          What workflow you're currently in
        </li>
      </ul>
      <p className="mt-5 text-sm text-base-400">
        A macro pad has to be told what to do. Noma notices what you actually do, and asks before
        it changes anything — see for yourself in the Workspace.
      </p>
    </div>
  )
}

export function WhyNoma() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <WhyNomaContent />
    </div>
  )
}
