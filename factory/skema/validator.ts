import type { Kasus, MasalahValidasi, Soal } from './tipe.ts';
import { SEMUA_ATURAN, VERSI_SKEMA } from './tipe.ts';
import { RUJUKAN_ANDAIAN, ambilRujukan, angkaTelanjang } from './rujukan.ts';

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

function tambah(
  daftar: MasalahValidasi[],
  kode: string,
  pesan: string,
): void {
  daftar.push({ kode, pesan });
}

/**
 * Periksa satu berkas kasus. Mengembalikan daftar masalah; kosong berarti lolos.
 * Tidak pernah melempar dan tidak pernah diam: setiap masalah menyebut penyebabnya.
 */
export function periksaKasus(kasus: Kasus): MasalahValidasi[] {
  const masalah: MasalahValidasi[] = [];

  if (kasus.skema_versi !== VERSI_SKEMA) {
    tambah(
      masalah,
      'SKEMA_VERSI',
      `Versi skema ${String(kasus.skema_versi)} tidak dikenal; yang didukung ${String(VERSI_SKEMA)}.`,
    );
  }
  if (!POLA_TANGGAL.test(kasus.tanggal_t)) {
    tambah(masalah, 'TANGGAL_T', `tanggal_t "${kasus.tanggal_t}" bukan tanggal ISO.`);
  }

  // --- fakta: id unik, tanggal masuk akal -------------------------------
  const indeksFakta = new Map<string, Kasus['fakta'][number]>();
  for (const fakta of kasus.fakta) {
    if (indeksFakta.has(fakta.fact_id)) {
      tambah(masalah, 'FAKTA_GANDA', `fact_id "${fakta.fact_id}" muncul lebih dari sekali.`);
    }
    indeksFakta.set(fakta.fact_id, fakta);
    if (fakta.tersedia_sejak !== null && !POLA_TANGGAL.test(fakta.tersedia_sejak)) {
      tambah(
        masalah,
        'TANGGAL_FAKTA',
        `Fakta "${fakta.fact_id}" punya tersedia_sejak "${fakta.tersedia_sejak}" yang bukan tanggal ISO.`,
      );
    }
    if (fakta.sumber.jenis === 'api' && fakta.sumber.endpoint === null) {
      tambah(
        masalah,
        'SUMBER_TAK_LENGKAP',
        `Fakta "${fakta.fact_id}" bersumber API tetapi tidak menyebut endpoint.`,
      );
    }
    if (fakta.sumber.jenis === 'berkas' && fakta.sumber.berkas === null) {
      tambah(
        masalah,
        'SUMBER_TAK_LENGKAP',
        `Fakta "${fakta.fact_id}" bersumber berkas tetapi tidak menyebut nama berkas.`,
      );
    }
  }

  const adaFakta = (id: string): boolean => indeksFakta.has(id);

  for (const fakta of kasus.fakta) {
    for (const asal of fakta.turunan_dari) {
      if (!adaFakta(asal)) {
        tambah(
          masalah,
          'FACT_ID_MENGGANTUNG',
          `fact_id menggantung "${asal}" dirujuk sebagai turunan_dari oleh fakta "${fakta.fact_id}".`,
        );
      }
    }
  }

  const periksaId = (id: string, dirujukOleh: string): void => {
    if (!adaFakta(id)) {
      tambah(
        masalah,
        'FACT_ID_MENGGANTUNG',
        `fact_id menggantung "${id}" dirujuk oleh ${dirujukOleh}.`,
      );
    }
  };

  // --- teks: setiap angka harus menunjuk fact_id (INV-4) ----------------
  const periksaTeks = (teks: string, dirujukOleh: string): void => {
    for (const rujukan of ambilRujukan(teks)) {
      if (rujukan.fact_id === RUJUKAN_ANDAIAN) continue;
      periksaId(rujukan.fact_id, dirujukOleh);
    }
    const telanjang = angkaTelanjang(teks);
    if (telanjang.length > 0) {
      tambah(
        masalah,
        'ANGKA_TANPA_FACT_ID',
        `Angka tanpa fact_id di ${dirujukOleh}: ${telanjang.join(', ')}.`,
      );
    }
  };

  // --- fakta yang terlihat pemain ---------------------------------------
  const terlihat = new Set<string>();
  for (const id of kasus.fakta_terlihat) {
    periksaId(id, 'fakta_terlihat');
    terlihat.add(id);
  }

  const periksaTerlihat = (id: string, dirujukOleh: string): void => {
    const fakta = indeksFakta.get(id);
    if (fakta === undefined) return;
    if (fakta.tersedia_sejak === null) {
      tambah(
        masalah,
        'FAKTA_BELUM_TERSEDIA',
        `Fakta "${id}" tidak punya tanggal ketersediaan (tersedia_sejak null) tetapi dipakai di ${dirujukOleh}.`,
      );
      return;
    }
    if (fakta.tersedia_sejak > kasus.tanggal_t) {
      tambah(
        masalah,
        'FAKTA_SESUDAH_T',
        `Fakta "${id}" baru tersedia ${fakta.tersedia_sejak}, sesudah tanggal beku ${kasus.tanggal_t}, tetapi dipakai di ${dirujukOleh}.`,
      );
    }
  };

  for (const id of kasus.fakta_terlihat) {
    periksaTerlihat(id, 'fakta_terlihat');
  }

  // --- soal --------------------------------------------------------------
  const kunciSoal = new Set<string>();
  for (const soal of kasus.soal) {
    if (kunciSoal.has(soal.soal_id)) {
      tambah(masalah, 'SOAL_GANDA', `soal_id "${soal.soal_id}" muncul lebih dari sekali.`);
    }
    kunciSoal.add(soal.soal_id);
    periksaSoal(soal, masalah);

    periksaTeks(soal.batang, `soal "${soal.soal_id}" (batang)`);
    periksaTeks(soal.penjelasan, `soal "${soal.soal_id}" (penjelasan)`);
    for (const pilihan of soal.pilihan) {
      periksaTeks(pilihan.teks, `soal "${soal.soal_id}" (pilihan ${pilihan.kunci})`);
    }

    for (const id of soal.fact_ids) {
      periksaId(id, `soal "${soal.soal_id}"`);
      periksaTerlihat(id, `soal "${soal.soal_id}"`);
      const fakta = indeksFakta.get(id);
      if (fakta !== undefined && fakta.status === 'KONFLIK') {
        tambah(
          masalah,
          'FAKTA_KONFLIK_DIPAKAI',
          `Fakta "${id}" berstatus KONFLIK tetapi dipakai sebagai dasar jawaban soal "${soal.soal_id}".`,
        );
      }
      if (!terlihat.has(id)) {
        tambah(
          masalah,
          'FAKTA_SOAL_TAK_TERLIHAT',
          `Soal "${soal.soal_id}" memakai fakta "${id}" yang tidak ada di fakta_terlihat.`,
        );
      }
    }
  }

  // --- pembukaan ----------------------------------------------------------
  for (const id of kasus.pembukaan.fact_ids) {
    periksaId(id, 'pembukaan');
    if (terlihat.has(id)) {
      tambah(
        masalah,
        'FAKTA_PEMBUKAAN_BOCOR',
        `Fakta pembukaan "${id}" juga terdaftar di fakta_terlihat.`,
      );
    }
  }
  for (const [nomor, paragraf] of kasus.pembukaan.paragraf.entries()) {
    periksaTeks(paragraf, `pembukaan (paragraf ke-${String(nomor + 1)})`);
  }

  // --- temuan -------------------------------------------------------------
  for (const temuan of kasus.temuan) {
    for (const id of temuan.fakta_terkait) {
      periksaId(id, `temuan "${temuan.temuan_id}"`);
    }
    if (temuan.angka.length === 0) {
      tambah(
        masalah,
        'TEMUAN_TANPA_ANGKA',
        `Temuan "${temuan.temuan_id}" (${temuan.aturan}) tidak menyebut satu angka pun.`,
      );
    }
  }

  // --- jejak pemeriksaan: tidak ada aturan yang hilang diam-diam ----------
  const dicatat = new Set(kasus.pemeriksaan.map((p) => p.aturan));
  for (const aturan of SEMUA_ATURAN) {
    if (!dicatat.has(aturan)) {
      tambah(
        masalah,
        'PEMERIKSAAN_TAK_LENGKAP',
        `Aturan ${aturan} tidak tercatat di jejak pemeriksaan; aturan tidak boleh hilang tanpa keterangan.`,
      );
    }
  }
  for (const p of kasus.pemeriksaan) {
    if (!p.dijalankan && (p.alasan_lewat === null || p.alasan_lewat === '')) {
      tambah(
        masalah,
        'PEMERIKSAAN_TANPA_ALASAN',
        `Aturan ${p.aturan} ditandai tidak dijalankan tetapi tidak menyebut alasannya.`,
      );
    }
    const sebenarnya = kasus.temuan.filter((t) => t.aturan === p.aturan).length;
    if (sebenarnya !== p.jumlah_temuan) {
      tambah(
        masalah,
        'PEMERIKSAAN_TAK_COCOK',
        `Aturan ${p.aturan} mencatat ${String(p.jumlah_temuan)} temuan, tetapi di daftar temuan ada ${String(sebenarnya)}.`,
      );
    }
  }

  // --- INV-5: tidak ada ajakan bertransaksi -------------------------------
  const semuaTeks: Array<[string, string]> = [
    ['judul', kasus.judul],
    ...kasus.fakta.map((f): [string, string] => [`fakta "${f.fact_id}"`, f.klaim]),
    ...kasus.soal.flatMap((s): Array<[string, string]> => [
      [`soal "${s.soal_id}" (batang)`, s.batang],
      [`soal "${s.soal_id}" (penjelasan)`, s.penjelasan],
      ...s.pilihan.map((p): [string, string] => [
        `soal "${s.soal_id}" (pilihan ${p.kunci})`,
        p.teks,
      ]),
    ]),
    ...kasus.pembukaan.paragraf.map((p, i): [string, string] => [
      `pembukaan (paragraf ke-${String(i + 1)})`,
      p,
    ]),
    ...kasus.temuan.map((t): [string, string] => [`temuan "${t.temuan_id}"`, t.ringkasan]),
  ];
  const polaAjakan =
    /\b(beli(lah)?|jual(lah)?|borong|akumulasi|cut loss|take profit|target harga|layak dikoleksi|wajib punya)\b/i;
  for (const [tempat, teks] of semuaTeks) {
    if (kasus.disclaimer.includes(teks)) continue;
    const cocok = polaAjakan.exec(teks);
    if (cocok !== null) {
      tambah(
        masalah,
        'AJAKAN_TRANSAKSI',
        `Kalimat di ${tempat} memuat ajakan bertransaksi: "${cocok[0]}".`,
      );
    }
  }

  // --- kalimat tetap ------------------------------------------------------
  if (kasus.disclaimer.length !== 3) {
    tambah(
      masalah,
      'DISCLAIMER',
      `Kasus harus memuat tiga kalimat tetap, ditemukan ${String(kasus.disclaimer.length)}.`,
    );
  }

  return masalah;
}

function periksaSoal(soal: Soal, masalah: MasalahValidasi[]): void {
  if (soal.pilihan.length < 2) {
    tambah(
      masalah,
      'SOAL_PILIHAN_KURANG',
      `Soal "${soal.soal_id}" hanya punya ${String(soal.pilihan.length)} pilihan.`,
    );
  }
  if (!soal.pilihan.some((p) => p.kunci === soal.jawaban)) {
    tambah(
      masalah,
      'JAWABAN_TAK_ADA',
      `Jawaban "${soal.jawaban}" pada soal "${soal.soal_id}" tidak ada di daftar pilihan.`,
    );
  }
  if (soal.fact_ids.length === 0) {
    tambah(
      masalah,
      'SOAL_TANPA_FAKTA',
      `Soal "${soal.soal_id}" tidak menunjuk satu fact_id pun.`,
    );
  }
}
