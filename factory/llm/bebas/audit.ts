/**
 * `npm run penulis:audit` — D-C M2d-13 (pra-registrasi §10): paket audit Opus
 * SATU SOAL per berkas untuk versi akhir SEMUA omongan tiap penulis (lulus
 * atau tidak), 4 rotasi tanpa kartu. DISIAPKAN kode, DIJALANKAN reviewer
 * (subagent Opus baru per berkas). Eksekutor tidak menulis hasil Opus.
 *
 * - `--bahan`: `eval/keluaran-m2d13/audit-opus/bahan/<bNN>--r<r>.md` (id buta,
 *   urutan diacak sha256), `kunci.json` dan `PETUNJUK.md` DI LUAR `bahan/`.
 * - `--nilai`: `jawaban/<berkas>.txt` → `nilai.json` (kunci per butir).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { teksPolos } from '../../skema/rujukan.ts';
import type { KunciOpsi } from '../draf.ts';
import { AKAR } from '../env.ts';
import { nilaiAudit, type KunciAudit } from '../patokan/audit.ts';
import { HURUF_ROTASI, putar, ROTASI } from '../rotasi/rotasi.ts';
import type { HasilBebas } from './mesin.ts';
import { urutanJalan, type NamaPenulis } from './pagu-adil.ts';
import { drafDari, type OmonganBebas } from './skema.ts';

export const FOLDER_M2D13 = `${AKAR}eval/keluaran-m2d13`;
export const FOLDER_AUDIT_M2D13 = `${FOLDER_M2D13}/audit-opus`;

export const PETUNJUK_SATU_SOAL = [
  'Kamu ikut menguji soal latihan. Di bawah ada satu soal pilihan ganda: seorang teman',
  'mengirim pesan di grup obrolan tentang sebuah saham, lalu ada pertanyaan dan empat pilihan.',
  'Kamu TIDAK diberi dokumen apa pun. Jawab dengan tebakan terbaikmu dari pesan dan pilihannya saja.',
  'Jangan memakai alat apa pun dan jangan mencari informasi.',
  'SALIN teks pilihanmu persis (tanpa huruf di depannya), tulis hurufnya, dan seberapa yakin',
  'kamu bahwa pilihanmu benar (0-100).',
  'Balas HANYA dengan JSON berbentuk:',
  '{"jawaban": [{"id": "Q1", "teks": "<salinan persis>", "pilihan": "a", "yakin": 50}]}',
].join('\n');

export interface ButirAkhir {
  jalan: string;
  penulis: NamaPenulis;
  no: number;
  versi: number;
  lulus: boolean;
  omongan: OmonganBebas;
}

/** Versi akhir semua omongan semua jalan D-B yang ada. */
export function butirAkhirDB(akar: string = AKAR): ButirAkhir[] {
  const hasil: ButirAkhir[] = [];
  for (const s of urutanJalan()) {
    const jalur = `${akar}eval/penyusun/${s.id}/hasil.json`;
    if (!existsSync(jalur)) continue;
    const h = JSON.parse(readFileSync(jalur, 'utf8')) as HasilBebas;
    for (const a of h.akhir) if (a !== null) hasil.push({ jalan: s.id, penulis: s.penulis, no: a.no, versi: a.versi, lulus: a.lulus, omongan: a.omongan });
  }
  return hasil;
}

const sha = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex');

/** Urutan buta: diurutkan menurut sha256(benih + id asal). Murni. */
export function urutButa<T>(xs: readonly T[], idAsal: (x: T) => string, benih: string): T[] {
  return [...xs].sort((a, b) => sha(`${benih}|${idAsal(a)}`).localeCompare(sha(`${benih}|${idAsal(b)}`)));
}

export interface KunciAuditM2d13 extends KunciAudit {
  benih: string;
  butir: Array<{ id_buta: string; jalan: string; penulis: NamaPenulis; no: number; versi: number; lulus: boolean }>;
}

export const BENIH_AUDIT = 'm2d13-audit-opus';

/** Berkas bahan (satu soal × satu rotasi, tanpa kartu) + kunci. Murni. */
export function bangunAuditSatuSoal(butir: readonly ButirAkhir[]): { berkas: Array<{ nama: string; isi: string }>; kunci: KunciAuditM2d13 } {
  const urut = urutButa(butir, (b) => `${b.jalan}/o${String(b.no)}`, BENIH_AUDIT);
  const berkas: Array<{ nama: string; isi: string }> = [];
  const kunci: KunciAuditM2d13 = { benih: BENIH_AUDIT, butir: [], berkas: [] };
  urut.forEach((b, i) => {
    const id = `b${String(i + 1).padStart(2, '0')}`;
    kunci.butir.push({ id_buta: id, jalan: b.jalan, penulis: b.penulis, no: b.no, versi: b.versi, lulus: b.lulus });
    const o = drafDari(b.omongan);
    for (const r of ROTASI) {
      const nama = `${id}--r${String(r)}`;
      const p = putar(o, r);
      const pilihan = Object.fromEntries(HURUF_ROTASI.map((h) => [h, teksPolos(p.pilihan[h])])) as Record<KunciOpsi, string>;
      const isi = [PETUNJUK_SATU_SOAL, '', '### Q1', `Pesan dari ${o.nama} (${o.jam}): "${teksPolos(o.pesan)}"`, `Pertanyaan: Omongan ${o.nama} cocok dengan dokumennya?`, ...HURUF_ROTASI.map((h) => `${h}) ${pilihan[h]}`), ''];
      berkas.push({ nama, isi: isi.join('\n') });
      kunci.berkas.push({ nama, kondisi: 'tanpa-kartu', r, soal: [{ q: 'Q1', id, kunci: p.kunci, pilihan }] });
    }
  });
  return { berkas, kunci };
}

export const PETUNJUK_REVIEWER_M2D13 = [
  '# Audit Opus satu soal M2d-13 (D-C) — petunjuk untuk reviewer',
  '',
  'Disiapkan kode eksekutor; eksekutor TIDAK menjalankan audit dan tidak menulis hasilnya.',
  '',
  '1. Untuk tiap berkas `bahan/<bNN>--r<r>.md` (satu soal × satu rotasi, tanpa kartu), jalankan SATU subagent Claude **opus baru**, SINKRON, yang hanya menerima isi berkas itu (tanpa folder lain; `kunci.json` ada di luar `bahan/`).',
  '2. Simpan jawaban mentahnya apa adanya di `jawaban/<bNN>--r<r>.txt`.',
  '3. `npm run penulis:audit -- --nilai` → `nilai.json` (isi kunci per butir dari 4 rotasi; ≥ 3/4 = tertebak Opus). Data H2-Opus (butir penulis Opus) dan H3a (butir penulis Haiku), pra-registrasi §2.',
].join('\n');

function tulisBahan(): number {
  const butir = butirAkhirDB();
  if (butir.length === 0) {
    console.error('Belum ada hasil jalan D-B.');
    return 1;
  }
  const { berkas, kunci } = bangunAuditSatuSoal(butir);
  rmSync(`${FOLDER_AUDIT_M2D13}/bahan`, { recursive: true, force: true });
  mkdirSync(`${FOLDER_AUDIT_M2D13}/bahan`, { recursive: true });
  mkdirSync(`${FOLDER_AUDIT_M2D13}/jawaban`, { recursive: true });
  for (const b of berkas) writeFileSync(`${FOLDER_AUDIT_M2D13}/bahan/${b.nama}.md`, b.isi, 'utf8');
  writeFileSync(`${FOLDER_AUDIT_M2D13}/kunci.json`, `${JSON.stringify(kunci, null, 2)}\n`, 'utf8');
  writeFileSync(`${FOLDER_AUDIT_M2D13}/PETUNJUK.md`, `${PETUNJUK_REVIEWER_M2D13}\n`, 'utf8');
  console.log(`${String(butir.length)} butir × 4 rotasi = ${String(berkas.length)} berkas di ${FOLDER_AUDIT_M2D13}/bahan`);
  return 0;
}

function nilai(): number {
  const kunci = JSON.parse(readFileSync(`${FOLDER_AUDIT_M2D13}/kunci.json`, 'utf8')) as KunciAuditM2d13;
  const folder = `${FOLDER_AUDIT_M2D13}/jawaban`;
  const ada = existsSync(folder) ? readdirSync(folder) : [];
  const jawaban = Object.fromEntries(kunci.berkas.map((b) => [b.nama, ada.includes(`${b.nama}.txt`) ? readFileSync(`${folder}/${b.nama}.txt`, 'utf8') : null]));
  const n = nilaiAudit(kunci, jawaban);
  const per = n.per_soal.map((s) => ({ ...kunci.butir.find((b) => b.id_buta === s.id), tanpa_kartu_benar: s.tanpa_kartu_benar, n: s.tanpa_kartu_n, tertebak_ge3: s.tanpa_kartu_benar >= 3 }));
  writeFileSync(`${FOLDER_AUDIT_M2D13}/nilai.json`, `${JSON.stringify({ cara: 'satu soal × satu rotasi per subagent Opus, tanpa kartu', per_butir: per, berkas_tanpa_jawaban: n.berkas_tanpa_jawaban }, null, 2)}\n`, 'utf8');
  console.log(`${String(per.length)} butir dinilai; berkas tanpa jawaban ${String(n.berkas_tanpa_jawaban.length)}`);
  return 0;
}

if (/(^|[\\/])bebas[\\/]audit\.ts$/.test(process.argv[1] ?? '')) {
  process.exitCode = process.argv.includes('--nilai') ? nilai() : tulisBahan();
}
