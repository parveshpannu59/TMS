export const disableBrowserBack = (): (() => void) => {
  // Push current state to create history entry
  window.history.pushState(null, '', window.location.href);

  const handlePopState = (): void => {
    window.history.pushState(null, '', window.location.href);
  };

  window.addEventListener('popstate', handlePopState);

  // Return cleanup function
  return () => {
    window.removeEventListener('popstate', handlePopState);
  };
};

export const enableBrowserBack = (): void => {
  // Allow normal browser back behavior
  // This is handled by removing the event listener in cleanup
};