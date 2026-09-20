/**
 * Perintah `npm run build:case -- <kasus_id>`.
 *
 * Membangun berkas kasus dari `.cache/` dan menuliskannya ke `cases/`.
 * Gagal keras: kasus yang tidak lolos validator, fact_id menggantung, atau
 * berkas cache yang hilang membuat perintah keluar dengan kode 1 dan menyebut
 * penyebabnya (INV-6).
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { angkaId } from './format.ts';
import { KasusTidakSah, bangunKasus, type DefinisiKasus } from './kasus/bangun.ts';
import { keJson } from './kasus/json.ts';
import { DADA_2025_10_08 } from './kasus/dada-2025-10-08.ts';
import { muatDada } from './muat/dada.ts';

const AKAR = fileURLToPath(new URL('../', import.meta.url));

const KASUS: Record<string, DefinisiKasus> = {
  'dada-2025-10-08': DADA_2025_10_08,
};

function utama(argumen: string[]): number {
  const kasus_id = argumen[0];
  if (kasus_id === undefined) {
    console.error(
      'Sebutkan kasus yang mau dibangun, misalnya:\n' +
        '  npm run build:case -- dada-2025-10-08\n' +
        'Kasus yang tersedia: ' +
        Object.keys(KASUS).join(', '),
    );
    return 1;
  }
  const definisi = KASUS[kasus_id];
  if (definisi === undefined) {
    console.error(
      `Kasus "${kasus_id}" tidak dikenal. Kasus yang tersedia: ${Object.keys(KASUS).join(', ')}.`,
    );
    return 1;
  }

  const data = muatDada();
  const { kasus } = bangunKasus(definisi, data);

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
