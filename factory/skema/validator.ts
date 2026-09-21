import type { Kasus, MasalahValidasi, Soal } from './tipe.ts';
import { SEMUA_ATURAN, VERSI_SKEMA } from './tipe.ts';
import {
  RUJUKAN_ANDAIAN,
  RUJUKAN_HARI_INI,
  ambilRujukan,
  angkaTelanjang,
  teksPolos,
} from './rujukan.ts';
import { tanggalId } from '../format.ts';

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

/** Batas panjang teks kartu, diukur atas teks polos sesudah `[[…|…]]` dilepas (D-13d). */
const MAKS_AWAM = 220;
/** Kartu per soal (D-1). */
const MIN_KARTU = 2;
const MAKS_KARTU = 4;
/** Istilah per soal (D-1). */
const MAKS_ISTILAH = 2;
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
type Ketat = 'pemain' | 'kunci' | 'pembukaan';

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

  // --- layar pertama ------------------------------------------------------
  periksaTeks(kasus.pembuka.hook, 'pembuka (hook)', 'pemain');
  if (kasus.pembuka.aturan.length !== 3) {
    tambah(
      masalah,
      'PEMBUKA_ATURAN',
      `Layar pertama harus memuat tepat tiga baris aturan main, ditemukan ${String(kasus.pembuka.aturan.length)}.`,
    );
  }
  for (const [nomor, baris] of kasus.pembuka.aturan.entries()) {
    periksaTeks(baris, `pembuka (aturan ke-${String(nomor + 1)})`, 'pemain');
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

  for (const soal of kasus.soal) {
    if (kunciSoal.has(soal.soal_id)) {
      tambah(masalah, 'SOAL_GANDA', `soal_id "${soal.soal_id}" muncul lebih dari sekali.`);
    }
    kunciSoal.add(soal.soal_id);
    periksaSoal(soal, masalah);
    periksaKartu(kasus, soal, indeksFakta, terlihat, masalah);
    periksaIstilah(soal, masalah);
    periksaOpsi(soal, masalah);

    for (const id of soal.kartu) semuaKartu.add(id);

    periksaTeks(soal.batang, `soal "${soal.soal_id}" (batang)`, 'pemain');
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
    ['pembuka (hook)', kasus.pembuka.hook],
    ...kasus.pembuka.aturan.map((a, i): [string, string] => [
      `pembuka (aturan ke-${String(i + 1)})`,
      a,
    ]),
    ...kasus.fakta.map((f): [string, string] => [`fakta "${f.fact_id}"`, f.klaim]),
    ...kasus.fakta
      .filter((f) => f.awam !== null)
      .map((f): [string, string] => [`kartu "${f.fact_id}" (teks awam)`, f.awam?.isi ?? '']),
    ...kasus.soal.flatMap((s): Array<[string, string]> => [
      [`soal "${s.soal_id}" (batang)`, s.batang],
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
  // Kalimat perintah: "Beli saham ini." / "Jual saja."
  /(^|[.!?]\s+)(beli|jual|borong)\b/i,
];

/**
 * Potongan kalimat yang mengajak bertransaksi, atau `null` kalau bersih.
 * Diperiksa atas teks **polos**: `fact_id` di dalam `[[…|…]]` bukan kalimat yang
 * dibaca siapa pun, dan id seperti `jumlah-jual-terverifikasi` tidak boleh
 * dianggap ajakan.
 */
export function ajakanBertransaksi(teks: string): string | null {
  const dibaca = teksPolos(teks);
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
    }

    if (!terlihat.has(id)) {
      tambah(
        masalah,
        'KARTU_TAK_TERLIHAT',
        `Kartu "${id}" di soal "${soal.soal_id}" tidak terdaftar di fakta_terlihat; D-1 menuntut keduanya sama.`,
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
