import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getSiteSettings, updateSiteSettings } from '../lib/supabase';
import { DEFAULT_SITE_SETTINGS } from '../data/siteSettingsDefaults';
import type { SiteSettings } from '../data/siteSettingsDefaults';

interface SiteSettingsContextType {
  settings: SiteSettings;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
  saveSettings: (data: Partial<SiteSettings>) => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

function applyFavicon(url: string | null) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url ?? '/vite.svg';
}

function setMetaContent(selector: string, content: string) {
  const el = document.querySelector<HTMLMetaElement>(selector);
  if (el) el.content = content;
}

function applyDocumentHead(settings: SiteSettings) {
  const title = `${settings.company_name} | ${settings.company_subtitle}`;
  document.title = title;
  applyFavicon(settings.favicon_url);
  setMetaContent('meta[name="description"]', settings.description);
  setMetaContent('meta[property="og:title"]', title);
  setMetaContent('meta[property="og:description"]', settings.description);
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSettings = useCallback(async () => {
    try {
      const data = await getSiteSettings();
      setSettings(data);
      applyDocumentHead(data);
    } catch (err) {
      console.error('Error loading site settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refreshSettings(); }, [refreshSettings]);

  const saveSettings = async (partial: Partial<SiteSettings>) => {
    const merged = { ...settings, ...partial };
    const saved = await updateSiteSettings(merged);
    setSettings(saved);
    applyDocumentHead(saved);
  };

  return (
    <SiteSettingsContext.Provider value={{ settings, isLoading, refreshSettings, saveSettings }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const ctx = useContext(SiteSettingsContext);
  if (!ctx) throw new Error('useSiteSettings must be used within SiteSettingsProvider');
  return ctx;
}
