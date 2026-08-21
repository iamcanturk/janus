export type ToolId =
  | 'base64'
  | 'hex'
  | 'url'
  | 'hash'
  | 'jwt'
  | 'password'
  | 'token'
  | 'cidr'
  | 'ioc'
  | 'dork'
  | 'typosquat'
  | 'time';

export interface ToolDef {
  id: ToolId;
  label: string;
  category: string;
}

export const TOOLS: ToolDef[] = [
  { id: 'base64', label: 'Base64', category: 'Kodlama' },
  { id: 'hex', label: 'Hex', category: 'Kodlama' },
  { id: 'url', label: 'URL', category: 'Kodlama' },
  { id: 'hash', label: 'Hash', category: 'Kripto & Hash' },
  { id: 'jwt', label: 'JWT decode', category: 'Kripto & Hash' },
  { id: 'password', label: 'Parola & entropi', category: 'Kripto & Hash' },
  { id: 'token', label: 'UUID / token', category: 'Kripto & Hash' },
  { id: 'cidr', label: 'CIDR hesaplayıcı', category: 'Ağ' },
  { id: 'ioc', label: 'IOC çıkarıcı', category: 'OSINT' },
  { id: 'dork', label: 'Dork oluşturucu', category: 'OSINT' },
  { id: 'typosquat', label: 'Typosquat üretici', category: 'OSINT' },
  { id: 'time', label: 'Zaman damgası', category: 'OSINT' },
];

export const CATEGORIES = ['Kodlama', 'Kripto & Hash', 'Ağ', 'OSINT'];

export function toolsByCategory(): [string, ToolDef[]][] {
  return CATEGORIES.map((c) => [c, TOOLS.filter((t) => t.category === c)]);
}
