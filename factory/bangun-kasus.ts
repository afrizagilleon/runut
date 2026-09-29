/**
 * Perintah `npm run build:case -- <kasus_id>`.
 *
 * Membangun berkas kasus dari `.cache/` dan menuliskannya ke `cases/`.
 * Gagal keras: kasus yang tidak lolos validator, fact_id menggantung, atau
 * berkas cache yang hilang membuat perintah keluar dengan kode 1 dan menyebut
 * penyebabnya (INV-6).
 */
import { writeFileSync } from 'node:fs';
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
import { muatDada } from './muat/dada.ts';
import { FOLDER_GUDANG } from './muat/gudang.ts';
import { bacaDaftarBeku, muatGudangBeku, periksaGudangBeku, type DaftarBeku } from './muat/gudang-beku.ts';
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
 * Kasus tayang dibangun dari **gudang beku** (M4a A-1): 111 berkas yang
 * sidiknya dibekukan di `docs/bukti/gudang-beku-kasus.json`, bukan dari apa pun
 * yang kebetulan ada di `.cache/sectors/`. Menambah data untuk audit tidak
 * boleh menggeser kasus yang sedang dimainkan; satu berkas beku hilang atau
 * berbeda satu byte → `GudangBekuRusak` yang menyebut nama berkasnya.
 */
function bangunUmum(def: DefinisiKasusUmum, folder: string, daftar: DaftarBeku): HasilBangun {
  const gudang = muatGudangBeku(folder, daftar);
  const data = gudang.emiten.get(def.simbol);
  if (data === undefined) {
    throw new Error(
      `Emiten "${def.simbol}" tidak ada di gudang ${gudang.folder}; ` +
        `yang terbaca: ${[...gudang.emiten.keys()].join(', ')}.`,
    );
  }
  const kosong = gudang.berkas.filter((b) => b.jenis === 'paginasi-kosong').map((b) => b.berkas);
  return bangunKasusUmum(def, data, gudang.asal, kosong);
}

/** Bangun satu kasus tayang dari gudang beku di `folder`. Tidak menulis apa pun. */
export function bangunKasusTayang(
  kasus_id: string,
  folder: string = FOLDER_GUDANG,
  daftar: DaftarBeku = bacaDaftarBeku(),
): HasilBangun {
  const definisi = KASUS[kasus_id];
  if (definisi !== undefined) {
    // Pemuat DADA membaca berkasnya sendiri menurut nama; sidik seluruh gudang
    // beku diperiksa lebih dulu, lalu berkas dibaca dari folder yang sama.
    periksaGudangBeku(folder, daftar);
    return bangunKasus(definisi, muatDada(folder));
  }
  const definisiUmum = KASUS_UMUM[kasus_id];
  if (definisiUmum !== undefined) return bangunUmum(definisiUmum, folder, daftar);
  throw new Error(`Kasus "${kasus_id}" tidak dikenal.`);
}

function utama(argumen: string[]): number {
  const kasus_id = argumen[0];
  if (kasus_id === undefined) {
    console.error(
      'Sebutkan kasus yang mau dibangun, misalnya:\n' +
        '  npm run build:case -- dada-2025-10-08\n' +
        'Kasus yang tersedia: ' +
        [...Object.keys(KASUS), ...Object.keys(KASUS_UMUM)].sort().join(', '),
    );
    return 1;
  }
  const definisi = KASUS[kasus_id];
  const definisiUmum = KASUS_UMUM[kasus_id];
  if (definisi === undefined && definisiUmum === undefined) {
    console.error(
      `Kasus "${kasus_id}" tidak dikenal. Kasus yang tersedia: ` +
        `${[...Object.keys(KASUS), ...Object.keys(KASUS_UMUM)].sort().join(', ')}.`,
    );
    return 1;
  }

  const { kasus } = bangunKasusTayang(kasus_id);

  const tujuan = `${AKAR}cases/${kasus_id}.json`;
  writeFileSync(tujuan, keJson(kasus), 'utf8');

  console.log(`Kasus ${kasus_id} dibangun dan lolos validator.`);
  console.log(`Ditulis ke cases/${kasus_id}.json`);
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
    } else {
      console.error(galat instanceof Error ? `${galat.name}: ${galat.message}` : String(galat));
    }
    process.exitCode = 1;
  }
}
