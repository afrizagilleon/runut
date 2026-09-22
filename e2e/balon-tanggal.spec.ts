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

/**
 * E-14b — nama pengirim masuk KE DALAM balon, satu baris dengan tanggal; jamnya
 * tetap di pojok kanan bawah (M3.6 D-2 beserta amandemen A-1 pemilik).
 *
 * Temuan kedua pemilik di ponselnya: celah kosong antara nama "Dimas" dan
 * balonnya terasa tidak nyaman. Namanya karena itu pindah ke dalam balon,
 * sebaris dengan tanggal — `Dimas · Rabu, 8 Okt 2025` — dan tidak ada lagi
 * elemen di atas balon. Jamnya kembali ke tempat yang sudah disetujui pemilik
 * ("jam sudah tepat di kanan bawah"), jadi angka jam tetap tampil **sekali**.
 *
 * Ini penyimpangan sadar dari patokan `docs/contoh/layar-soal.html`, yang tidak
 * diubah; ukurannya dilaporkan, bukan dinilai.
 */
test('E-14b nama ada di dalam balon sebaris dengan tanggal, jam sekali di kanan bawah', async ({
  page,
}) => {
  const kasus = bacaKasus();
  const tanggal = tanggalPendek(kasus.tanggal_t);

  await buka(page, penandaBaru());
  await mulaiKasus(page);

  const ukuran: string[] = [];
  for (const [nomor, soal] of kasus.soal.entries()) {
    await tungguSoal(page, nomor + 1);
    await tungguGulirBerhenti(page);

    const pesan = page.locator('[data-uid="pesan"]');
    const balon = pesan.locator('blockquote');

    // Tidak ada lagi apa pun di atas balon: figure hanya berisi balonnya.
    await expect(
      pesan.locator('figcaption'),
      `soal ${String(nomor + 1)}: tidak boleh ada elemen nama di atas balon lagi (D-2)`,
    ).toHaveCount(0);

    const isiBalon = (await balon.innerText()).replace(/\s+/g, ' ');
    expect(
      isiBalon,
      `soal ${String(nomor + 1)}: nama "${soal.pesan.nama}" harus terbaca DI DALAM balon; ` +
        `yang ada: ${isiBalon}`,
    ).toContain(soal.pesan.nama);

    /*
     * Satu baris, bukan dua: nama dan tanggal diukur berada di kotak baris yang
     * sama. Dua elemen yang kebetulan bertetangga di DOM masih bisa terpisah
     * baris; yang ditanya pemilik adalah rupanya.
     */
    const sebaris = await balon.evaluate((el) => {
      const kotakNama = el.querySelector('.pesan-nama');
      const kotakMeta = el.querySelector('.pesan-meta');
      const jam = el.querySelector('time.pesan-jam');
      const badan = el.querySelector('p.isi');
      if (kotakNama === null || kotakMeta === null || badan === null) {
        return {
          adaNama: kotakNama !== null,
          adaMeta: kotakMeta !== null,
          adaJam: jam !== null,
          teksNama: '',
          teksMeta: '',
          selisihBaris: -1,
          jamDiBawahBadan: false,
          jarakJamKeTepiKanan: -1,
          tebalNama: '',
          warnaNama: '',
          warnaMeta: '',
        };
      }
      const rNama = kotakNama.getBoundingClientRect();
      const rMeta = kotakMeta.getBoundingClientRect();
      const rBadan = badan.getBoundingClientRect();
      const rBalon = el.getBoundingClientRect();
      const rJam = jam?.getBoundingClientRect() ?? null;
      const gayaBalon = getComputedStyle(el);
      return {
        adaNama: true,
        adaMeta: true,
        adaJam: jam !== null,
        teksNama: kotakNama.textContent ?? '',
        teksMeta: (kotakMeta.textContent ?? '').replace(/\s+/g, ' ').trim(),
        // Nama duduk di dalam baris meta yang sama: puncaknya tidak boleh
        // berbeda lebih dari satu baris 12 px.
        selisihBaris: Math.abs(rNama.top - rMeta.top),
        jamDiBawahBadan: rJam !== null && rJam.top >= rBadan.bottom - 1,
        jarakJamKeTepiKanan:
          rJam === null
            ? -1
            : rBalon.right - Number.parseFloat(gayaBalon.paddingRight) - rJam.right,
        tebalNama: getComputedStyle(kotakNama).fontWeight,
        warnaNama: getComputedStyle(kotakNama).color,
        warnaMeta: getComputedStyle(kotakMeta).color,
      };
    });

    expect(sebaris.adaMeta, `soal ${String(nomor + 1)}: balon harus punya baris meta`).toBe(true);
    expect(sebaris.adaNama, `soal ${String(nomor + 1)}: nama harus ada di dalam balon`).toBe(true);
    expect(sebaris.teksNama.trim()).toBe(soal.pesan.nama);
    /*
     * Urutannya yang diikat, bukan ejaan nama harinya: "Rabu" lahir dari
     * `penanda()` di produk, dan menuliskannya ulang di sini hanya akan membuat
     * tes setuju dengan salinannya sendiri. Yang dijaga: nama lebih dulu,
     * pemisah titik tengah, lalu tanggal yang berakhir pada tanggal pendek
     * kasus ini.
     */
    expect(
      sebaris.teksMeta,
      `baris meta soal ${String(nomor + 1)} harus berbunyi "nama · <hari>, ${tanggal}"`,
    ).toMatch(new RegExp(`^${soal.pesan.nama} · .*${tanggal.replace(/\./g, '\.')}$`));
    expect(
      sebaris.selisihBaris,
      `nama dan tanggal harus satu baris; selisih puncak ${sebaris.selisihBaris.toFixed(1)} px`,
    ).toBeLessThanOrEqual(1);
    expect(sebaris.tebalNama, 'nama tetap 600').toBe('600');
    expect(
      sebaris.warnaNama === sebaris.warnaMeta,
      `nama memakai --nama (${sebaris.warnaNama}), sisanya --tinta-redup (${sebaris.warnaMeta})`,
    ).toBe(false);

    /* --- jam: tepat sekali, di pojok kanan bawah ----------------------- */
    expect(sebaris.adaJam, `soal ${String(nomor + 1)}: jam harus ada di balon`).toBe(true);
    const kemunculanJam = isiBalon.split(soal.pesan.jam).length - 1;
    expect(
      kemunculanJam,
      `jam "${soal.pesan.jam}" harus tampil TEPAT SEKALI di balon; yang ada: ${isiBalon}`,
    ).toBe(1);
    expect(sebaris.jamDiBawahBadan, 'jam berada di bawah isi pesan').toBe(true);
    expect(
      sebaris.jarakJamKeTepiKanan,
      `jam rata kanan: sisa ${sebaris.jarakJamKeTepiKanan.toFixed(1)} px ke tepi dalam balon`,
    ).toBeLessThanOrEqual(1);
    expect(sebaris.jarakJamKeTepiKanan, 'jaraknya hasil ukur, bukan penanda').toBeGreaterThanOrEqual(
      -1,
    );

    const kotak = await balon.boundingBox();
    const kotakPesan = await pesan.boundingBox();
    ukuran.push(
      `soal-${String(nomor + 1)}: balon tinggi=${(kotak?.height ?? -1).toFixed(2)} ` +
        `lebar=${(kotak?.width ?? -1).toFixed(2)} | seluruh blok pesan tinggi=` +
        `${(kotakPesan?.height ?? -1).toFixed(2)} | meta="${sebaris.teksMeta}"`,
    );

    if (nomor + 1 < kasus.soal.length) {
      await pilihOpsi(page, soal.jawaban);
      await kunciJawaban(page);
      await lanjut(page, `Lanjut ke soal ${String(nomor + 2)}`);
    }
  }

  console.log(`D-2 balon sesudah (${test.info().project.name}):\n  ${ukuran.join('\n  ')}`);
});
