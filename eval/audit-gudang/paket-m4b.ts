/**
 * Paket uji ulang penguji independen untuk aturan baru M4b (D-5):
 * `node --experimental-strip-types eval/audit-gudang/paket-m4b.ts`.
 *
 * Cara yang sama dengan M4a D-5 (`alat/audit-paket.ts`; `teksPrompt` dipakai
 * ulang apa adanya): tiap temuan diberikan ke subagent Claude Opus baru HANYA
 * dengan kalimat awam aturannya, satu baris fokus netral, dan potongan respons
 * mentah Sectors yang relevan (baris JSON asli, nilainya tidak diubah).
 *
 * Pilihan deterministik: gudang audit terkunci manifest (372 berkas, sha
 * diperiksa), tiap aturan baru paling banyak 3 temuan, urut
 * sha256(`aturan|simbol|temuan_id`). R36 punya 1 temuan dan R37 3 temuan di
 * seluruh gudang, jadi semuanya diuji.
 *
 * Paket berisi data mentah, jadi ditulis ke `.cache/audit-gudang/paket-m4b/`
 * (tidak ikut repo). Yang ikut repo: `eval/audit-gudang/penguji-m4b/pilihan.json`
 * — temuan, fokus, berkas sumber, dan sha256 tiap prompt.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PERTANYAAN_PENOLAK, teksPrompt, type Paket } from '../../alat/audit-paket.ts';
import { KALIMAT_AWAM } from '../../factory/gudang.ts';
import { FOLDER_GUDANG } from '../../factory/muat/gudang.ts';
import { muatGudangManifest } from '../../factory/muat/gudang-manifest.ts';
import { konteksEmiten } from '../../factory/verifikasi/konteks.ts';
import { r36LaporanSahamLain, r37BagianMelebihiKeseluruhan } from '../../factory/verifikasi/aturan-audit.ts';
import type { Temuan } from '../../factory/skema/tipe.ts';
import type { DataEmiten } from '../../factory/verifikasi/tipe.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));
export const FOLDER_PAKET_M4B = join(AKAR, '.cache', 'audit-gudang', 'paket-m4b');
export const JALUR_PILIHAN_M4B = join(AKAR, 'eval', 'audit-gudang', 'penguji-m4b', 'pilihan.json');
const MAKS_PER_ATURAN = 3;

type Obj = Record<string, unknown>;

function baca(nama: string): unknown {
  return JSON.parse(readFileSync(join(FOLDER_GUDANG, nama), 'utf8'));
}

function sidik(teks: string): string {
  return createHash('sha256').update(teks).digest('hex');
}

interface Pilihan {
  aturan: 'R36' | 'R37';
  data: DataEmiten;
  temuan: Temuan;
}

export function pilihTemuanM4b(): Pilihan[] {
  const gudang = muatGudangManifest();
  const keluar: Pilihan[] = [];
  for (const [aturan, jalankan] of [
    ['R36', r36LaporanSahamLain],
    ['R37', r37BagianMelebihiKeseluruhan],
  ] as const) {
    const semua: Pilihan[] = [];
    for (const data of gudang.emiten.values()) {
      for (const temuan of jalankan(konteksEmiten(data)).temuan) semua.push({ aturan, data, temuan });
    }
    semua.sort((a, b) => {
      const x = sidik(`${a.aturan}|${a.data.simbol}|${a.temuan.temuan_id}`);
      const y = sidik(`${b.aturan}|${b.data.simbol}|${b.temuan.temuan_id}`);
      return x < y ? -1 : x > y ? 1 : 0;
    });
    keluar.push(...semua.slice(0, MAKS_PER_ATURAN));
  }
  return keluar;
}

function tambahHari(t: string, n: number): string {
  return new Date(Date.parse(`${t}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

/** Berkas milik emiten ini yang isinya cocok dengan `saring`, menurut nama. */
function berkasDengan(data: DataEmiten, saring: (isi: unknown) => boolean): string[] {
  return data.berkas.filter((n) => saring(baca(n)));
}

export function bangunPaketM4b(id: string, p: Pilihan): Paket {
  const { data, temuan } = p;
  const kalimat = KALIMAT_AWAM[p.aturan] ?? p.aturan;
  const potongan: Paket['potongan'] = [];
  let fokus: string;

  if (p.aturan === 'R36') {
    const waktu = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/.exec(temuan.rujukan[0] ?? '')?.[1] ?? '';
    fokus = `laporan kepemilikan bertanggal ${waktu} di respons filings bersimbol ${data.simbol}`;
    for (const n of berkasDengan(data, (isi) => Array.isArray((isi as Obj)['results']))) {
      const baris = ((baca(n) as Obj)['results'] as Obj[]).filter((r) => r['timestamp'] === waktu);
      if (baris.length > 0) potongan.push({ dari: `${n} results[]`, keterangan: 'baris laporan itu, utuh', isi: baris });
    }
    for (const n of berkasDengan(data, (isi) => typeof (isi as Obj)['company_name'] === 'string').slice(0, 1)) {
      const r = baca(n) as Obj;
      potongan.push({
        dari: n,
        keterangan: 'symbol dan company_name emiten',
        isi: { symbol: r['symbol'], company_name: r['company_name'] },
      });
    }
    const hari = waktu.slice(0, 10);
    const harian: Obj[] = [];
    for (const n of berkasDengan(data, (isi) => Array.isArray(isi) && (isi as Obj[])[0]?.['date'] !== undefined)) {
      for (const r of baca(n) as Obj[]) {
        const t = String(r['date']);
        if (t >= tambahHari(hari, -5) && t <= hari && !harian.some((x) => x['date'] === t)) harian.push(r);
      }
    }
    harian.sort((a, b) => String(a['date']).localeCompare(String(b['date'])));
    potongan.push({
      dari: `${data.simbol}-*daily*.json`,
      keterangan:
        'harga harian emiten ini 5 hari sebelum s.d. hari laporan (market_cap = nilai pasar, close = harga tutup)',
      isi: harian,
    });
  } else {
    const tahun = Number(/-(\d{4})$/.exec(temuan.temuan_id)?.[1] ?? '0');
    fokus = `laporan keuangan tahunan ${data.simbol} tahun buku ${tahun}`;
    const punyaKeuangan = (isi: unknown) =>
      Array.isArray(((isi as Obj)['financials'] as Obj | undefined)?.['historical_financials']);
    for (const n of berkasDengan(data, punyaKeuangan)) {
      const baris = (((baca(n) as Obj)['financials'] as Obj)['historical_financials'] as Obj[]).filter(
        (r) => Number(r['year']) === tahun,
      );
      if (baris.length > 0) {
        potongan.push({
          dari: `${n} financials.historical_financials`,
          keterangan: `baris tahun buku ${tahun}, utuh`,
          isi: baris,
        });
        break;
      }
    }
  }
  return { id, aturan: p.aturan, simbol: data.simbol, kalimat, fokus, pertanyaan: PERTANYAAN_PENOLAK, potongan };
}

function utama(): number {
  const pilihan = pilihTemuanM4b();
  mkdirSync(FOLDER_PAKET_M4B, { recursive: true });
  const uji = pilihan.map((p, i) => {
    const id = `B${String(i + 1).padStart(2, '0')}`;
    const paket = bangunPaketM4b(id, p);
    const prompt = teksPrompt(paket);
    writeFileSync(join(FOLDER_PAKET_M4B, `${id}.txt`), prompt, 'utf8');
    return {
      id,
      aturan: p.aturan,
      simbol: p.data.simbol,
      temuan_id: p.temuan.temuan_id,
      fokus: paket.fokus,
      pertanyaan: paket.pertanyaan,
      sumber: [...new Set(paket.potongan.map((x) => x.dari))],
      prompt_sha256: sidik(prompt),
      prompt_byte: Buffer.byteLength(prompt),
    };
  });
  mkdirSync(join(AKAR, 'eval', 'audit-gudang', 'penguji-m4b'), { recursive: true });
  const keterangan =
    'Temuan aturan baru M4b (R36, R37) untuk uji ulang penguji independen (M4b D-5): gudang audit ' +
    'terkunci manifest, paling banyak 3 per aturan, urut sha256(aturan|simbol|temuan_id). Sidik prompt ' +
    'dari .cache/audit-gudang/paket-m4b/ (tidak ikut repo). Ditulis oleh eval/audit-gudang/paket-m4b.ts.';
  writeFileSync(JALUR_PILIHAN_M4B, `${JSON.stringify({ keterangan, uji }, null, 2)}\n`, 'utf8');
  for (const u of uji) {
    console.log(`${u.id} ${u.aturan} ${u.simbol} ${String(u.prompt_byte).padStart(6)} B  ${u.fokus}`);
  }
  return 0;
}

const dijalankanLangsung =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (dijalankanLangsung) {
  process.exitCode = utama();
}
