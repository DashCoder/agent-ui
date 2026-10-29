import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import type { SiteConfig } from '../api/types';

/** Used until /api/config answers, and if the API is down. */
export const FALLBACK_CONFIG: SiteConfig = {
  brand: { name: 'Agent UI', adminTitle: 'builder.example.com', landingUrl: '/' },
  assistant: { name: 'Assistant', greeting: 'Hi! How can I help you today?', learnByDefault: false },
  avatar: { posterUrl: '/avatar/poster.svg', idleVideos: [], talkVideos: [], speakReplies: false },
  quickReplies: [],
};

interface Ctx { config: SiteConfig; loaded: boolean; reload: () => Promise<void> }
const SiteConfigContext = createContext<Ctx>({ config: FALLBACK_CONFIG, loaded: false, reload: async () => {} });

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(FALLBACK_CONFIG);
  const [loaded, setLoaded] = useState(false);
  const reload = useCallback(async () => {
    try { setConfig(await api.config()); } catch { /* keep fallback */ } finally { setLoaded(true); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => { document.title = config.assistant.name; }, [config.assistant.name]);
  return <SiteConfigContext.Provider value={{ config, loaded, reload }}>{children}</SiteConfigContext.Provider>;
}

export const useSiteConfig = () => useContext(SiteConfigContext);
