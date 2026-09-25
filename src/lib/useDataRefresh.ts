import { useEffect, useRef } from 'react';
import { DATA_CHANGED } from './storeEvents';

export function useDataRefresh(refresh: () => unknown) {
  const callback = useRef(refresh);
  callback.current = refresh;
  useEffect(() => {
    const update = () => { void callback.current(); };
    const storage = (event: StorageEvent) => {
      if (event.key === 'pousada_hospedes_v2_store' || event.key === null) update();
    };
    window.addEventListener(DATA_CHANGED, update);
    window.addEventListener('storage', storage);
    return () => {
      window.removeEventListener(DATA_CHANGED, update);
      window.removeEventListener('storage', storage);
    };
  }, []);
}
