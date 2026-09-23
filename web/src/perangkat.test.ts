import { describe, expect, it } from 'vitest';
import {
  MEDAN_PERANGKAT,
  NILAI_BAHASA,
  NILAI_KONEKSI,
  NILAI_OS,
  NILAI_PERAMBAN_DALAM,
  NILAI_PERUJUK,
  PERANGKAT_KOSONG,
  bacaPerangkat,
  bahasaDari,
  koneksiDari,
  osDari,
  perambanDalamDari,
  perujukDari,
  zonaMenitDari,
  type MasukanPerangkat,
} from './perangkat.ts';

/**
 * Tabel User-Agent SUNGGUHAN (M3.8 D-1).
 *
 * String-string ini **hanya boleh ada di berkas tes**. Yang dikirim aplikasi
 * adalah kategorinya — `os` dan `peramban_dalam` — dan INV M3.8 D-9 membuktikan
 * dari antrean kiriman e2e bahwa tidak satu pun `Mozilla`/`AppleWebKit` ikut.
 *
 * Sumbernya: bentuk UA yang dilaporkan peramban dan aplikasi itu sendiri
 * (Threads menyebut dirinya `Barcelona`, nama sandi internalnya; Facebook
 * memakai `FBAN`/`FB_IAB`; TikTok `musical_ly`/`BytedanceWebview`).
 */
const UA = {
  threadsAndroid:
    'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.179 Mobile Safari/537.36 ' +
    'Barcelona 330.0.0.37.64 Android (34/14; 480dpi; 1080x2340; samsung; SM-S918B; dm3q; qcom; en_US; 606423413)',
  threadsIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
    'Mobile/15E148 Barcelona 330.0.0.20.100 (iPhone15,3; iOS 17_5; id_ID; id; scale=3.00; 1290x2796; 609151842)',
  instagramIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
    'Mobile/15E148 Instagram 329.0.3.29.99 (iPhone15,2; iOS 17_4_1; en_US; en; scale=3.00; 1179x2556; 598563946; IABMV/1)',
  instagramAndroid:
    'Mozilla/5.0 (Linux; Android 13; SM-A536E Build/TP1A.220624.014; wv) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Version/4.0 Chrome/123.0.6312.118 Mobile Safari/537.36 ' +
    'Instagram 327.1.0.40.95 Android (33/13; 450dpi; 1080x2186; samsung; SM-A536E; a53x; s5e8825; in_ID; 588188287)',
  whatsappAndroid:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A.230805.001; wv) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.230 Mobile Safari/537.36 WhatsApp/2.24.2.76',
  facebookIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
    'Mobile/15E148 [FBAN/FBIOS;FBAV/458.0.0.36.108;FBBV/590019446;FBDV/iPhone14,5;FBMD/iPhone;' +
    'FBSN/iOS;FBSV/17.4;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5;FBRV/591837461]',
  facebookAndroid:
    'Mozilla/5.0 (Linux; Android 12; RMX3363 Build/SKQ1.210216.001; wv) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.113 Mobile Safari/537.36 ' +
    '[FB_IAB/FB4A;FBAV/461.0.0.52.107;]',
  tiktokAndroid:
    'Mozilla/5.0 (Linux; Android 11; RMX2185 Build/RP1A.201005.001; wv) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Version/4.0 Chrome/110.0.5481.153 Mobile Safari/537.36 ' +
    'trill_340103 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/34.1.3 ' +
    'ByteLocale/id ByteFullLocale/id Region/ID BytedanceWebview/d8a21c6',
  lineIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
    'Mobile/15E148 Safari Line/14.5.0',
  telegramAndroid:
    'Mozilla/5.0 (Linux; Android 13; SM-A515F Build/TP1A.220624.014; wv) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.123 Mobile Safari/537.36 ' +
    'Telegram-Android/10.12.0 (Samsung SM-A515F; Android 13; SDK 33; AVERAGE)',
  xIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
    'Mobile/15E148 Twitter for iPhone/10.40',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/124.0.0.0 Mobile Safari/537.36',
  safariIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
    'Version/17.5 Mobile/15E148 Safari/604.1',
  chromeIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
    'CriOS/125.0.6422.80 Mobile/15E148 Safari/604.1',
  chromeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/124.0.0.0 Safari/537.36',
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
  safariMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
    'Version/17.4 Safari/605.1.15',
  webviewAndroid:
    'Mozilla/5.0 (Linux; Android 12; M2101K6G Build/SKQ1.210908.001; wv) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.82 Mobile Safari/537.36',
  webviewIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  chromeOs:
    'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/124.0.0.0 Safari/537.36',
} as const;

type NamaUa = keyof typeof UA;

/** [ua, os, peramban_dalam] — satu baris per peramban sungguhan. */
const TABEL: ReadonlyArray<[NamaUa, string, string]> = [
  ['threadsAndroid', 'android', 'threads'],
  ['threadsIos', 'ios', 'threads'],
  ['instagramIos', 'ios', 'instagram'],
  ['instagramAndroid', 'android', 'instagram'],
  ['whatsappAndroid', 'android', 'whatsapp'],
  ['facebookIos', 'ios', 'facebook'],
  ['facebookAndroid', 'android', 'facebook'],
  ['tiktokAndroid', 'android', 'tiktok'],
  ['lineIos', 'ios', 'line'],
  ['telegramAndroid', 'android', 'telegram'],
  ['xIos', 'ios', 'x'],
  ['chromeAndroid', 'android', 'tidak'],
  ['safariIos', 'ios', 'tidak'],
  ['chromeIos', 'ios', 'tidak'],
  ['chromeWindows', 'windows', 'tidak'],
  ['firefoxLinux', 'linux', 'tidak'],
  ['safariMac', 'mac', 'tidak'],
  // Tampilan-web tanpa nama aplikasi: kita tahu ia BUKAN peramban, tetapi
  // tidak tahu aplikasi mana. Itu "lain", bukan "tidak".
  ['webviewAndroid', 'android', 'lain'],
  ['webviewIos', 'ios', 'lain'],
  ['chromeOs', 'lain', 'tidak'],
];

describe('perangkat — os dan peramban dalam aplikasi, dari UA sungguhan (D-1)', () => {
  for (const [nama, os, dalam] of TABEL) {
    it(`${nama} → os=${os}, peramban_dalam=${dalam}`, () => {
      expect(osDari(UA[nama], 0)).toBe(os);
      expect(perambanDalamDari(UA[nama])).toBe(dalam);
    });
  }

  it('iPad dalam mode desktop mengaku Macintosh; titik sentuh membedakannya', () => {
    expect(osDari(UA.safariMac, 5)).toBe('ios');
    expect(osDari(UA.safariMac, 0)).toBe('mac');
    expect(osDari(UA.safariMac, 1)).toBe('mac');
  });

  it('UA kosong atau aneh tidak melempar dan jatuh ke kategori paling jujur', () => {
    expect(osDari('', 0)).toBe('lain');
    expect(perambanDalamDari('')).toBe('tidak');
    expect(osDari('curl/8.4.0', 0)).toBe('lain');
  });

  it('setiap keluaran ada di daftar enum yang dikirim', () => {
    for (const ua of Object.values(UA)) {
      expect(NILAI_OS).toContain(osDari(ua, 0));
      expect(NILAI_PERAMBAN_DALAM).toContain(perambanDalamDari(ua));
    }
  });
});

describe('perangkat — perujuk hanya dari NAMA HOST (D-1)', () => {
  const kasus: Array<[string, string]> = [
    ['', 'langsung'],
    ['https://www.threads.net/@seseorang/post/C8abc?xmt=AQG', 'threads'],
    ['https://www.threads.com/', 'threads'],
    ['https://l.instagram.com/?u=https%3A%2F%2Frunut.id%2F&e=AT0', 'instagram'],
    ['https://www.instagram.com/', 'instagram'],
    ['https://lm.facebook.com/l.php?u=https%3A%2F%2Frunut.id', 'facebook'],
    ['https://m.facebook.com/', 'facebook'],
    ['https://web.whatsapp.com/', 'whatsapp'],
    ['https://wa.me/628123', 'whatsapp'],
    ['https://www.google.com/', 'google'],
    ['https://www.google.co.id/search?q=runut', 'google'],
    ['https://t.co/AbCdEf', 'x'],
    ['https://x.com/seseorang/status/1', 'x'],
    ['https://twitter.com/', 'x'],
    ['https://www.tiktok.com/@a/video/1', 'tiktok'],
    ['https://t.me/grupku', 'telegram'],
    ['https://bing.com/', 'lain'],
    ['bukan-alamat', 'lain'],
    // Dari halaman kita sendiri (muat ulang, navigasi dalam situs) = langsung.
    ['https://runut.test/?k=abc', 'langsung'],
    // Nama yang MIRIP tidak ikut: pencocokan akhiran domain, bukan potongan.
    ['https://notthreads.net/', 'lain'],
    ['https://google.evil.example/', 'lain'],
  ];
  for (const [perujuk, harap] of kasus) {
    it(`"${perujuk}" → ${harap}`, () => {
      expect(perujukDari(perujuk, 'runut.test')).toBe(harap);
      expect(NILAI_PERUJUK).toContain(perujukDari(perujuk, 'runut.test'));
    });
  }
});

describe('perangkat — bahasa, koneksi, zona (D-1)', () => {
  it('bahasa: id / in (kode lama Java) → id; en-* → en; sisanya lain', () => {
    expect(bahasaDari('id-ID')).toBe('id');
    expect(bahasaDari('in-ID')).toBe('id');
    expect(bahasaDari('ID')).toBe('id');
    expect(bahasaDari('en-US')).toBe('en');
    expect(bahasaDari('ms-MY')).toBe('lain');
    expect(bahasaDari('')).toBe('lain');
    // "ind" bukan kode BCP-47 untuk bahasa Indonesia di peramban; ia tetap lain.
    expect(bahasaDari('ja')).toBe('lain');
    for (const b of ['id', 'en', 'x', '']) expect(NILAI_BAHASA).toContain(bahasaDari(b));
  });

  it('koneksi: effectiveType dipetakan; slow-2g = lambat; tidak ada = tidak-tahu', () => {
    expect(koneksiDari({ effectiveType: '4g' })).toBe('4g');
    expect(koneksiDari({ effectiveType: '3g' })).toBe('3g');
    expect(koneksiDari({ effectiveType: '2g' })).toBe('2g');
    expect(koneksiDari({ effectiveType: 'slow-2g' })).toBe('lambat');
    expect(koneksiDari({ effectiveType: '5g-palsu' })).toBe('tidak-tahu');
    expect(koneksiDari({})).toBe('tidak-tahu');
    expect(koneksiDari(null)).toBe('tidak-tahu');
    for (const k of ['4g', 'slow-2g', 'x']) {
      expect(NILAI_KONEKSI).toContain(koneksiDari({ effectiveType: k }));
    }
  });

  it('zona_menit = kebalikan getTimezoneOffset, bulat, dibatasi −720…840', () => {
    expect(zonaMenitDari(-420)).toBe(420); // WIB
    expect(zonaMenitDari(-480)).toBe(480); // WITA
    expect(zonaMenitDari(0)).toBe(0);
    expect(zonaMenitDari(300)).toBe(-300); // New York
    expect(zonaMenitDari(-840)).toBe(840);
    expect(zonaMenitDari(-900)).toBe(840);
    expect(zonaMenitDari(900)).toBe(-720);
    expect(zonaMenitDari(-330.4)).toBe(330);
    expect(zonaMenitDari(Number.NaN)).toBeNull();
  });
});

function masukan(ubah: Partial<MasukanPerangkat> = {}): MasukanPerangkat {
  return {
    ua: UA.threadsAndroid,
    titikSentuh: 5,
    perujuk: 'https://l.threads.net/?u=https%3A%2F%2Frunut.test%2F%3Fk%3Dthreads',
    hostSendiri: 'runut.test',
    bahasa: 'id-ID',
    cocokMedia: (kueri) =>
      kueri === '(prefers-color-scheme: dark)' ||
      kueri === '(pointer: coarse)' ||
      kueri === '(prefers-reduced-motion: reduce)',
    tinggi: 740.4,
    rasioPiksel: 2.625,
    jamLokal: 21,
    hariLokal: 2,
    offsetZona: -420,
    koneksi: { effectiveType: '4g', saveData: false },
    ...ubah,
  };
}

describe('perangkat — bacaPerangkat merangkai semuanya (D-1)', () => {
  it('lima belas medan, urutannya tetap, semuanya kategori kasar', () => {
    const p = bacaPerangkat(masukan());
    expect(Object.keys(p)).toEqual([...MEDAN_PERANGKAT]);
    expect(MEDAN_PERANGKAT).toHaveLength(15);
    expect(p).toEqual({
      tinggi_layar: 740,
      rasio_piksel: 2.6,
      skema_warna: 'gelap',
      penunjuk: 'kasar',
      os: 'android',
      peramban_dalam: 'threads',
      perujuk: 'threads',
      bahasa: 'id',
      jam_lokal: 21,
      hari_lokal: 2,
      zona_menit: 420,
      koneksi: '4g',
      hemat_data: false,
      gerak_dikurangi: true,
      mandiri: false,
    });
  });

  it('penunjuk: halus untuk tetikus, tidak untuk tanpa penunjuk', () => {
    expect(bacaPerangkat(masukan({ cocokMedia: (q) => q === '(pointer: fine)' })).penunjuk).toBe(
      'halus',
    );
    expect(bacaPerangkat(masukan({ cocokMedia: () => false })).penunjuk).toBe('tidak');
    expect(bacaPerangkat(masukan({ cocokMedia: () => false })).skema_warna).toBe('terang');
  });

  it('mandiri: dibuka dari layar utama (display-mode: standalone)', () => {
    const p = bacaPerangkat(masukan({ cocokMedia: (q) => q === '(display-mode: standalone)' }));
    expect(p.mandiri).toBe(true);
  });

  it('tanpa matchMedia: medan media null — memang tidak tersedia, bukan "terang"', () => {
    const p = bacaPerangkat(masukan({ cocokMedia: null }));
    expect(p.skema_warna).toBeNull();
    expect(p.penunjuk).toBeNull();
    expect(p.gerak_dikurangi).toBeNull();
    expect(p.mandiri).toBeNull();
  });

  it('tanpa navigator.connection: koneksi tidak-tahu, hemat_data null', () => {
    const p = bacaPerangkat(masukan({ koneksi: null }));
    expect(p.koneksi).toBe('tidak-tahu');
    expect(p.hemat_data).toBeNull();
  });

  it('angka yang tidak masuk akal menjadi null, bukan dikirim apa adanya', () => {
    const p = bacaPerangkat(
      masukan({ tinggi: Number.NaN, rasioPiksel: 0, jamLokal: 24, hariLokal: -1, offsetZona: Number.NaN }),
    );
    expect(p.tinggi_layar).toBeNull();
    expect(p.rasio_piksel).toBeNull();
    expect(p.jam_lokal).toBeNull();
    expect(p.hari_lokal).toBeNull();
    expect(p.zona_menit).toBeNull();
  });

  it('INV: keluarannya tidak memuat UA, alamat, atau potongan perujuk', () => {
    const teks = JSON.stringify(bacaPerangkat(masukan()));
    expect(teks).not.toMatch(/Mozilla|AppleWebKit|Barcelona|Android \(|:\/\/|runut\.test|\?u=/);
  });

  it('PERANGKAT_KOSONG punya medan yang sama, semuanya null', () => {
    expect(Object.keys(PERANGKAT_KOSONG)).toEqual([...MEDAN_PERANGKAT]);
    expect(Object.values(PERANGKAT_KOSONG).every((v) => v === null)).toBe(true);
  });
});
