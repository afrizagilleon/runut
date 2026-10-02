/**
 * Paket audit luar Opus (M2d-11 D-3/D-5, pra-registrasi §4) — DISIAPKAN kode,
 * DIJALANKAN reviewer (subagent Opus baru, sinkron; eksekutor tidak bisa
 * memanggil Opus). Tidak ada hasil audit yang ditulis eksekutor.
 *
 * `npm run patokan:audit -- --bahan <nama>`: ≤ 10 soal (soal lulus putusan
 * inti D-3, tayang didahulukan; atau ketiga omongan jalan TIRT yang lulus
 * `--jalan <id>`) → 8 berkas bahan = 4 rotasi × (tanpa kartu / dengan kartu),
 * tiap berkas memuat semua soal pada rotasi itu; `kunci.json`; `PETUNJUK.md`.
 * `npm run patokan:audit -- --nilai <nama>`: jawaban mentah reviewer
 * (`jawaban/<berkas>.txt`) → `nilai.json` (benar per rotasi; data H3).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { teksPolos } from '../../skema/rujukan.ts';
import type { KunciOpsi, OmonganDraf } from '../draf.ts';
import { kartuOmongan } from '../gerbang-kartu.ts';
import type { PaketFakta } from '../paket.ts';
import { uraiKeluaran } from '../susun.ts';
import { HURUF_ROTASI, petakanSalinan, putar, ROTASI } from '../rotasi/rotasi.ts';
import { bankUjiUlang } from './bank-lama.ts';
import { FOLDER_M2D11 } from './konfig.ts';
import { JALUR_MENTAH_UJI_ULANG, lengkapUjiUlang, putusanInti, type MentahUjiUlang } from './uji-ulang.ts';

export const FOLDER_AUDIT_M2D11 = `${FOLDER_M2D11}/audit-opus`;
export const MAKS_AUDIT = 10;

export const PETUNJUK_AUDIT_TANPA_KARTU = [
  'Kamu ikut menguji soal latihan. Di bawah ada beberapa soal pilihan ganda. Tiap soal: seorang teman',
  'mengirim pesan di grup obrolan tentang sebuah saham, lalu ada pertanyaan dan empat pilihan.',
  'Kamu TIDAK diberi dokumen apa pun. Jawab dengan tebakan terbaikmu dari pesan dan pilihannya saja.',
  'Tiap soal berdiri sendiri. Jangan memakai alat apa pun dan jangan mencari informasi.',
  'Untuk tiap soal: SALIN teks pilihanmu persis (tanpa huruf di depannya), tulis hurufnya, dan seberapa yakin',
  'kamu bahwa pilihanmu benar (0-100).',
  'Balas HANYA dengan JSON berbentuk:',
  '{"jawaban": [{"id": "Q1", "teks": "<salinan persis>", "pilihan": "a", "yakin": 50}, ...]}',
].join('\n');

export const PETUNJUK_AUDIT_DENGAN_KARTU = [
  'Kamu ikut menguji soal latihan. Di bawah ada beberapa soal pilihan ganda. Tiap soal: seorang teman',
  'mengirim pesan di grup obrolan tentang sebuah saham; di bawahnya ada kartu (potongan dokumen resmi),',
  'lalu pertanyaan dan empat pilihan. Jawab dari kartu saja. Tiap soal berdiri sendiri. Jangan memakai alat apa pun.',
  'Untuk tiap soal: SALIN teks pilihanmu persis (tanpa huruf di depannya), tulis hurufnya, nomor kartu yang',
  'menentukan, dan di "kunci_lain" huruf pilihan LAIN yang menurut kartu juga benar (kosongkan bila tidak ada).',
  'Balas HANYA dengan JSON berbentuk:',
  '{"jawaban": [{"id": "Q1", "teks": "<salinan persis>", "pilihan": "a", "kartu": [1], "kunci_lain": ""}, ...]}',
].join('\n');

export interface SoalAudit {
  id: string;
  omongan: OmonganDraf;
  paket: PaketFakta;
}

export interface KunciAudit {
  berkas: Array<{ nama: string; kondisi: 'tanpa-kartu' | 'dengan-kartu'; r: number; soal: Array<{ q: string; id: string; kunci: KunciOpsi; pilihan: Record<KunciOpsi, string> }> }>;
}

/** 8 berkas bahan + kunci. Murni. */
export function bangunAudit(soal: readonly SoalAudit[]): { berkas: Array<{ nama: string; isi: string }>; kunci: KunciAudit } {
  if (soal.length === 0 || soal.length > MAKS_AUDIT) throw new Error(`soal audit harus 1–${String(MAKS_AUDIT)}`);
  const berkas: Array<{ nama: string; isi: string }> = [];
  const kunci: KunciAudit = { berkas: [] };
  for (const kondisi of ['tanpa-kartu', 'dengan-kartu'] as const) {
    for (const r of ROTASI) {
      const nama = `${kondisi}-r${String(r)}`;
      const isi: string[] = [kondisi === 'tanpa-kartu' ? PETUNJUK_AUDIT_TANPA_KARTU : PETUNJUK_AUDIT_DENGAN_KARTU, ''];
      const k: KunciAudit['berkas'][number] = { nama, kondisi, r, soal: [] };
      soal.forEach((s, i) => {
        const q = `Q${String(i + 1)}`;
        const p = putar(s.omongan, r);
        const pilihan = Object.fromEntries(HURUF_ROTASI.map((h) => [h, teksPolos(p.pilihan[h])])) as Record<KunciOpsi, string>;
        k.soal.push({ q, id: s.id, kunci: p.kunci, pilihan });
        isi.push(`### ${q}`, `Pesan dari ${s.omongan.nama} (${s.omongan.jam}): "${teksPolos(s.omongan.pesan)}"`);
        if (kondisi === 'dengan-kartu') {
          isi.push('Kartu:', ...kartuOmongan(s.omongan, s.paket).map((c) => `- Kartu ${String(c.no)} — ${c.kepala}: ${c.isi}`));
        }
        isi.push(`Pertanyaan: Omongan ${s.omongan.nama} cocok dengan dokumennya?`, ...HURUF_ROTASI.map((h) => `${h}) ${pilihan[h]}`), '');
      });
      berkas.push({ nama, isi: isi.join('\n') });
      kunci.berkas.push(k);
    }
  }
  return { berkas, kunci };
}

export const PETUNJUK_REVIEWER = [
  '# Audit luar Opus M2d-11 — petunjuk untuk reviewer',
  '',
  'Disiapkan kode eksekutor; eksekutor TIDAK menjalankan audit dan tidak menulis hasilnya.',
  '',
  '1. Untuk tiap berkas `bahan/<nama>.md` (8 berkas: 4 rotasi × tanpa/dengan kartu), jalankan SATU subagent Claude **opus baru**, SINKRON, yang hanya menerima isi berkas itu.',
  '2. Simpan jawaban mentahnya apa adanya di `jawaban/<nama>.txt`.',
  '3. `npm run patokan:audit -- --nilai <folder>` → `nilai.json` (benar per rotasi; "tanpa kartu benar" = sinyal ditinjau, bukan otomatis gagal; data H3).',
].join('\n');

/** Soal untuk audit dari uji ulang D-3: lulus putusan inti, tayang dulu, ≤ 10. */
export function soalAuditUjiUlang(mentah: readonly MentahUjiUlang[]): SoalAudit[] {
  const lulus = mentah.filter((m) => lengkapUjiUlang(m) && putusanInti(m).lulus);
  const urut = [...lulus.filter((m) => m.kelompok === 'tayang'), ...lulus.filter((m) => m.kelompok !== 'tayang')].slice(0, MAKS_AUDIT);
  const bank = bankUjiUlang();
  return urut.map((m) => {
    const b = bank.find((x) => x.id === m.id);
    if (b === undefined) throw new Error(`${m.id} tidak ada di bank`);
    return { id: b.id, omongan: b.omongan, paket: b.paket };
  });
}

export interface NilaiAudit {
  per_soal: Array<{ id: string; tanpa_kartu_benar: number; tanpa_kartu_n: number; dengan_kartu_benar: number; dengan_kartu_n: number; kunci_lain: string[]; vonis_opus_tertebak: boolean }>;
  berkas_tanpa_jawaban: string[];
}

/** Nilai jawaban mentah reviewer (teks salinan dipetakan; bila tak terpetakan, huruf). Murni terhadap masukan. */
export function nilaiAudit(kunci: KunciAudit, jawaban: Readonly<Record<string, string | null>>): NilaiAudit {
  const per = new Map<string, NilaiAudit['per_soal'][number]>();
  const tanpa: string[] = [];
  for (const b of kunci.berkas) {
    const mentah = jawaban[b.nama];
    if (mentah === null || mentah === undefined) {
      tanpa.push(b.nama);
      continue;
    }
    const u = uraiKeluaran(mentah);
    const daftar = ((u.ok ? (u.nilai as { jawaban?: Array<Record<string, unknown>> } | null) : null)?.jawaban ?? []) as Array<Record<string, unknown>>;
    for (const s of b.soal) {
      const x = per.get(s.id) ?? { id: s.id, tanpa_kartu_benar: 0, tanpa_kartu_n: 0, dengan_kartu_benar: 0, dengan_kartu_n: 0, kunci_lain: [], vonis_opus_tertebak: false };
      const j = daftar.find((y) => y['id'] === s.q);
      let huruf: KunciOpsi | null = null;
      if (j !== undefined) {
        if (typeof j['teks'] === 'string') huruf = petakanSalinan(j['teks'], s.pilihan).huruf;
        if (huruf === null && typeof j['pilihan'] === 'string' && (HURUF_ROTASI as readonly string[]).includes(j['pilihan'].trim().toLowerCase())) huruf = j['pilihan'].trim().toLowerCase() as KunciOpsi;
      }
      const benar = huruf === s.kunci ? 1 : 0;
      if (b.kondisi === 'tanpa-kartu') {
        x.tanpa_kartu_benar += benar;
        x.tanpa_kartu_n += 1;
      } else {
        x.dengan_kartu_benar += benar;
        x.dengan_kartu_n += 1;
        const kl = typeof j?.['kunci_lain'] === 'string' ? j['kunci_lain'].trim() : '';
        if (kl !== '') x.kunci_lain.push(`${b.nama}: ${kl}`);
      }
      x.vonis_opus_tertebak = x.tanpa_kartu_benar >= 3;
      per.set(s.id, x);
    }
  }
  return { per_soal: [...per.values()], berkas_tanpa_jawaban: tanpa };
}

function tulisBahan(nama: string, soal: readonly SoalAudit[]): void {
  const folder = `${FOLDER_AUDIT_M2D11}/${nama}`;
  mkdirSync(`${folder}/bahan`, { recursive: true });
  mkdirSync(`${folder}/jawaban`, { recursive: true });
  const a = bangunAudit(soal);
  for (const b of a.berkas) writeFileSync(`${folder}/bahan/${b.nama}.md`, b.isi + '\n', 'utf8');
  writeFileSync(`${folder}/kunci.json`, JSON.stringify(a.kunci, null, 2) + '\n', 'utf8');
  writeFileSync(`${folder}/PETUNJUK.md`, `${PETUNJUK_REVIEWER}\n\nSoal: ${soal.map((s) => s.id).join(', ')}\n`, 'utf8');
  writeFileSync(`${folder}/jawaban/.gitkeep`, '', 'utf8');
  console.log(`${folder}: ${String(soal.length)} soal, ${String(a.berkas.length)} berkas bahan`);
}

function utama(argv: string[]): number {
  const iB = argv.indexOf('--bahan');
  const iN = argv.indexOf('--nilai');
  const iJ = argv.indexOf('--jalan');
  if (iB >= 0) {
    const nama = argv[iB + 1] ?? '';
    if (!/^[a-z0-9-]{2,40}$/.test(nama)) throw new Error('nama folder audit tidak sah');
    if (iJ >= 0) {
      const id = argv[iJ + 1] ?? '';
      if (!/^m2d11-tirt-\d+$/.test(id)) throw new Error('id jalan tidak sah');
      const dir = `${FOLDER_M2D11.replace(/eval\/keluaran-m2d11$/, 'eval/penyusun')}/${id}`;
      const h = JSON.parse(readFileSync(`${dir}/hasil.json`, 'utf8')) as { lolos: boolean; draf: { omongan: OmonganDraf[] } | null };
      const paket = JSON.parse(readFileSync(`${dir}/paket.json`, 'utf8')) as PaketFakta;
      if (!h.lolos || h.draf === null) throw new Error(`${id} tidak terbit; tidak ada audit jalan`);
      tulisBahan(nama, h.draf.omongan.map((o, i) => ({ id: `${id}-o${String(i + 1)}`, omongan: o, paket })));
      return 0;
    }
    const mentah = (JSON.parse(readFileSync(JALUR_MENTAH_UJI_ULANG, 'utf8')) as { hasil: MentahUjiUlang[] }).hasil;
    const soal = soalAuditUjiUlang(mentah);
    if (soal.length === 0) {
      console.log('Tidak ada soal yang lulus putusan inti; tidak ada bahan audit.');
      return 0;
    }
    tulisBahan(nama, soal);
    return 0;
  }
  if (iN >= 0) {
    const nama = argv[iN + 1] ?? '';
    const folder = `${FOLDER_AUDIT_M2D11}/${nama}`;
    const kunci = JSON.parse(readFileSync(`${folder}/kunci.json`, 'utf8')) as KunciAudit;
    const jawaban = Object.fromEntries(kunci.berkas.map((b) => [b.nama, existsSync(`${folder}/jawaban/${b.nama}.txt`) ? readFileSync(`${folder}/jawaban/${b.nama}.txt`, 'utf8') : null]));
    const n = nilaiAudit(kunci, jawaban);
    writeFileSync(`${folder}/nilai.json`, JSON.stringify(n, null, 2) + '\n', 'utf8');
    for (const x of n.per_soal) console.log(`${x.id}: tanpa kartu ${String(x.tanpa_kartu_benar)}/${String(x.tanpa_kartu_n)}, dengan kartu ${String(x.dengan_kartu_benar)}/${String(x.dengan_kartu_n)}${x.kunci_lain.length > 0 ? `, kunci lain: ${x.kunci_lain.join('; ')}` : ''}`);
    if (n.berkas_tanpa_jawaban.length > 0) console.log(`belum ada jawaban: ${n.berkas_tanpa_jawaban.join(', ')}`);
    return 0;
  }
  console.error('Pakai: npm run patokan:audit -- --bahan <nama> [--jalan m2d11-tirt-<n>] | --nilai <nama>');
  return 1;
}

if (/(^|[\\/])patokan[\\/]audit\.ts$/.test(process.argv[1] ?? '')) {
  try {
    process.exitCode = utama(process.argv.slice(2));
  } catch (g) {
    console.error(g instanceof Error ? g.message : 'galat');
    process.exitCode = 1;
  }
}
