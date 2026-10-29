import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { SiteSettings } from '../../api/types';
import { useSiteConfig } from '../../hooks/useSiteConfig';

/** Loads the admin settings document and saves partial patches (deep-merged by the API). */
export function useSettings() {
  const { reload } = useSiteConfig();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.settings().then(setSettings).catch((e) => setError((e as Error).message));
  }, []);

  const save = useCallback(async (patch: Partial<Record<keyof SiteSettings, unknown>>) => {
    setError(null);
    setStatus('Saving…');
    try {
      setSettings(await api.updateSettings(patch));
      await reload();
      setStatus('Saved');
      setTimeout(() => setStatus(null), 2000);
    } catch (e) {
      setStatus(null);
      setError((e as Error).message);
    }
  }, [reload]);

  return { settings, save, status, error };
}

export const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
