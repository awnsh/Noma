/** The three traffic-light dots every window-chrome mockup on this site
 *  uses (AppPreview, AdaptiveIntelligence, WorkflowDemo's feature preview)
 *  — real feedback was that plain gray dots didn't read as an actual
 *  application window. Real (if slightly toned down for a dark UI) close /
 *  minimize / fullscreen colors, not a costume: these are the same three
 *  affordances every desktop OS window chrome has, just decorative here
 *  since none of these mockups are real windows.
 */
export default function WindowDots({ size = 'h-2.5 w-2.5' }: { size?: string }) {
  return (
    <>
      <span className={`${size} rounded-full bg-[#ff5f57]`} />
      <span className={`${size} rounded-full bg-[#febc2e]`} />
      <span className={`${size} rounded-full bg-[#28c840]`} />
    </>
  )
}
