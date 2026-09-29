/**
 * Penjalan rencana audit gudang (M4a D-3/D-4): `npm run sectors:ambil -- --audit <langkah>`.
 *
 * Tiga langkah, masing-masing menolak mengulang yang sudah terjadi:
 *
 * 1. `rencana` — tulis `docs/bukti/audit-rencana.json` dari cache yang sudah
 *    ada (gudang lama, kelompok suspensi). Tidak ada panggilan jaringan.
 *    Menolak menimpa rencana yang sudah ada.
 * 2. `daftar` — satu panggilan daftar perusahaan (1 kredit), lalu kelompok
 *    pembanding diturunkan dengan aturan tetap dan ditulis ke rencana. Menolak
 *    bila kelompok pembanding sudah terisi.
 * 3. `data` — paket panggilan tiap emiten, berselang 2:1. Berkas yang sudah
 *    ada dilewati (biaya 0), jadi langkah ini aman diulang sesudah terhenti.
 *
 * `ringkas` menulis `docs/bukti/audit-ambil.json` dari berkas yang ada dan
 * buku kas saja — deterministik, boleh dijalankan kapan pun.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { muatGudang } from '../factory/muat/gudang.ts';
import {
  PARAMETER_AUDIT,
  kreditTerburuk,
  normalkan,
  panggilanFilingsLanjut,
  panggilanHarian,
  paketTetap,
  pilihJendela,
  pilihKelompokPembanding,
  pilihKelompokSuspensi,
  simbolGudangLama,
  simbolPernahSuspensi,
  tanggalPenting,
  urutanAmbil,
  type BarisSuspensi,
  type RencanaPanggilan,
} from './audit-rencana.ts';
import {
  AKAR,
  SALDO_PEMBUKA,
  ambil,
  bacaBukuKas,
  biayaPanggilan,
  kreditTerpakai,
  type BarisBuku,
  type Pengambil,
} from './sectors.ts';

export const JALUR_RENCANA = join(AKAR, 'docs', 'bukti', 'audit-rencana.json');
export const JALUR_RINGKAS_AMBIL = join(AKAR, 'docs', 'bukti', 'audit-ambil.json');

export interface Rencana {
  keterangan: string;
  parameter: typeof PARAMETER_AUDIT;
  gudang_lama: string[];
  kelompok_suspensi: string[];
  kelompok_pembanding: string[] | null;
  pembanding_dari: {
    berkas: string;
    total_count: number | null;
    baris_dibaca: number;
    dibuang_pernah_suspensi: number;
    dibuang_gudang_lama: number;
  } | null;
  kredit_terburuk: number;
}

function tulisJson(jalur: string, isi: unknown): void {
  writeFileSync(jalur, `${JSON.stringify(isi, null, 2)}\n`, 'utf8');
}

function bacaJson(jalur: string): unknown {
  return JSON.parse(readFileSync(jalur, 'utf8'));
}

export function bacaRencana(jalur: string = JALUR_RENCANA): Rencana {
  return bacaJson(jalur) as Rencana;
}

function bacaSuspensi(folder: string): BarisSuspensi[] {
  const isi = bacaJson(join(folder, 'suspensions-all.json'));
  return Array.isArray(isi) ? (isi as BarisSuspensi[]) : [];
}

// --- 1. rencana ----------------------------------------------------------------

export function susunRencana(folder: string): Rencana {
  const gudang = muatGudang(folder);
  const lama = simbolGudangLama(gudang.emiten.values());
  const suspensi = pilihKelompokSuspensi(bacaSuspensi(folder), lama);
  const jumlah = PARAMETER_AUDIT.jumlah_suspensi + PARAMETER_AUDIT.jumlah_pembanding;
  return {
    keterangan:
      'Rencana audit gudang M4a, ditulis sebelum data emiten diambil. Aturan pemilihan di ' +
      'alat/audit-rencana.ts dan docs/bukti/audit-rencana.md. Jangan disunting tangan.',
    parameter: PARAMETER_AUDIT,
    gudang_lama: lama,
    kelompok_suspensi: suspensi,
    kelompok_pembanding: null,
    pembanding_dari: null,
    kredit_terburuk: kreditTerburuk(jumlah),
  };
}

// --- 2. daftar -----------------------------------------------------------------

export function isiPembanding(rencana: Rencana, daftarIsi: unknown, folder: string): Rencana {
  const akar = typeof daftarIsi === 'object' && daftarIsi !== null ? (daftarIsi as Record<string, unknown>) : {};
  const hasil = Array.isArray(akar['results']) ? (akar['results'] as Array<{ symbol: string }>) : [];
  const paginasi = (akar['pagination'] ?? {}) as Record<string, unknown>;
  const pernah = simbolPernahSuspensi(bacaSuspensi(folder));
  for (const b of existsSync(join(folder, 'dada-suspensions.json'))
    ? ((bacaJson(join(folder, 'dada-suspensions.json')) as { results?: BarisSuspensi[] }).results ?? [])
    : []) {
    pernah.add(normalkan(b.symbol));
  }
  const simbol = [...new Set(hasil.filter((h) => typeof h?.symbol === 'string').map((h) => normalkan(h.symbol)))];
  const lama = new Set(rencana.gudang_lama);
  return {
    ...rencana,
    kelompok_pembanding: pilihKelompokPembanding(hasil, pernah, rencana.gudang_lama),
    pembanding_dari: {
      berkas: PARAMETER_AUDIT.berkas_daftar,
      total_count: typeof paginasi['total_count'] === 'number' ? paginasi['total_count'] : null,
      baris_dibaca: simbol.length,
      dibuang_pernah_suspensi: simbol.filter((s) => pernah.has(s)).length,
      dibuang_gudang_lama: simbol.filter((s) => !pernah.has(s) && lama.has(s)).length,
    },
  };
}

// --- 3. data -------------------------------------------------------------------

function isiBerkas(folder: string, berkas: string): unknown {
  const jalur = join(folder, berkas);
  if (!existsSync(jalur)) return undefined;
  try {
    return bacaJson(jalur);
  } catch {
    return undefined;
  }
}

function adaHalamanBerikut(isi: unknown): boolean {
  const p = (isi as { pagination?: { has_next?: unknown } } | undefined)?.pagination;
  return p?.has_next === true;
}

/** Kredit yang sudah dibebankan ke berkas emiten ini menurut buku kas (tahan jalan ulang). */
function biayaEmitenDariBuku(buku: readonly BarisBuku[], simbol: string): number {
  const awalan = `${normalkan(simbol)}-m4a-`;
  return buku.filter((b) => b.berkas.startsWith(awalan)).reduce((n, b) => n + b.biaya, 0);
}

class Henti extends Error {}

export interface CatatanPanggilan {
  peran: string;
  path: string;
  berkas: string;
  akhir: string;
  status: number | null;
  biaya: number;
}

export async function ambilEmiten(
  p: Pengambil,
  simbol: string,
  suspensi: readonly BarisSuspensi[],
): Promise<CatatanPanggilan[]> {
  const catatan: CatatanPanggilan[] = [];

  const panggil = async (r: RencanaPanggilan) => {
    const sudahAda = existsSync(join(p.folder, r.berkas));
    const terpakai = biayaEmitenDariBuku(bacaBukuKas(p.bukuKas), simbol);
    if (!sudahAda && terpakai + biayaPanggilan(r.path) > PARAMETER_AUDIT.pagu_emiten) {
      catatan.push({ ...r, akhir: 'dilewati-pagu-emiten', status: null, biaya: 0 });
      return undefined;
    }
    const h = await ambil(p, r.path, r.berkas);
    catatan.push({ ...r, akhir: h.akhir, status: h.status, biaya: h.biaya });
    console.log(`  ${simbol} ${r.peran.padEnd(18)} ${h.akhir.padEnd(12)} ${h.status ?? '-'} biaya ${h.biaya}`);
    if (h.akhir === 'berhenti' || h.akhir === 'ditolak-pagu') {
      throw new Henti(`${simbol} ${r.peran}: ${h.akhir}${h.alasan ? ` — ${h.alasan}` : ''}`);
    }
    return h;
  };

  const [ca, f0, own, of] = paketTetap(simbol);
  const hCa = await panggil(ca!);
  if (hCa?.akhir === 'tidak-ada') return catatan; // simbol tidak dikenal Sectors: sisa paket tidak dikirim
  const hF0 = await panggil(f0!);
  await panggil(own!);
  await panggil(of!);
  const halaman: unknown[] = [];
  if (hF0?.isi !== undefined) halaman.push(hF0.isi);
  if (adaHalamanBerikut(hF0?.isi)) {
    const hF1 = await panggil(panggilanFilingsLanjut(simbol));
    if (hF1?.isi !== undefined) halaman.push(hF1.isi);
  }
  const tp = tanggalPenting({ simbol, suspensi, halamanFilings: halaman, aksiKorporasi: hCa?.isi });
  for (const j of pilihJendela(tp)) await panggil(panggilanHarian(simbol, j));
  return catatan;
}

// --- ringkasan (deterministik, dari berkas dan buku kas) ------------------------

export interface RingkasEmiten {
  simbol: string;
  kelompok: 'suspensi' | 'pembanding';
  tanggal_penting: { suspensi: number; laporan: number; aksi: number };
  panggilan: Array<{ peran: string; path: string; berkas: string; ada: boolean; status: string | null; biaya: number }>;
  biaya: number;
  berkas_ada: number;
  gagal: string | null;
}

/**
 * Susun ulang daftar panggilan tiap emiten dari berkas yang ada (paket tetap
 * → halaman kedua bila `has_next` → jendela dari tanggal penting), lalu
 * tempelkan status dan biaya dari buku kas.
 */
export function ringkasAmbil(rencana: Rencana, folder: string, buku: readonly BarisBuku[]) {
  const suspensi = bacaSuspensi(folder);
  const statusTerakhir = new Map<string, string>();
  const biayaBerkas = new Map<string, number>();
  for (const b of buku) {
    if (b.jenis === 'hasil') statusTerakhir.set(b.berkas, b.status);
    biayaBerkas.set(b.berkas, (biayaBerkas.get(b.berkas) ?? 0) + b.biaya);
  }
  const emiten: RingkasEmiten[] = [];
  for (const { simbol, kelompok } of urutanAmbil(rencana.kelompok_suspensi, rencana.kelompok_pembanding ?? [])) {
    const rencanaPanggilan: RencanaPanggilan[] = [...paketTetap(simbol)];
    const ca = isiBerkas(folder, rencanaPanggilan[0]!.berkas);
    const f0 = isiBerkas(folder, rencanaPanggilan[1]!.berkas);
    const halaman: unknown[] = f0 === undefined ? [] : [f0];
    if (adaHalamanBerikut(f0)) {
      const lanjut = panggilanFilingsLanjut(simbol);
      rencanaPanggilan.push(lanjut);
      const f1 = isiBerkas(folder, lanjut.berkas);
      if (f1 !== undefined) halaman.push(f1);
    }
    const tp = tanggalPenting({ simbol, suspensi, halamanFilings: halaman, aksiKorporasi: ca });
    const caGagal = statusTerakhir.get(rencanaPanggilan[0]!.berkas) === '404';
    if (!caGagal) for (const j of pilihJendela(tp)) rencanaPanggilan.push(panggilanHarian(simbol, j));
    const panggilan = (caGagal ? rencanaPanggilan.slice(0, 1) : rencanaPanggilan).map((r) => ({
      peran: r.peran,
      path: r.path,
      berkas: r.berkas,
      ada: existsSync(join(folder, r.berkas)),
      status: statusTerakhir.get(r.berkas) ?? null,
      biaya: biayaBerkas.get(r.berkas) ?? 0,
    }));
    const gagal = caGagal
      ? 'Sectors menjawab 404 untuk aksi korporasi (simbol tidak dikenal); sisa paket tidak dikirim'
      : panggilan.some((x) => !x.ada)
        ? `berkas tidak ada: ${panggilan.filter((x) => !x.ada).map((x) => `${x.peran} (status ${x.status ?? 'belum dipanggil'})`).join(', ')}`
        : null;
    emiten.push({
      simbol,
      kelompok,
      tanggal_penting: { suspensi: tp.suspensi.length, laporan: tp.laporan.length, aksi: tp.aksi.length },
      panggilan,
      biaya: panggilan.reduce((n, x) => n + x.biaya, 0),
      berkas_ada: panggilan.filter((x) => x.ada).length,
      gagal,
    });
  }
  const daftarBiaya = biayaBerkas.get(PARAMETER_AUDIT.berkas_daftar) ?? 0;
  const perKelompok = (k: string) => {
    const e = emiten.filter((x) => x.kelompok === k);
    return {
      emiten: e.length,
      emiten_lengkap: e.filter((x) => x.gagal === null).length,
      kredit: e.reduce((n, x) => n + x.biaya, 0),
      berkas: e.reduce((n, x) => n + x.berkas_ada, 0),
    };
  };
  return {
    keterangan:
      'Hasil pengambilan audit gudang M4a, disusun dari berkas di .cache/sectors dan buku kas ' +
      '.cache/sectors/kredit.csv oleh `npm run sectors:ambil -- --audit ringkas`.',
    kredit: {
      saldo_pembuka: SALDO_PEMBUKA,
      terpakai_total: kreditTerpakai([...buku]),
      terpakai_sejak_pembuka: kreditTerpakai([...buku]) - SALDO_PEMBUKA,
      daftar_perusahaan: daftarBiaya,
    },
    kelompok: { suspensi: perKelompok('suspensi'), pembanding: perKelompok('pembanding') },
    emiten,
  };
}

// --- perintah ------------------------------------------------------------------

export async function jalankanAudit(p: Pengambil, argumen: string[]): Promise<number> {
  const langkah = argumen[0];
  if (langkah === 'rencana') {
    if (existsSync(JALUR_RENCANA)) {
      console.error('Rencana sudah ada; tidak ditimpa. Rencana tidak boleh diubah sesudah ditulis.');
      return 1;
    }
    const r = susunRencana(p.folder);
    tulisJson(JALUR_RENCANA, r);
    console.log(`rencana ditulis: ${r.kelompok_suspensi.length} emiten kelompok suspensi, gudang lama ${r.gudang_lama.length}`);
    console.log(`kredit terburuk: ${r.kredit_terburuk}`);
    return 0;
  }
  if (!existsSync(JALUR_RENCANA)) {
    console.error('Rencana belum ada. Jalankan dulu: npm run sectors:ambil -- --audit rencana');
    return 1;
  }
  const rencana = bacaRencana();

  if (langkah === 'daftar') {
    if (rencana.kelompok_pembanding !== null) {
      console.error('Kelompok pembanding sudah terisi; tidak dipilih ulang.');
      return 1;
    }
    const h = await ambil(p, PARAMETER_AUDIT.path_daftar, PARAMETER_AUDIT.berkas_daftar);
    console.log(`daftar perusahaan: ${h.akhir} | status ${h.status ?? '-'} | biaya ${h.biaya}`);
    if (h.isi === undefined) {
      console.error(`Daftar perusahaan tidak didapat${h.alasan ? `: ${h.alasan}` : ''}.`);
      return 1;
    }
    const baru = isiPembanding(rencana, h.isi, p.folder);
    tulisJson(JALUR_RENCANA, baru);
    console.log(`kelompok pembanding: ${(baru.kelompok_pembanding ?? []).join(' ')}`);
    return 0;
  }

  if (langkah === 'data') {
    if (rencana.kelompok_pembanding === null) {
      console.error('Kelompok pembanding belum diturunkan. Jalankan dulu: --audit daftar');
      return 1;
    }
    const suspensi = bacaSuspensi(p.folder);
    try {
      for (const { simbol, kelompok } of urutanAmbil(rencana.kelompok_suspensi, rencana.kelompok_pembanding)) {
        console.log(`${simbol} (${kelompok})`);
        await ambilEmiten(p, simbol, suspensi);
      }
    } catch (galat) {
      if (galat instanceof Henti) {
        console.error(`BERHENTI: ${galat.message}`);
        tulisJson(JALUR_RINGKAS_AMBIL, ringkasAmbil(rencana, p.folder, bacaBukuKas(p.bukuKas)));
        return 1;
      }
      throw galat;
    }
    const r = ringkasAmbil(rencana, p.folder, bacaBukuKas(p.bukuKas));
    tulisJson(JALUR_RINGKAS_AMBIL, r);
    console.log(`selesai. kredit sejak saldo pembuka: ${r.kredit.terpakai_sejak_pembuka}`);
    return 0;
  }

  if (langkah === 'ringkas') {
    const r = ringkasAmbil(rencana, p.folder, bacaBukuKas(p.bukuKas));
    tulisJson(JALUR_RINGKAS_AMBIL, r);
    console.log(`ringkasan ditulis. kredit sejak saldo pembuka: ${r.kredit.terpakai_sejak_pembuka}`);
    return 0;
  }

  console.error('Langkah audit: rencana | daftar | data | ringkas');
  return 1;
}
