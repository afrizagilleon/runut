import type { Kasus, Keparahan, MasalahValidasi, Soal } from './tipe.ts';
import { SEMUA_ATURAN, SEMUA_KODE_ATURAN, VERSI_SKEMA } from './tipe.ts';

/** Ketiga nilai `Temuan.keparahan` yang sah (M2a D-1). */
const KEPARAHAN: readonly Keparahan[] = ['konflik', 'peringatan', 'catatan'];
import {
  RUJUKAN_ANDAIAN,
  RUJUKAN_HARI_INI,
  ambilRujukan,
  angkaTelanjang,
  teksPolos,
} from './rujukan.ts';
import { tanggalId } from '../format.ts';

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
/** Tanggal ISO di mana pun di dalam kalimat, bukan hanya seluruh nilainya. */
const POLA_TANGGAL_DI_TEKS = /\d{4}-\d{2}-\d{2}/;

/** Batas panjang teks kartu, diukur atas teks polos sesudah `[[…|…]]` dilepas (D-13d). */
const MAKS_AWAM = 220;
/**
 * Batas panjang baris kepala kartu (A2-T1).
 *
 * Kepala dirender satu baris dengan elipsis; lebih dari ini ia terpotong di
 * layar 375 px dan pemain kehilangan tanggal terbitnya. "Dihitung dari data
 * harga · 1 Agu – 8 Okt 2025" butuh 402 px di ruang 341 px — itu yang terjadi
 * sebelum aturan ini ada. Rentang tanggal yang panjang masuk ke kalimat kartu,
 * bukan ke kepalanya (`docs/kasus-dada-v2.md`, aturan penulisan 7).
 */
const MAKS_KEPALA = 36;

/* --- v3: pesan teman, judul pertanyaan, petunjuk (D-2) ------------------- */
/** Kalimat layar pertama; satu kalimat, bukan paragraf. */
const MAKS_KALIMAT_PEMBUKA = 160;
/** Pesan obrolan: panjang yang masih terbaca sekali lihat di 360 px. */
const MAKS_PESAN = 220;
/** Judul pertanyaan satu baris. */
const MAKS_TANYA = 60;
const MIN_NAMA = 2;
const MAKS_NAMA = 12;
/** Nama pengirim: huruf saja (boleh spasi di tengah), tanpa angka atau tanda. */
const POLA_NAMA = /^[A-Za-z][A-Za-z ]*[A-Za-z]$/;
/** Jam `HH.MM` 24 jam, dengan titik — bukan titik dua. */
const POLA_JAM = /^([01]\d|2[0-3])\.[0-5]\d$/;
/** Tanda tebal Markdown `**...**` di dalam teks yang harus polos. */
const POLA_TEBAL = /\*\*[^*]+\*\*/;
/** Kartu per soal (D-1). */
const MIN_KARTU = 2;
const MAKS_KARTU = 4;
/** Istilah per soal (D-1). */
const MAKS_ISTILAH = 2;
/** Kartu penentu per soal (A1-T1). */
const MIN_PENENTU = 1;
const MAKS_PENENTU = 2;
/**
 * Kepala lembar bergaris putus-putus wajib berbunyi begini. Garis kepala
 * memberi tahu pemain siapa yang mengumumkan angkanya; kalau kepalanya tidak
 * mengatakan hal yang sama, garis itu berbohong (`docs/desain.md`).
 */
const KEPALA_HITUNG = 'Dihitung dari';
/** Selisih panjang opsi terpanjang dan terpendek, sebagai porsi dari yang terpanjang (D-2). */
const MAKS_TIMPANG = 0.4;
/** Label opsi wajib (D-2): dua "Betul," dan dua "Keliru,". */
const LABEL_BETUL = 'Betul,';
const LABEL_KELIRU = 'Keliru,';
const OPSI_PER_LABEL = 2;

/**
 * Seberapa ketat rujukan di sebuah teks diperiksa (D-13b).
 * - `pemain`  teks yang dilihat sebelum layar pembukaan: fakta wajib TERVERIFIKASI dan tersedia ≤ T.
 * - `kunci`   sama, tetapi pelanggaran tanggal dilaporkan sebagai INV-10 (teks kunci).
 * - `pembukaan` boleh menautkan fakta KONFLIK dan fakta sesudah T.
 */
/**
 * Seberapa ketat sebuah teks diperiksa.
 *
 * `ucapan` (v3) adalah kebalikan dari yang lain: di pesan teman dan di opsi,
 * angka justru HARUS telanjang. Ia ucapan orang, bukan dokumen — menautkannya
 * membuat kabar tampak sudah terverifikasi, dan seluruh gagasan "orang kasih
 * kabar, kita verify" runtuh (INV-4, D-2).
 */
type Ketat = 'pemain' | 'kunci' | 'pembukaan' | 'ucapan';

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

  // Teks yang ditulis penanda `hari-ini` harus benar-benar tanggal beku kasus,
  // supaya penanda itu tidak bisa dipakai menyelundupkan angka lain.
  const tanggalBeku = tanggalId(kasus.tanggal_t);

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

  /*
   * `sumber.keterangan` adalah kalimat "Cara menghitungnya" yang dibaca pemain
   * di panel sumber — bukan catatan pabrik. Uji pemilik di ponsel menemukannya
   * berbunyi "harga penutupan 2025-10-08 dibagi harga penutupan 2025-08-01".
   *
   * Pemeriksaan "tanpa tanggal ISO" yang sudah ada hanya memindai teks layar
   * pembukaan, jadi panel ini lolos begitu saja. Dua aturan di bawah menutup
   * kedua bentuk bahasa mesin yang bisa bocor ke sana: tanggal ISO, dan
   * `fact_id` mentah. Keduanya punya tempatnya sendiri — di dalam lipatan
   * "Rincian teknis".
   */
  for (const fakta of kasus.fakta) {
    const keterangan = fakta.sumber.keterangan;
    if (keterangan === null) continue;
    const tanggalMesin = POLA_TANGGAL_DI_TEKS.exec(keterangan);
    if (tanggalMesin !== null) {
      tambah(
        masalah,
        'KETERANGAN_TANGGAL_MESIN',
        `Keterangan fakta "${fakta.fact_id}" memuat tanggal mesin "${tanggalMesin[0]}"; ` +
          `pemain membacanya di panel sumber, jadi ia harus berbahasa orang ` +
          `(pakai tanggalId()). Keterangan: "${keterangan}"`,
      );
    }
    for (const lain of kasus.fakta) {
      if (keterangan.includes(lain.fact_id)) {
        tambah(
          masalah,
          'KETERANGAN_KODE_FAKTA',
          `Keterangan fakta "${fakta.fact_id}" menyebut kode fakta "${lain.fact_id}" mentah-mentah; ` +
            `sebut isinya dalam bahasa orang. Keterangan: "${keterangan}"`,
        );
        break;
      }
    }
  }

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
  // Aturan 11 (D-13b) ikut di sini: fakta yang ditautkan dari teks yang dilihat
  // pemain sebelum layar pembukaan wajib TERVERIFIKASI dan tersedia ≤ T,
  // walaupun ia tidak terdaftar sebagai kartu.
  const periksaTeks = (teks: string, dirujukOleh: string, ketat: Ketat): void => {
    if (ketat === 'ucapan') {
      for (const rujukan of ambilRujukan(teks)) {
        tambah(
          masalah,
          'UCAPAN_BERTAUT',
          `Teks di ${dirujukOleh} menautkan fakta "${rujukan.fact_id}". Ini ucapan orang, ` +
            `bukan dokumen: angkanya tidak ditautkan dan tidak ditebalkan (INV-4).`,
        );
      }
      // Angka telanjang memang yang diharapkan di sini; tidak diperiksa.
      return;
    }
    for (const rujukan of ambilRujukan(teks)) {
      if (rujukan.fact_id === RUJUKAN_ANDAIAN) continue;
      if (rujukan.fact_id === RUJUKAN_HARI_INI) {
        if (rujukan.teks !== tanggalBeku) {
          tambah(
            masalah,
            'HARI_INI_TAK_COCOK',
            `Penanda hari-ini di ${dirujukOleh} menulis "${rujukan.teks}", padahal tanggal beku kasus "${tanggalBeku}".`,
          );
        }
        continue;
      }
      periksaId(rujukan.fact_id, dirujukOleh);
      if (ketat === 'pembukaan') continue;
      const fakta = indeksFakta.get(rujukan.fact_id);
      if (fakta === undefined) continue;
      if (fakta.status !== 'TERVERIFIKASI') {
        tambah(
          masalah,
          'TAUTAN_KONFLIK',
          `Teks di ${dirujukOleh} menautkan fakta "${rujukan.fact_id}" yang berstatus ${fakta.status}; ` +
            'di luar layar pembukaan hanya fakta TERVERIFIKASI boleh ditautkan.',
        );
      }
      if (fakta.tersedia_sejak === null || fakta.tersedia_sejak > kasus.tanggal_t) {
        const kapan = fakta.tersedia_sejak ?? 'tidak diketahui';
        if (ketat === 'kunci') {
          tambah(
            masalah,
            'KUNCI_SESUDAH_T',
            `Teks kunci di ${dirujukOleh} menautkan fakta "${rujukan.fact_id}" yang baru tersedia ${kapan}, ` +
              `sesudah tanggal beku ${kasus.tanggal_t} (INV-10).`,
          );
        } else {
          tambah(
            masalah,
            'TAUTAN_SESUDAH_T',
            `Teks di ${dirujukOleh} menautkan fakta "${rujukan.fact_id}" yang baru tersedia ${kapan}, ` +
              `sesudah tanggal beku ${kasus.tanggal_t}.`,
          );
        }
      }
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

  // --- layar pertama (v3: satu kalimat) -----------------------------------
  periksaTeks(kasus.pembuka.kalimat, 'pembuka (kalimat)', 'pemain');
  if (kasus.pembuka.kalimat.trim() === '') {
    tambah(masalah, 'PEMBUKA_KOSONG', 'Layar pertama tidak punya kalimat pembuka.');
  }
  if (teksPolos(kasus.pembuka.kalimat).length > MAKS_KALIMAT_PEMBUKA) {
    tambah(
      masalah,
      'PEMBUKA_PANJANG',
      `Kalimat layar pertama ${String(teksPolos(kasus.pembuka.kalimat).length)} karakter, ` +
        `lebih dari ${String(MAKS_KALIMAT_PEMBUKA)}.`,
    );
  }

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
  /** Gabungan seluruh `kartu`; D-1 menuntut ia sama persis dengan `fakta_terlihat`. */
  const semuaKartu = new Set<string>();

  for (const [nomorSoal, soal] of kasus.soal.entries()) {
    if (kunciSoal.has(soal.soal_id)) {
      tambah(masalah, 'SOAL_GANDA', `soal_id "${soal.soal_id}" muncul lebih dari sekali.`);
    }
    kunciSoal.add(soal.soal_id);
    periksaSoal(soal, masalah);
    periksaPesan(soal, masalah);
    periksaTanya(soal, masalah);
    periksaPetunjuk(soal, nomorSoal, masalah);
    periksaOpsiPolos(soal, masalah);
    periksaKartu(kasus, soal, indeksFakta, terlihat, masalah);
    periksaIstilah(soal, masalah);
    periksaOpsi(soal, masalah);

    for (const id of soal.kartu) semuaKartu.add(id);

    periksaTeks(soal.pesan.isi, `soal "${soal.soal_id}" (pesan)`, 'ucapan');
    periksaTeks(soal.tanya, `soal "${soal.soal_id}" (tanya)`, 'pemain');
    if (soal.petunjuk !== null) {
      periksaTeks(soal.petunjuk, `soal "${soal.soal_id}" (petunjuk)`, 'pemain');
    }
    periksaTeks(soal.penjelasan, `soal "${soal.soal_id}" (penjelasan)`, 'kunci');
    for (const pilihan of soal.pilihan) {
      periksaTeks(pilihan.teks, `soal "${soal.soal_id}" (pilihan ${pilihan.kunci})`, 'pemain');
    }
    for (const id of soal.kartu) {
      const awam = indeksFakta.get(id)?.awam;
      if (awam === undefined || awam === null) continue;
      periksaTeks(awam.isi, `kartu "${id}" di soal "${soal.soal_id}" (teks awam)`, 'pemain');
    }

    for (const id of soal.fact_ids) {
      periksaId(id, `soal "${soal.soal_id}"`);
      periksaTerlihat(id, `soal "${soal.soal_id}"`);
      const fakta = indeksFakta.get(id);
      // TIDAK_LENGKAP (M2a D-1) sama terlarangnya dengan KONFLIK sebagai dasar
      // jawaban: "datanya tidak cukup" bukan jawaban yang bisa dinilai benar.
      if (fakta !== undefined && (fakta.status === 'KONFLIK' || fakta.status === 'TIDAK_LENGKAP')) {
        tambah(
          masalah,
          'FAKTA_KONFLIK_DIPAKAI',
          `Fakta "${id}" berstatus ${fakta.status} tetapi dipakai sebagai dasar jawaban soal "${soal.soal_id}".`,
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

  // D-2 aturan 8: tidak ada fakta terlihat yang menganggur.
  for (const id of kasus.fakta_terlihat) {
    if (!semuaKartu.has(id)) {
      tambah(
        masalah,
        'TERLIHAT_TAK_TERPAKAI',
        `Fakta "${id}" ada di fakta_terlihat tetapi tidak dipakai sebagai kartu oleh soal mana pun.`,
      );
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
    periksaTeks(paragraf, `pembukaan (paragraf ke-${String(nomor + 1)})`, 'pembukaan');
  }
  const bagianPembukaan: Array<[string, string[]]> = [
    ['bisa_dibaca', kasus.pembukaan.bisa_dibaca],
    ['tidak_bisa_dibaca', kasus.pembukaan.tidak_bisa_dibaca],
    ['disingkirkan', kasus.pembukaan.disingkirkan],
  ];
  for (const [nama, baris] of bagianPembukaan) {
    if (baris.length === 0) {
      tambah(
        masalah,
        'PEMBUKAAN_TAK_LENGKAP',
        `Layar pembukaan tidak memuat satu butir pun di "${nama}".`,
      );
    }
    for (const [nomor, teks] of baris.entries()) {
      periksaTeks(teks, `pembukaan (${nama} ke-${String(nomor + 1)})`, 'pembukaan');
    }
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
    if (!SEMUA_KODE_ATURAN.includes(temuan.aturan)) {
      tambah(
        masalah,
        'TEMUAN_ATURAN_TAK_DIKENAL',
        `Temuan "${temuan.temuan_id}" menyebut aturan "${temuan.aturan}" yang tidak ada di skema.`,
      );
    }
    // M2a D-1: medan opsional. Tidak ada = `konflik`; ada tetapi bukan salah
    // satu dari tiga nilai = berkas kasus tidak sah.
    if (temuan.keparahan !== undefined && !KEPARAHAN.includes(temuan.keparahan)) {
      tambah(
        masalah,
        'TEMUAN_KEPARAHAN_TAK_DIKENAL',
        `Temuan "${temuan.temuan_id}" menyebut keparahan "${String(temuan.keparahan)}"; ` +
          `yang sah hanya ${KEPARAHAN.join(', ')}.`,
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
    ['pembuka (kalimat)', kasus.pembuka.kalimat],
    ...kasus.fakta.map((f): [string, string] => [`fakta "${f.fact_id}"`, f.klaim]),
    ...kasus.fakta
      .filter((f) => f.awam !== null)
      .map((f): [string, string] => [`kartu "${f.fact_id}" (teks awam)`, f.awam?.isi ?? '']),
    ...kasus.soal.flatMap((s): Array<[string, string]> => [
      [`soal "${s.soal_id}" (pesan)`, s.pesan.isi],
      [`soal "${s.soal_id}" (tanya)`, s.tanya],
      [`soal "${s.soal_id}" (penjelasan)`, s.penjelasan],
      ...s.istilah.map((i): [string, string] => [`soal "${s.soal_id}" (istilah ${i.kata})`, i.arti]),
      ...s.pilihan.map((p): [string, string] => [
        `soal "${s.soal_id}" (pilihan ${p.kunci})`,
        p.teks,
      ]),
    ]),
    ...kasus.pembukaan.paragraf.map((p, i): [string, string] => [
      `pembukaan (paragraf ke-${String(i + 1)})`,
      p,
    ]),
    ...kasus.pembukaan.bisa_dibaca.map((p, i): [string, string] => [
      `pembukaan (bisa_dibaca ke-${String(i + 1)})`,
      p,
    ]),
    ...kasus.pembukaan.tidak_bisa_dibaca.map((p, i): [string, string] => [
      `pembukaan (tidak_bisa_dibaca ke-${String(i + 1)})`,
      p,
    ]),
    ...kasus.pembukaan.disingkirkan.map((p, i): [string, string] => [
      `pembukaan (disingkirkan ke-${String(i + 1)})`,
      p,
    ]),
    ...kasus.temuan.map((t): [string, string] => [`temuan "${t.temuan_id}"`, t.ringkasan]),
  ];
  for (const [tempat, teks] of semuaTeks) {
    if (kasus.disclaimer.includes(teks)) continue;
    const cocok = ajakanBertransaksi(teks);
    if (cocok !== null) {
      tambah(
        masalah,
        'AJAKAN_TRANSAKSI',
        `Kalimat di ${tempat} memuat ajakan bertransaksi: "${cocok}".`,
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

/**
 * INV-5: tidak ada kalimat yang mengajak pembaca bertransaksi.
 *
 * Pola versi pertama mencocokkan kata "beli"/"jual" telanjang. Itu menyalakan
 * alarm palsu begitu kasus ditulis dalam bahasa sehari-hari, karena dalam bahasa
 * Indonesia keduanya juga kata benda yang lumrah: "jual-beli" berarti
 * perdagangan, "sisi jual" berarti pihak penjual. Yang dijaga INV-5 adalah
 * kalimat yang **menyuruh pembaca**, jadi itulah yang dicocokkan sekarang:
 * kata yang tidak punya arti lain, ajakan yang diarahkan ke pembaca, dan
 * kalimat perintah di awal kalimat. Tesnya ada di `validator.test.ts`
 * ("INV-5 ajakan bertransaksi"), lengkap dengan kalimat yang harus lolos
 * dan kalimat yang harus tertangkap.
 */
const POLA_AJAKAN: readonly RegExp[] = [
  // Kata yang di pasar modal tidak punya arti lain selain ajakan.
  /\b(borong|akumulasi|cut loss|take profit|target harga|layak dikoleksi|wajib punya|belilah|juallah)\b/i,
  // Ajakan yang diarahkan ke pembaca.
  /\b(sebaiknya|ayo|yuk|mending|segera|buruan|wajib|harus)\s+(di)?(beli|jual)\b/i,
  /\b(beli|jual)\s+(sekarang|selagi|mumpung)\b/i,
  /\brekomendasi\s+(beli|jual)\b/i,
  /*
   * Kalimat perintah di awal kalimat mana pun **di dalam** paragraf, bukan
   * hanya di awal teks (A1-T8, menutup F-6). `[.!?]` diikuti spasi menandai
   * awal kalimat berikutnya; `^` tetap menangkap kalimat pertama.
   */
  /(^|[.!?]\s+)(beli|jual|borong)\b/i,
];

/**
 * Kata benda majemuk yang kebetulan diawali "jual" atau "beli", dan `fact_id`
 * di dalam tanda tautan. Keduanya dilepas dari teks sebelum pencocokan supaya
 * "Jual-beli saham ini disetop bursa." tidak dibaca sebagai perintah,
 * sementara "Jual saja seluruhnya." tetap tertangkap.
 *
 * Inilah dua positif palsu yang diperbaiki di T-01+T-02 dan tidak boleh hidup
 * lagi ketika INV-5 dipulihkan.
 */
const BUKAN_PERINTAH = /\b(jual-beli|beli-jual)\b/gi;

/**
 * Potongan kalimat yang mengajak bertransaksi, atau `null` kalau bersih.
 * Diperiksa atas teks **polos**: `fact_id` di dalam `[[…|…]]` bukan kalimat yang
 * dibaca siapa pun, dan id seperti `jumlah-jual-terverifikasi` tidak boleh
 * dianggap ajakan.
 */
export function ajakanBertransaksi(teks: string): string | null {
  const dibaca = teksPolos(teks).replace(BUKAN_PERINTAH, 'perdagangan');
  for (const pola of POLA_AJAKAN) {
    const cocok = pola.exec(dibaca);
    if (cocok !== null) return cocok[0].trim();
  }
  return null;
}

/**
 * D-2 aturan 1, 3, 5, 6, 7, dan kesamaan `kartu` ⊆ `fakta_terlihat` dari D-1.
 * Kartu adalah satu-satunya fakta yang dibaca pemain sebagai dokumen resmi, jadi
 * di sinilah syaratnya paling ketat.
 */
function periksaKartu(
  kasus: Kasus,
  soal: Soal,
  indeksFakta: Map<string, Kasus['fakta'][number]>,
  terlihat: Set<string>,
  masalah: MasalahValidasi[],
): void {
  if (soal.kartu.length < MIN_KARTU || soal.kartu.length > MAKS_KARTU) {
    tambah(
      masalah,
      'KARTU_JUMLAH',
      `Soal "${soal.soal_id}" membawa ${String(soal.kartu.length)} kartu; yang diizinkan ${String(MIN_KARTU)}–${String(MAKS_KARTU)}.`,
    );
  }

  for (const id of soal.kartu) {
    const fakta = indeksFakta.get(id);
    if (fakta === undefined) {
      tambah(
        masalah,
        'KARTU_MENGGANTUNG',
        `Kartu "${id}" di soal "${soal.soal_id}" tidak ada di daftar fakta kasus ini.`,
      );
      continue;
    }

    if (fakta.status !== 'TERVERIFIKASI') {
      tambah(
        masalah,
        'KARTU_TAK_TERVERIFIKASI',
        `Kartu "${id}" di soal "${soal.soal_id}" berstatus ${fakta.status}; kartu wajib TERVERIFIKASI.`,
      );
    }

    if (fakta.tersedia_sejak === null) {
      tambah(
        masalah,
        'KARTU_TANPA_TANGGAL',
        `Kartu "${id}" di soal "${soal.soal_id}" tidak punya tersedia_sejak, jadi tidak bisa dipastikan publik tahu hari itu.`,
      );
    } else if (fakta.tersedia_sejak > kasus.tanggal_t) {
      tambah(
        masalah,
        'KARTU_SESUDAH_T',
        `Kartu "${id}" di soal "${soal.soal_id}" baru tersedia ${fakta.tersedia_sejak}, sesudah tanggal beku ${kasus.tanggal_t}.`,
      );
    }

    if (fakta.awam === null) {
      tambah(
        masalah,
        'KARTU_TANPA_AWAM',
        `Kartu "${id}" di soal "${soal.soal_id}" tidak punya teks awam; kartu tanpa bahasa sehari-hari tidak boleh tampil.`,
      );
    } else {
      const panjang = teksPolos(fakta.awam.isi).length;
      if (panjang > MAKS_AWAM) {
        tambah(
          masalah,
          'KARTU_AWAM_PANJANG',
          `Teks awam kartu "${id}" di soal "${soal.soal_id}" ${String(panjang)} karakter (polos), lebih dari ${String(MAKS_AWAM)}.`,
        );
      }
      if (fakta.awam.kepala.trim() === '') {
        tambah(
          masalah,
          'KARTU_TANPA_AWAM',
          `Kartu "${id}" di soal "${soal.soal_id}" punya baris kepala kosong.`,
        );
      }
      if (fakta.awam.kepala.length > MAKS_KEPALA) {
        tambah(
          masalah,
          'KEPALA_PANJANG',
          `Baris kepala kartu "${id}" di soal "${soal.soal_id}" ${String(fakta.awam.kepala.length)} ` +
            `karakter, lebih dari ${String(MAKS_KEPALA)}; ia akan terpotong satu baris di layar 375 px.`,
        );
      }
    }

    if (!terlihat.has(id)) {
      tambah(
        masalah,
        'KARTU_TAK_TERLIHAT',
        `Kartu "${id}" di soal "${soal.soal_id}" tidak terdaftar di fakta_terlihat; D-1 menuntut keduanya sama.`,
      );
    }

    periksaKepalaGaris(fakta, soal, masalah);
  }

  periksaKartuPenentu(soal, masalah);
}

/**
 * Garis kepala lembar dipilih mesin dari `sumber.jenis`, tetapi kepalanya
 * ditulis manusia. Kalau keduanya tidak sepakat, pemain melihat garis
 * putus-putus di atas kalimat yang mengaku laporan resmi — atau sebaliknya.
 * Dua arah, dua kode, supaya masing-masing bisa dibuktikan sendiri.
 */
function periksaKepalaGaris(
  fakta: Kasus['fakta'][number],
  soal: Soal,
  masalah: MasalahValidasi[],
): void {
  const kepala = fakta.awam?.kepala;
  if (kepala === undefined || kepala === null) return;
  const dihitung = fakta.sumber.jenis === 'turunan';
  const mengaku = kepala.startsWith(KEPALA_HITUNG);

  if (dihitung && !mengaku) {
    tambah(
      masalah,
      'KEPALA_HITUNG_HILANG',
      `Kartu "${fakta.fact_id}" di soal "${soal.soal_id}" dihitung sendiri (sumber.jenis "turunan") ` +
        `sehingga garis kepalanya putus-putus, tetapi kepalanya berbunyi "${kepala}" — ` +
        `kepala lembar bergaris putus-putus wajib diawali "${KEPALA_HITUNG}".`,
    );
  }
  if (!dihitung && mengaku) {
    tambah(
      masalah,
      'KEPALA_HITUNG_PALSU',
      `Kartu "${fakta.fact_id}" di soal "${soal.soal_id}" berkepala "${kepala}" seolah kami yang ` +
        `menghitungnya, padahal sumbernya "${fakta.sumber.jenis}" sehingga garis kepalanya utuh.`,
    );
  }
}

/** A1-T1: 1–2 kartu penentu, dan semuanya harus benar-benar kartu soal itu. */
function periksaKartuPenentu(soal: Soal, masalah: MasalahValidasi[]): void {
  if (soal.kartu_penentu.length < MIN_PENENTU || soal.kartu_penentu.length > MAKS_PENENTU) {
    tambah(
      masalah,
      'KARTU_PENENTU_JUMLAH',
      `Soal "${soal.soal_id}" menyebut ${String(soal.kartu_penentu.length)} kartu penentu; ` +
        `yang diizinkan ${String(MIN_PENENTU)}–${String(MAKS_PENENTU)}. ` +
        'Kalau semua kartu menentukan, tidak ada yang menentukan.',
    );
  }
  for (const id of soal.kartu_penentu) {
    if (!soal.kartu.includes(id)) {
      tambah(
        masalah,
        'KARTU_PENENTU_BUKAN_KARTU',
        `Kartu penentu "${id}" di soal "${soal.soal_id}" bukan salah satu kartu soal itu.`,
      );
    }
  }
}

/** D-2 aturan 2. */
function periksaIstilah(soal: Soal, masalah: MasalahValidasi[]): void {
  if (soal.istilah.length > MAKS_ISTILAH) {
    tambah(
      masalah,
      'ISTILAH_TERLALU_BANYAK',
      `Soal "${soal.soal_id}" memuat ${String(soal.istilah.length)} istilah; paling banyak ${String(MAKS_ISTILAH)}.`,
    );
  }
  for (const istilah of soal.istilah) {
    if (istilah.arti.trim() === '') {
      tambah(
        masalah,
        'ISTILAH_TANPA_ARTI',
        `Istilah "${istilah.kata}" di soal "${soal.soal_id}" tidak punya arti; istilah tanpa penjelasan menguji hafalan.`,
      );
    }
    if (istilah.kata.trim() === '') {
      tambah(
        masalah,
        'ISTILAH_TANPA_ARTI',
        `Soal "${soal.soal_id}" memuat istilah tanpa kata.`,
      );
    }
  }
}

/** D-2 aturan 4 dan 10: label dua-dua, dan panjang yang tidak membocorkan jawaban. */
function periksaOpsi(soal: Soal, masalah: MasalahValidasi[]): void {
  let betul = 0;
  let keliru = 0;
  for (const pilihan of soal.pilihan) {
    const teks = teksPolos(pilihan.teks);
    if (teks.startsWith(LABEL_BETUL)) betul += 1;
    else if (teks.startsWith(LABEL_KELIRU)) keliru += 1;
    else {
      tambah(
        masalah,
        'OPSI_TANPA_LABEL',
        `Pilihan "${pilihan.kunci}" soal "${soal.soal_id}" tidak diawali "${LABEL_BETUL}" atau "${LABEL_KELIRU}".`,
      );
    }
  }
  if (betul !== OPSI_PER_LABEL || keliru !== OPSI_PER_LABEL) {
    tambah(
      masalah,
      'OPSI_TAK_DUA_DUA',
      `Soal "${soal.soal_id}" memuat ${String(betul)} opsi "${LABEL_BETUL}" dan ${String(keliru)} opsi "${LABEL_KELIRU}"; ` +
        `perbandingannya harus ${String(OPSI_PER_LABEL)}–${String(OPSI_PER_LABEL)} supaya "jawab Keliru saja" bukan strategi.`,
    );
  }

  const panjang = soal.pilihan.map((p) => teksPolos(p.teks).length);
  const terpanjang = Math.max(...panjang);
  const terpendek = Math.min(...panjang);
  if (terpanjang > 0) {
    const timpang = (terpanjang - terpendek) / terpanjang;
    if (timpang > MAKS_TIMPANG) {
      tambah(
        masalah,
        'OPSI_PANJANG_TIMPANG',
        `Opsi soal "${soal.soal_id}" timpang: terpanjang ${String(terpanjang)} karakter, terpendek ${String(terpendek)}, ` +
          `selisihnya ${String(Math.round(timpang * 100))} persen dari yang terpanjang (batas ${String(Math.round(MAKS_TIMPANG * 100))} persen).`,
      );
    }
  }
}

/*
 * --- v3: pesan teman, judul pertanyaan, petunjuk (D-2) --------------------
 *
 * Ketiganya dibaca pemain sebagai hal yang berbeda, jadi ketiganya dijaga
 * terpisah. Yang paling mudah rusak diam-diam adalah aturan INV-4 di pesan:
 * angka di dalam ucapan orang **bukan** fakta, jadi ia tidak boleh ditebalkan
 * maupun ditautkan. Tanda `[[...]]` boleh ada di data sebagai jejak, tetapi
 * kalau ia sampai dirender, pesan teman berubah menjadi dokumen — dan seluruh
 * gagasan "kabar lawan bukti" runtuh.
 */
function periksaPesan(soal: Soal, masalah: MasalahValidasi[]): void {
  const { nama, jam, isi } = soal.pesan;

  if (nama.length < MIN_NAMA || nama.length > MAKS_NAMA || !POLA_NAMA.test(nama)) {
    tambah(
      masalah,
      'PESAN_NAMA',
      `Nama pengirim soal "${soal.soal_id}" adalah "${nama}"; harus ${String(MIN_NAMA)}–${String(MAKS_NAMA)} huruf, ` +
        `huruf saja.`,
    );
  }

  if (!POLA_JAM.test(jam)) {
    tambah(
      masalah,
      'PESAN_JAM',
      `Jam pesan soal "${soal.soal_id}" adalah "${jam}"; harus berbentuk HH.MM (24 jam, memakai titik).`,
    );
  }

  const polos = teksPolos(isi);
  if (polos.trim() === '') {
    tambah(masalah, 'PESAN_KOSONG', `Pesan soal "${soal.soal_id}" kosong.`);
  }
  if (polos.length > MAKS_PESAN) {
    tambah(
      masalah,
      'PESAN_PANJANG',
      `Pesan soal "${soal.soal_id}" ${String(polos.length)} karakter polos, lebih dari ${String(MAKS_PESAN)}.`,
    );
  }
  if (POLA_TEBAL.test(isi)) {
    tambah(
      masalah,
      'PESAN_DITEBALKAN',
      `Pesan soal "${soal.soal_id}" memuat tanda tebal. Angka di dalam ucapan orang adalah ucapan, ` +
        `bukan fakta (INV-4): ia tidak ditebalkan, tidak diwarnai, tidak ditautkan.`,
    );
  }
}

function periksaTanya(soal: Soal, masalah: MasalahValidasi[]): void {
  const polos = teksPolos(soal.tanya);
  if (polos.trim() === '') {
    tambah(masalah, 'TANYA_KOSONG', `Soal "${soal.soal_id}" tidak punya judul pertanyaan.`);
  }
  if (polos.length > MAKS_TANYA) {
    tambah(
      masalah,
      'TANYA_PANJANG',
      `Judul pertanyaan soal "${soal.soal_id}" ${String(polos.length)} karakter, ` +
        `lebih dari ${String(MAKS_TANYA)}; ia harus muat satu baris.`,
    );
  }
  // Nama pengirimnya harus muncul: "Omongan {nama} cocok dengan dokumennya?"
  if (!polos.includes(soal.pesan.nama)) {
    tambah(
      masalah,
      'TANYA_TANPA_NAMA',
      `Judul pertanyaan soal "${soal.soal_id}" tidak menyebut "${soal.pesan.nama}"; ` +
        `pemain harus tahu omongan siapa yang sedang dicek.`,
    );
  }
}

function periksaPetunjuk(soal: Soal, nomor: number, masalah: MasalahValidasi[]): void {
  const pertama = nomor === 0;
  if (!pertama && soal.petunjuk !== null) {
    tambah(
      masalah,
      'PETUNJUK_BUKAN_SOAL_PERTAMA',
      `Soal "${soal.soal_id}" bukan soal pertama tetapi punya petunjuk; cara main hanya diberikan sekali.`,
    );
  }
  if (pertama && (soal.petunjuk === null || soal.petunjuk.trim() === '')) {
    tambah(
      masalah,
      'PETUNJUK_HILANG',
      `Soal pertama "${soal.soal_id}" tidak punya petunjuk; layar pertama tidak lagi memuat aturan main.`,
    );
  }
}

/** Opsi juga ucapan pemain, bukan dokumen: tidak ditebalkan, tidak ditautkan. */
function periksaOpsiPolos(soal: Soal, masalah: MasalahValidasi[]): void {
  for (const pilihan of soal.pilihan) {
    if (POLA_TEBAL.test(pilihan.teks)) {
      tambah(
        masalah,
        'OPSI_DITEBALKAN',
        `Opsi ${pilihan.kunci} soal "${soal.soal_id}" memuat tanda tebal; opsi ditulis polos.`,
      );
    }
  }
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
