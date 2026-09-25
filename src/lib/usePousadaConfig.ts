import { useEffect, useState } from 'react';
import { dataService } from './storageStore';
import { useDataRefresh } from './useDataRefresh';
import { PousadaConfig } from '../types';
export function usePousadaConfig() {
  const [config, setConfig] = useState<PousadaConfig | null>(null);
  const refresh = () => dataService.fetchConfig().then(setConfig).catch(() => setConfig(null));
  useEffect(() => { void refresh(); }, []);
  useDataRefresh(refresh);
  return config;
}
