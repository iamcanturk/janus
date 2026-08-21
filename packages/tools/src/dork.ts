/**
 * Search-engine dork builder for a target domain. Pure — returns ready-to-run
 * web queries (engine-agnostic) and GitHub code-search queries.
 */

export interface Dork {
  readonly label: string;
  readonly query: string;
  /** Only set for GitHub dorks; web dorks open in the chosen search engine. */
  readonly url?: string;
}

export interface SearchEngine {
  readonly id: string;
  readonly label: string;
  readonly base: string;
}

export const SEARCH_ENGINES: readonly SearchEngine[] = [
  { id: 'google', label: 'Google', base: 'https://www.google.com/search?q=' },
  { id: 'bing', label: 'Bing', base: 'https://www.bing.com/search?q=' },
  { id: 'duckduckgo', label: 'DuckDuckGo', base: 'https://duckduckgo.com/?q=' },
  { id: 'brave', label: 'Brave', base: 'https://search.brave.com/search?q=' },
  { id: 'yandex', label: 'Yandex', base: 'https://yandex.com/search/?text=' },
  { id: 'yahoo', label: 'Yahoo', base: 'https://search.yahoo.com/search?p=' },
];

export function searchUrl(base: string, query: string): string {
  return base + encodeURIComponent(query);
}

const gh = (label: string, query: string): Dork => ({
  label,
  query,
  url: `https://github.com/search?q=${encodeURIComponent(query)}&type=code`,
});

export function buildDorks(target: string): { web: Dork[]; github: Dork[] } {
  const d = target.trim().toLowerCase();
  return {
    web: [
      { label: 'Tüm indekslenmiş sayfalar', query: `site:${d}` },
      { label: 'Subdomainler', query: `site:*.${d} -www` },
      {
        label: 'Login/admin panelleri',
        query: `site:${d} (inurl:login OR inurl:admin OR inurl:signin)`,
      },
      { label: 'Açık dizinler', query: `site:${d} intitle:"index of"` },
      {
        label: 'Belgeler (pdf/doc/xls)',
        query: `site:${d} (ext:pdf OR ext:doc OR ext:xls OR ext:csv)`,
      },
      {
        label: 'Yapılandırma/yedek',
        query: `site:${d} (ext:env OR ext:bak OR ext:old OR ext:sql OR ext:log)`,
      },
      {
        label: 'Parola/secret geçen sayfalar',
        query: `site:${d} (intext:password OR intext:apikey)`,
      },
      { label: 'Pastebin sızıntıları', query: `site:pastebin.com ${d}` },
    ],
    github: [
      gh('Kod içinde alan adı', `"${d}"`),
      gh('.env dosyaları', `"${d}" filename:.env`),
      gh('API anahtarı ipuçları', `"${d}" (api_key OR apikey OR secret OR token)`),
      gh('Yapılandırma dosyaları', `"${d}" (filename:config OR filename:credentials)`),
    ],
  };
}
