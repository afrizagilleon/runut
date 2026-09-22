import { expect, test } from '@playwright/test';
import {
  buka,
  lanjut,
  kunciJawaban,
  mulaiKasus,
  penandaBaru,
  pilihOpsi,
  tungguGulirBerhenti,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';

/**
 * E-14 — setiap balon chat membawa tanggalnya (M3.5 D-2).
 *
 * Cacat yang ditemukan manusia: teman pemilik, fakultas ekonomi, sesudah
 * bermain sampai habis — *"ga tau yang chat itu tanggal berapa… tidak tahu
 * chat-nya di hari sesudah dokumen rilis atau sebelumnya"*. Ia berpatokan pada
 * tiga bulatan kemajuan dan **tidak melihat** keping tanggal yang menempel di
 * atasnya. Kepala kartu sudah menyebut tahun ("Pengumuman dividen · ex 16 Sep
 * 2025"); balonnya hanya berbunyi "19.42". Permintaannya sendiri: tanggal
 * "berdekatan di nama seperti WhatsApp".
 *
 * Yang dijaga di sini bukan bentuknya melainkan isinya: teks balon memuat
 * tanggal T dalam bahasa Indonesia dan jam pesan itu, dan nama yang dibaca
 * pembaca layar menyebut keduanya juga. Tanggalnya dibaca dari berkas kasus,
 * tidak disalin ke dalam tes.
 */

/** Nama bulan pendek berhuruf biasa, sama dengan yang dipakai `tanggalBalon`. */
const BULAN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

/** "2025-10-08" -> "8 Okt 2025". Dihitung di tes dari data, bukan disalin. */
function tanggalPendek(iso: string): string {
  const [tahun, bulan, hari] = iso.split('-');
  return `${String(Number(hari))} ${BULAN[Number(bulan) - 1] ?? '?'} ${String(tahun)}`;
}

test('E-14 tiap balon chat memuat tanggal T dan jam pesannya', async ({ page }) => {
  const kasus = bacaKasus();
  const tanggal = tanggalPendek(kasus.tanggal_t);

  await buka(page, penandaBaru());
  await mulaiKasus(page);

  const tinggi: string[] = [];
  for (const [nomor, soal] of kasus.soal.entries()) {
    await tungguSoal(page, nomor + 1);
    await tungguGulirBerhenti(page);

    const pesan = page.locator('[data-uid="pesan"]');
    const balon = pesan.locator('blockquote');
    const teks = (await balon.innerText()).replace(/\s+/g, ' ');

    expect(
      teks,
      `balon soal ${String(nomor + 1)} harus menyebut tanggal T "${tanggal}"; yang ada: ${teks}`,
    ).toContain(tanggal);
    expect(
      teks,
      `balon soal ${String(nomor + 1)} harus menyebut jam "${soal.pesan.jam}"; yang ada: ${teks}`,
    ).toContain(soal.pesan.jam);

    /*
     * Nama yang dibaca pembaca layar. Tanpa ini, pemain yang tidak melihat
     * layar tetap tidak tahu chat-nya kapan — dan cacat yang sedang ditambal
     * justru "tidak tahu chat-nya kapan".
     */
    const label = (await pesan.getAttribute('aria-label')) ?? '';
    expect(label, `aria-label balon soal ${String(nomor + 1)}: ${label}`).toContain(tanggal);
    expect(label, `aria-label balon soal ${String(nomor + 1)}: ${label}`).toContain(soal.pesan.jam);
    expect(label).toContain(soal.pesan.nama);

    const kotak = await balon.boundingBox();
    tinggi.push(
      `soal-${String(nomor + 1)}: tinggi=${(kotak?.height ?? -1).toFixed(2)} ` +
        `lebar=${(kotak?.width ?? -1).toFixed(2)}`,
    );

    if (nomor + 1 < kasus.soal.length) {
      await pilihOpsi(page, soal.jawaban);
      await kunciJawaban(page);
      await lanjut(page, `Lanjut ke soal ${String(nomor + 2)}`);
    }
  }

  // Ukuran dilaporkan, bukan dinilai: D-2 menyimpang dari patokan dengan sadar,
  // dan penyimpangan yang tidak diukur tidak bisa ditimbang siapa pun.
  console.log(`D-2 tinggi balon (${test.info().project.name}):\n  ${tinggi.join('\n  ')}`);
});
