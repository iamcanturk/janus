/**
 * Search-engine dork builder for a target domain. Pure — returns ready-to-open
 * Google and GitHub queries a researcher commonly runs.
 */

export interface Dork {
  readonly label: string;
  readonly query: string;
  readonly url: string;
}

const g = (label: string, query: string): Dork => ({
  label,
  query,
  url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
});
const gh = (label: string, query: string): Dork => ({
  label,
  query,
  url: `https://github.com/search?q=${encodeURIComponent(query)}&type=code`,
});

export function buildDorks(target: string): { google: Dork[]; github: Dork[] } {
  const d = target.trim().toLowerCase();
  return {
    google: [
      g('Tüm indekslenmiş sayfalar', `site:${d}`),
      g('Subdomainler', `site:*.${d} -www`),
      g('Login/admin panelleri', `site:${d} (inurl:login OR inurl:admin OR inurl:signin)`),
      g('Açık dizinler', `site:${d} intitle:"index of"`),
      g('Belgeler (pdf/doc/xls)', `site:${d} (ext:pdf OR ext:doc OR ext:xls OR ext:csv)`),
      g('Yapılandırma/yedek', `site:${d} (ext:env OR ext:bak OR ext:old OR ext:sql OR ext:log)`),
      g('Parola/secret geçen sayfalar', `site:${d} (intext:password OR intext:apikey)`),
      g('Pastebin sızıntıları', `site:pastebin.com ${d}`),
    ],
    github: [
      gh('Kod içinde alan adı', `"${d}"`),
      gh('.env dosyaları', `"${d}" filename:.env`),
      gh('API anahtarı ipuçları', `"${d}" (api_key OR apikey OR secret OR token)`),
      gh('Yapılandırma dosyaları', `"${d}" (filename:config OR filename:credentials)`),
    ],
  };
}
