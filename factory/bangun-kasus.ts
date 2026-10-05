/**
 * Perintah `npm run build:case -- <kasus_id>`.
 *
 * Membangun berkas kasus dari `.cache/` dan menuliskannya ke `cases/`.
 * Gagal keras: kasus yang tidak lolos validator, fact_id menggantung, atau
 * berkas cache yang hilang membuat perintah keluar dengan kode 1 dan menyebut
 * penyebabnya (INV-6).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { angkaId } from './format.ts';
import {
  KasusTidakSah,
  bangunKasus,
  bangunKasusUmum,
  type DefinisiKasus,
  type DefinisiKasusUmum,
} from './kasus/bangun.ts';
import { keJson } from './kasus/json.ts';
import { DADA_2025_10_08 } from './kasus/dada-2025-10-08.ts';
import { ULTJ_2026_05_04 } from './kasus/ultj-2026-05-04.ts';
import {
  HasilAgenTidakSah,
  bacaSumberAgen,
  dariAgen,
  periksaSetia,
  type LampiranPenyetuju,
} from './kasus/dari-agen.ts';
import { LAMPIRAN_AMAG_2026_06_15 } from './kasus/lampiran/amag-2026-06-15.ts';
import { muatDada } from './muat/dada.ts';
import { FOLDER_GUDANG, muatGudang } from './muat/gudang.ts';
import { bacaDaftarBeku, muatGudangBeku, periksaGudangBeku, type DaftarBeku } from './muat/gudang-beku.ts';
import { bacaAturanBeku, periksaJejakBeku, type AturanBeku } from './verifikasi/aturan-beku.ts';
import type { HasilBangun } from './kasus/bangun.ts';

const AKAR = fileURLToPath(new URL('../', import.meta.url));

/**
 * Kasus generasi pertama: dibangun pemuat DADA dan himpunan aturan V1.
 *
 * Tidak dipindahkan ke jalur umum, dan itu disengaja (INV-A): berkas kasus yang
 * sedang dimainkan orang tidak boleh bergeser satu byte pun karena perubahan
 * pabrik. Yang berpindah jalur akan berpindah angka.
 */
const KASUS: Record<string, DefinisiKasus> = {
  'dada-2025-10-08': DADA_2025_10_08,
};

/** Kasus yang dibangun dari pemuat gudang M2a dan himpunan aturan V2 (M4 D-1). */
const KASUS_UMUM: Record<string, DefinisiKasusUmum> = {
  'ultj-2026-05-04': ULTJ_2026_05_04,
};

/**
 * Kasus yang soalnya ditulis AI agent (`npm run agen`) dan dilengkapi satu
 * lampiran penyetuju. Definisinya tidak ditulis tangan: `dariAgen` menyusunnya
 * dari paket fakta + omongan bank + lampiran, lalu ia dibangun pembangun yang
 * sama dengan `KASUS_UMUM` (`bangunKasusUmum`, `ATURAN_V2`).
 */
const KASUS_AGEN: Record<string, LampiranPenyetuju> = {
  'amag-2026-06-15': LAMPIRAN_AMAG_2026_06_15,
};

/** Kasus yang soalnya tulisan agent; harus sama dengan `KASUS_DARI_AGEN` (`kasus/asal-agen.ts`, dites). */
export const ID_KASUS_AGEN: readonly string[] = Object.keys(KASUS_AGEN).sort();

/** Seluruh kasus yang bisa dibangun `npm run build:case`. */
export const ID_KASUS_TERDAFTAR: readonly string[] = [
  ...Object.keys(KASUS),
  ...Object.keys(KASUS_UMUM),
  ...Object.keys(KASUS_AGEN),
].sort();

/**
 * Endpoint asal tiap respons kosong menurut manifest gudang (M3.13 D-3).
 *
 * Respons berpaginasi yang kosong tidak memuat simbolnya; satu-satunya jejak
 * emitennya adalah permintaan yang dicatat `npm run sectors:ambil` di
 * `docs/bukti/gudang-manifest.json` (`path_endpoint`). R25 memakainya supaya
 * sebuah kasus hanya menghitung respons kosong miliknya sendiri. Berkas yang
 * tidak ada di manifest, atau yang `path_endpoint`-nya `null` (diambil sebelum
 * M4a), bernilai `null`: asalnya tidak diketahui.
 */
export function asalKosongDariManifest(
  kosong: readonly string[],
  berkasManifest: string = `${AKAR}docs/bukti/gudang-manifest.json`,
): Record<string, string | null> {
  const isi: { berkas?: Array<{ nama: string; path_endpoint?: string | null }> } = existsSync(berkasManifest)
    ? (JSON.parse(readFileSync(berkasManifest, 'utf8')) as {
        berkas?: Array<{ nama: string; path_endpoint?: string | null }>;
      })
    : {};
  const peta = new Map((isi.berkas ?? []).map((b) => [b.nama, b.path_endpoint ?? null]));
  return Object.fromEntries(kosong.map((b) => [b, peta.get(b) ?? null]));
}

/**
 * Kasus tayang dibangun dari **gudang beku** (M4a A-1): 111 berkas yang
 * sidiknya dibekukan di `docs/bukti/gudang-beku-kasus.json`, bukan dari apa pun
 * yang kebetulan ada di `.cache/sectors/`. Menambah data untuk audit tidak
 * boleh menggeser kasus yang sedang dimainkan; satu berkas beku hilang atau
 * berbeda satu byte → `GudangBekuRusak` yang menyebut nama berkasnya.
 */
function bangunUmum(
  def: DefinisiKasusUmum,
  folder: string,
  daftar: DaftarBeku,
  beku: AturanBeku['kasus'][string] | undefined,
): HasilBangun {
  const gudang = muatGudangBeku(folder, daftar);
  const dataGudang = gudang.emiten.get(def.simbol);
  if (dataGudang === undefined) {
    throw new Error(
      `Emiten "${def.simbol}" tidak ada di gudang ${gudang.folder}; ` +
        `yang terbaca: ${[...gudang.emiten.keys()].join(', ')}.`,
    );
  }
  // Aturan beku (M4b D-1): kasus yang sudah tayang hanya menjalankan aturan yang
  // dipakai saat ia dibekukan. Kasus baru (belum di daftar) memakai ATURAN_V2 penuh.
  const data = beku === undefined ? dataGudang : { ...dataGudang, aturan_beku: [...beku.aturan] };
  const kosong = gudang.berkas.filter((b) => b.jenis === 'paginasi-kosong').map((b) => b.berkas);
  return bangunKasusUmum(def, data, gudang.asal, kosong, asalKosongDariManifest(kosong));
}

/**
 * Kasus dari agent dibangun dari berkas gudang yang disebut lampirannya
 * sendiri (nama + sha256), bukan dari 111 berkas beku DADA/ULTJ: emitennya
 * memang tidak ada di sana. Aturannya sama — satu berkas hilang atau berbeda
 * satu byte → `GudangBekuRusak`, dan berkas lain di folder tidak ikut dibaca.
 *
 * Sesudah dibangun, kasusnya dibandingkan kembali dengan hasil agent
 * (`periksaSetia`): teks soal sama huruf demi huruf, dan fakta kartunya sama
 * dengan paket yang dibaca agent. Selisih apa pun menggagalkan build.
 */
function bangunDariAgen(
  lampiran: LampiranPenyetuju,
  folder: string,
  beku: AturanBeku['kasus'][string] | undefined,
): HasilBangun {
  const { paket, omongan } = bacaSumberAgen(lampiran, AKAR);
  const gudang = muatGudang(folder, { izin: lampiran.sumber.gudang });
  const dataGudang = gudang.emiten.get(paket.simbol);
  if (dataGudang === undefined) {
    throw new Error(
      `Emiten "${paket.simbol}" tidak ada di berkas gudang lampiran ${lampiran.kasus_id}; ` +
        `yang terbaca: ${[...gudang.emiten.keys()].join(', ')}.`,
    );
  }
  const def = dariAgen({ paket, omongan, lampiran, data: dataGudang });
  const data = beku === undefined ? dataGudang : { ...dataGudang, aturan_beku: [...beku.aturan] };
  const kosong = gudang.berkas.filter((b) => b.jenis === 'paginasi-kosong').map((b) => b.berkas);
  const hasil = bangunKasusUmum(def, data, gudang.asal, kosong, asalKosongDariManifest(kosong));
  const selisih = periksaSetia(hasil.kasus, paket, omongan);
  if (selisih.length > 0) throw new HasilAgenTidakSah(lampiran.kasus_id, selisih);
  return hasil;
}

/**
 * Bangun satu kasus tayang dari gudang beku di `folder`, dengan daftar aturan
 * beku kasus itu. Tidak menulis apa pun.
 *
 * Kasus yang ada di daftar aturan beku diperiksa sekali lagi sesudah dibangun:
 * jejak `pemeriksaan`-nya harus sama persis dengan daftarnya, atau
 * `AturanBekuRusak`. Untuk DADA ini satu-satunya penjaga — jalurnya V1, yang
 * tidak membaca `ATURAN_V2` sama sekali.
 */
export function bangunKasusTayang(
  kasus_id: string,
  folder: string = FOLDER_GUDANG,
  daftar: DaftarBeku = bacaDaftarBeku(),
  aturan: AturanBeku = bacaAturanBeku(),
): HasilBangun {
  const beku = aturan.kasus[kasus_id];
  let hasil: HasilBangun;
  const definisi = KASUS[kasus_id];
  const definisiUmum = KASUS_UMUM[kasus_id];
  const lampiranAgen = KASUS_AGEN[kasus_id];
  if (definisi !== undefined) {
    // Pemuat DADA membaca berkasnya sendiri menurut nama; sidik seluruh gudang
    // beku diperiksa lebih dulu, lalu berkas dibaca dari folder yang sama.
    periksaGudangBeku(folder, daftar);
    hasil = bangunKasus(definisi, muatDada(folder));
  } else if (definisiUmum !== undefined) {
    hasil = bangunUmum(definisiUmum, folder, daftar, beku);
  } else if (lampiranAgen !== undefined) {
    hasil = bangunDariAgen(lampiranAgen, folder, beku);
  } else {
    throw new Error(`Kasus "${kasus_id}" tidak dikenal.`);
  }
  if (beku !== undefined) {
    periksaJejakBeku(
      kasus_id,
      hasil.kasus.pemeriksaan.map((p) => p.aturan),
      beku.aturan,
    );
  }
  return hasil;
}

function utama(argumen: string[]): number {
  const kasus_id = argumen[0];
  if (kasus_id === undefined) {
    console.error(
      'Sebutkan kasus yang mau dibangun, misalnya:\n' +
        '  npm run build:case -- dada-2025-10-08\n' +
        'Kasus yang tersedia: ' +
        ID_KASUS_TERDAFTAR.join(', '),
    );
    return 1;
  }
  if (!ID_KASUS_TERDAFTAR.includes(kasus_id)) {
    console.error(
      `Kasus "${kasus_id}" tidak dikenal. Kasus yang tersedia: ${ID_KASUS_TERDAFTAR.join(', ')}.`,
    );
    return 1;
  }

  const aturan = bacaAturanBeku();
  const { kasus } = bangunKasusTayang(kasus_id, FOLDER_GUDANG, bacaDaftarBeku(), aturan);

  const tujuan = `${AKAR}cases/${kasus_id}.json`;
  writeFileSync(tujuan, keJson(kasus), 'utf8');

  console.log(`Kasus ${kasus_id} dibangun dan lolos validator.`);
  console.log(`Ditulis ke cases/${kasus_id}.json`);
  const beku = aturan.kasus[kasus_id];
  console.log(
    beku === undefined
      ? 'Aturan: ATURAN_V2 penuh — kasus ini belum dibekukan di docs/bukti/aturan-beku-kasus.json.'
      : `Aturan: ${angkaId(beku.aturan.length)} aturan beku (docs/bukti/aturan-beku-kasus.json, jalur ${beku.jalur}).`,
  );
  console.log('');
  console.log(`Tanggal beku          : ${kasus.tanggal_t}`);
  console.log(`Fakta di berkas       : ${angkaId(kasus.fakta.length)}`);
  console.log(`Fakta terlihat pemain : ${angkaId(kasus.fakta_terlihat.length)}`);
  console.log(`Fakta pembukaan       : ${angkaId(kasus.pembukaan.fact_ids.length)}`);
  console.log(
    `Fakta berstatus KONFLIK: ${angkaId(kasus.fakta.filter((f) => f.status === 'KONFLIK').length)}`,
  );
  console.log(`Soal                  : ${angkaId(kasus.soal.length)}`);
  console.log('');
  console.log(`Jejak verifikasi: ${angkaId(kasus.temuan.length)} temuan`);
  for (const t of kasus.temuan) {
    console.log(`  [${t.aturan}] ${t.ringkasan}`);
    for (const a of t.angka) {
      console.log(`        ${a.label}: ${angkaId(a.nilai)} ${a.satuan}`);
    }
  }
  console.log('');
  console.log('Aturan yang tidak bisa dijalankan (tidak ada yang hilang diam-diam):');
  const dilewati = kasus.pemeriksaan.filter((p) => !p.dijalankan);
  if (dilewati.length === 0) console.log('  tidak ada');
  for (const p of dilewati) {
    console.log(`  ${p.aturan} — ${p.alasan_lewat ?? ''}`);
  }
  return 0;
}

const dijalankanLangsung =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (dijalankanLangsung) {
  try {
    process.exitCode = utama(process.argv.slice(2));
  } catch (galat) {
    if (galat instanceof KasusTidakSah) {
      console.error('Kasus tidak dibangun karena tidak lolos validator:');
      for (const m of galat.masalah) console.error(`  [${m.kode}] ${m.pesan}`);
    } else if (galat instanceof HasilAgenTidakSah) {
      console.error('Kasus tidak dibangun karena hasil agent dan lampirannya tidak cocok:');
      for (const b of galat.butir) console.error(`  - ${b}`);
    } else {
      console.error(galat instanceof Error ? `${galat.name}: ${galat.message}` : String(galat));
    }
    process.exitCode = 1;
  }
}
