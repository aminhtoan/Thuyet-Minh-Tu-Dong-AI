import { useEffect, useState } from 'react';

/** Catalog reads are independent; aborted responses must not update a newer request. */
export function useCatalogResource<T>(load: (options: { signal: AbortSignal }) => Promise<T[]>) {
  const [request, setRequest] = useState(0);
  const [state, setState] = useState<{ request: number; data: T[] | null; error: boolean }>({ request: -1, data: null, error: false });
  useEffect(() => {
    const controller = new AbortController();
    load({ signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setState({ request, data, error: false }); })
      .catch(() => { if (!controller.signal.aborted) setState({ request, data: null, error: true }); });
    return () => controller.abort();
  }, [load, request]);
  return { data: state.request === request ? state.data : null, loading: state.request !== request, error: state.request === request && state.error, retry: () => setRequest(value => value + 1) };
}
