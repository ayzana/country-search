// DEBOUNCE

export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const wrapped = (...args: Parameters<T>): void => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delay);
  };

  wrapped.cancel = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return wrapped;
}
// errors
export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message = `HTTP ${status}`) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}
export type ErrorKind = 'abort' | 'timeout' | 'http' | 'network' | 'unknown';

export function classifyError(err: unknown): ErrorKind {
  if (err instanceof DOMException) {
    if (err.name === 'AbortError') return 'abort';
    if (err.name === 'TimeoutError') return 'timeout';
  }
  if (err instanceof HttpError) return 'http';
  if (err instanceof TypeError) return 'network';
  return 'unknown';
}
