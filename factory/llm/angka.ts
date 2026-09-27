/**
 * Pembaca angka dan tanggal di kalimat bahasa Indonesia, untuk paket fakta dan
 * validator keluaran LLM (M2d D-3, D-4).
 *
 * Sengaja terpisah dari `eval/angka.ts` (milik M1.5, di luar batas kerja):
 * validator butuh **posisi** tiap angka dan **presisi tampilannya**, supaya
 * "22 kali" boleh menunjuk 22,25 tetapi "Rp150" tidak boleh menunjuk Rp145.
 *
 * Aturan presisi: angka yang ditulis dengan d angka desimal mewakili rentang
 * ± setengah satuan terakhirnya, dikali pengali (ribu/juta/miliar/triliun)
 * kalau ada. "16,07 juta" = 16.070.000 ± 5.000; "Rp145" = 145 ± 0,5.
 */

const BULAN: Readonly<Record<string, number>> = {
  januari: 1,
  jan: 1,
  februari: 2,
  feb: 2,
  maret: 3,
  mar: 3,
  april: 4,
  apr: 4,
  mei: 5,
  juni: 6,
  jun: 6,
  juli: 7,
  jul: 7,
  agustus: 8,
  agu: 8,
  agt: 8,
  ags: 8,
  september: 9,
  sep: 9,
  sept: 9,
  oktober: 10,
  okt: 10,
  november: 11,
  nov: 11,
  desember: 12,
  des: 12,
};

const NAMA_BULAN = Object.keys(BULAN)
  .sort((a, b) => b.length - a.length)
  .join('|');

export interface TanggalDiTeks {
  teks: string;
  mulai: number;
  akhir: number;
  tahun: number | null;
  bulan: number | null;
  hari: number | null;
}

/**
 * Semua tanggal di teks: ISO `2025-10-08`, "8 Oktober 2025", "8 Okt 2025",
 * "8 Oktober" (tanpa tahun), "Oktober 2025" (tanpa hari), dan tahun lepas
 * 19xx/20xx. Rentang yang sudah dipakai pola yang lebih lengkap tidak dibaca
 * ulang oleh pola yang lebih pendek.
 */
export function tanggalDalam(teks: string): TanggalDiTeks[] {
  const hasil: TanggalDiTeks[] = [];
  const terpakai: Array<[number, number]> = [];
  const bebas = (m: number, a: number): boolean => terpakai.every(([x, y]) => a <= x || m >= y);
  const tambah = (t: TanggalDiTeks): void => {
    hasil.push(t);
    terpakai.push([t.mulai, t.akhir]);
  };

  for (const c of teks.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    const m = c.index;
    tambah({
      teks: c[0],
      mulai: m,
      akhir: m + c[0].length,
      tahun: Number(c[1]),
      bulan: Number(c[2]),
      hari: Number(c[3]),
    });
  }
  const polaLengkap = new RegExp(`\\b(\\d{1,2})\\s+(${NAMA_BULAN})\\.?\\s+(\\d{4})\\b`, 'gi');
  for (const c of teks.matchAll(polaLengkap)) {
    const m = c.index;
    if (!bebas(m, m + c[0].length)) continue;
    tambah({
      teks: c[0],
      mulai: m,
      akhir: m + c[0].length,
      tahun: Number(c[3]),
      bulan: BULAN[(c[2] ?? '').toLowerCase()] ?? null,
      hari: Number(c[1]),
    });
  }
  const polaTanpaTahun = new RegExp(`\\b(\\d{1,2})\\s+(${NAMA_BULAN})\\b\\.?`, 'gi');
  for (const c of teks.matchAll(polaTanpaTahun)) {
    const m = c.index;
    if (!bebas(m, m + c[0].length)) continue;
    tambah({
      teks: c[0],
      mulai: m,
      akhir: m + c[0].length,
      tahun: null,
      bulan: BULAN[(c[2] ?? '').toLowerCase()] ?? null,
      hari: Number(c[1]),
    });
  }
  const polaBulanTahun = new RegExp(`\\b(${NAMA_BULAN})\\.?\\s+(\\d{4})\\b`, 'gi');
  for (const c of teks.matchAll(polaBulanTahun)) {
    const m = c.index;
    if (!bebas(m, m + c[0].length)) continue;
    tambah({
      teks: c[0],
      mulai: m,
      akhir: m + c[0].length,
      tahun: Number(c[2]),
      bulan: BULAN[(c[1] ?? '').toLowerCase()] ?? null,
      hari: null,
    });
  }
  for (const c of teks.matchAll(/(?<![\d.,])((?:19|20)\d{2})(?![\d.,]*\d)/g)) {
    const m = c.index;
    if (!bebas(m, m + c[0].length)) continue;
    tambah({ teks: c[0], mulai: m, akhir: m + c[0].length, tahun: Number(c[1]), bulan: null, hari: null });
  }
  return hasil.sort((a, b) => a.mulai - b.mulai);
}

/** ISO dari tanggal lengkap; `null` kalau ada bagian yang hilang. */
export function isoTanggal(t: TanggalDiTeks): string | null {
  if (t.tahun === null || t.bulan === null || t.hari === null) return null;
  return `${String(t.tahun)}-${String(t.bulan).padStart(2, '0')}-${String(t.hari).padStart(2, '0')}`;
}

/**
 * Apakah tanggal ini (sejauh bagian yang tertulis) jatuh SESUDAH T. Tanggal tanpa
 * tahun dianggap tahun T; tanggal tanpa hari dibandingkan per bulan; tahun lepas
 * dibandingkan per tahun.
 */
export function sesudahT(t: TanggalDiTeks, tanggalT: string): boolean {
  const [ty, tm, td] = tanggalT.split('-').map(Number) as [number, number, number];
  const tahun = t.tahun ?? ty;
  if (tahun !== ty) return tahun > ty;
  if (t.bulan === null) return false;
  if (t.bulan !== tm) return t.bulan > tm;
  if (t.hari === null) return false;
  return t.hari > td;
}

export interface AngkaDiTeks {
  teks: string;
  mulai: number;
  akhir: number;
  nilai: number;
  /** Setengah satuan terakhir yang tertulis, sesudah dikali pengali. */
  presisi: number;
}

const PENGALI: ReadonlyArray<[RegExp, number]> = [
  [/^\s*triliun\b/i, 1e12],
  [/^\s*(miliar|milyar)\b/i, 1e9],
  [/^\s*juta\b/i, 1e6],
  [/^\s*ribu\b/i, 1e3],
];

function uraiToken(token: string): { nilai: number; desimal: number } | null {
  // 1.690 / 4.662.137.600 (titik ribuan), boleh diikuti ,desimal
  let c = /^(\d{1,3}(?:\.\d{3})+)(?:,(\d+))?$/.exec(token);
  if (c) {
    const bulat = Number((c[1] ?? '').replace(/\./g, ''));
    const des = c[2] ?? '';
    return { nilai: bulat + (des ? Number(`0.${des}`) : 0), desimal: des.length };
  }
  // 53,16 / 0,14
  c = /^(\d+),(\d+)$/.exec(token);
  if (c) return { nilai: Number(`${c[1] ?? ''}.${c[2] ?? ''}`), desimal: (c[2] ?? '').length };
  // 22.25 (desimal gaya Inggris, satu atau dua angka di belakang titik)
  c = /^(\d+)\.(\d{1,2})$/.exec(token);
  if (c) return { nilai: Number(token), desimal: (c[2] ?? '').length };
  // 1,000,000 (koma ribuan gaya Inggris)
  if (/^\d{1,3}(,\d{3})+$/.test(token)) return { nilai: Number(token.replace(/,/g, '')), desimal: 0 };
  if (/^\d+$/.test(token)) return { nilai: Number(token), desimal: 0 };
  return null;
}

/**
 * Semua angka di teks, **di luar** tanggal yang dikenali `tanggalDalam`.
 * Tanda baca di ujung token dilepas ("Rp145." → 145).
 */
export function angkaDalam(teks: string, abaikanTanggal = true): AngkaDiTeks[] {
  const tanggal = abaikanTanggal ? tanggalDalam(teks) : [];
  const hasil: AngkaDiTeks[] = [];
  for (const c of teks.matchAll(/\d[\d.,]*/g)) {
    const mulai = c.index;
    const token = c[0].replace(/[.,]+$/, '');
    const akhir = mulai + token.length;
    if (tanggal.some((t) => mulai >= t.mulai && akhir <= t.akhir)) continue;
    const u = uraiToken(token);
    if (u === null) continue;
    const ekor = teks.slice(akhir, akhir + 12);
    let faktor = 1;
    for (const [pola, f] of PENGALI) {
      if (pola.test(ekor)) {
        faktor = f;
        break;
      }
    }
    hasil.push({
      teks: token,
      mulai,
      akhir,
      nilai: u.nilai * faktor,
      presisi: 0.5 * 10 ** -u.desimal * faktor,
    });
  }
  return hasil;
}

/** Benar kalau angka tampil `a` bisa mewakili nilai `nilai` pada presisi tampilannya. */
export function cocokAngka(a: AngkaDiTeks, nilai: number): boolean {
  return Math.abs(a.nilai - nilai) <= a.presisi + 1e-9 * Math.max(1, Math.abs(nilai));
}
