/**
 * Ringkasan data alpha (D-10): `npm run alpha:ringkas -- <berkas.jsonl…>`.
 *
 * Deterministik: keluaran yang sama untuk berkas yang sama, tanpa membaca jam
 * maupun urutan berkas di direktori. Semua hitungan berasal dari peristiwa
 * D-6; tidak ada angka yang ditebak.
 *
 * Yang dijawab tabel ini adalah pertanyaan pemilik, bukan metrik umum:
 * apakah orang sampai ke pembukaan, di soal mana mereka berhenti, dan —
 * yang paling penting — **apakah mereka membuka kartu sebelum menjawab**.
 */
import { readFileSync } from 'node:fs';

export interface Peristiwa {
  nama: string;
  sesi: string;
  kasus_id: string;
  t_ms: number;
  urut: number;
  isi: Record<string, unknown>;
  diterima_pada?: string;
}

export interface RingkasSoal {
  soal_id: string;
  benar: boolean | null;
  kunci: string | null;
  ms_di_soal: number | null;
  kartu_dibuka_sebelum: number | null;
  ganti_pilihan: number;
}

export interface RingkasSesi {
  sesi: string;
  kasus_id: string;
  lebar_layar: number | null;
  sampai_pembukaan: boolean;
  durasi_total_ms: number;
  ms_per_layar: Array<[string, number]>;
  soal_terlama: string | null;
  soal: RingkasSoal[];
  layar_terakhir: string;
  minat_kasus_lain: boolean;
  akhir: Record<string, unknown> | null;
}

function angka(nilai: unknown): number | null {
  return typeof nilai === 'number' ? nilai : null;
}

function teks(nilai: unknown): string | null {
  return typeof nilai === 'string' ? nilai : null;
}

/** Baca berkas JSONL; baris kosong dilewati, baris rusak dilaporkan (INV-6). */
export function bacaJsonl(isi: string, namaBerkas = '<stdin>'): Peristiwa[] {
  const keluar: Peristiwa[] = [];
  for (const [nomor, baris] of isi.split('\n').entries()) {
    if (baris.trim() === '') continue;
    try {
      keluar.push(JSON.parse(baris) as Peristiwa);
    } catch {
      throw new Error(`${namaBerkas} baris ${String(nomor + 1)} bukan JSON yang sah.`);
    }
  }
  return keluar;
}

/**
 * Lama tiap layar, dihitung dari jarak antar `layar_masuk`. Layar terakhir
 * dihitung sampai peristiwa terakhir sesi itu. Kunjungan berulang ke layar yang
 * sama dijumlahkan, karena pemain boleh melihat balik soal yang sudah dikunci.
 */
function msPerLayar(peristiwa: Peristiwa[]): Array<[string, number]> {
  const masuk = peristiwa.filter((p) => p.nama === 'layar_masuk');
  const akhir = peristiwa[peristiwa.length - 1]?.t_ms ?? 0;
  const jumlah = new Map<string, number>();
  for (const [nomor, p] of masuk.entries()) {
    const layar = teks(p.isi['layar']) ?? '(tidak diketahui)';
    const berikut = masuk[nomor + 1]?.t_ms ?? akhir;
    jumlah.set(layar, (jumlah.get(layar) ?? 0) + Math.max(0, berikut - p.t_ms));
  }
  return [...jumlah.entries()];
}

export function ringkasSesi(peristiwa: Peristiwa[]): RingkasSesi {
  const urut = [...peristiwa].sort((a, b) => a.urut - b.urut);
  const pertama = urut[0];
  const terakhir = urut[urut.length - 1];

  const mulai = urut.find((p) => p.nama === 'mulai');
  const tutup = urut.find((p) => p.nama === 'tutup');
  const layarMasuk = urut.filter((p) => p.nama === 'layar_masuk');

  const soal = new Map<string, RingkasSoal>();
  const pastikan = (soal_id: string): RingkasSoal => {
    const ada = soal.get(soal_id);
    if (ada !== undefined) return ada;
    const baru: RingkasSoal = {
      soal_id,
      benar: null,
      kunci: null,
      ms_di_soal: null,
      kartu_dibuka_sebelum: null,
      ganti_pilihan: 0,
    };
    soal.set(soal_id, baru);
    return baru;
  };

  for (const p of urut) {
    if (p.nama === 'pilih') {
      const id = teks(p.isi['soal_id']);
      if (id === null) continue;
      const s = pastikan(id);
      s.ganti_pilihan = Math.max(s.ganti_pilihan, angka(p.isi['ganti_ke']) ?? 0);
    }
    if (p.nama === 'kunci_jawaban') {
      const id = teks(p.isi['soal_id']);
      if (id === null) continue;
      const s = pastikan(id);
      s.benar = typeof p.isi['benar'] === 'boolean' ? p.isi['benar'] : null;
      s.kunci = teks(p.isi['kunci']);
      s.ms_di_soal = angka(p.isi['ms_di_soal']);
      s.kartu_dibuka_sebelum = angka(p.isi['kartu_dibuka_sebelum']);
    }
  }

  const daftarSoal = [...soal.values()].sort((a, b) => a.soal_id.localeCompare(b.soal_id));
  const terlama = daftarSoal
    .filter((s) => s.ms_di_soal !== null)
    .sort((a, b) => (b.ms_di_soal ?? 0) - (a.ms_di_soal ?? 0))[0];

  const layarTerakhir =
    teks(tutup?.isi['layar_terakhir']) ??
    teks(layarMasuk[layarMasuk.length - 1]?.isi['layar']) ??
    '(tidak diketahui)';

  const kirimAkhir = urut.find((p) => p.nama === 'akhir_kirim');

  return {
    sesi: pertama?.sesi ?? '(tanpa sesi)',
    kasus_id: pertama?.kasus_id ?? '(tanpa kasus)',
    lebar_layar: angka(mulai?.isi['lebar_layar']),
    sampai_pembukaan: urut.some((p) => p.nama === 'pembukaan_masuk'),
    durasi_total_ms: terakhir?.t_ms ?? 0,
    ms_per_layar: msPerLayar(urut),
    soal_terlama: terlama?.soal_id ?? null,
    soal: daftarSoal,
    layar_terakhir: layarTerakhir,
    minat_kasus_lain: urut.some((p) => p.nama === 'minat_kasus_lain'),
    akhir: kirimAkhir === undefined ? null : kirimAkhir.isi,
  };
}

export function kelompokkanSesi(peristiwa: Peristiwa[]): RingkasSesi[] {
  const per = new Map<string, Peristiwa[]>();
  for (const p of peristiwa) {
    const daftar = per.get(p.sesi);
    if (daftar === undefined) per.set(p.sesi, [p]);
    else daftar.push(p);
  }
  return [...per.values()]
    .map(ringkasSesi)
    // Urutan tetap supaya keluarannya bisa dibandingkan antar jalankan.
    .sort((a, b) => a.sesi.localeCompare(b.sesi));
}

function detik(ms: number): string {
  return `${(ms / 1000).toFixed(1)} d`;
}

function ya(nilai: boolean): string {
  return nilai ? 'ya' : 'tidak';
}

function nilaiAkhir(akhir: Record<string, unknown> | null, medan: string): string {
  if (akhir === null) return '—';
  const nilai = akhir[medan];
  if (nilai === null || nilai === undefined || nilai === '') return '—';
  return String(nilai);
}

/** Seluruh laporan Markdown untuk sekumpulan sesi. */
export function laporan(sesi: RingkasSesi[]): string {
  const baris: string[] = [];
  baris.push('# Ringkasan alpha');
  baris.push('');
  baris.push(`Sesi: **${String(sesi.length)}**`);

  if (sesi.length === 0) {
    baris.push('');
    baris.push('Tidak ada satu pun sesi di berkas yang diberikan.');
    return baris.join('\n') + '\n';
  }

  const sampai = sesi.filter((s) => s.sampai_pembukaan).length;
  const minat = sesi.filter((s) => s.minat_kasus_lain).length;
  baris.push(`Sampai layar pembukaan: **${String(sampai)}** dari ${String(sesi.length)}`);
  baris.push(`Menekan "Mau coba kasus lain": **${String(minat)}**`);
  baris.push('');

  baris.push('## Per sesi');
  baris.push('');
  baris.push('| sesi | lebar | sampai pembukaan | durasi | berhenti di | soal terlama |');
  baris.push('|---|---|---|---|---|---|');
  for (const s of sesi) {
    baris.push(
      `| ${s.sesi} | ${s.lebar_layar === null ? '—' : String(s.lebar_layar)} | ` +
        `${ya(s.sampai_pembukaan)} | ${detik(s.durasi_total_ms)} | ${s.layar_terakhir} | ` +
        `${s.soal_terlama ?? '—'} |`,
    );
  }
  baris.push('');

  baris.push('## Kartu dibuka sebelum menjawab');
  baris.push('');
  baris.push('Ini ukuran yang paling penting: apakah pemain menjawab dari kartu atau dari ingatan.');
  baris.push('');
  const semuaSoal = [...new Set(sesi.flatMap((s) => s.soal.map((x) => x.soal_id)))].sort();
  baris.push(`| sesi | ${semuaSoal.join(' | ')} |`);
  baris.push(`|---|${semuaSoal.map(() => '---').join('|')}|`);
  for (const s of sesi) {
    const sel = semuaSoal.map((id) => {
      const soal = s.soal.find((x) => x.soal_id === id);
      if (soal === undefined || soal.kartu_dibuka_sebelum === null) return '—';
      return String(soal.kartu_dibuka_sebelum);
    });
    baris.push(`| ${s.sesi} | ${sel.join(' | ')} |`);
  }
  baris.push('');

  baris.push('## Per soal');
  baris.push('');
  baris.push('| soal | dijawab | benar | rata kartu dibuka | rata ganti pilihan | rata lama |');
  baris.push('|---|---|---|---|---|---|');
  for (const id of semuaSoal) {
    const jawab = sesi
      .map((s) => s.soal.find((x) => x.soal_id === id))
      .filter((s): s is RingkasSoal => s !== undefined && s.benar !== null);
    const benar = jawab.filter((s) => s.benar === true).length;
    const rata = (ambil: (s: RingkasSoal) => number): string =>
      jawab.length === 0 ? '—' : (jawab.reduce((j, s) => j + ambil(s), 0) / jawab.length).toFixed(1);
    const rataLama =
      jawab.length === 0
        ? '—'
        : detik(jawab.reduce((j, s) => j + (s.ms_di_soal ?? 0), 0) / jawab.length);
    baris.push(
      `| ${id} | ${String(jawab.length)} | ${String(benar)} | ` +
        `${rata((s) => s.kartu_dibuka_sebelum ?? 0)} | ${rata((s) => s.ganti_pilihan)} | ${rataLama} |`,
    );
  }
  baris.push('');

  baris.push('## Lama per layar');
  baris.push('');
  const semuaLayar = [...new Set(sesi.flatMap((s) => s.ms_per_layar.map(([l]) => l)))].sort();
  baris.push(`| sesi | ${semuaLayar.join(' | ')} |`);
  baris.push(`|---|${semuaLayar.map(() => '---').join('|')}|`);
  for (const s of sesi) {
    const sel = semuaLayar.map((layar) => {
      const cocok = s.ms_per_layar.find(([l]) => l === layar);
      return cocok === undefined ? '—' : detik(cocok[1]);
    });
    baris.push(`| ${s.sesi} | ${sel.join(' | ')} |`);
  }
  baris.push('');

  baris.push('## Titik berhenti');
  baris.push('');
  const berhenti = new Map<string, number>();
  for (const s of sesi) berhenti.set(s.layar_terakhir, (berhenti.get(s.layar_terakhir) ?? 0) + 1);
  baris.push('| layar terakhir | sesi |');
  baris.push('|---|---|');
  for (const [layar, jumlah] of [...berhenti.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    baris.push(`| ${layar} | ${String(jumlah)} |`);
  }
  baris.push('');

  baris.push('## Layar akhir');
  baris.push('');
  baris.push('| sesi | layak dibagikan | terasa seperti | menjawab dari | tulisan bebas |');
  baris.push('|---|---|---|---|---|');
  for (const s of sesi) {
    const tulisan = nilaiAkhir(s.akhir, 'teks');
    baris.push(
      `| ${s.sesi} | ${nilaiAkhir(s.akhir, 'rating')} | ${nilaiAkhir(s.akhir, 'terasa')} | ` +
        `${nilaiAkhir(s.akhir, 'sumber_jawaban')} | ${tulisan.replace(/\|/g, '\\|')} |`,
    );
  }

  return baris.join('\n') + '\n';
}

export function utama(argumen: string[]): number {
  if (argumen.length === 0) {
    console.error(
      'Sebutkan berkas JSONL yang mau diringkas, misalnya:\n' +
        '  npm run alpha:ringkas -- alat/contoh/peristiwa-contoh.jsonl',
    );
    return 1;
  }
  const peristiwa: Peristiwa[] = [];
  for (const berkas of argumen) {
    peristiwa.push(...bacaJsonl(readFileSync(berkas, 'utf8'), berkas));
  }
  process.stdout.write(laporan(kelompokkanSesi(peristiwa)));
  return 0;
}

const dijalankanLangsung =
  process.argv[1] !== undefined &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').replace(/^[A-Za-z]:/, ''));

if (dijalankanLangsung) {
  try {
    process.exitCode = utama(process.argv.slice(2));
  } catch (galat) {
    console.error(galat instanceof Error ? galat.message : String(galat));
    process.exitCode = 1;
  }
}
