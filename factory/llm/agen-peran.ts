/**
 * Lingkar agen BERPERAN (M2d-3). Pembagian peran dan informasinya tertulis di
 * `factory/llm/peran.md`; di sini orkestrasinya, terbaca, tanpa kerangka agent.
 *
 *   perencana (kode): paket fakta
 *     → penulis (DeepSeek): SATU omongan per panggilan
 *     → pemeriksa (kode): validator deterministik
 *     → pembaca kartu (DeepSeek): harus menjawab benar dengan kartu
 *     → penebak ×3 (DeepSeek): tidak boleh menebak benar tanpa kartu
 *     → kritikus (GLM-5.3): keberatan terstruktur + arahan
 *     → lolos HANYA bila keempat penilai tidak keberatan (`putusanAkhir`)
 *
 * Bedanya dengan M2d-2 (`agen.ts`, tidak diubah supaya jalannya bisa diulang):
 * penilai berbeda dari penulis — kritikus memakai model lain dan melihat kunci;
 * tidak ada peran yang bisa meloloskan sendirian.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { teksPolos } from '../skema/rujukan.ts';
import { SETELAN_CADANGAN, SETELAN_PENYUSUN, ambilOmongan } from './agen.ts';
import { nadaUntuk, pilihContoh, topikDariTeks, tulisContoh, type KalimatGaya, type Nada } from './bank-gaya.ts';
import type { DrafSimulasi, MasalahDraf, OmonganDraf } from './draf.ts';
import { gerbangG, type PutusanG } from './gerbang-g.ts';
import { gerbangKartu, type PutusanKartu } from './gerbang-kartu.ts';
import { PETUNJUK_PENEBAK, gerbangTebak, type InfoPanggil, type PanggilLlm, type PutusanTebak } from './gerbang-tebak.ts';
import { hashPesan, type LangkahJejak, type PencatatJejak, type PeranLangkah } from './jejak.ts';
import type { PesanChat } from './klien.ts';
import { kritik, umpanKritik, type PutusanKritik } from './kritikus.ts';
import { MODEL_PERAN, type PeranModel } from './model.ts';
import { PaguTercapai } from './pagu.ts';
import type { PaketFakta } from './paket.ts';
import { pesanPaket, promptSistem, uraiKeluaran, type JawabanModel, type SetelanPanggil } from './susun.ts';

export const MAKS_PUTARAN_PERAN = 5;

/**
 * Petunjuk penebak M2d-3 = petunjuk M2d-2 + satu kalimat eksplisit untuk
 * berhitung (D-2): di M2d-2 penebak DeepSeek tidak menghitung 106 ÷ 48,
 * sedangkan ketiga penguji luar menghitungnya.
 */
export const PETUNJUK_PENEBAK_PERAN = [
  PETUNJUK_PENEBAK.split('\n').slice(0, -1).join('\n'),
  'Sebelum menebak, coba hitung dari angka yang ada di pesan dan pilihan (selisih, kali lipat, persen); kalau hitunganmu menunjuk satu pilihan, pakai itu.',
  PETUNJUK_PENEBAK.split('\n').at(-1) ?? '',
].join('\n');
export const JUMLAH_OMONGAN = 3;

const JALUR_PENULIS = fileURLToPath(new URL('./prompt-penulis.md', import.meta.url));

/** Prompt sistem penulis = aturan M2d-1 (`prompt-susun.md`) + tambahan lingkar berperan (`prompt-penulis.md`). */
export function promptPenulis(): string {
  return `${promptSistem()}\n\n${readFileSync(JALUR_PENULIS, 'utf8').replace(/\r\n/g, '\n').trim()}`;
}

/** Keterangan satu panggilan: peran pemanggil dan model yang ditetapkan kode untuk peran itu. */
export interface InfoPeran extends InfoPanggil {
  peran: PeranModel;
  model: string;
}

export type PanggilPeran = (pesan: PesanChat[], setelan: SetelanPanggil, info: InfoPeran) => Promise<JawabanModel>;

const PERAN_JENIS: Readonly<Record<InfoPanggil['jenis'], PeranModel>> = {
  susun: 'penulis',
  'tulis-ulang': 'penulis',
  'gerbang-kartu': 'pembaca-kartu',
  'gerbang-tebak': 'penebak',
  kritikus: 'kritikus',
};

/** Tempelkan peran + model (dari `MODEL_PERAN`) ke setiap panggilan; gerbang M2d-2 tidak perlu tahu. */
function lewatPeran(panggil: PanggilPeran): PanggilLlm {
  return (pesan, setelan, info) => {
    const peran = PERAN_JENIS[info.jenis];
    return panggil(pesan, setelan, { ...info, peran, model: MODEL_PERAN[peran] });
  };
}

/**
 * Putusan satu omongan dari keempat penilai. `null` = peran itu tidak
 * dijalankan (karena penilai sebelumnya sudah keberatan) — tidak dijalankan
 * TIDAK sama dengan tidak keberatan. Tidak ada peran yang bisa meloloskan
 * sendirian: keempatnya harus `true`.
 */
export interface SuaraPenilai {
  pemeriksa: boolean;
  kartu: boolean | null;
  tebak: boolean | null;
  kritikus: boolean | null;
}

export function putusanAkhir(s: SuaraPenilai): boolean {
  return s.pemeriksa === true && s.kartu === true && s.tebak === true && s.kritikus === true;
}

export type StatusPeran =
  | 'terkunci-sebelumnya'
  | 'tidak-ada'
  | 'ditolak-pemeriksa'
  | 'ditolak-kartu'
  | 'ditolak-tebak'
  | 'ditolak-kritikus'
  | 'kritikus-tidak-menjawab'
  | 'galat-gerbang'
  | 'lolos';

export interface PemeriksaanPeran {
  no: number;
  status: StatusPeran;
  suara: SuaraPenilai;
  umpan: string[];
  kartu: PutusanKartu | null;
  tebak: PutusanTebak | null;
  kritik: PutusanKritik | null;
  /** Gerbang G (pemeriksa); `null` bila omongan tidak ada atau bentuknya rusak. */
  g?: PutusanG | null;
  /** Versi ini dibawa ke putaran berikutnya tanpa ditulis ulang (kritikus tidak menjawab). */
  dibawa: boolean;
}

export interface PanggilanPenulis {
  omongan: number;
  permintaan: string;
  waktu_mulai: string;
  waktu_selesai: string;
  teks_mentah: string;
  panjang_penalaran: number;
  finish_reason: string | null;
  token_masuk: number;
  token_keluar: number;
  biaya_usd: number;
  latensi_ms: number;
  terurai: boolean;
  mode_berpikir: boolean;
}

export interface PutaranPeran {
  putaran: number;
  /** Omongan yang ditulis penulis pada putaran ini. */
  ditulis: number[];
  /** Omongan yang dibawa dari putaran sebelumnya tanpa ditulis ulang. */
  dibawa: number[];
  panggilan: PanggilanPenulis[];
  diabaikan: number[];
  masalah: MasalahDraf[];
  omongan: PemeriksaanPeran[];
  draf: Array<OmonganDraf | null>;
  galat: string | null;
}

export interface HasilPeran {
  paket_id: string;
  model_peran: Readonly<Record<PeranModel, string>>;
  lolos: boolean;
  jumlah_putaran: number;
  berhenti: string | null;
  draf: DrafSimulasi | null;
  riwayat: PutaranPeran[];
}

export interface OpsiPeran {
  paket: PaketFakta;
  panggil: PanggilPeran;
  validasi: (draf: unknown, paket: PaketFakta) => MasalahDraf[];
  maksPutaran?: number;
  jam?: () => Date;
  jejak?: PencatatJejak;
}

function adalahObyek(n: unknown): n is Record<string, unknown> {
  return typeof n === 'object' && n !== null && !Array.isArray(n);
}

function labelKunci(o: OmonganDraf): string {
  const teks = adalahObyek(o.pilihan) ? (o.pilihan[o.kunci] ?? '') : '';
  return teks.trimStart().startsWith('Betul,') ? 'Betul' : teks.trimStart().startsWith('Keliru,') ? 'Keliru' : '?';
}

function ringkasOmongan(no: number, o: OmonganDraf | null, terkunci: boolean): string {
  if (o === null) return `- omongan ${String(no)}: belum ada`;
  return `- omongan ${String(no)}${terkunci ? ' (TERKUNCI)' : ''}: ${JSON.stringify(adalahObyek(o) ? { no, ...o } : o)}`;
}

export interface PermintaanPenulis {
  no: number;
  draf: ReadonlyArray<OmonganDraf | null>;
  terkunci: ReadonlySet<number>;
  umpan: readonly string[] | undefined;
  /** Nada yang diminta perencana + contoh bank gaya (D-3). */
  gaya?: { nada: Nada; contoh: readonly KalimatGaya[] };
}

/** Pesan pengguna untuk penulis: omongan lain sebagai konteks, versi ditolak + umpan balik, bentuk keluaran. */
export function pesanPenulis(p: PermintaanPenulis): string {
  const { no, draf, terkunci, umpan } = p;
  const lain = [1, 2, 3].filter((x) => x !== no);
  const baris: string[] = [
    `TUGAS PANGGILAN INI: tulis HANYA omongan nomor ${String(no)} dari tiga omongan simulasi ini — satu omongan, bukan tiga.`,
    '',
    'Omongan lain di simulasi ini (jangan ditulis ulang; pakai untuk aturan antar-omongan):',
    ...lain.map((x) => ringkasOmongan(x, draf[x - 1] ?? null, terkunci.has(x))),
    '',
  ];
  const ada = lain.map((x) => draf[x - 1]).filter((x): x is OmonganDraf => adalahObyek(x) && typeof x.nama === 'string');
  const syarat: string[] = [];
  if (ada.length > 0) syarat.push(`nama pengirim berbeda dari ${ada.map((o) => `"${o.nama}"`).join(' dan ')}`);
  if (ada.length === 2 && !ada.some((o) => labelKunci(o) === 'Betul')) {
    syarat.push('omongan ini HARUS ternyata BETUL (kuncinya pilihan "Betul,"), karena kedua omongan lain Keliru');
  } else if (!ada.some((o) => labelKunci(o) === 'Betul')) {
    syarat.push('minimal satu dari tiga omongan harus ternyata BETUL');
  }
  if (ada.length === 2 && ada[0]?.kunci === ada[1]?.kunci) {
    syarat.push(`huruf kunci omongan ini tidak boleh "${String(ada[0]?.kunci)}" (kedua omongan lain sudah "${String(ada[0]?.kunci)}")`);
  }
  if (syarat.length > 0) baris.push(`Aturan antar-omongan untuk omongan ${String(no)}: ${syarat.join('; ')}.`, '');
  if (p.gaya !== undefined) baris.push(tulisContoh(p.gaya.nada, p.gaya.contoh), '');
  const sebelumnya = draf[no - 1];
  if (umpan !== undefined && umpan.length > 0) {
    baris.push(
      sebelumnya === null || sebelumnya === undefined
        ? `Percobaan sebelumnya untuk omongan ${String(no)} DITOLAK:`
        : `Versi sebelumnya omongan ${String(no)} DITOLAK: ${JSON.stringify(sebelumnya)}`,
      ...umpan.map((u) => `- ${u}`),
      '',
      'Versi baru harus berbeda NYATA dari versi yang ditolak — mengirim ulang versi yang sama akan ditolak lagi ' +
        'dengan alasan yang sama. Kalau ditolak penebak tanpa kartu, ubah klaim teman atau label kuncinya ' +
        '(Betul↔Keliru), bukan hanya kata-katanya. Boleh mengganti pesan, kartu, pilihan, dan penjelasannya ' +
        'sepenuhnya, asal tetap dari paket fakta dan mematuhi semua aturan.',
      '',
    );
  }
  baris.push(
    'Keluarkan JSON saja, tepat satu objek dengan medan "no":',
    `{"omongan": [{"no": ${String(no)}, "nama": "...", "jam": "...", "pesan": "...", "angka_pesan": [], "kartu": [], "kartu_penentu": [], "pilihan": {"a": "...", "b": "...", "c": "...", "d": "..."}, "kunci": "...", "penjelasan": "..."}]}`,
  );
  return baris.join('\n');
}

function teksGalat(galat: unknown): string {
  return galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat tak dikenal';
}

function jumlah<T>(larik: readonly T[], f: (x: T) => number): number {
  return larik.reduce((a, x) => a + f(x), 0);
}

type CatatLangkah = Omit<LangkahJejak, 'no' | 'peran'> & { peran: PeranLangkah };

export async function jalankanPeran(opsi: OpsiPeran): Promise<HasilPeran> {
  const maks = opsi.maksPutaran ?? MAKS_PUTARAN_PERAN;
  const jam = opsi.jam ?? (() => new Date());
  const jejak = opsi.jejak ?? null;
  const catat = (l: CatatLangkah): void => {
    jejak?.catat(l);
  };
  const panggilGerbang = lewatPeran(opsi.panggil);
  const hasil: HasilPeran = {
    paket_id: opsi.paket.paket_id,
    model_peran: MODEL_PERAN,
    lolos: false,
    jumlah_putaran: 0,
    berhenti: null,
    draf: null,
    riwayat: [],
  };
  const akhiri = (): HasilPeran => {
    jejak?.selesai(hasil.lolos, hasil.jumlah_putaran, hasil.berhenti);
    return hasil;
  };
  let draf: Array<OmonganDraf | null> = Array.from({ length: JUMLAH_OMONGAN }, () => null);
  const terkunci = new Set<number>();
  let umpan = new Map<number, string[]>();
  /** Omongan yang versinya dibawa tanpa ditulis ulang (kritikus tidak menjawab). */
  let bawa = new Set<number>();

  for (let putaran = 1; putaran <= maks; putaran++) {
    hasil.jumlah_putaran = putaran;
    const aktif = [1, 2, 3].filter((no) => !terkunci.has(no));
    const ditulis = aktif.filter((no) => !bawa.has(no));
    const catatan: PutaranPeran = {
      putaran,
      ditulis,
      dibawa: aktif.filter((no) => bawa.has(no)),
      panggilan: [],
      diabaikan: [],
      masalah: [],
      omongan: [],
      draf: [],
      galat: null,
    };
    hasil.riwayat.push(catatan);
    const jenisTulis = putaran === 1 ? 'susun' : 'tulis-ulang';

    // --- 1. PENULIS: satu omongan per panggilan; cadangan tanpa berpikir bila
    // panggilan berpikir tidak menghasilkan omongan terbaca (M2d-2).
    const gabung = [...draf] as unknown[];
    const tidakAda = new Map<number, string>();
    for (const no of ditulis) {
      const nada = nadaUntuk(no);
      const contoh = pilihContoh({ topik: topikDariTeks(opsi.paket.peristiwa), nada, paket_id: opsi.paket.paket_id });
      const permintaan = pesanPenulis({
        no, draf: gabung as Array<OmonganDraf | null>, terkunci, umpan: umpan.get(no), gaya: { nada, contoh },
      });
      const pesan: PesanChat[] = [
        { role: 'system', content: promptPenulis() },
        { role: 'user', content: `${pesanPaket(opsi.paket)}\n\n${permintaan}` },
      ];
      const upaya = [
        { setelan: SETELAN_PENYUSUN as SetelanPanggil, berpikir: true },
        { setelan: SETELAN_CADANGAN as SetelanPanggil, berpikir: false },
      ];
      let gagal = '';
      for (const [ulang, u] of upaya.entries()) {
        const info: InfoPeran = {
          jenis: jenisTulis, putaran, omongan: no, ke: 1, ulang, peran: 'penulis', model: MODEL_PERAN.penulis,
        };
        const label =
          `${jenisTulis === 'susun' ? 'menulis' : 'menulis ulang'} omongan ${String(no)}` +
          (umpan.has(no) ? ` dengan ${String(umpan.get(no)?.length ?? 0)} butir umpan balik` : '') +
          (u.berpikir ? '' : ` — cadangan tanpa berpikir (${gagal})`);
        const mulai = jam().toISOString();
        let jawaban: JawabanModel;
        try {
          jawaban = await opsi.panggil(pesan, { ...u.setelan }, info);
        } catch (galat) {
          catatan.galat = [catatan.galat, teksGalat(galat)].filter((x) => x !== null).join(' | ');
          const pagu = galat instanceof PaguTercapai;
          const alasan = pagu ? `pagu tercapai: ${galat.message}` : `galat penyedia: ${teksGalat(galat)}`;
          catat({
            putaran, jenis: jenisTulis, omongan: no, waktu_mulai: mulai, waktu_selesai: jam().toISOString(),
            model: MODEL_PERAN.penulis, panggilan: 0, token_masuk: 0, token_keluar: 0, biaya_usd: 0, putusan: 'galat',
            alasan: [label, alasan], sha256_prompt: hashPesan(pesan), rincian: { mode_berpikir: u.berpikir }, peran: 'penulis',
          });
          if (pagu) {
            hasil.berhenti = alasan;
            catatan.draf = gabung as Array<OmonganDraf | null>;
            return akhiri();
          }
          gagal = 'galat penyedia';
          tidakAda.set(no, `[galat penyedia] panggilan untuk omongan ini gagal (${teksGalat(galat).slice(0, 200)}); tulis omongan ini lagi.`);
          continue;
        }
        const selesai = jam().toISOString();
        const urai = uraiKeluaran(jawaban.teks);
        const ambil = urai.ok ? ambilOmongan(urai.nilai, no) : { omongan: undefined, lain: [] };
        const terurai = ambil.omongan !== undefined;
        catatan.diabaikan.push(...ambil.lain);
        catatan.panggilan.push({
          omongan: no, permintaan, waktu_mulai: mulai, waktu_selesai: selesai, teks_mentah: jawaban.teks,
          panjang_penalaran: jawaban.penalaran?.length ?? 0, finish_reason: jawaban.finish_reason,
          token_masuk: jawaban.token_masuk, token_keluar: jawaban.token_keluar, biaya_usd: jawaban.biaya_usd,
          latensi_ms: jawaban.latensi_ms, terurai, mode_berpikir: u.berpikir,
        });
        catat({
          putaran, jenis: jenisTulis, omongan: no, waktu_mulai: mulai, waktu_selesai: selesai, model: MODEL_PERAN.penulis,
          panggilan: 1, token_masuk: jawaban.token_masuk, token_keluar: jawaban.token_keluar, biaya_usd: jawaban.biaya_usd,
          putusan: 'ditulis',
          alasan: [
            label,
            ...(terurai ? [] : ['keluaran tidak memuat omongan yang terbaca']),
            ...(ambil.lain.length > 0 ? [`objek omongan lain (${ambil.lain.join(', ')}) dibuang`] : []),
          ],
          sha256_prompt: hashPesan(pesan),
          rincian: {
            terurai, diabaikan: ambil.lain, finish_reason: jawaban.finish_reason,
            panjang_penalaran: jawaban.penalaran?.length ?? 0, suhu: u.setelan.suhu, max_tokens: u.setelan.maxTokens,
            mode_berpikir: u.berpikir, nada, contoh_gaya: contoh.map((c) => c.id),
          },
          peran: 'penulis',
        });
        if (terurai) {
          gabung[no - 1] = ambil.omongan;
          tidakAda.delete(no);
          break;
        }
        gagal = jawaban.finish_reason === 'length' ? 'panggilan berpikir terpotong batas token' : 'keluaran tidak terbaca';
        tidakAda.set(
          no,
          urai.ok
            ? `[bentuk] keluaranmu tidak memuat omongan ${String(no)}; kirim tepat satu objek dengan "no": ${String(no)}.`
            : `[bentuk] keluaran bukan JSON yang sah: ${urai.alasan}` +
                (jawaban.finish_reason === 'length' ? ' (terpotong batas token: rencanakan lebih singkat)' : ''),
        );
      }
    }

    // --- 2. PEMERIKSA (kode): validator atas draf gabungan.
    const mulaiValidasi = jam().toISOString();
    const ada = gabung.filter((x) => x !== null && x !== undefined);
    const masalah = (ada.length > 0 ? opsi.validasi({ omongan: ada }, opsi.paket) : []).filter(
      (m) => !(ada.length < JUMLAH_OMONGAN && m.omongan === null && m.kode === 'SKEMA'),
    );
    const posisi = gabung.map((x, i) => (x === null || x === undefined ? null : i + 1)).filter((x): x is number => x !== null);
    const masalahNyata: MasalahDraf[] = masalah.map((m) => ({
      ...m,
      omongan: m.omongan === null ? null : (posisi[m.omongan - 1] ?? m.omongan),
    }));
    catatan.masalah = masalahNyata;
    const global = masalahNyata.filter((m) => m.omongan === null);
    catat({
      putaran, jenis: 'validator', omongan: null, waktu_mulai: mulaiValidasi, waktu_selesai: jam().toISOString(),
      model: null, panggilan: 0, token_masuk: 0, token_keluar: 0, biaya_usd: 0,
      putusan: masalahNyata.length > 0 || tidakAda.size > 0 ? 'tolak' : 'lolos',
      alasan: [
        ...[...tidakAda.keys()].map((no) => `omongan ${String(no)}: tidak ada omongan terbaca dari penulis`),
        ...masalahNyata.map((m) => `${m.omongan === null ? 'seluruh draf' : `omongan ${String(m.omongan)}`}: [${m.kode}] ${m.pesan}`),
      ],
      sha256_prompt: null,
      rincian: { diperiksa: posisi, kode: [...new Set(masalahNyata.map((m) => m.kode))].sort() },
      peran: 'pemeriksa',
    });

    // --- 3. per omongan yang belum terkunci: pemeriksa → pembaca kartu → penebak → kritikus.
    const umpanBaru = new Map<number, string[]>();
    const bawaBaru = new Set<number>();
    for (const no of [1, 2, 3]) {
      const tolak = (p: Omit<PemeriksaanPeran, 'no' | 'dibawa'> & { dibawa?: boolean }): void => {
        catatan.omongan.push({ no, dibawa: false, ...p });
        umpanBaru.set(no, p.umpan.length > 0 ? p.umpan : ['[bentuk] omongan ini belum ada.']);
        if (p.dibawa === true) bawaBaru.add(no);
      };
      if (terkunci.has(no)) {
        catatan.omongan.push({
          no, status: 'terkunci-sebelumnya', suara: { pemeriksa: true, kartu: true, tebak: true, kritikus: true },
          umpan: [], kartu: null, tebak: null, kritik: null, dibawa: false,
        });
        continue;
      }
      const suara: SuaraPenilai = { pemeriksa: false, kartu: null, tebak: null, kritikus: null };
      const butir: string[] = [];
      const hilang = tidakAda.get(no);
      if (hilang !== undefined) butir.push(hilang);
      for (const m of masalahNyata.filter((x) => x.omongan === no)) butir.push(`[pemeriksa: ${m.kode}] ${m.pesan}`);
      for (const m of global) butir.push(`[pemeriksa: ${m.kode}, seluruh draf] ${m.pesan}`);
      const o = gabung[no - 1];
      // Gerbang G (pemeriksa, kode): dijalankan pada setiap omongan yang
      // bentuknya terbaca, juga bila validator menolak — umpan baliknya
      // digabung supaya penulis melihat semua keberatan pemeriksa sekaligus.
      let g: PutusanG | null = null;
      const bentukRusak = masalahNyata.some((m) => m.omongan === no && m.kode === 'SKEMA');
      if (o !== null && o !== undefined && !bentukRusak) {
        const mulaiG = jam().toISOString();
        g = gerbangG(o as OmonganDraf);
        butir.push(...g.umpan);
        catat({
          putaran, jenis: 'gerbang-g', omongan: no, waktu_mulai: mulaiG, waktu_selesai: jam().toISOString(), model: null,
          panggilan: 0, token_masuk: 0, token_keluar: 0, biaya_usd: 0, putusan: g.tolak ? 'tolak' : 'lolos',
          alasan: g.tolak ? g.umpan : ['G-angka-cukup dan G-kaku tidak keberatan'],
          sha256_prompt: null,
          rincian: {
            pesan: teksPolos((o as OmonganDraf).pesan),
            angka_cukup: { tolak: g.angka_cukup.tolak, bukti: g.angka_cukup.bukti },
            kaku: { tolak: g.kaku.tolak, penanda: g.kaku.penanda, panjang: g.kaku.panjang, kalimat_panjang: g.kaku.kalimat_panjang },
          },
          peran: 'pemeriksa',
        });
      }
      if (butir.length > 0 || o === null || o === undefined) {
        tolak({
          status: o === null || o === undefined ? 'tidak-ada' : 'ditolak-pemeriksa',
          suara, umpan: butir, kartu: null, tebak: null, kritik: null, g,
        });
        continue;
      }
      suara.pemeriksa = true;
      const omongan = o as OmonganDraf;
      const pesanTeman = teksPolos(omongan.pesan);
      const opsiGerbang = { panggil: panggilGerbang, putaran, omongan: no, jam };
      let tahap: 'gerbang-kartu' | 'gerbang-tebak' | 'kritikus' = 'gerbang-kartu';
      let mulaiGerbang = jam().toISOString();
      let kartu: PutusanKartu | null = null;
      let tebak: PutusanTebak | null = null;
      let kr: PutusanKritik | null = null;
      try {
        // --- 3a. PEMBACA KARTU
        kartu = await gerbangKartu(omongan, opsi.paket, opsiGerbang);
        suara.kartu = kartu.lolos;
        catat({
          putaran, jenis: 'gerbang-kartu', omongan: no, waktu_mulai: mulaiGerbang, waktu_selesai: jam().toISOString(),
          model: MODEL_PERAN['pembaca-kartu'], panggilan: kartu.panggilan.length,
          token_masuk: jumlah(kartu.panggilan, (p) => p.token_masuk), token_keluar: jumlah(kartu.panggilan, (p) => p.token_keluar),
          biaya_usd: jumlah(kartu.panggilan, (p) => p.biaya_usd), putusan: kartu.lolos ? 'lolos' : 'tolak',
          alasan: [kartu.lolos ? `pembaca yang memegang kartu memilih "${String(kartu.pilihan)}" = kunci` : kartu.alasan],
          sha256_prompt: null,
          rincian: {
            pesan: pesanTeman, kunci: kartu.kunci, pilihan: kartu.pilihan, kartu_ditunjuk: kartu.kartu_ditunjuk,
            menunjuk_penentu: kartu.menunjuk_penentu, alasan_penjawab: kartu.alasan_penjawab,
          },
          peran: 'pembaca-kartu',
        });
        // --- 3b. PENEBAK ×3 (hanya bila pembaca kartu tidak keberatan)
        if (kartu.lolos) {
          tahap = 'gerbang-tebak';
          mulaiGerbang = jam().toISOString();
          tebak = await gerbangTebak(omongan, { ...opsiGerbang, petunjuk: PETUNJUK_PENEBAK_PERAN });
          suara.tebak = tebak.lolos;
          const semua = tebak.tebakan.flatMap((t) => t.panggilan);
          catat({
            putaran, jenis: 'gerbang-tebak', omongan: no, waktu_mulai: mulaiGerbang, waktu_selesai: jam().toISOString(),
            model: MODEL_PERAN.penebak, panggilan: semua.length,
            token_masuk: jumlah(semua, (p) => p.token_masuk), token_keluar: jumlah(semua, (p) => p.token_keluar),
            biaya_usd: jumlah(semua, (p) => p.biaya_usd), putusan: tebak.lolos ? 'lolos' : 'tolak',
            alasan: [
              tebak.lolos
                ? `${String(tebak.benar)}/3 penebak tanpa kartu memilih kunci "${omongan.kunci}"` +
                  (tebak.yakin_benar === null ? '' : ` (rata-rata yakin ${String(Math.round(tebak.yakin_benar))})`)
                : tebak.alasan,
            ],
            sha256_prompt: null,
            rincian: {
              pesan: pesanTeman, kunci: omongan.kunci, benar: tebak.benar, yakin_benar: tebak.yakin_benar,
              tebakan: tebak.tebakan.map((t) => ({ ke: t.ke, pilihan: t.pilihan, yakin: t.yakin, benar: t.benar, terbaca: t.terbaca, alasan: t.alasan })),
            },
            peran: 'penebak',
          });
        }
        // --- 3c. KRITIKUS (hanya bila ketiga penilai sebelumnya tidak keberatan)
        if (kartu.lolos && tebak?.lolos === true) {
          tahap = 'kritikus';
          mulaiGerbang = jam().toISOString();
          kr = await kritik(
            omongan,
            opsi.paket,
            {
              no,
              kartu: {
                pilihan: kartu.pilihan,
                kartu_ditunjuk_no: kartu.kartu_ditunjuk.map((id) => omongan.kartu.indexOf(id) + 1).filter((x) => x > 0),
                alasan: kartu.alasan_penjawab,
              },
              tebakan: tebak.tebakan.map((t) => ({ pilihan: t.pilihan, yakin: t.yakin })),
            },
            opsiGerbang,
          );
          suara.kritikus = kr.tanpa_keberatan;
          catat({
            putaran, jenis: 'kritikus', omongan: no, waktu_mulai: mulaiGerbang, waktu_selesai: jam().toISOString(),
            model: MODEL_PERAN.kritikus, panggilan: kr.panggilan.length,
            token_masuk: jumlah(kr.panggilan, (p) => p.token_masuk), token_keluar: jumlah(kr.panggilan, (p) => p.token_keluar),
            biaya_usd: jumlah(kr.panggilan, (p) => p.biaya_usd),
            putusan: kr.tanpa_keberatan ? 'lolos' : 'tolak',
            alasan: kr.tanpa_keberatan ? ['kritikus tidak keberatan'] : umpanKritik(kr),
            sha256_prompt: null,
            rincian: {
              pesan: pesanTeman, menjawab: kr.menjawab, terpotong: kr.terpotong, keberatan: kr.keberatan, arahan: kr.arahan,
              diabaikan: kr.diabaikan, galat: kr.galat,
              finish_reason: kr.panggilan.map((p) => p.finish_reason),
            },
            peran: 'kritikus',
          });
        }
      } catch (galat) {
        catatan.galat = [catatan.galat, teksGalat(galat)].filter((x) => x !== null).join(' | ');
        const pagu = galat instanceof PaguTercapai;
        const alasanGalat = pagu ? `pagu tercapai: ${galat.message}` : `galat penyedia saat ${tahap}: ${teksGalat(galat)}`;
        catat({
          putaran, jenis: tahap, omongan: no, waktu_mulai: mulaiGerbang, waktu_selesai: jam().toISOString(),
          model: MODEL_PERAN[PERAN_JENIS[tahap]], panggilan: 0, token_masuk: 0, token_keluar: 0, biaya_usd: 0,
          putusan: 'galat', alasan: [alasanGalat], sha256_prompt: null, rincian: { pesan: pesanTeman },
          peran: PERAN_JENIS[tahap],
        });
        if (pagu) {
          hasil.berhenti = alasanGalat;
          catatan.draf = gabung as Array<OmonganDraf | null>;
          return akhiri();
        }
        const butirGalat = `[galat penyedia saat ${tahap}] ${teksGalat(galat).slice(0, 200)}; omongan ini diperiksa lagi sesudah ditulis ulang.`;
        tolak({ status: 'galat-gerbang', suara, umpan: [butirGalat], kartu, tebak, kritik: kr, g });
        continue;
      }

      if (putusanAkhir(suara)) {
        catatan.omongan.push({ no, status: 'lolos', suara, umpan: [], kartu, tebak, kritik: kr, g, dibawa: false });
        terkunci.add(no);
      } else if (kartu !== null && !kartu.lolos) {
        tolak({ status: 'ditolak-kartu', suara, umpan: [`[pembaca kartu] ${kartu.alasan}`], kartu, tebak, kritik: kr, g });
      } else if (tebak !== null && !tebak.lolos) {
        tolak({ status: 'ditolak-tebak', suara, umpan: [`[penebak tanpa kartu] ${tebak.alasan}`], kartu, tebak, kritik: kr, g });
      } else if (kr !== null && !kr.menjawab) {
        tolak({ status: 'kritikus-tidak-menjawab', suara, umpan: umpanKritik(kr), kartu, tebak, kritik: kr, g, dibawa: true });
      } else {
        tolak({ status: 'ditolak-kritikus', suara, umpan: kr === null ? ['[kritikus] tidak dijalankan.'] : umpanKritik(kr), kartu, tebak, kritik: kr, g });
      }
    }
    draf = gabung.map((x) => (x === undefined ? null : (x as OmonganDraf | null)));
    catatan.draf = [...draf];
    umpan = umpanBaru;
    bawa = bawaBaru;

    if (terkunci.size === JUMLAH_OMONGAN) {
      const akhir: DrafSimulasi = { omongan: draf as OmonganDraf[] };
      const sisa = opsi.validasi(akhir, opsi.paket);
      if (sisa.length > 0) {
        hasil.berhenti = `draf akhir ditolak validator: ${sisa.map((m) => m.kode).join(', ')}`;
        return akhiri();
      }
      hasil.lolos = true;
      hasil.draf = akhir;
      return akhiri();
    }
  }
  hasil.berhenti = `batas ${String(maks)} putaran tercapai; omongan terkunci: ${[...terkunci].sort().join(', ') || 'tidak ada'}`;
  return akhiri();
}
