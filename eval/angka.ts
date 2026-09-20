// Pembaca angka dan tanggal dari kalimat bahasa Indonesia.
//
// Dipakai penilai untuk membandingkan angka di keluaran lengan dengan angka di
// kunci jawaban. Aturannya ditetapkan sebelum satu pun lengan dijalankan dan
// tidak boleh disetel setelah melihat hasil (aturan pelaporan 6).

const PENGALI: [RegExp, number][] = [
  [/^\s*(triliun)/i, 1e12],
  [/^\s*(miliar|milyar)/i, 1e9],
  [/^\s*(juta)/i, 1e6],
  [/^\s*(ribu)/i, 1e3],
];

function keAngka(token: string): number | null {
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(token)) return Number(token.replace(/\./g, '').replace(',', '.'));
  if (/^\d+,\d+$/.test(token)) return Number(token.replace(',', '.'));
  if (/^\d{1,3}(,\d{3})+$/.test(token)) return Number(token.replace(/,/g, ''));
  if (/^\d+(\.\d+)?$/.test(token)) return Number(token);
  return null;
}

export interface AngkaBerekor {
  nilai: number;
  /** 14 karakter sesudah angka, apa adanya. Dipakai mengenali satuan (%, kali, persen). */
  ekor: string;
}

/** Semua angka di dalam teks beserta ekornya, sudah dikalikan satuan besar kalau disebut. */
export function angkaBerekorDalam(teks: string): AngkaBerekor[] {
  const hasil: AngkaBerekor[] = [];
  for (const cocok of teks.matchAll(/\d[\d.,]*/g)) {
    const token = cocok[0].replace(/[.,]+$/, '');
    const nilai = keAngka(token);
    if (nilai === null || cocok.index === undefined) continue;
    const ekor = teks.slice(cocok.index + cocok[0].length, cocok.index + cocok[0].length + 14);
    let dikali = nilai;
    for (const [pola, faktor] of PENGALI) {
      if (pola.test(ekor)) {
        dikali = nilai * faktor;
        break;
      }
    }
    hasil.push({ nilai: dikali, ekor });
  }
  return hasil;
}

/** Semua angka di dalam teks, sudah dikalikan satuan besar kalau disebut. */
export function angkaDalam(teks: string): number[] {
  return angkaBerekorDalam(teks).map((a) => a.nilai);
}

const BULAN: Record<string, string> = {
  jan: '01', januari: '01',
  feb: '02', februari: '02',
  mar: '03', maret: '03',
  apr: '04', april: '04',
  mei: '05',
  jun: '06', juni: '06',
  jul: '07', juli: '07',
  agu: '08', ags: '08', agt: '08', agustus: '08',
  sep: '09', sept: '09', september: '09',
  okt: '10', oktober: '10',
  nov: '11', november: '11',
  des: '12', desember: '12',
};

/** Semua tanggal di dalam teks, dinormalkan ke YYYY-MM-DD. */
export function tanggalDalam(teks: string): string[] {
  const hasil = new Set<string>();
  for (const cocok of teks.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) hasil.add(cocok[0]);
  for (const cocok of teks.matchAll(/\b(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})\b/g)) {
    const hari = cocok[1];
    const bulan = BULAN[(cocok[2] ?? '').toLowerCase()];
    const tahun = cocok[3];
    if (hari === undefined || bulan === undefined || tahun === undefined) continue;
    hasil.add(`${tahun}-${bulan}-${hari.padStart(2, '0')}`);
  }
  return [...hasil];
}

export const TOLERANSI_RELATIF = 0.01;

/** Benar kalau dua angka sama dalam toleransi 1 persen (atau keduanya nol). */
export function angkaSama(a: number, b: number): boolean {
  if (a === b) return true;
  const besar = Math.max(Math.abs(a), Math.abs(b));
  if (besar === 0) return true;
  return Math.abs(a - b) / besar <= TOLERANSI_RELATIF;
}

export function adaYangSama(kandidat: number[], harapan: number[]): boolean {
  return kandidat.some((k) => harapan.some((h) => angkaSama(k, h)));
}
