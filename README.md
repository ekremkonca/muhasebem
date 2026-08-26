# Rehberlik Muhasebe

Cloudflare Pages, Pages Functions ve D1 üzerinde çalışan React/Vite muhasebe uygulaması.

## Cloudflare Pages ayarları

- Production branch: `main`
- Root directory: `tur-butcem-site`
- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- D1 binding: `DB` (uygulama `db`, `D1`, `DATABASE` ve `MUHASEBEM_DB` adlarını da tanır)

Kayıtlar D1 veritabanında tutulur. Oturum çerezi `HttpOnly`, `Secure` ve `SameSite=Strict` olarak ayarlanır.

## Yerel geliştirme

```bash
cd tur-butcem-site
npm install
npm run dev
```

Üretim kontrolü:

```bash
npm run build
```
