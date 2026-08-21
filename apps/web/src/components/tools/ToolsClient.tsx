'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  toBase64,
  fromBase64,
  toHex,
  fromHex,
  urlEncode,
  urlDecode,
  hashAll,
  decodeJwt,
  parseCidr,
  extractIocs,
} from '@janus/tools';
import { CopyButton } from './CopyButton';

type ToolId = 'base64' | 'hex' | 'url' | 'hash' | 'jwt' | 'cidr' | 'ioc';

const TOOLS: { id: ToolId; label: string; hint: string }[] = [
  { id: 'base64', label: 'Base64', hint: 'Encode / decode' },
  { id: 'hex', label: 'Hex', hint: 'Encode / decode' },
  { id: 'url', label: 'URL', hint: 'Encode / decode' },
  { id: 'hash', label: 'Hash', hint: 'SHA-1/256/384/512' },
  { id: 'jwt', label: 'JWT', hint: 'Decode + uyarılar' },
  { id: 'cidr', label: 'CIDR', hint: 'IPv4 hesaplayıcı' },
  { id: 'ioc', label: 'IOC çıkarıcı', hint: 'Metinden IOC ayıkla' },
];

const inputCls =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-cyan-500';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function Output({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        <CopyButton text={value} />
      </div>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-emerald-300">
        {value}
      </pre>
    </div>
  );
}

function safe(fn: () => string): string {
  try {
    return fn();
  } catch (e) {
    return `⚠️ ${e instanceof Error ? e.message : String(e)}`;
  }
}

function EncoderTool({ enc, dec }: { enc: (s: string) => string; dec: (s: string) => string }) {
  const [value, setValue] = useState('');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const out = value ? safe(() => (mode === 'encode' ? enc(value) : dec(value))) : '';
  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg border border-slate-700 p-0.5">
        {(['encode', 'decode'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-md px-3 py-1 text-xs ${mode === m ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
          >
            {m === 'encode' ? 'Encode' : 'Decode'}
          </button>
        ))}
      </div>
      <Field label="Girdi">
        <textarea
          className={`${inputCls} min-h-28`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="metin…"
        />
      </Field>
      <Output label="Çıktı" value={out} />
    </div>
  );
}

function HashTool() {
  const [value, setValue] = useState('');
  const [out, setOut] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!value) {
      setOut({});
      return;
    }
    let live = true;
    void hashAll(value).then((h) => live && setOut(h));
    return () => {
      live = false;
    };
  }, [value]);
  return (
    <div className="space-y-3">
      <Field label="Girdi">
        <textarea
          className={`${inputCls} min-h-24`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="hash'lenecek metin…"
        />
      </Field>
      {Object.entries(out).map(([algo, digest]) => (
        <Output key={algo} label={algo} value={digest} />
      ))}
    </div>
  );
}

function JwtTool() {
  const [value, setValue] = useState('');
  let decoded: ReturnType<typeof decodeJwt> | null = null;
  let err = '';
  if (value) {
    try {
      decoded = decodeJwt(value);
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    }
  }
  return (
    <div className="space-y-3">
      <Field label="Token">
        <textarea
          className={`${inputCls} min-h-24`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="eyJhbGciOi…"
        />
      </Field>
      {err && <p className="text-xs text-rose-400">⚠️ {err}</p>}
      {decoded && (
        <>
          {decoded.warnings.map((w) => (
            <p
              key={w}
              className="rounded-lg border border-rose-800 bg-rose-950/40 px-3 py-1.5 text-xs text-rose-300"
            >
              ⚠️ {w}
            </p>
          ))}
          <Output label="Header" value={JSON.stringify(decoded.header, null, 2)} />
          <Output label="Payload" value={JSON.stringify(decoded.payload, null, 2)} />
        </>
      )}
    </div>
  );
}

function CidrTool() {
  const [value, setValue] = useState('192.168.1.0/24');
  let info: ReturnType<typeof parseCidr> | null = null;
  let err = '';
  try {
    info = parseCidr(value);
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
  }
  return (
    <div className="space-y-3">
      <Field label="CIDR (IPv4)">
        <input className={inputCls} value={value} onChange={(e) => setValue(e.target.value)} />
      </Field>
      {err && <p className="text-xs text-rose-400">⚠️ {err}</p>}
      {info && (
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(info).map(([k, v]) => (
            <div
              key={k}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
            >
              <span className="text-slate-500">{k}</span>
              <span className="font-mono text-slate-200">{String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IocTool() {
  const [value, setValue] = useState('');
  const iocs = value ? extractIocs(value) : null;
  const groups = iocs ? Object.entries(iocs).filter(([, l]) => l.length > 0) : [];
  return (
    <div className="space-y-3">
      <Field label="Metin">
        <textarea
          className={`${inputCls} min-h-36`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="log, e-posta, rapor… yapıştır"
        />
      </Field>
      {value && groups.length === 0 && <p className="text-xs text-slate-500">IOC bulunamadı.</p>}
      {groups.map(([kind, list]) => (
        <Output key={kind} label={`${kind} (${list.length})`} value={list.join('\n')} />
      ))}
    </div>
  );
}

export function ToolsClient() {
  const [active, setActive] = useState<ToolId>('base64');
  return (
    <div className="grid gap-4 md:grid-cols-[200px_minmax(0,1fr)]">
      <nav className="flex flex-row flex-wrap gap-1.5 md:flex-col">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`rounded-lg border px-3 py-2 text-left transition ${
              active === t.id
                ? 'border-cyan-500 bg-cyan-950/40'
                : 'border-slate-800 bg-slate-900/40 hover:border-slate-600'
            }`}
          >
            <span className="block text-sm font-medium text-slate-100">{t.label}</span>
            <span className="hidden text-[11px] text-slate-500 md:block">{t.hint}</span>
          </button>
        ))}
      </nav>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        {active === 'base64' && <EncoderTool enc={toBase64} dec={fromBase64} />}
        {active === 'hex' && <EncoderTool enc={toHex} dec={fromHex} />}
        {active === 'url' && <EncoderTool enc={urlEncode} dec={urlDecode} />}
        {active === 'hash' && <HashTool />}
        {active === 'jwt' && <JwtTool />}
        {active === 'cidr' && <CidrTool />}
        {active === 'ioc' && <IocTool />}
        <p className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-500">
          🔒 Tüm araçlar tarayıcında çalışır — hiçbir veri sunucuya yüklenmez.
        </p>
      </div>
    </div>
  );
}
