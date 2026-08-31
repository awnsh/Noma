// Shared vitest setup — runs for every test file (node and jsdom alike),
// so everything here must be guarded for environments where `window`
// doesn't exist.

// Extends vitest's `expect` with the DOM matchers (toBeInTheDocument,
// toHaveAttribute, toBeDisabled, ...) onboarding's component tests use.
// Harmless to import in the main-process (node-environment) test files
// too — it only extends `expect`, it doesn't touch `window`.
import '@testing-library/jest-dom/vitest'

// jsdom doesn't implement matchMedia. Onboarding's usePrefersReducedMotion
// hook (and anything else that checks prefers-reduced-motion) needs it.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    })
  })
}
