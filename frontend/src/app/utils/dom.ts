/**
 * Gets element position relative to viewport
 */
export const getElementPosition = (
  element: HTMLElement
): { x: number; y: number } => {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + window.scrollX,
    y: rect.top + window.scrollY,
  };
};

/**
 * Gets mouse/touch position from event
 */
export const getEventPosition = (
  event: MouseEvent | TouchEvent
): { x: number; y: number } => {
  if ('touches' in event && event.touches.length > 0) {
    const touch = event.touches[0];
    return {
      x: touch?.clientX ?? 0,
      y: touch?.clientY ?? 0,
    };
  }

  if ('clientX' in event) {
    return {
      x: event.clientX,
      y: event.clientY,
    };
  }

  return { x: 0, y: 0 };
};

/**
 * Prevents default behavior and stops propagation
 */
export const preventEventDefault = (event: Event): void => {
  event.preventDefault();
  event.stopPropagation();
};

/**
 * Throttle function for event handlers
 */
export const throttle = <T extends any[]>(
  func: (...args: T) => void,
  limit: number
): ((...args: T) => void) => {
  let inThrottle: boolean;

  return (...args: T) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Debounce function for event handlers
 */
export const debounce = <T extends any[]>(
  func: (...args: T) => void,
  wait: number
): ((...args: T) => void) => {
  let timeout: NodeJS.Timeout;

  return (...args: T) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
};

/**
 * Checks if element is in viewport
 */
export const isElementInViewport = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

/**
 * Copies text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'absolute';
      textArea.style.left = '-999999px';

      document.body.prepend(textArea);
      textArea.select();

      try {
        document.execCommand('copy');
        return true;
      } catch (error) {
        console.error('Failed to copy text: ', error);
        return false;
      } finally {
        textArea.remove();
      }
    }
  } catch (error) {
    console.error('Failed to copy text: ', error);
    return false;
  }
};

/**
 * Downloads content as a file
 */
export const downloadFile = (
  content: string,
  filename: string,
  mimeType: string = 'text/plain'
): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

/**
 * Adds event listener with cleanup
 */
export const addEventListenerWithCleanup = (
  element: HTMLElement | Window | Document,
  event: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions
): (() => void) => {
  element.addEventListener(event, handler, options);

  return () => {
    element.removeEventListener(event, handler, options);
  };
};

/**
 * Gets scroll position
 */
export const getScrollPosition = (): { x: number; y: number } => {
  return {
    x: window.pageXOffset || document.documentElement.scrollLeft,
    y: window.pageYOffset || document.documentElement.scrollTop,
  };
};
