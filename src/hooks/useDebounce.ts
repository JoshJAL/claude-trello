import { useState, useEffect } from "react";

/**
 * Debounces a value, returning the last value only after the user
 * has stopped updating it for `delay` milliseconds.
 *
 * @param value - The value to debounce
 * @param delay - Delay in ms (300–500 recommended for search inputs)
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
