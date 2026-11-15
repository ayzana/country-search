import { describe, it, expect } from 'vitest';
import { HttpError, classifyError } from './index';

describe('HttpError', () => {
  it('хранит статус и наследует Error', () => {
    const e = new HttpError(500);
    expect(e.status).toBe(500);
    expect(e instanceof Error).toBe(true);
    expect(e.name).toBe('HttpError');
  });
});

describe('classifyError', () => {
  it('AbortError → abort', () => {
    expect(classifyError(new DOMException('x', 'AbortError'))).toBe('abort');
  });

  it('TimeoutError → timeout', () => {
    expect(classifyError(new DOMException('x', 'TimeoutError'))).toBe('timeout');
  });

  it('HttpError → http', () => {
    expect(classifyError(new HttpError(500))).toBe('http');
  });

  it('TypeError → network', () => {
    expect(classifyError(new TypeError('failed'))).toBe('network');
  });

  it('прочее → unknown', () => {
    expect(classifyError(new Error('x'))).toBe('unknown');
  });
});
