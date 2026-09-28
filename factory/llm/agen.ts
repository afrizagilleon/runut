/**
 * Lingkar agen penyusun simulasi (M2d-2 D-3). Seluruh orkestrasinya di sini,
 * terbaca, tanpa kerangka agent:
 *
 *   paket fakta (M2d-1, lolos mesin verifikasi V2)
 *     → susun (model menulis tiap omongan)
 *     → validator deterministik (jejak angka, tanggal ≤ T, bentuk 2×2, …)
 *     → gerbang jawab-dengan-kartu (pembaca kartu harus benar)
 *     → gerbang tebak buta (tiga penebak TANPA kartu tidak boleh benar)
 *     → yang lolos ketiganya DIKUNCI; yang ditolak mendapat umpan balik
 *       terstruktur (gerbang mana, omongan mana, alasan) → tulis ulang HANYA
 *       omongan yang ditolak
 *   paling banyak 5 putaran per simulasi.
 *
 * **Satu panggilan penyusun per omongan.** Satu putaran = penyusun menulis
 * setiap omongan yang belum terkunci (berurutan, satu panggilan untuk satu
 * omongan, melihat versi terbaru omongan lain) + validator atas draf gabungan +
 * gerbang. Terukur 28 Sep (`eval/keluaran-m2d2/dibuang/`): diminta menulis
 * ketiga omongan sekaligus di bawah aturan 12, DeepSeek menalar ±110 ribu
 * karakter — mensimulasikan penebak untuk tiap omongan — dan menghabiskan
 * seluruh batas penyedia (32.768 token) tanpa satu karakter JSON, tiga kali
 * berturut-turut. Satu omongan per panggilan memecah beban itu; batas 5
 * putaran tetap berarti paling banyak 15 panggilan penyusun per simulasi.
 *
 * Yang dijaga kode, bukan model:
 *
 * - **Kunci omongan**: omongan yang lolos disimpan kode dan tidak pernah
 *   diminta lagi; kalau model tetap mengirim objek bernomor lain, objek itu
 *   dibuang dan dicatat (`diabaikan`).
 * - **Masalah seluruh draf** (nama kembar, tidak ada yang Betul, kunci
 *   seragam) dibebankan ke omongan yang belum terkunci — hanya merekalah yang
 *   bisa memperbaikinya — dan gerbang tidak dijalankan pada putaran itu.
 * - **Pagu**: `PaguTercapai` dari pencatat biaya menghentikan lingkar seketika;
 *   tidak ada panggilan sesudahnya.
 * - **Penebak tidak berbagi riwayat dengan penyusun**: gerbang membangun
 *   percakapan baru sendiri dari medan omongan (lihat `gerbang-tebak.ts`).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { teksPolos } from '../skema/rujukan.ts';
import type { PesanChat } from './klien.ts';
import type { DrafSimulasi, MasalahDraf, OmonganDraf } from './draf.ts';
import { gerbangKartu, type PutusanKartu } from './gerbang-kartu.ts';
import { gerbangTebak, type InfoPanggil, type PanggilLlm, type PutusanTebak } from './gerbang-tebak.ts';
import { MODEL_AGEN } from './model.ts';
import { hashPesan, type PencatatJejak } from './jejak.ts';
import { PaguTercapai } from './pagu.ts';
import type { PaketFakta } from './paket.ts';
import { SUHU, pesanPaket, promptSistem, uraiKeluaran } from './susun.ts';

export const MAKS_PUTARAN = 5;
export const JUMLAH_OMONGAN = 3;
/**
 * Setelan penyusun — hasil lima jalan TIRT yang dibuang (28 Sep,
 * `eval/keluaran-m2d2/dibuang/`, semuanya tercatat di ledger):
 *
 * - Suhu M2d-1 (0,3), supaya beda hasil tebak buta dengan M2d-1 bisa
 *   dikaitkan ke lingkar dan prompt, bukan ke suhu.
 * - `max_tokens` 32.768 = batas penyedia (64.000 ditolak HTTP 400, tanpa biaya).
 * - **Mode berpikir tetap menyala.** Jalan 5 mematikannya
 *   (`chat_template_kwargs.thinking = false`, `klien.ts` `tambahanBadan`):
 *   cepat (±10 detik per omongan) tetapi dua kegagalan terukur — kunci yang
 *   salah menurut kartunya sendiri (tertangkap gerbang kartu, lima putaran
 *   berturut-turut untuk omongan yang sama) dan versi yang ditolak dikirim
 *   ulang hampir kata per kata. Nol omongan terkunci dalam 5 putaran.
 * - Yang membuat penalaran tidak berujung di jalan 1–4 adalah aturan 12 versi
 *   panjang (lima "cara" + contoh) yang mengundang model mensimulasikan
 *   penebak untuk setiap susunan pilihan; ia diringkas menjadi tiga pegangan,
 *   dan prompt kini menyerahkan pemeriksaan ke lingkar ("CARA BEKERJA").
 *   Penalaran yang tetap terpotong menjadi penolakan biasa dengan umpan balik.
 */
export const SETELAN_PENYUSUN = { suhu: SUHU, maxTokens: 32_768 } as const;

/**
 * Cadangan untuk SATU omongan bila panggilan berpikir tidak menghasilkan
 * omongan terbaca (terpotong 32.768 token, galat penyedia, JSON rusak) —
 * terukur di jalan TIRT 6–7: 8 dari 16 panggilan penyusun berpikir berakhir
 * begitu (6 terpotong, 2 HTTP 200 tanpa choices), dan tiap kali omongan itu
 * kehilangan satu putaran penuh.
 * Tanpa berpikir, model cepat tetapi lebih sering salah kunci (jalan 5); di
 * sini itu tidak berbahaya karena hasilnya tetap melewati validator dan kedua
 * gerbang. Paling banyak 2 panggilan penyusun per omongan per putaran.
 */
export const SETELAN_CADANGAN = {
  suhu: SUHU,
  maxTokens: 8_000,
  tambahanBadan: { chat_template_kwargs: { thinking: false } },
} as const;

const JALUR_TAMBAHAN = fileURLToPath(new URL('./prompt-agen.md', import.meta.url));

/** Prompt sistem penyusun = aturan M2d-1 (`prompt-susun.md`) + tambahan lingkar (`prompt-agen.md`). */
export function promptAgen(): string {
  return `${promptSistem()}\n\n${readFileSync(JALUR_TAMBAHAN, 'utf8').replace(/\r\n/g, '\n').trim()}`;
}

export type StatusOmongan =
  | 'terkunci-sebelumnya'
  | 'tidak-ada'
  | 'ditolak-validator'
  | 'ditolak-kartu'
  | 'ditolak-tebak'
  | 'galat-gerbang'
  | 'lolos';

export interface PemeriksaanOmongan {
  no: number;
  status: StatusOmongan;
  /** Butir umpan balik untuk penyusun; kosong kalau lolos atau terkunci. */
  umpan: string[];
  kartu: PutusanKartu | null;
  tebak: PutusanTebak | null;
}

export interface PanggilanPenyusun {
  /** Omongan yang diminta pada panggilan ini. */
  omongan: number;
  /** Pesan pengguna yang dikirim (paket + permintaan). */
  permintaan: string;
  waktu_mulai: string;
  waktu_selesai: string;
  teks_mentah: string;
  /** Panjang penalaran terpisah (karakter); isinya tidak disimpan. */
  panjang_penalaran: number;
  finish_reason: string | null;
  token_masuk: number;
  token_keluar: number;
  biaya_usd: number;
  latensi_ms: number;
  /** Keluaran memuat omongan yang diminta dalam JSON yang terbaca. */
  terurai: boolean;
}

export interface PutaranAgen {
  putaran: number;
  jenis: 'susun' | 'tulis-ulang';
  /** Omongan yang diminta ditulis pada putaran ini. */
  diminta: number[];
  panggilan: PanggilanPenyusun[];
  /** Nomor omongan lain yang dikirim model tanpa diminta (dibuang). */
  diabaikan: number[];
  masalah: MasalahDraf[];
  omongan: PemeriksaanOmongan[];
  /** Draf gabungan yang diperiksa pada putaran ini (`null` di posisi yang belum pernah ada). */
  draf: Array<OmonganDraf | null>;
  galat: string | null;
}

export interface HasilAgen {
  paket_id: string;
  model: string;
  lolos: boolean;
  jumlah_putaran: number;
  berhenti: string | null;
  draf: DrafSimulasi | null;
  riwayat: PutaranAgen[];
}

export interface OpsiAgen {
  paket: PaketFakta;
  panggil: PanggilLlm;
  validasi: (draf: unknown, paket: PaketFakta) => MasalahDraf[];
  maksPutaran?: number;
  jam?: () => Date;
  /** Pencatat jejak (D-4): setiap langkah dicatat saat terjadi. */
  jejak?: PencatatJejak;
}

function adalahObyek(n: unknown): n is Record<string, unknown> {
  return typeof n === 'object' && n !== null && !Array.isArray(n);
}

function labelKunci(o: OmonganDraf): string {
  const teks = adalahObyek(o.pilihan) ? (o.pilihan[o.kunci] ?? '') : '';
  return teks.trimStart().startsWith('Betul,') ? 'Betul' : teks.trimStart().startsWith('Keliru,') ? 'Keliru' : '?';
}

/**
 * Ambil omongan nomor `no` dari keluaran model: objek bermedan `no` yang sama,
 * atau — kalau hanya ada satu objek tanpa `no` — objek itu. Nomor lain yang
 * dikirim model dikembalikan sebagai `lain` (dibuang pemanggil).
 */
export function ambilOmongan(nilai: unknown, no: number): { omongan: unknown; lain: number[] } {
  if (!adalahObyek(nilai) || !Array.isArray(nilai['omongan'])) return { omongan: undefined, lain: [] };
  const larik = nilai['omongan'] as unknown[];
  let omongan: unknown;
  const lain: number[] = [];
  larik.forEach((x, i) => {
    const nomor = adalahObyek(x) && typeof x['no'] === 'number' ? x['no'] : larik.length === 1 ? no : i + 1;
    if (nomor === no && omongan === undefined) {
      if (adalahObyek(x)) {
        const { no: _no, ...isi } = x;
        omongan = isi;
      } else {
        omongan = x;
      }
    } else {
      lain.push(nomor);
    }
  });
  return { omongan, lain };
}

function ringkasOmongan(no: number, o: OmonganDraf | null, terkunci: boolean): string {
  if (o === null) return `- omongan ${String(no)}: belum ada`;
  return `- omongan ${String(no)}${terkunci ? ' (TERKUNCI)' : ''}: ${JSON.stringify(adalahObyek(o) ? { no, ...o } : o)}`;
}

/**
 * Permintaan untuk SATU omongan: omongan lain sebagai konteks (untuk aturan
 * antar-omongan), versi yang ditolak + umpan baliknya bila ada, bentuk keluaran.
 */
export function pesanTulisOmongan(
  no: number,
  draf: ReadonlyArray<OmonganDraf | null>,
  terkunci: ReadonlySet<number>,
  umpan: readonly string[] | undefined,
): string {
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
        'sepenuhnya, asal tetap dari paket fakta dan mematuhi aturan 1–13.',
      '',
    );
  }
  baris.push(
    'Keluarkan JSON saja, tepat satu objek dengan medan "no":',
    `{"omongan": [{"no": ${String(no)}, "nama": "...", "jam": "...", "pesan": "...", "angka_pesan": [], "kartu": [], "kartu_penentu": [], "pilihan": {"a": "...", "b": "...", "c": "...", "d": "..."}, "kunci": "...", "penjelasan": "..."}]}`,
  );
  return baris.join('\n');
}

function kosong(n: number): Array<OmonganDraf | null> {
  return Array.from({ length: n }, () => null);
}

function teksGalat(galat: unknown): string {
  return galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat tak dikenal';
}

function jumlah<T>(larik: readonly T[], f: (x: T) => number): number {
  return larik.reduce((a, x) => a + f(x), 0);
}

export async function jalankanAgen(opsi: OpsiAgen): Promise<HasilAgen> {
  const maks = opsi.maksPutaran ?? MAKS_PUTARAN;
  const jam = opsi.jam ?? (() => new Date());
  const jejak = opsi.jejak ?? null;
  const hasil: HasilAgen = {
    paket_id: opsi.paket.paket_id,
    model: MODEL_AGEN,
    lolos: false,
    jumlah_putaran: 0,
    berhenti: null,
    draf: null,
    riwayat: [],
  };
  /** Setiap jalan keluar menutup jejak: ringkasannya dihitung dari langkah yang tercatat. */
  const akhiri = (): HasilAgen => {
    jejak?.selesai(hasil.lolos, hasil.jumlah_putaran, hasil.berhenti);
    return hasil;
  };
  let draf = kosong(JUMLAH_OMONGAN);
  const terkunci = new Set<number>();
  /** Umpan balik untuk putaran berikutnya, per omongan yang ditolak. */
  let umpan = new Map<number, string[]>();

  for (let putaran = 1; putaran <= maks; putaran++) {
    hasil.jumlah_putaran = putaran;
    const jenis: PutaranAgen['jenis'] = putaran === 1 ? 'susun' : 'tulis-ulang';
    const diminta = [1, 2, 3].filter((no) => !terkunci.has(no));
    const catatan: PutaranAgen = {
      putaran,
      jenis,
      diminta,
      panggilan: [],
      diabaikan: [],
      masalah: [],
      omongan: [],
      draf: [],
      galat: null,
    };
    hasil.riwayat.push(catatan);

    // --- 1. penyusun: satu omongan per panggilan; bila panggilan berpikir tidak
    // menghasilkan omongan terbaca (terpotong, galat penyedia, JSON rusak),
    // SATU panggilan cadangan tanpa berpikir untuk omongan yang sama.
    const gabung = [...draf] as unknown[];
    const tidakAda = new Map<number, string>();
    for (const no of diminta) {
      const permintaan = pesanTulisOmongan(no, gabung as Array<OmonganDraf | null>, terkunci, umpan.get(no));
      const pesan: PesanChat[] = [
        { role: 'system', content: promptAgen() },
        { role: 'user', content: `${pesanPaket(opsi.paket)}\n\n${permintaan}` },
      ];
      const upaya = [
        { setelan: SETELAN_PENYUSUN, berpikir: true },
        { setelan: SETELAN_CADANGAN, berpikir: false },
      ] as const;
      let gagal = '';
      for (const [ulang, u] of upaya.entries()) {
        const info: InfoPanggil = { jenis, putaran, omongan: no, ke: 1, ulang };
        const label =
          `${jenis === 'susun' ? 'menyusun' : 'menulis ulang'} omongan ${String(no)}` +
          (umpan.has(no) ? ` dengan ${String(umpan.get(no)?.length ?? 0)} butir umpan balik` : '') +
          (u.berpikir ? '' : ` — cadangan tanpa berpikir (${gagal})`);
        const mulai = jam().toISOString();
        let jawaban;
        try {
          jawaban = await opsi.panggil(pesan, { ...u.setelan }, info);
        } catch (galat) {
          catatan.galat = [catatan.galat, teksGalat(galat)].filter((x) => x !== null).join(' | ');
          const pagu = galat instanceof PaguTercapai;
          const alasan = pagu ? `pagu tercapai: ${galat.message}` : `galat penyedia: ${teksGalat(galat)}`;
          jejak?.catat({
            putaran, jenis, omongan: no, waktu_mulai: mulai, waktu_selesai: jam().toISOString(), model: MODEL_AGEN,
            panggilan: 0, token_masuk: 0, token_keluar: 0, biaya_usd: 0, putusan: 'galat', alasan: [label, alasan],
            sha256_prompt: hashPesan(pesan), rincian: { mode_berpikir: u.berpikir },
          });
          if (pagu) {
            hasil.berhenti = alasan;
            catatan.draf = gabung as Array<OmonganDraf | null>;
            return akhiri();
          }
          // Galat penyedia (mis. HTTP 200 tanpa choices, terukur di jalan TIRT 6
          // dan 7) menggagalkan panggilan ini saja; biayanya tetap masuk ledger
          // lewat chatBerpagu (perkiraan maksimum bila tanpa usage).
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
          omongan: no,
          permintaan,
          waktu_mulai: mulai,
          waktu_selesai: selesai,
          teks_mentah: jawaban.teks,
          panjang_penalaran: jawaban.penalaran?.length ?? 0,
          finish_reason: jawaban.finish_reason,
          token_masuk: jawaban.token_masuk,
          token_keluar: jawaban.token_keluar,
          biaya_usd: jawaban.biaya_usd,
          latensi_ms: jawaban.latensi_ms,
          terurai,
        });
        jejak?.catat({
          putaran,
          jenis,
          omongan: no,
          waktu_mulai: mulai,
          waktu_selesai: selesai,
          model: MODEL_AGEN,
          panggilan: 1,
          token_masuk: jawaban.token_masuk,
          token_keluar: jawaban.token_keluar,
          biaya_usd: jawaban.biaya_usd,
          putusan: 'ditulis',
          alasan: [
            label,
            ...(terurai ? [] : ['keluaran tidak memuat omongan yang terbaca']),
            ...(ambil.lain.length > 0 ? [`objek omongan lain (${ambil.lain.join(', ')}) dibuang`] : []),
          ],
          sha256_prompt: hashPesan(pesan),
          rincian: {
            terurai,
            diabaikan: ambil.lain,
            finish_reason: jawaban.finish_reason,
            panjang_penalaran: jawaban.penalaran?.length ?? 0,
            suhu: u.setelan.suhu,
            max_tokens: u.setelan.maxTokens,
            mode_berpikir: u.berpikir,
          },
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

    // --- 2. validator atas draf gabungan
    const mulaiValidasi = jam().toISOString();
    const ada = gabung.filter((x) => x !== null && x !== undefined);
    // Kalau ada omongan yang belum terbaca, keluhan "harus tepat 3 omongan"
    // (SKEMA seluruh draf) bukan salah omongan yang ada: omongan yang hilang
    // sudah mendapat umpan baliknya sendiri, dan pemeriksaan antar-omongan
    // validator memang hanya berjalan bila ketiganya ada.
    const masalah = (ada.length > 0 ? opsi.validasi({ omongan: ada }, opsi.paket) : []).filter(
      (m) => !(ada.length < JUMLAH_OMONGAN && m.omongan === null && m.kode === 'SKEMA'),
    );
    // Nomor omongan validator mengikuti posisi di larik yang diperiksa; saat
    // semua posisi terisi (yang biasa), posisi = nomor.
    const posisi = gabung.map((x, i) => (x === null || x === undefined ? null : i + 1)).filter((x): x is number => x !== null);
    const masalahNyata: MasalahDraf[] = masalah.map((m) => ({
      ...m,
      omongan: m.omongan === null ? null : (posisi[m.omongan - 1] ?? m.omongan),
    }));
    catatan.masalah = masalahNyata;
    const global = masalahNyata.filter((m) => m.omongan === null);
    jejak?.catat({
      putaran,
      jenis: 'validator',
      omongan: null,
      waktu_mulai: mulaiValidasi,
      waktu_selesai: jam().toISOString(),
      model: null,
      panggilan: 0,
      token_masuk: 0,
      token_keluar: 0,
      biaya_usd: 0,
      putusan: masalahNyata.length > 0 || tidakAda.size > 0 ? 'tolak' : 'lolos',
      alasan: [
        ...[...tidakAda.keys()].map((no) => `omongan ${String(no)}: tidak ada omongan terbaca dari penyusun`),
        ...masalahNyata.map(
          (m) => `${m.omongan === null ? 'seluruh draf' : `omongan ${String(m.omongan)}`}: [${m.kode}] ${m.pesan}`,
        ),
      ],
      sha256_prompt: null,
      rincian: { diperiksa: posisi, kode: [...new Set(masalahNyata.map((m) => m.kode))].sort() },
    });

    // --- 3. gerbang per omongan yang belum terkunci
    const umpanBaru = new Map<number, string[]>();
    for (const no of [1, 2, 3]) {
      if (terkunci.has(no)) {
        catatan.omongan.push({ no, status: 'terkunci-sebelumnya', umpan: [], kartu: null, tebak: null });
        continue;
      }
      const butir: string[] = [];
      const hilang = tidakAda.get(no);
      if (hilang !== undefined) butir.push(hilang);
      for (const m of masalahNyata.filter((x) => x.omongan === no)) butir.push(`[validator ${m.kode}] ${m.pesan}`);
      for (const m of global) butir.push(`[validator ${m.kode}, seluruh draf] ${m.pesan}`);
      const o = gabung[no - 1];
      if (butir.length > 0 || o === null || o === undefined) {
        catatan.omongan.push({
          no,
          status: o === null || o === undefined ? 'tidak-ada' : 'ditolak-validator',
          umpan: butir,
          kartu: null,
          tebak: null,
        });
        umpanBaru.set(no, butir.length > 0 ? butir : ['[bentuk] omongan ini belum ada.']);
        continue;
      }
      const omongan = o as OmonganDraf;
      const pesanTeman = teksPolos(omongan.pesan);

      // --- 3a. gerbang jawab-dengan-kartu
      let tahap: 'gerbang-kartu' | 'gerbang-tebak' = 'gerbang-kartu';
      let mulaiGerbang = jam().toISOString();
      let kartu: PutusanKartu;
      let tebak: PutusanTebak | null = null;
      try {
        kartu = await gerbangKartu(omongan, opsi.paket, { panggil: opsi.panggil, putaran, omongan: no, jam });
        jejak?.catat({
          putaran,
          jenis: 'gerbang-kartu',
          omongan: no,
          waktu_mulai: mulaiGerbang,
          waktu_selesai: jam().toISOString(),
          model: MODEL_AGEN,
          panggilan: kartu.panggilan.length,
          token_masuk: jumlah(kartu.panggilan, (p) => p.token_masuk),
          token_keluar: jumlah(kartu.panggilan, (p) => p.token_keluar),
          biaya_usd: jumlah(kartu.panggilan, (p) => p.biaya_usd),
          putusan: kartu.lolos ? 'lolos' : 'tolak',
          alasan: [kartu.lolos ? `pembaca yang memegang kartu memilih "${String(kartu.pilihan)}" = kunci` : kartu.alasan],
          sha256_prompt: null,
          rincian: {
            pesan: pesanTeman,
            kunci: kartu.kunci,
            pilihan: kartu.pilihan,
            kartu_ditunjuk: kartu.kartu_ditunjuk,
            menunjuk_penentu: kartu.menunjuk_penentu,
            alasan_penjawab: kartu.alasan_penjawab,
          },
        });

        // --- 3b. gerbang tebak buta (hanya bila pembaca kartu benar)
        if (kartu.lolos) {
          tahap = 'gerbang-tebak';
          mulaiGerbang = jam().toISOString();
          tebak = await gerbangTebak(omongan, { panggil: opsi.panggil, putaran, omongan: no, jam });
          const semua = tebak.tebakan.flatMap((t) => t.panggilan);
          jejak?.catat({
            putaran,
            jenis: 'gerbang-tebak',
            omongan: no,
            waktu_mulai: mulaiGerbang,
            waktu_selesai: jam().toISOString(),
            model: MODEL_AGEN,
            panggilan: semua.length,
            token_masuk: jumlah(semua, (p) => p.token_masuk),
            token_keluar: jumlah(semua, (p) => p.token_keluar),
            biaya_usd: jumlah(semua, (p) => p.biaya_usd),
            putusan: tebak.lolos ? 'lolos' : 'tolak',
            alasan: [
              tebak.lolos
                ? `${String(tebak.benar)}/3 penebak tanpa kartu memilih kunci "${omongan.kunci}"` +
                  (tebak.yakin_benar === null ? '' : ` (rata-rata yakin ${String(Math.round(tebak.yakin_benar))})`)
                : tebak.alasan,
            ],
            sha256_prompt: null,
            rincian: {
              pesan: pesanTeman,
              kunci: omongan.kunci,
              benar: tebak.benar,
              yakin_benar: tebak.yakin_benar,
              tebakan: tebak.tebakan.map((t) => ({
                ke: t.ke,
                pilihan: t.pilihan,
                yakin: t.yakin,
                benar: t.benar,
                terbaca: t.terbaca,
                alasan: t.alasan,
              })),
            },
          });
        }
      } catch (galat) {
        catatan.galat = [catatan.galat, teksGalat(galat)].filter((x) => x !== null).join(' | ');
        const pagu = galat instanceof PaguTercapai;
        const alasanGalat = pagu ? `pagu tercapai: ${galat.message}` : `galat penyedia saat gerbang: ${teksGalat(galat)}`;
        // Panggilan gerbang yang sudah terjadi sebelum galat ada di ledger
        // biaya; jejak mencatat bahwa gerbang ini berhenti di tengah.
        jejak?.catat({
          putaran,
          jenis: tahap,
          omongan: no,
          waktu_mulai: mulaiGerbang,
          waktu_selesai: jam().toISOString(),
          model: MODEL_AGEN,
          panggilan: 0,
          token_masuk: 0,
          token_keluar: 0,
          biaya_usd: 0,
          putusan: 'galat',
          alasan: [alasanGalat],
          sha256_prompt: null,
          rincian: { pesan: pesanTeman },
        });
        if (pagu) {
          hasil.berhenti = alasanGalat;
          catatan.draf = gabung as Array<OmonganDraf | null>;
          return akhiri();
        }
        // Galat penyedia di gerbang: omongan ini tidak bisa diputus pada putaran
        // ini; ia tidak dikunci dan diminta lagi dengan catatan galatnya.
        const butirGalat = `[galat penyedia saat gerbang] ${teksGalat(galat).slice(0, 200)}; omongan ini diperiksa lagi sesudah ditulis ulang.`;
        catatan.omongan.push({ no, status: 'galat-gerbang', umpan: [butirGalat], kartu: null, tebak: null });
        umpanBaru.set(no, [butirGalat]);
        continue;
      }
      if (!kartu.lolos) {
        catatan.omongan.push({ no, status: 'ditolak-kartu', umpan: [`[gerbang kartu] ${kartu.alasan}`], kartu, tebak: null });
        umpanBaru.set(no, [`[gerbang kartu] ${kartu.alasan}`]);
      } else if (tebak !== null && !tebak.lolos) {
        catatan.omongan.push({ no, status: 'ditolak-tebak', umpan: [`[gerbang tebak buta] ${tebak.alasan}`], kartu, tebak });
        umpanBaru.set(no, [`[gerbang tebak buta] ${tebak.alasan}`]);
      } else {
        catatan.omongan.push({ no, status: 'lolos', umpan: [], kartu, tebak });
        terkunci.add(no);
      }
    }
    draf = gabung.map((x) => (x === undefined ? null : (x as OmonganDraf | null)));
    catatan.draf = [...draf];
    umpan = umpanBaru;

    if (terkunci.size === JUMLAH_OMONGAN) {
      const akhir: DrafSimulasi = { omongan: draf as OmonganDraf[] };
      const sisa = opsi.validasi(akhir, opsi.paket);
      if (sisa.length > 0) {
        // Tidak mungkin bila setiap omongan dikunci pada putaran tanpa masalah
        // validator; dijaga supaya draf yang tidak sah tidak pernah keluar.
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
