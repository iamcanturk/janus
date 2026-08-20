# Janus

> Web tabanlı, self-host edilebilen, BYOK mantığıyla çalışan modüler OSINT & zafiyet tarama platformu.
> "Bir siber güvenlikçinin el çantası."

Adını iki yüzlü Roma tanrısı **Janus**'tan alır: bir yüz geçmişe/dışarıya (**pasif** gözlem), bir yüz ileriye/hedefe (**aktif** recon) bakar. Bu ikilik projenin tüm mimarisinin çekirdeğidir.

---

## Ne yapıyoruz, ne yapmıyoruz

**Yapıyoruz:** Bir araştırmacının bir hedef (domain / IP / organizasyon) üzerinde attack surface keşfi ve zafiyet taraması yaparken ihtiyaç duyduğu her şeyi tek bir web arayüzünde, checklist mantığıyla topluyoruz. Her kontrol bir modüldür; sistem yeni modül eklenerek büyür.

**Yapmıyoruz:** Otomatik exploit çalıştırmıyoruz, hedefe zarar veren/DoS eden işlem yapmıyoruz, kullanıcı adına yetkisiz tarama meşrulaştırmıyoruz. Aktif modüller her zaman opt-in ve açık onay arkasındadır.

---

## En önemli mimari karar: pasif / aktif ayrımı

Her modül (`check`) ya **pasif** ya **aktif**tir:

- **pasif** — hedefe TEK paket bile göndermez. Yalnızca üçüncü taraf/açık kaynaklardan (CT logs, RDAP, Wayback, InternetDB...) veri toplar. Yasal riski ~sıfır. Kullanıcı çekinmeden çalıştırır.
- **aktif** — hedefe canlı istek gönderir (port tarama, host doğrulama, dizin keşfi...). Güçlüdür ama VPS blackliste girebilir, kullanıcı yetkisiz taramadan sorumludur.

**Kural:** Aktif bir modül ASLA pasif bir profilde çalışmaz. Aktif modüller arayüzde ayrı, kırmızı bir "bu hedefe canlı paket gönderir — izinli misin?" onayının arkasındadır. Kod tarafında bir aktif modül eklerken `mod: aktif` ve `risk` alanı ZORUNLUDUR.

---

## Çekirdek kavramlar

### Check (modül)
Sistemin çalışma birimidir. Her check bağımsız bir plugin dosyasıdır ve şu sözleşmeye uyar:

```yaml
id: dns.zone_transfer        # benzersiz, nokta ile namespace'lenmiş
faz: recon                   # scope | recon | enumeration | surface | exposure | intel | evidence
mod: pasif                   # pasif | aktif
girdi: [domain]              # hangi entity tiplerini tüketir
uretir: [dns_record, misconfiguration]  # grafiğe hangi entity/edge'leri yazar
kaynak: DoH resolver         # veri kaynağı (dokümantasyon için)
key_gerekir: false           # BYOK key şart mı
risk: düşük                  # aktif checklerde ZORUNLU: düşük | orta | yüksek
```

Runtime kontratı (dil-agnostik olacak şekilde tasarlandı):

```
run(target, context, config) -> { entities: [], edges: [], observations: [], findings: [], status }
```

- `observations` ≠ `findings`. **Bir gözlem kendiliğinden bulguya dönüşmez.** Gözlem ham veridir; bulgu yorum + risk taşır. Bu ayrımı katmanlarda koru.
- Modül native TypeScript olabilir ya da harici bir binary'yi (nuclei, subfinder vb.) subprocess ile sarabilir. Adapter deseni kullan.

### Entity graph
Tüm çıktı ortak bir varlık grafiğine yazılır. Pivot bunun üzerinden yapılır:

```
domain → subdomain → ip → asn → org → email → github_account → leaked_secret → ...
```

- **entities** tablosu: `id, type, value, first_seen, last_seen, source_check, meta(jsonb)`
- **edges** tablosu: `id, from_entity, to_entity, relation, source_check, meta(jsonb)`
- Bir düğüme tıklayıp "buradan devam et" diyebilmek hedeftir; modüller bunu mümkün kılacak şekilde entity üretmeli.

### Profil (preset)
Kullanıcı hedef girer + profil seçer → o profildeki checkler koşar.

- `pasif-recon` — sadece pasif fazlar, hiç paket göndermez
- `bug-bounty-surface` — pasif + aktif enumeration/surface (izinli varsayımı)
- `kendi-varligim-monitor` — periyodik koşan, diff çıkaran, bildirim gönderen

### Job & queue
Bu işler dakikalarca sürer — HTTP request içinde çalıştırılmaz. Her tarama bir **job**, her check bir **task**tır. Redis + worker üzerinden koşar. Sonuçlar stream halinde arayüze düşer (checklist canlı dolar).

### Checklist görünümü
Tarama çıktısının kendisi bir checklisttir. Her check yanında:
`✅ temiz · ⚠️ gözlem · ❌ bulgu · ⏭️ atlandı (key yok/kapsam dışı)`

---

## Önerilen teknoloji yığını

> Bunlar başlangıç önerisidir; kesinleşince güncelle. Tek dil (TS) hızlı iterasyon için tercih edildi; check'ler gerektiğinde harici araçlara subprocess ile bağlanır.

| Katman | Seçim | Not |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind | Web dev arka planına uygun, hızlı |
| API | Next.js API routes ya da ayrı Fastify servisi | Tek kod tabanı |
| Queue | BullMQ + Redis | Job/task yönetimi, retry, rate-limit |
| DB | PostgreSQL (jsonb ile entity/edge) | Graph DB (Neo4j) ileride opsiyonel |
| Worker | Node worker'ları | Check'leri koşar, harici binary sarar |
| Graph UI | React Flow / Cytoscape.js | Pivot tuvali için |
| Deploy | Docker Compose | `docker compose up` ile tek komut |

---

## Dizin yapısı (hedef)

```
janus/
├── apps/
│   ├── web/                 # Next.js arayüz
│   └── worker/              # queue consumer
├── packages/
│   ├── core/                # check runner, entity graph, job modeli
│   ├── checks/              # TÜM MODÜLLER buraya (faz/mod'a göre klasörlenmiş)
│   │   ├── recon/
│   │   ├── enumeration/
│   │   ├── surface/
│   │   ├── exposure/
│   │   └── intel/
│   ├── tools/               # el çantası: keysiz küçük araçlar (hash, jwt, cidr...)
│   └── connectors/          # BYOK entegrasyonları (shodan, vt, otx, censys...)
├── docker-compose.yml
├── .env.example             # BYOK key şablonu
└── PROJECT.md
```

---

## Yeni modül nasıl eklenir (en sık yapılacak iş)

1. `packages/checks/<faz>/` altına yeni bir dosya aç.
2. Yukarıdaki check sözleşmesini doldur (id, faz, mod, girdi, uretir, risk).
3. `run()` fonksiyonunu yaz: girdiyi al → veriyi çek/tara → `entities`, `edges`, `observations`, `findings` döndür.
4. **Aktif modülse:** `mod: aktif`, `risk` zorunlu; rate-limit config'i kullan; hedefe zarar veren işlem yapma.
5. Modülü ilgili profillere ekle.
6. Testini yaz (mock kaynak yanıtıyla; ağ çağrısı testte gerçek gitmesin).

Sistem satır ekleyerek büyür. Bir modülü eklerken çekirdeğe dokunmak gerekiyorsa bir şey yanlış tasarlanmış demektir — çekirdek stabil kalmalı.

---

## Bedava & keysiz kaynaklar (BYOK olmadan çalışanlar)

İlk açılışta kullanıcı boş ekran görmemeli. Keysiz çalışanlar:
`crt.sh (CT logs)`, `RDAP`, `Wayback CDX`, `Shodan InternetDB`, `RIPEstat / bgp.tools`, `CISA KEV`, `DoH resolver'lar`.

BYOK gerektirenler ayrı çekmecede (`connectors/`): urlscan.io, VirusTotal, AlienVault OTX, Censys, GitHub token, Hunter.io.

> Free-tier limitleri sık değişir. Bir connector eklerken güncel limiti doğrula ve kota panelinde göster.

---

## El çantası (keysiz, tarayıcıda/lokal çalışan küçük araçlar)

Ana motordan bağımsız, anında sonuç veren yardımcılar. Trafik kapısı + günlük kullanım değeri:

- **Encode/decode:** Base64 / Hex / URL / HTML, CyberChef benzeri zincir, defang/refang
- **Kripto & kimlik:** hash hesaplama + hash tanımlama, JWT decode/verify (`alg:none` uyarısı), sertifika (PEM) ayrıştırma, parola entropi + üretici, UUID/token üretici
- **Ağ & DNS:** CIDR/subnet hesaplayıcı, IP aralığı genişletici, DNS/reverse DNS, ASN sorgu
- **OSINT yardımcıları:** IOC çıkarıcı (metinden IP/domain/hash/e-posta ayıkla), typosquat/homograph üretici, EXIF görüntüleyici (lokal), favicon hash (mmh3), Google/GitHub dork oluşturucu, epoch/cron/regex/User-Agent araçları

---

## Güvenlik, gizlilik, hukuk (ihlal edilemez kurallar)

- Aktif tarama daima opt-in + açık onay arkasında. Varsayılan pasiftir.
- Kişisel veri (e-posta, isim) işlenir → KVKK/GDPR sorumluluk reddi ve "yalnızca yetkili olduğun varlıklarda kullan" ibaresi her yerde görünür olmalı.
- Kullanıcının BYOK key'leri şifreli saklanır, loglara asla düşmez, üçüncü tarafa gitmez.
- Lokal araçlar (EXIF, sandbox vb.) veriyi sunucuya YÜKLEMEZ — tarayıcıda işler.
- Exploit/DoS/zarar verici otomasyon kapsam dışıdır.

---

## Faz haritası (tarama akışı = doğal araştırma sırası)

```
Faz 0  Kapsam & sahiplik   (pasif)  → RDAP, ASN, org eşleştirme — "bu varlık gerçekten hedefin mi?"
Faz 1  Recon               (pasif)  → subdomain (crt.sh), DNS, Wayback, InternetDB
Faz 2  Enumeration         (aktif)  → canlı host, port, teknoloji parmak izi, favicon pivot, dizin keşfi
Faz 3  Exposure            (karma)  → .git/.env, S3, güvenlik başlıkları, TLS sağlığı, sızmış secret
Faz 4  Intel eşleştirme    (pasif)  → CISA KEV / CVE / IOC karşılaştırma
Faz 5  Kanıt & rapor                → SHA-256 + zaman damgası, kaynak linki, PDF/Markdown çıktı
```

---

## MVP kapsamı (ilk sürüm)

Çekirdek (check runner + entity graph + queue + profil + checklist görünümü) + şu modüller:
subdomain keşfi · DNS/SPF/DMARC · RDAP/ASN · Wayback CDX · InternetDB · canlı host+port (aktif) · güvenlik başlıkları+TLS · CISA KEV eşleştirme · Markdown/PDF rapor.

Bir de el çantasından: hash, JWT decode, Base64, CIDR, IOC çıkarıcı.

---

## Claude Code için çalışma notları

- Her zaman **modül modül** ilerle. Bir seferde bir check'i tam bitir (kod + test + profile ekleme).
- Çekirdek sözleşmesini (check schema, entity/edge modeli) bozma; genişletirken geriye uyumlu tut.
- Aktif modül yazarken güvenlik kurallarını hatırlat ve `risk` alanını doldurmadan geçme.
- Dış kaynak entegrasyonu eklerken free-tier limitini doğrula, kota takibini unutma.
- Türkçe arayüz metni, İngilizce kod/değişken/commit mesajı (open source hedefi).
