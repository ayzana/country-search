import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from './index';

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('вызывает fn один раз после delay', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d();
    d();
    d();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('сбрасывает таймер при повторном вызове', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d();
    vi.advanceTimersByTime(50);
    d();
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cancel предотвращает вызов', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d();
    d.cancel();
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();
  });

  it('передаёт аргументы последнего вызова', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d('a');
    d('b');
    d('c');
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith('c');
  });
});
