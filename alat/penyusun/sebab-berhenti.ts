/**
 * Sebab agent berhenti, dalam kalimat biasa (M-PN1 A-1, T-A3).
 *
 * Saat agent yang dijalankan dari halaman berhenti sebelum tiga soal terakit,
 * sebabnya dulu hanya ada di terminal. Modul ini memetakan pesan program
 * (`hasil.json` → `berhenti` yang berawalan `galat:`, atau keluaran proses yang
 * keluar tanpa `hasil.json`) ke satu kalimat: apa yang terjadi + langkah
 * berikutnya. Semuanya fungsi murni — tanpa berkas, tanpa jam, tanpa jaringan —
 * supaya bisa dites dengan tabel.
 *
 * Yang dijaga: kalimat di sini teks KAMI (tanpa istilah buatan, tanpa
 * pembingkaian; dites di `agen-halaman.test.ts`). Pesan asli program hanya
 * ikut sebagai kutipan yang sudah disamarkan (`samarkanKeluaran`): nilai kunci,
 * token, dan alamat berkas mesin tidak pernah sampai ke halaman.
 */
import { samarkan } from './rekaman-agen.ts';

export interface SebabBerhenti {
  id: string;
  /** Satu kalimat keadaan + langkah berikutnya. */
  kalimat: string;
}

/**
 * Tabel pemetaan, dibaca dari atas: baris pertama yang polanya cocok menang.
 * Pola dicocokkan dengan seluruh pesan (boleh beberapa baris).
 */
export const TABEL_SEBAB: ReadonlyArray<SebabBerhenti & { pola: RegExp }> = [
  // `jalan-agen.ts` → `periksaPenyediaTerkunci()`: pemeriksaan gratis sebelum panggilan berbayar apa pun.
  {
    id: 'penyedia-tidak-melayani',
    pola: /Penyedia terkunci bermasalah[\s\S]*tidak lagi melayani/i,
    kalimat: 'Agent tidak dijalankan: penyedia model yang ditetapkan di kode tidak lagi melayani model itu. Tidak ada biaya. (rincian di terminal)',
  },
  {
    id: 'daftar-penyedia',
    pola: /Penyedia terkunci bermasalah[\s\S]*tidak terbaca/i,
    kalimat: 'Agent tidak dijalankan: daftar penyedia model di OpenRouter tidak terbaca. Tidak ada biaya. Periksa jaringan, lalu jalankan lagi.',
  },
  {
    id: 'harga-penyedia',
    pola: /Penyedia terkunci bermasalah/i,
    kalimat: 'Agent tidak dijalankan: harga penyedia model berubah melewati batas yang ditetapkan di kode. Tidak ada biaya. (rincian di terminal)',
  },
  {
    id: 'alamat-bukan-openrouter',
    pola: /LLM_BASE_URL bukan OpenRouter/i,
    kalimat: 'Agent tidak dijalankan: LLM_BASE_URL di .env bukan alamat OpenRouter. Tidak ada biaya. Perbaiki nilainya, lalu jalankan lagi.',
  },
  {
    id: 'kunci-kedaluwarsa',
    pola: /(?:api[ _-]?key|kunci)[^\n]*(?:expired|kedaluwarsa)|(?:expired|kedaluwarsa)[^\n]*(?:api[ _-]?key|kunci)/i,
    kalimat: 'Agent berhenti: kunci API tidak diterima penyedia model (kedaluwarsa). Perbarui LLM_API_KEY di .env, lalu jalankan lagi.',
  },
  {
    id: 'kunci-tidak-diterima',
    pola: /\b401\b|unauthori[sz]ed|invalid[^\n]*api[ _-]?key|no auth credentials|user not found|incorrect api key/i,
    kalimat: 'Agent berhenti: kunci API tidak diterima penyedia model. Periksa LLM_API_KEY di .env, lalu jalankan lagi.',
  },
  {
    id: 'saldo',
    pola: /\b402\b|insufficient[^\n]*(?:credit|balance|fund)|requires more credits|payment required/i,
    kalimat: 'Agent berhenti: saldo di OpenRouter tidak cukup untuk panggilan berikutnya. Isi saldo, lalu jalankan lagi.',
  },
  {
    id: 'batas-permintaan',
    pola: /\b429\b|rate.?limit/i,
    kalimat: 'Agent berhenti: penyedia model sedang membatasi jumlah permintaan. Tunggu beberapa menit, lalu jalankan lagi.',
  },
  // `jalan-agen.ts` → `fetchBerpenjaga`: "penjaga: pagu kumulatif akan terlampaui; panggilan tidak dikirim".
  {
    id: 'batas-biaya-kumulatif',
    pola: /pagu kumulatif/i,
    kalimat: 'Agent berhenti: batas biaya seluruh panggilan dari komputer ini (LLM_PAGU_USD di .env) hampir tercapai. Naikkan angkanya bila memang dimaksud, lalu jalankan lagi.',
  },
  {
    id: 'jaringan',
    pola: /fetch failed|ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|network error|socket hang up/i,
    kalimat: 'Agent berhenti: sambungan ke penyedia model terputus. Periksa jaringan, lalu jalankan lagi.',
  },
];

/** Sebab yang belum ada di tabel, sesudah agent sempat bekerja (`hasil.json` ada). */
export const SEBAB_TAK_DIKENAL: SebabBerhenti = {
  id: 'tak-dikenal',
  kalimat: 'Agent berhenti karena kesalahan yang belum dikenali halaman ini. Pesan aslinya ada di bawah; lihat terminal tempat npm run penyusun dinyalakan.',
};

/** Sebab yang belum ada di tabel, dan proses agent keluar sebelum menulis `hasil.json`. */
export const SEBAB_TAK_DIKENAL_TANPA_HASIL: SebabBerhenti = {
  id: 'tak-dikenal-tanpa-hasil',
  kalimat: 'Agent berhenti sebelum menulis hasil, dan sebabnya belum dikenali halaman ini. Lihat terminal tempat npm run penyusun dinyalakan.',
};

/** Pesan program → sebab yang dikenal, atau `null` (pemanggil memilih kalimat umum). Murni. */
export function sebabBerhenti(pesan: string): SebabBerhenti | null {
  for (const baris of TABEL_SEBAB) if (baris.pola.test(pesan)) return { id: baris.id, kalimat: baris.kalimat };
  return null;
}

/** `hasil.json` → `berhenti` yang menyatakan kesalahan (bukan keadaan biasa seperti budget atau batas percakapan). */
export function berhentiKarenaGalat(berhenti: unknown): berhenti is string {
  return typeof berhenti === 'string' && /^(?:galat|gerbang rusak):/.test(berhenti);
}

/** Awalan yang ditambahkan `jalankanProses` ke tiap baris keluaran proses agent. */
const AWALAN_LOG = /^agent \| /;

/**
 * Baris pesan kesalahan TERAKHIR di keluaran proses (bukan baris tumpukan
 * `at …`), beserta baris rincian "- …" tepat di bawahnya. `null` bila tidak ada.
 */
export function barisGalatTerakhir(keluaran: readonly string[]): string | null {
  const baris = keluaran.map((b) => b.replace(AWALAN_LOG, ''));
  for (let i = baris.length - 1; i >= 0; i--) {
    const b = baris[i] ?? '';
    if (/^\s*at\s/.test(b)) continue;
    if (!/(?:^|\s)(?:[A-Za-z_]*Error|galat|penjaga)\b[^:]*:\s*\S/.test(b)) continue;
    const rincian: string[] = [];
    for (let j = i + 1; j < baris.length && /^\s*- /.test(baris[j] ?? ''); j++) rincian.push((baris[j] ?? '').trim());
    return [b.trim(), ...rincian].join(' ');
  }
  return null;
}

/** Pengganti apa pun yang disamarkan di kutipan pesan program. */
export const TANDA_SAMAR = '[disamarkan]';
/** Panjang paling banyak kutipan pesan program di halaman. */
export const MAKS_KUTIPAN = 400;

/**
 * Kutipan pesan program yang aman ditampilkan: kode saham dan nama perusahaan
 * (`samarkan` yang dipakai rekaman), alamat berkas mesin, token `Bearer`, kunci
 * berawalan `sk-`, dan untaian panjang mirip kunci diganti; spasi dirapikan;
 * dipotong di `MAKS_KUTIPAN`.
 */
export function samarkanKeluaran(teks: string, terlarang: readonly string[]): string {
  const s = samarkan(teks, terlarang)
    .replace(/file:\/\/\/[^\s"'()]+|[A-Za-z]:[\\/][^\s"'()]+/g, '[berkas]')
    .replace(/\b(Bearer)\s+[A-Za-z0-9._~+/=-]+/gi, `$1 ${TANDA_SAMAR}`)
    .replace(/\bsk-[A-Za-z0-9_-]{6,}/g, TANDA_SAMAR)
    .replace(/[A-Za-z0-9_-]{28,}/g, TANDA_SAMAR)
    .replace(/\s+/g, ' ')
    .trim();
  return s.length > MAKS_KUTIPAN ? `${s.slice(0, MAKS_KUTIPAN).trimEnd()} …` : s;
}
