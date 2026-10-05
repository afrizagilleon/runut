/**
 * Critic lampiran kasus (mode `--lengkapi`, M2d-29): SATU panggilan critic
 * (peran dan model `kritikus` yang dikunci `PENYEDIA_PERAN`, setelan yang sama
 * dengan critic omongan: `SETELAN_KRITIKUS`) membaca kasus yang sudah dibangun
 * dan menyebut keberatan atas tulisan agent di luar teks soal.
 *
 * Yang dijaga kode, sama dengan critic omongan (`kritikus.ts`):
 * - critic tidak bisa meloloskan: yang dibaca hanya larik `keberatan` dan
 *   `arahan`; lolos = menjawab terbaca DAN larik keberatannya kosong;
 * - terpotong, kosong, JSON tak terbaca, atau tidak terbukti berpikir →
 *   diulang SEKALI; bila tetap begitu, "tidak menjawab" (bukan lolos);
 * - critic tidak menulis ulang: tidak ada jalur dari jawabannya ke lampiran.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tanggalId } from '../../format.ts';
import { ambilRujukan } from '../../skema/rujukan.ts';
import type { Kasus } from '../../skema/tipe.ts';
import type { PesanChat } from '../klien.ts';
import { jawabanTerpotong, SUHU_KRITIKUS } from '../kritikus.ts';
import { MODEL_OR_GLM } from '../model.ts';
import type { PaketFakta } from '../paket.ts';
import { alasanTidakSah, penalaranSah } from '../penjaga-penalaran.ts';
import { uraiKeluaran, type SetelanPanggil } from '../susun.ts';
import { SETELAN_KRITIKUS } from '../templat/gerbang.ts';
import type { InfoTemplat, PanggilTemplat } from '../templat/penulis.ts';
import type { RingkasanSesudah } from './lengkapi.ts';

const JALUR_PROMPT = fileURLToPath(new URL('./prompt-kritikus-kasus.md', import.meta.url));
export const MAKS_KEBERATAN_KASUS = 8;
const MAKS_ALASAN = 400;
const MAKS_ARAHAN = 400;

export function promptKritikusKasus(): string {
  return readFileSync(JALUR_PROMPT, 'utf8').replace(/\r\n/g, '\n').trim();
}

export interface BahanKritikKasus {
  kasus: Kasus;
  paket: PaketFakta;
  /** Ringkasan sesudah tanggal simulasi yang sama dengan yang dilihat agent. */
  sesudah: RingkasanSesudah;
  /** Penyamar nama (kode saham, nama emiten, nama orang). */
  samar: (t: string) => string;
}

/** `[[fact_id|teks]]` → `[teks → fact_id]`, supaya critic melihat apa yang ditautkan ke mana. */
const tampilRujukan = (t: string): string => t.replace(/\[\[([^\]|]+)\|([^\]]*)\]\]/g, (_s, id: string, isi: string) => `[${isi} → ${id.trim()}]`);

/** Pesan pengguna untuk critic: seluruh tulisan agent, dengan kalimat resmi tiap fakta yang ditautkannya. Murni. */
export function tulisKasusKritik(b: BahanKritikKasus): string {
  const k = b.kasus;
  const T = k.tanggal_t;
  const fakta = new Map(k.fakta.map((f) => [f.fact_id, f]));
  const baris: string[] = [
    `KASUS YANG DIPERIKSA: simulasi "${k.nama_samaran}", tanggal simulasi ${tanggalId(T)}.`,
    `Judul: ${k.judul}`,
    '',
    'TIGA SOAL (teks soalnya sudah terkunci dan sudah diperiksa; di sini hanya konteks — yang kamu nilai dari bagian ini hanyalah "tanya" dan "istilah"):',
  ];
  for (const [i, s] of k.soal.entries()) {
    baris.push(
      `Soal ${String(i + 1)} — tanya: ${s.tanya}`,
      `  pesan dari ${s.pesan.nama} (${s.pesan.jam}): "${s.pesan.isi}"`,
      ...s.pilihan.map((p) => `  ${p.kunci}) ${tampilRujukan(p.teks)}`),
      `  KUNCI: ${s.jawaban}; kartu penentu: ${s.kartu_penentu.join(', ')}`,
      ...(s.istilah.length === 0 ? ['  istilah: (tidak ada)'] : s.istilah.map((x) => `  istilah "${x.kata}": ${x.arti}`)),
      '',
    );
  }
  baris.push('KARTU (teks sehari-hari tulisan penulis, masing-masing dengan kalimat resminya):');
  for (const id of k.fakta_terlihat) {
    const f = fakta.get(id);
    if (f === undefined) continue;
    const dipakai = k.soal.flatMap((s, i) => (s.kartu.includes(id) ? [`soal ${String(i + 1)}${s.kartu_penentu.includes(id) ? ' (kartu penentu)' : ''}`] : []));
    baris.push(
      `Kartu ${id} — dipakai di ${dipakai.join(', ')}`,
      `  kepala: ${f.awam?.kepala ?? ''}`,
      `  teks kartu: ${tampilRujukan(f.awam?.isi ?? '')}`,
      `  kalimat resmi: ${f.klaim}`,
    );
    for (const r of new Set(ambilRujukan(f.awam?.isi ?? '').map((x) => x.fact_id).filter((x) => x !== id))) {
      const lain = fakta.get(r);
      if (lain !== undefined) baris.push(`  kalimat resmi ${r}: ${lain.klaim}`);
    }
  }
  baris.push('', 'LAYAR PEMBUKAAN (dibaca pemain SESUDAH menjawab ketiga soal), tiap baris dengan fakta yang ditautkannya:');
  const bagian: Array<[string, string[]]> = [
    ['Apa yang terjadi sesudahnya', k.pembukaan.paragraf],
    ['Yang bisa dibaca pada tanggal simulasi', k.pembukaan.bisa_dibaca],
    ['Yang tidak bisa dibaca', k.pembukaan.tidak_bisa_dibaca],
    ['Yang disingkirkan dari kartu', k.pembukaan.disingkirkan],
  ];
  for (const [nama, daftar] of bagian) {
    baris.push(`${nama}:`);
    for (const [i, t] of daftar.entries()) {
      baris.push(`  ${String(i + 1)}. ${tampilRujukan(t)}`);
      const id = [...new Set(ambilRujukan(t).map((x) => x.fact_id))];
      if (id.length === 0) baris.push('     (tidak menautkan fakta)');
      for (const x of id) {
        const f = fakta.get(x);
        if (f === undefined) continue;
        const kapan = f.tersedia_sejak === null ? 'tanggal tak diketahui' : `${tanggalId(f.tersedia_sejak)}${f.tersedia_sejak > T ? ', sesudah tanggal simulasi' : ''}`;
        baris.push(`     fakta ${x} (${kapan}): ${f.klaim}`);
      }
    }
  }
  baris.push(
    '',
    `PENUTUP — ${k.penutup.kepala} ${k.penutup.isi}`,
    '',
    'DATA SESUDAH TANGGAL SIMULASI MENURUT PROGRAM (ringkasan yang sama dengan yang dilihat penulis; sebutan seperti "tertinggi", "terendah", "terakhir", dan jenis data yang "kosong" di sini dihitung program dan boleh dipercaya):',
    JSON.stringify(b.sesudah, null, 1),
  );
  return b.samar(baris.join('\n'));
}

export function pesanKritikusKasus(b: BahanKritikKasus): PesanChat[] {
  return [
    { role: 'system', content: promptKritikusKasus() },
    { role: 'user', content: tulisKasusKritik(b) },
  ];
}

export interface KeberatanKasus {
  bagian: string;
  alasan: string;
}

const rapikan = (t: string, n: number): string => {
  const r = t.replace(/\s+/g, ' ').trim();
  return r.length > n ? `${r.slice(0, n - 1)}…` : r;
};

/** Urai jawaban critic; `null` kalau bentuknya tidak sah (dihitung "tidak menjawab"). Medan selain `keberatan`/`arahan` tidak dibaca. */
export function uraiKritikKasus(teks: string): { keberatan: KeberatanKasus[]; arahan: string } | null {
  const u = uraiKeluaran(teks);
  if (!u.ok || typeof u.nilai !== 'object' || u.nilai === null || Array.isArray(u.nilai)) return null;
  const n = u.nilai as Record<string, unknown>;
  if (!Array.isArray(n['keberatan'])) return null;
  const keberatan: KeberatanKasus[] = [];
  for (const x of n['keberatan'] as unknown[]) {
    if (typeof x === 'string' && x.trim() !== '') {
      keberatan.push({ bagian: '-', alasan: rapikan(x, MAKS_ALASAN) });
      continue;
    }
    if (typeof x !== 'object' || x === null) continue;
    const b = x as Record<string, unknown>;
    const alasan = typeof b['alasan'] === 'string' ? b['alasan'] : '';
    if (alasan.trim() === '') continue;
    keberatan.push({ bagian: typeof b['bagian'] === 'string' ? rapikan(b['bagian'], 60) : '-', alasan: rapikan(alasan, MAKS_ALASAN) });
  }
  return { keberatan: keberatan.slice(0, MAKS_KEBERATAN_KASUS), arahan: typeof n['arahan'] === 'string' ? rapikan(n['arahan'], MAKS_ARAHAN) : '' };
}

export interface PutusanKritikKasus {
  /** `false` = dua percobaan terpotong, tak terbaca, atau tidak terbukti berpikir. */
  menjawab: boolean;
  keberatan: KeberatanKasus[];
  arahan: string;
  biaya_usd: number;
  /** Satu baris per percobaan: token, biaya, dan kenapa tidak terbaca bila begitu. */
  catatan: string[];
}

/**
 * Jalankan critic untuk satu lampiran: paling banyak dua panggilan (satu ulang
 * bila yang pertama tidak menjawab). Galat pemanggil (pagu, penyedia hilang)
 * diteruskan ke pemanggilnya.
 */
export async function kritikKasus(b: BahanKritikKasus, panggil: PanggilTemplat, putaran: number): Promise<PutusanKritikKasus> {
  const setelan: SetelanPanggil = { suhu: SUHU_KRITIKUS, ...SETELAN_KRITIKUS };
  const pesan = pesanKritikusKasus(b);
  const catatan: string[] = [];
  let biaya = 0;
  for (let ulang = 0; ulang < 2; ulang++) {
    const info: InfoTemplat = { jenis: 'kritikus', putaran, omongan: null, ke: 1, ulang, peran: 'kritikus', model: MODEL_OR_GLM };
    const j = await panggil(pesan, { ...setelan }, info);
    biaya += j.biaya_usd;
    const ukuran = `masuk ${String(j.token_masuk)}, keluar ${String(j.token_keluar)}, penalaran ${String(j.token_penalaran ?? '-')}, US$${j.biaya_usd.toFixed(4)}`;
    if (jawabanTerpotong(j)) {
      catatan.push(`percobaan ${String(ulang + 1)}: terpotong atau kosong (${ukuran})`);
      continue;
    }
    if (!penalaranSah(j, SETELAN_KRITIKUS.ambangPenalaran)) {
      catatan.push(`percobaan ${String(ulang + 1)}: ${alasanTidakSah(j, SETELAN_KRITIKUS.ambangPenalaran)} (${ukuran})`);
      continue;
    }
    const hasil = uraiKritikKasus(j.teks);
    if (hasil === null) {
      catatan.push(`percobaan ${String(ulang + 1)}: jawaban tidak terbaca sebagai JSON berisi "keberatan" (${ukuran})`);
      continue;
    }
    catatan.push(`percobaan ${String(ulang + 1)}: terbaca, ${String(hasil.keberatan.length)} keberatan (${ukuran})`);
    return { menjawab: true, keberatan: hasil.keberatan, arahan: hasil.arahan, biaya_usd: biaya, catatan };
  }
  return { menjawab: false, keberatan: [], arahan: '', biaya_usd: biaya, catatan };
}
