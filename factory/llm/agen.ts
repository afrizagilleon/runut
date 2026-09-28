/**
 * Lingkar agen penyusun simulasi (M2d-2 D-3). Seluruh orkestrasinya di sini,
 * terbaca, tanpa kerangka agent:
 *
 *   paket fakta (M2d-1, lolos mesin verifikasi V2)
 *     → susun (model menulis tiga omongan)
 *     → validator deterministik (jejak angka, tanggal ≤ T, bentuk 2×2, …)
 *     → gerbang jawab-dengan-kartu (pembaca kartu harus benar)
 *     → gerbang tebak buta (tiga penebak TANPA kartu tidak boleh benar)
 *     → yang lolos ketiganya DIKUNCI; yang ditolak mendapat umpan balik
 *       terstruktur (gerbang mana, omongan mana, alasan) → tulis ulang HANYA
 *       omongan yang ditolak
 *   paling banyak 5 putaran per simulasi.
 *
 * Satu putaran = satu panggilan penyusun + pemeriksaan hasilnya. Penolakan
 * validator juga menghabiskan satu putaran: batasnya ada untuk melindungi
 * kredit, jadi setiap panggilan penyusun dihitung.
 *
 * Yang dijaga kode, bukan model:
 *
 * - **Kunci omongan**: omongan yang lolos disimpan kode. Kalau model
 *   mengembalikan versi baru omongan terkunci, versi itu dibuang; draf yang
 *   diperiksa selalu gabungan omongan terkunci + omongan yang ditulis ulang.
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
import type { PesanChat } from './klien.ts';
import type { DrafSimulasi, MasalahDraf, OmonganDraf } from './draf.ts';
import { gerbangKartu, type PutusanKartu } from './gerbang-kartu.ts';
import { gerbangTebak, type InfoPanggil, type PanggilLlm, type PutusanTebak } from './gerbang-tebak.ts';
import { MODEL_AGEN } from './model.ts';
import { PaguTercapai } from './pagu.ts';
import type { PaketFakta } from './paket.ts';
import { PUTARAN, SUHU, pesanPaket, promptSistem, uraiKeluaran } from './susun.ts';

export const MAKS_PUTARAN = 5;
export const JUMLAH_OMONGAN = 3;
/**
 * Setelan penyusun: suhu M2d-1 (0,3) — supaya beda hasil tebak buta dengan
 * M2d-1 bisa dikaitkan ke lingkar dan prompt, bukan ke suhu — dan batas token
 * putaran 2 M2d-1 (32.000), yang tidak pernah terpotong untuk DeepSeek.
 */
export const SETELAN_PENYUSUN = { suhu: SUHU, maxTokens: PUTARAN[2].maxTokens } as const;

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
}

export interface PutaranAgen {
  putaran: number;
  jenis: 'susun' | 'tulis-ulang';
  /** Omongan yang diminta ditulis pada putaran ini. */
  diminta: number[];
  /** Pesan pengguna terakhir yang dikirim ke penyusun (umpan balik / permintaan). */
  permintaan: string;
  panggilan: PanggilanPenyusun | null;
  /** Keluaran model bisa diurai sebagai JSON. */
  terurai: boolean;
  /** Omongan terkunci yang coba diubah model (versinya dibuang). */
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
}

function adalahObyek(n: unknown): n is Record<string, unknown> {
  return typeof n === 'object' && n !== null && !Array.isArray(n);
}

function labelKunci(o: OmonganDraf): string {
  const teks = o.pilihan[o.kunci] ?? '';
  return teks.trimStart().startsWith('Betul,') ? 'Betul' : teks.trimStart().startsWith('Keliru,') ? 'Keliru' : '?';
}

/**
 * Ambil omongan baru dari keluaran model. Putaran penuh: `omongan` berisi tiga
 * objek berurutan. Tulis ulang: objek bermedan `no`; kalau model tetap
 * mengirim tiga objek tanpa `no`, posisinya yang dipakai.
 */
export function omonganBaru(nilai: unknown, penuh: boolean): Map<number, unknown> {
  const hasil = new Map<number, unknown>();
  if (!adalahObyek(nilai) || !Array.isArray(nilai['omongan'])) return hasil;
  const larik = nilai['omongan'] as unknown[];
  const bernomor = larik.every((x) => adalahObyek(x) && typeof x['no'] === 'number');
  if (!penuh && bernomor) {
    for (const x of larik) {
      const { no, ...isi } = x as Record<string, unknown> & { no: number };
      hasil.set(no, isi);
    }
    return hasil;
  }
  larik.forEach((x, i) => {
    if (adalahObyek(x)) {
      const { no: _no, ...isi } = x;
      hasil.set(i + 1, isi);
    } else {
      hasil.set(i + 1, x);
    }
  });
  return hasil;
}

/** Permintaan tulis ulang: siapa terkunci, siapa ditolak dan kenapa, bentuk keluaran. */
export function pesanTulisUlang(
  draf: Array<OmonganDraf | null>,
  terkunci: ReadonlySet<number>,
  umpan: ReadonlyMap<number, string[]>,
): string {
  const ditolak = [...umpan.keys()].sort((a, b) => a - b);
  const baris: string[] = ['Draf di atas sudah diperiksa.'];
  if (terkunci.size > 0) {
    const daftar = [...terkunci]
      .sort((a, b) => a - b)
      .map((no) => {
        const o = draf[no - 1];
        return o === null || o === undefined ? `${String(no)}` : `${String(no)} (${o.nama}, kunci "${o.kunci}" = ${labelKunci(o)})`;
      });
    baris.push(`Omongan TERKUNCI — sudah lolos semua pemeriksaan, jangan diubah dan jangan dikirim ulang: ${daftar.join('; ')}.`);
  }
  baris.push(`Omongan yang DITOLAK: ${ditolak.join(', ')}.`, '');
  for (const no of ditolak) {
    baris.push(`Omongan ${String(no)}:`);
    for (const u of umpan.get(no) ?? []) baris.push(`- ${u}`);
    baris.push('');
  }
  baris.push(
    `Tulis ulang HANYA omongan ${ditolak.join(', ')}. Boleh mengganti pesan, kartu, pilihan, dan penjelasannya ` +
      'sepenuhnya, asal tetap dari paket fakta dan tetap mematuhi aturan 1–13 — termasuk aturan antar-omongan: ' +
      'nama berbeda dari omongan lain, minimal satu omongan di seluruh simulasi BETUL, dan huruf kunci ketiga ' +
      'omongan tidak sama semua.',
    'Keluarkan JSON saja, satu objek per omongan yang ditulis ulang, dengan medan "no" = nomornya:',
    `{"omongan": [{"no": ${String(ditolak[0] ?? 1)}, "nama": "...", "jam": "...", "pesan": "...", "angka_pesan": [], "kartu": [], "kartu_penentu": [], "pilihan": {"a": "...", "b": "...", "c": "...", "d": "..."}, "kunci": "...", "penjelasan": "..."}]}`,
  );
  return baris.join('\n');
}

function kosong(n: number): Array<OmonganDraf | null> {
  return Array.from({ length: n }, () => null);
}

export async function jalankanAgen(opsi: OpsiAgen): Promise<HasilAgen> {
  const maks = opsi.maksPutaran ?? MAKS_PUTARAN;
  const jam = opsi.jam ?? (() => new Date());
  const hasil: HasilAgen = {
    paket_id: opsi.paket.paket_id,
    model: MODEL_AGEN,
    lolos: false,
    jumlah_putaran: 0,
    berhenti: null,
    draf: null,
    riwayat: [],
  };
  let draf = kosong(JUMLAH_OMONGAN);
  const terkunci = new Set<number>();
  /** Umpan balik untuk putaran berikutnya, per omongan yang ditolak. */
  let umpan = new Map<number, string[]>();
  let teksTerakhir = '';

  for (let putaran = 1; putaran <= maks; putaran++) {
    hasil.jumlah_putaran = putaran;
    const adaDraf = draf.some((o) => o !== null);
    const jenis: PutaranAgen['jenis'] = adaDraf ? 'tulis-ulang' : 'susun';
    const diminta = [1, 2, 3].filter((no) => !terkunci.has(no));
    const pesan: PesanChat[] = [
      { role: 'system', content: promptAgen() },
      { role: 'user', content: pesanPaket(opsi.paket) },
    ];
    let permintaan = '';
    if (adaDraf) {
      pesan.push({ role: 'assistant', content: JSON.stringify({ omongan: draf }, null, 2) });
      permintaan = pesanTulisUlang(draf, terkunci, umpan);
      pesan.push({ role: 'user', content: permintaan });
    } else if (putaran > 1) {
      // Putaran sebelumnya tidak menghasilkan satu omongan pun yang terbaca.
      pesan.push({ role: 'assistant', content: teksTerakhir.slice(-4000) });
      permintaan = [
        'Keluaranmu tidak bisa dipakai:',
        ...(umpan.get(1) ?? []).map((u) => `- ${u}`),
        '',
        'Tulis ulang SELURUH JSON (tiga omongan) sesuai aturan. Keluarkan JSON saja.',
      ].join('\n');
      pesan.push({ role: 'user', content: permintaan });
    }

    const catatan: PutaranAgen = {
      putaran,
      jenis,
      diminta,
      permintaan,
      panggilan: null,
      terurai: false,
      diabaikan: [],
      masalah: [],
      omongan: [],
      draf: [],
      galat: null,
    };
    hasil.riwayat.push(catatan);

    const info: InfoPanggil = { jenis, putaran, omongan: null, ke: 1 };
    const mulai = jam().toISOString();
    let jawaban;
    try {
      jawaban = await opsi.panggil(pesan, { ...SETELAN_PENYUSUN }, info);
    } catch (galat) {
      catatan.galat = galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat tak dikenal';
      hasil.berhenti = galat instanceof PaguTercapai ? `pagu tercapai: ${galat.message}` : `galat penyusun: ${catatan.galat}`;
      return hasil;
    }
    teksTerakhir = jawaban.teks;
    catatan.panggilan = {
      waktu_mulai: mulai,
      waktu_selesai: jam().toISOString(),
      teks_mentah: jawaban.teks,
      panjang_penalaran: jawaban.penalaran?.length ?? 0,
      finish_reason: jawaban.finish_reason,
      token_masuk: jawaban.token_masuk,
      token_keluar: jawaban.token_keluar,
      biaya_usd: jawaban.biaya_usd,
      latensi_ms: jawaban.latensi_ms,
    };

    // --- gabungkan: omongan terkunci tetap, yang diminta diganti versi baru
    const urai = uraiKeluaran(jawaban.teks);
    catatan.terurai = urai.ok;
    const baru = urai.ok ? omonganBaru(urai.nilai, !adaDraf) : new Map<number, unknown>();
    const gabung = [...draf] as unknown[];
    const tidakAda: number[] = [];
    for (const no of diminta) {
      if (baru.has(no)) gabung[no - 1] = baru.get(no);
      else tidakAda.push(no);
    }
    catatan.diabaikan = [...baru.keys()].filter((no) => terkunci.has(no) || no < 1 || no > JUMLAH_OMONGAN);

    // --- validator atas draf gabungan
    const masalah = urai.ok
      ? opsi.validasi({ omongan: gabung.filter((x) => x !== null) }, opsi.paket)
      : [
          {
            kode: 'JSON_RUSAK',
            omongan: null,
            pesan:
              `${urai.alasan}` +
              (jawaban.finish_reason === 'length' ? ' (keluaran terpotong: batas token keluar tercapai)' : ''),
          },
        ];
    // Nomor omongan validator mengikuti posisi di larik yang diperiksa; saat
    // semua posisi terisi (yang biasa), posisi = nomor.
    const posisi = gabung.map((x, i) => (x === null ? null : i + 1)).filter((x): x is number => x !== null);
    const masalahNyata: MasalahDraf[] = masalah.map((m) => ({
      ...m,
      omongan: m.omongan === null ? null : (posisi[m.omongan - 1] ?? m.omongan),
    }));
    catatan.masalah = masalahNyata;
    const global = masalahNyata.filter((m) => m.omongan === null);

    const umpanBaru = new Map<number, string[]>();
    for (const no of [1, 2, 3]) {
      if (terkunci.has(no)) {
        catatan.omongan.push({ no, status: 'terkunci-sebelumnya', umpan: [], kartu: null, tebak: null });
        continue;
      }
      const butir: string[] = [];
      if (tidakAda.includes(no)) {
        butir.push(
          urai.ok
            ? `[bentuk] omongan ${String(no)} tidak ada di keluaranmu; kirim objeknya dengan "no": ${String(no)}.`
            : `[bentuk] keluaran bukan JSON yang sah: ${urai.alasan}`,
        );
      }
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
      // --- gerbang jawab-dengan-kartu, lalu gerbang tebak buta
      let kartu: PutusanKartu;
      let tebak: PutusanTebak | null = null;
      try {
        kartu = await gerbangKartu(omongan, opsi.paket, { panggil: opsi.panggil, putaran, omongan: no, jam });
        if (kartu.lolos) tebak = await gerbangTebak(omongan, { panggil: opsi.panggil, putaran, omongan: no, jam });
      } catch (galat) {
        catatan.galat = galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat tak dikenal';
        hasil.berhenti = galat instanceof PaguTercapai ? `pagu tercapai: ${galat.message}` : `galat gerbang: ${catatan.galat}`;
        catatan.draf = gabung as Array<OmonganDraf | null>;
        return hasil;
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
        return hasil;
      }
      hasil.lolos = true;
      hasil.draf = akhir;
      return hasil;
    }
  }
  hasil.berhenti = `batas ${String(maks)} putaran tercapai; omongan terkunci: ${[...terkunci].sort().join(', ') || 'tidak ada'}`;
  return hasil;
}
