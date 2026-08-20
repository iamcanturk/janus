'use client';

import { useEffect, useState } from 'react';
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

type ToolId = 'base64' | 'hex' | 'url' | 'hash' | 'jwt' | 'cidr' | 'ioc';

const TOOLS: { id: ToolId; label: string }[] = [
  { id: 'base64', label: 'Base64' },
  { id: 'hex', label: 'Hex' },
  { id: 'url', label: 'URL' },
  { id: 'hash', label: 'Hash' },
  { id: 'jwt', label: 'JWT decode' },
  { id: 'cidr', label: 'CIDR' },
  { id: 'ioc', label: 'IOC çıkarıcı' },
];

const input =
  'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-cyan-500';
const btn =
  'rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:border-cyan-500';
const pre =
  'overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-emerald-300 whitespace-pre-wrap break-all';

function tryRun(fn: () => string): string {
  try {
    return fn();
  } catch (e) {
    return `Hata: ${e instanceof Error ? e.message : String(e)}`;
  }
}

function TextTool({
  encode,
  decode,
}: {
  encode: (s: string) => string;
  decode: (s: string) => string;
}) {
  const [value, setValue] = useState('');
  const [out, setOut] = useState('');
  return (
    <div className="space-y-3">
      <textarea
        className={`${input} min-h-24`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="flex gap-2">
        <button className={btn} onClick={() => setOut(tryRun(() => encode(value)))}>
          Encode
        </button>
        <button className={btn} onClick={() => setOut(tryRun(() => decode(value)))}>
          Decode
        </button>
      </div>
      {out && <pre className={pre}>{out}</pre>}
    </div>
  );
}

function HashTool() {
  const [value, setValue] = useState('');
  const [out, setOut] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!value) return setOut({});
    let live = true;
    void hashAll(value).then((h) => live && setOut(h));
    return () => {
      live = false;
    };
  }, [value]);
  return (
    <div className="space-y-3">
      <textarea
        className={`${input} min-h-24`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {Object.entries(out).map(([algo, digest]) => (
        <div key={algo}>
          <div className="text-xs text-slate-500">{algo}</div>
          <pre className={pre}>{digest}</pre>
        </div>
      ))}
    </div>
  );
}

function JwtTool() {
  const [value, setValue] = useState('');
  const decoded = value ? tryRunObj(() => decodeJwt(value)) : null;
  return (
    <div className="space-y-3">
      <textarea
        className={`${input} min-h-24`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="eyJ..."
      />
      {decoded && 'error' in decoded && <pre className={pre}>{decoded.error}</pre>}
      {decoded && 'header' in decoded && (
        <div className="space-y-2">
          <pre className={pre}>{JSON.stringify(decoded.header, null, 2)}</pre>
          <pre className={pre}>{JSON.stringify(decoded.payload, null, 2)}</pre>
          {decoded.warnings.map((w) => (
            <p
              key={w}
              className="rounded-lg border border-rose-800 bg-rose-950/40 px-3 py-1.5 text-xs text-rose-300"
            >
              ⚠️ {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function CidrTool() {
  const [value, setValue] = useState('192.168.1.0/24');
  const info = value ? tryRunObj(() => parseCidr(value)) : null;
  return (
    <div className="space-y-3">
      <input className={input} value={value} onChange={(e) => setValue(e.target.value)} />
      {info && 'error' in info && <pre className={pre}>{info.error}</pre>}
      {info && 'network' in info && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          {Object.entries(info).map(([k, v]) => (
            <div
              key={k}
              className="flex justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5"
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
  return (
    <div className="space-y-3">
      <textarea
        className={`${input} min-h-32`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Metni yapıştır…"
      />
      {iocs &&
        Object.entries(iocs)
          .filter(([, list]) => list.length > 0)
          .map(([kind, list]) => (
            <div key={kind}>
              <div className="text-xs uppercase text-slate-500">{kind}</div>
              <pre className={pre}>{list.join('\n')}</pre>
            </div>
          ))}
    </div>
  );
}

function tryRunObj<T>(fn: () => T): T | { error: string } {
  try {
    return fn();
  } catch (e) {
    return { error: `Hata: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export function ToolsClient() {
  const [active, setActive] = useState<ToolId>('base64');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              active === t.id
                ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200'
                : 'border-slate-700 bg-slate-900 text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        {active === 'base64' && <TextTool encode={toBase64} decode={fromBase64} />}
        {active === 'hex' && <TextTool encode={toHex} decode={fromHex} />}
        {active === 'url' && <TextTool encode={urlEncode} decode={urlDecode} />}
        {active === 'hash' && <HashTool />}
        {active === 'jwt' && <JwtTool />}
        {active === 'cidr' && <CidrTool />}
        {active === 'ioc' && <IocTool />}
      </div>

      <p className="text-xs text-slate-500">
        🔒 Tüm araçlar tarayıcında çalışır — hiçbir veri sunucuya yüklenmez.
      </p>
    </div>
  );
}
