// T-02 — Periksa kelengkapan data kasus tersembunyi di .cache/sectors/.
//
// Data FOLK sudah ditarik pemilik (7 kredit, di luar pagu milestone ini).
// Skrip ini hanya memeriksa: berkas mana ada, berapa baris isinya, dan
// endpoint mana yang kosong. Endpoint kosong DICATAT kosong, bukan didiamkan.
// Kalau ada yang kurang, skrip mencetak daftar yang harus ditarik dan keluar
// dengan kode 1 — penarikan tambahan harus lewat pencatat kredit.

import { adaBerkas, bacaJson, berkasCache, iniEntri } from './berkas.ts';
import { ringkasanKredit } from './kredit.ts';

interface Diperlukan {
  berkas: string;
  endpoint: string;
  /** Menghitung jumlah baris/entri yang berarti dari isi berkas. */
  hitung: (isi: unknown) => number;
  wajib: boolean;
}

function panjangArray(isi: unknown): number {
  return Array.isArray(isi) ? isi.length : 0;
}

function panjangResults(isi: unknown): number {
  if (isi !== null && typeof isi === 'object' && 'results' in isi) {
    const r = (isi as { results: unknown }).results;
    return Array.isArray(r) ? r.length : 0;
  }
  return 0;
}

function jumlahKunciDalam(jalan: string[]): (isi: unknown) => number {
  return (isi) => {
    let kursor: unknown = isi;
    for (const k of jalan) {
      if (kursor === null || typeof kursor !== 'object' || !(k in kursor)) return 0;
      kursor = (kursor as Record<string, unknown>)[k];
    }
    if (Array.isArray(kursor)) return kursor.length;
    if (kursor !== null && typeof kursor === 'object') {
      return Object.entries(kursor as Record<string, unknown>).filter(([, v]) => v !== null).length;
    }
    return kursor === null ? 0 : 1;
  };
}

export const DIPERLUKAN: Diperlukan[] = [
  { berkas: 'FOLK-filings.json', endpoint: '/v2/filings/?symbol=FOLK', hitung: panjangResults, wajib: true },
  { berkas: 'FOLK-daily-2025q3.json', endpoint: '/v2/daily/FOLK/ (jul-sep 2025)', hitung: panjangArray, wajib: true },
  { berkas: 'FOLK-daily-2025q4.json', endpoint: '/v2/daily/FOLK/ (okt 2025-jan 2026)', hitung: panjangArray, wajib: true },
  {
    berkas: 'FOLK-overview.json',
    endpoint: '/v2/company/report/FOLK/?sections=overview',
    hitung: jumlahKunciDalam(['overview']),
    wajib: true,
  },
  {
    berkas: 'FOLK-financials.json',
    endpoint: '/v2/company/report/FOLK/?sections=financials',
    hitung: jumlahKunciDalam(['financials', 'historical_financials']),
    wajib: true,
  },
  {
    berkas: 'FOLK-corpactions.json',
    endpoint: '/v2/company/corporate-actions/FOLK/',
    hitung: jumlahKunciDalam(['corporate_actions', 'agm']),
    wajib: true,
  },
  { berkas: 'suspensions-all.json', endpoint: '/v2/suspensions/ (seluruh IDX)', hitung: panjangArray, wajib: true },
];

export interface HasilPeriksa {
  berkas: string;
  endpoint: string;
  ada: boolean;
  baris: number;
  catatan: string;
}

export function periksaSemua(): HasilPeriksa[] {
  return DIPERLUKAN.map((d) => {
    const jalur = berkasCache(d.berkas);
    if (!adaBerkas(jalur)) {
      return { berkas: d.berkas, endpoint: d.endpoint, ada: false, baris: 0, catatan: 'TIDAK ADA — perlu ditarik' };
    }
    const baris = d.hitung(bacaJson<unknown>(jalur));
    return {
      berkas: d.berkas,
      endpoint: d.endpoint,
      ada: true,
      baris,
      catatan: baris === 0 ? 'ADA tetapi KOSONG (nol entri) — dicatat kosong, bukan didiamkan' : 'ada',
    };
  });
}

export function jalankan(): void {
  const hasil = periksaSemua();
  console.log('berkas cache untuk kasus tersembunyi FOLK (T = 2025-10-07):');
  for (const h of hasil) {
    console.log(`  ${h.ada ? 'ADA ' : 'HILANG'} ${h.berkas.padEnd(26)} baris=${String(h.baris).padStart(4)}  ${h.endpoint}  ${h.catatan}`);
  }
  // Sub-bagian aksi korporasi dicatat satu per satu: yang kosong harus terlihat
  // kosong, karena "tidak pernah ada dividen" adalah fakta kasus, bukan lubang data.
  const jalurCorp = berkasCache('FOLK-corpactions.json');
  if (adaBerkas(jalurCorp)) {
    const isi = bacaJson<{ corporate_actions: Record<string, unknown> }>(jalurCorp);
    const bagian = Object.entries(isi.corporate_actions).map(([k, v]) => {
      if (v === null) return `${k}=KOSONG`;
      if (Array.isArray(v)) return `${k}=${v.length}`;
      return `${k}=ada`;
    });
    console.log(`  aksi korporasi FOLK: ${bagian.join(', ')}`);
  }

  const kurang = hasil.filter((h) => !h.ada);
  console.log('');
  console.log(ringkasanKredit());
  if (kurang.length > 0) {
    console.error(`KURANG ${kurang.length} berkas: ${kurang.map((k) => k.berkas).join(', ')}. Tarik lewat pencatat kredit.`);
    process.exitCode = 1;
    return;
  }
  console.log('Tidak ada penarikan tambahan yang diperlukan: 0 kredit dipakai T-02.');
}

if (iniEntri(import.meta.url)) jalankan();
