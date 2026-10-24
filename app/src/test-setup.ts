import '@testing-library/jest-dom/vitest'

// jsdom has no ResizeObserver; Radix Slider measures its thumb with one.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// cmdk scrolls the highlighted option into view; jsdom has no scrollIntoView.
if (typeof Element !== 'undefined') Element.prototype.scrollIntoView ??= () => {}
