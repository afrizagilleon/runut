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
  /** Lama tumpukan kartu terlihat sebelum jawaban dikunci (A1-T2). */
  ms_kartu_terlihat: number | null;
  /** Berapa kali pemain menggulir balik ke kartu sebelum mengunci. */
  gulir_balik: number | null;
  /** Ketukan tombol "Kembali ke kartu" di soal ini. */
  kembali_ke_kartu: number;
  /** Panel sumber kartu yang dibuka di soal ini. */
  panel_sumber: number;
  ganti_pilihan: number;
}

export interface RingkasSesi {
  sesi: string;
  kasus_id: string;
  /**
   * Sesi tanpa peristiwa `mulai` — misalnya tab lama yang baru ditutup, atau
   * kiriman yang kepalanya hilang. Ia dilaporkan terpisah dan tidak masuk
   * penyebut mana pun, supaya tidak menyamar sebagai orang yang berhenti.
   */
  lengkap: boolean;
  lebar_layar: number | null;
  sampai_pembukaan: boolean;
  /**
   * A4-T5: pemain menekan "Langsung ke ringkasan". Seberapa sering ini dipakai
   * adalah ukuran apakah garis waktu pembukaan terlalu panjang — pertanyaan
   * yang hanya bisa dijawab kalau jalan pintasnya dicatat, bukan disembunyikan.
   */
  loncat_ke_ringkasan: boolean;
  /** Sudah sejauh mana pemain menggulir saat melompat; null kalau tidak melompat. */
  gulir_saat_loncat: number | null;
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
      ms_kartu_terlihat: null,
      gulir_balik: null,
      kembali_ke_kartu: 0,
      panel_sumber: 0,
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
      s.ms_kartu_terlihat = angka(p.isi['ms_kartu_terlihat_sebelum']);
      s.gulir_balik = angka(p.isi['gulir_balik_ke_kartu']);
    }
    if (p.nama === 'kembali_ke_kartu') {
      const id = teks(p.isi['soal_id']);
      if (id !== null) pastikan(id).kembali_ke_kartu += 1;
    }
    if (p.nama === 'kartu_buka') {
      const id = teks(p.isi['soal_id']);
      if (id !== null) pastikan(id).panel_sumber += 1;
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
  const loncat = urut.find((p) => p.nama === 'loncat_ke_ringkasan');

  return {
    sesi: pertama?.sesi ?? '(tanpa sesi)',
    kasus_id: pertama?.kasus_id ?? '(tanpa kasus)',
    lengkap: mulai !== undefined,
    lebar_layar: angka(mulai?.isi['lebar_layar']),
    sampai_pembukaan: urut.some((p) => p.nama === 'pembukaan_masuk'),
    loncat_ke_ringkasan: loncat !== undefined,
    gulir_saat_loncat: loncat === undefined ? null : angka(loncat.isi['gulir_maks_persen']),
    durasi_total_ms: terakhir?.t_ms ?? 0,
    ms_per_layar: msPerLayar(urut),
    soal_terlama: terlama?.soal_id ?? null,
    soal: daftarSoal,
    layar_terakhir: layarTerakhir,
    minat_kasus_lain: urut.some((p) => p.nama === 'minat_kasus_lain'),
    akhir: kirimAkhir === undefined ? null : kirimAkhir.isi,
  };
}

/**
 * Buang peristiwa kembar `(sesi, urut)`.
 *
 * Ini **jaring pengaman**, bukan perbaikan: penyebabnya sudah ditambal di
 * pengirim (A1-T2). Ia tetap ada karena berkas alpha yang sudah telanjur
 * terkumpul memuat kembaran, dan karena pengumpul sengaja tidak menyimpan
 * keadaan antar-permintaan.
 */
export function buangKembar(peristiwa: Peristiwa[]): Peristiwa[] {
  const terlihat = new Set<string>();
  const keluar: Peristiwa[] = [];
  for (const p of peristiwa) {
    const kunci = `${p.sesi}#${String(p.urut)}`;
    if (terlihat.has(kunci)) continue;
    terlihat.add(kunci);
    keluar.push(p);
  }
  return keluar;
}

export function kelompokkanSesi(peristiwa: Peristiwa[]): RingkasSesi[] {
  const per = new Map<string, Peristiwa[]>();
  for (const p of buangKembar(peristiwa)) {
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
export function laporan(semua: RingkasSesi[]): string {
  const baris: string[] = [];
  const sesi = semua.filter((s) => s.lengkap);
  const sebagian = semua.filter((s) => !s.lengkap);

  baris.push('# Ringkasan alpha');
  baris.push('');
  baris.push(`Sesi: **${String(sesi.length)}**`);

  if (sesi.length === 0) {
    baris.push('');
    baris.push('Tidak ada satu pun sesi lengkap di berkas yang diberikan.');
    if (sebagian.length > 0) {
      baris.push('');
      baris.push(`Sesi tak lengkap (tanpa peristiwa \`mulai\`): ${String(sebagian.length)}.`);
    }
    return baris.join('\n') + '\n';
  }

  const sampai = sesi.filter((s) => s.sampai_pembukaan).length;
  const minat = sesi.filter((s) => s.minat_kasus_lain).length;
  baris.push(`Sampai layar pembukaan: **${String(sampai)}** dari ${String(sesi.length)}`);
  baris.push(`Menekan "Mau coba kasus lain": **${String(minat)}**`);
  const loncat = sesi.filter((s) => s.loncat_ke_ringkasan);
  baris.push(
    `Menekan "Langsung ke ringkasan": **${String(loncat.length)}** dari ${String(sampai)} ` +
      `yang sampai layar pembukaan`,
  );
  baris.push('');

  baris.push('## Per sesi');
  baris.push('');
  baris.push(
    '| sesi | lebar | sampai pembukaan | loncat ke ringkasan | durasi | berhenti di | soal terlama |',
  );
  baris.push('|---|---|---|---|---|---|---|');
  for (const s of sesi) {
    const loncatSel = s.loncat_ke_ringkasan
      ? `ya (gulir ${s.gulir_saat_loncat === null ? '?' : String(s.gulir_saat_loncat)}%)`
      : ya(false);
    baris.push(
      `| ${s.sesi} | ${s.lebar_layar === null ? '—' : String(s.lebar_layar)} | ` +
        `${ya(s.sampai_pembukaan)} | ${loncatSel} | ${detik(s.durasi_total_ms)} | ` +
        `${s.layar_terakhir} | ${s.soal_terlama ?? '—'} |`,
    );
  }
  baris.push('');

  const semuaSoal = [...new Set(sesi.flatMap((s) => s.soal.map((x) => x.soal_id)))].sort();

  baris.push('## Apakah kartu dibaca sebelum menjawab');
  baris.push('');
  baris.push(
    'Ukuran utama alpha. **Detik** = lama tumpukan kartu berada di layar sebelum jawaban',
  );
  baris.push(
    'dikunci; **balik** = berapa kali pemain menggulir kembali ke kartu sesudah meninggalkannya.',
  );
  baris.push('');
  baris.push(`| sesi | ${semuaSoal.map((id) => `${id} (detik / balik)`).join(' | ')} |`);
  baris.push(`|---|${semuaSoal.map(() => '---').join('|')}|`);
  for (const s of sesi) {
    const sel = semuaSoal.map((id) => {
      const soal = s.soal.find((x) => x.soal_id === id);
      if (soal === undefined || soal.ms_kartu_terlihat === null) return '—';
      return `${detik(soal.ms_kartu_terlihat)} / ${String(soal.gulir_balik ?? 0)}`;
    });
    baris.push(`| ${s.sesi} | ${sel.join(' | ')} |`);
  }
  baris.push('');

  baris.push('## Per soal');
  baris.push('');
  baris.push(
    '| soal | dijawab | benar | rata kartu terlihat | rata gulir balik | ketuk "Kembali ke kartu" | panel sumber | rata ganti pilihan | rata lama |',
  );
  baris.push('|---|---|---|---|---|---|---|---|---|');
  for (const id of semuaSoal) {
    const jawab = sesi
      .map((s) => s.soal.find((x) => x.soal_id === id))
      .filter((s): s is RingkasSoal => s !== undefined && s.benar !== null);
    const benar = jawab.filter((s) => s.benar === true).length;
    const rata = (ambil: (s: RingkasSoal) => number): string =>
      jawab.length === 0 ? '—' : (jawab.reduce((j, s) => j + ambil(s), 0) / jawab.length).toFixed(1);
    const rataDetik = (ambil: (s: RingkasSoal) => number): string =>
      jawab.length === 0
        ? '—'
        : detik(jawab.reduce((j, s) => j + ambil(s), 0) / jawab.length);
    const jumlah = (ambil: (s: RingkasSoal) => number): string =>
      String(
        sesi
          .flatMap((s) => s.soal.filter((x) => x.soal_id === id))
          .reduce((j, s) => j + ambil(s), 0),
      );
    baris.push(
      `| ${id} | ${String(jawab.length)} | ${String(benar)} | ` +
        `${rataDetik((s) => s.ms_kartu_terlihat ?? 0)} | ${rata((s) => s.gulir_balik ?? 0)} | ` +
        `${jumlah((s) => s.kembali_ke_kartu)} | ${jumlah((s) => s.panel_sumber)} | ` +
        `${rata((s) => s.ganti_pilihan)} | ${rataDetik((s) => s.ms_di_soal ?? 0)} |`,
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

  if (sebagian.length > 0) {
    baris.push('');
    baris.push('## Sesi tak lengkap');
    baris.push('');
    baris.push(
      'Tanpa peristiwa `mulai` — biasanya tab lama yang baru ditutup. **Tidak** dihitung di',
    );
    baris.push('penyebut mana pun di atas.');
    baris.push('');
    baris.push('| sesi | peristiwa terakhir | layar terakhir |');
    baris.push('|---|---|---|');
    for (const s of sebagian) {
      baris.push(`| ${s.sesi} | ${String(s.soal.length)} soal tersentuh | ${s.layar_terakhir} |`);
    }
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
