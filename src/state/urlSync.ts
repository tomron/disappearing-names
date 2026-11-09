import { effect } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { replaceParams, route } from '../router';

/**
 * Keeps the URL and a view's state in step: reads the query string on load and on back/forward,
 * and writes it (without adding history entries) whenever the state changes.
 */
export function useUrlSync(
  toParams: () => URLSearchParams,
  applyParams: (p: URLSearchParams) => void,
) {
  useEffect(() => {
    applyParams(route.peek().params);
    const stopWrite = effect(() => {
      const p = toParams();
      if (p.toString() !== route.peek().params.toString()) replaceParams(p);
    });
    const stopRead = effect(() => {
      const incoming = route.value.params;
      if (incoming.toString() !== toParams().toString()) applyParams(incoming);
    });
    return () => {
      stopWrite();
      stopRead();
    };
    // toParams and applyParams are stable module-level functions
  }, []);
}
