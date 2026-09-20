/**
 * Cetak ringkasan apa saja yang berhasil dimuat dari `.cache/`.
 * Dipakai sebagai bukti T-04:
 *   node --experimental-strip-types factory/muat/cetak.ts
 */
import { angkaId } from '../format.ts';
import { muatDada } from './dada.ts';
import { faktaKenaikan, pustakaDada } from './fakta.ts';

/** Angka pemilik di kontrak §3.1, dibandingkan dengan hitungan sendiri (OQ-2). */
const SAHAM_BEREDAR_MENURUT_PEMILIK = 7_431_815_981;

function utama(): void {
  const data = muatDada();
  const pustaka = pustakaDada(data);

  console.log('Berkas cache terbaca, data DADA dimuat.');
  console.log('');
  console.log('Laporan kepemilikan 2025 :', angkaId(data.laporan2025.length), 'laporan');
  console.log('Laporan kepemilikan 2026 :', angkaId(data.laporan2026.length), 'laporan');
  console.log('Hari bursa               :', angkaId(data.harga.length), 'hari');
  console.log('Suspensi                 :', angkaId(data.suspensi.length));
  console.log('Dividen                  :', angkaId(data.dividen.length));
  console.log('RUPS dengan hasil        :', angkaId(data.rups.length));
  console.log('');
  console.log('Jumlah fakta per jenis:');
  for (const [nama, jumlah] of Object.entries(pustaka.jumlah)) {
    console.log('  ' + nama.padEnd(12), angkaId(jumlah));
  }
  console.log('');
  const beredar = data.saham_beredar;
  console.log('Saham beredar (nilai pasar / harga penutupan):', angkaId(beredar.lembar), 'lembar');
  console.log('  disepakati oleh', angkaId(beredar.hari_sepakat), 'hari bursa');
  console.log(
    '  angka lain yang muncul:',
    beredar.angka_lain.length === 0 ? 'tidak ada' : beredar.angka_lain.map(angkaId).join(', '),
  );
  console.log('  angka pemilik di kontrak      :', angkaId(SAHAM_BEREDAR_MENURUT_PEMILIK));
  console.log(
    '  selisih (hitungan − kontrak)  :',
    angkaId(beredar.lembar - SAHAM_BEREDAR_MENURUT_PEMILIK),
    'lembar',
  );
  console.log('');
  for (const f of faktaKenaikan(data, '2025-08-01', '2025-10-08')) {
    console.log(f.fact_id + ':', f.klaim);
  }
  console.log('');
  console.log('Contoh jejak sumber satu laporan:');
  const contoh = pustaka.fakta.find((f) => f.fact_id === 'fil-2025-10-19-01');
  console.log(JSON.stringify(contoh, null, 2));
}

utama();
