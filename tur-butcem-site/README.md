# Tur Bütçem

Tur gelirleri, tur masrafları, bahşişler ve komisyonlar için özel bütçe takip uygulaması.

## Özellikler

- Gelir, gider, bahşiş ve komisyon kaydı
- Alındı/Alınmadı ve Ödendi/Ödenmedi durumları
- TRY, USD, EUR ve GBP para birimi filtreleri
- Son altı aya ait gelir-gider grafiği
- Net kazanç ve bekleyen tahsilat göstergeleri
- Excel `.xlsx` dışa aktarımı
- Tarayıcıda kalıcı kayıt (`localStorage`)

## Yerel çalıştırma

```bash
npm install
npm run dev
```

## Üretim derlemesi

```bash
npm run build
```

Kişisel muhasebe kayıtları GitHub deposuna yazılmaz. Kayıtlar, siteyi açtığınız tarayıcının yerel depolama alanında tutulur. Alan adı değiştirildiğinde mevcut kayıtlar otomatik taşınmaz; önce Excel yedeği alınmalıdır.
