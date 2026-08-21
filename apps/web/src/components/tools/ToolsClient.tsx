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
  buildDorks,
  passwordStrength,
  generatePassword,
  generateToken,
  uuidv4,
  buildTyposquats,
  convertTime,
} from '@janus/tools';
import { CopyButton } from './CopyButton';
import { toolsByCategory, type ToolId } from './registry';

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

function PasswordTool() {
  const [pw, setPw] = useState('');
  const [len, setLen] = useState(20);
  const [sym, setSym] = useState(true);
  const strength = passwordStrength(pw);
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Field label="Parola gücü ölç">
          <input
            className={inputCls}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="parolanı yaz…"
          />
        </Field>
        {pw && (
          <p className="text-sm text-slate-300">
            {strength.bits} bit entropi ·{' '}
            <span className="font-medium text-cyan-300">{strength.verdict}</span> ({strength.length}{' '}
            karakter)
          </p>
        )}
      </div>
      <div className="space-y-2 border-t border-slate-800 pt-3">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
          <label className="flex items-center gap-1.5">
            uzunluk
            <input
              type="number"
              min={4}
              max={128}
              value={len}
              onChange={(e) => setLen(Number(e.target.value))}
              className="w-16 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={sym} onChange={(e) => setSym(e.target.checked)} />{' '}
            semboller
          </label>
        </div>
        <Output label="Üretilen parola" value={generatePassword({ length: len, symbols: sym })} />
        <p className="text-[11px] text-slate-600">Her satır yenilemede yeni parola üretilir.</p>
      </div>
    </div>
  );
}

function TokenTool() {
  const [uuid, setUuid] = useState('');
  const [tok, setTok] = useState('');
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <button
          onClick={() => setUuid(uuidv4())}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-cyan-500"
        >
          UUID v4 üret
        </button>
        <Output label="UUID" value={uuid} />
      </div>
      <div className="space-y-2 border-t border-slate-800 pt-3">
        <div className="flex gap-2">
          <button
            onClick={() => setTok(generateToken(32, 'hex'))}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-cyan-500"
          >
            256-bit hex
          </button>
          <button
            onClick={() => setTok(generateToken(32, 'base64url'))}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-cyan-500"
          >
            256-bit base64url
          </button>
        </div>
        <Output label="Token" value={tok} />
      </div>
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

function DorkTool() {
  const [value, setValue] = useState('');
  const dorks = value.trim() ? buildDorks(value) : null;
  const list = (title: string, items: ReturnType<typeof buildDorks>['google']) => (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      {items.map((d) => (
        <div
          key={d.query}
          className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5"
        >
          <div className="min-w-0 flex-1">
            <div className="text-sm text-slate-200">{d.label}</div>
            <div className="truncate font-mono text-[11px] text-slate-500">{d.query}</div>
          </div>
          <CopyButton text={d.query} />
          <a
            href={d.url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-xs text-cyan-400 hover:text-cyan-300"
          >
            aç ↗
          </a>
        </div>
      ))}
    </div>
  );
  return (
    <div className="space-y-3">
      <Field label="Hedef alan adı">
        <input
          className={inputCls}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="example.com"
        />
      </Field>
      {dorks && (
        <div className="space-y-4">
          {list('Google', dorks.google)}
          {list('GitHub', dorks.github)}
        </div>
      )}
    </div>
  );
}

function TyposquatTool() {
  const [value, setValue] = useState('');
  const list = value.trim() ? buildTyposquats(value) : [];
  return (
    <div className="space-y-3">
      <Field label="Alan adı">
        <input
          className={inputCls}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="example.com"
        />
      </Field>
      {list.length > 0 && (
        <Output label={`Benzer alan adları (${list.length})`} value={list.join('\n')} />
      )}
    </div>
  );
}

function TimeTool() {
  const [value, setValue] = useState('');
  const info = value.trim() ? convertTime(value, Date.now()) : null;
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          className={inputCls}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="epoch (1600000000) ya da ISO tarih"
        />
        <button
          onClick={() => setValue(String(Math.floor(Date.now() / 1000)))}
          className="shrink-0 rounded-lg border border-slate-700 px-3 text-sm text-slate-200 hover:border-cyan-500"
        >
          şimdi
        </button>
      </div>
      {value && !info && <p className="text-xs text-rose-400">⚠️ Anlaşılmadı.</p>}
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

const PANELS: Record<ToolId, ReactNode> = {
  base64: <EncoderTool enc={toBase64} dec={fromBase64} />,
  hex: <EncoderTool enc={toHex} dec={fromHex} />,
  url: <EncoderTool enc={urlEncode} dec={urlDecode} />,
  hash: <HashTool />,
  jwt: <JwtTool />,
  password: <PasswordTool />,
  token: <TokenTool />,
  cidr: <CidrTool />,
  ioc: <IocTool />,
  dork: <DorkTool />,
  typosquat: <TyposquatTool />,
  time: <TimeTool />,
};

interface Props {
  active: ToolId;
  onActive: (id: ToolId) => void;
}

export function ToolsClient({ active, onActive }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
      <nav className="space-y-3">
        {toolsByCategory().map(([cat, tools]) => (
          <div key={cat}>
            <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {cat}
            </div>
            <div className="space-y-0.5">
              {tools.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onActive(t.id)}
                  className={`block w-full rounded-md px-3 py-1.5 text-left text-sm ${
                    active === t.id
                      ? 'bg-cyan-950/40 text-cyan-200'
                      : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        {PANELS[active]}
        <p className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-500">
          🔒 Tüm araçlar tarayıcında çalışır — hiçbir veri sunucuya yüklenmez.
        </p>
      </div>
    </div>
  );
}
