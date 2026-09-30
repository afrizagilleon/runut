/**
 * G-penilaian (M2d-5 D-5): pesan teman tidak boleh memuat PENILAIAN
 * investasi atau AJAKAN yang tidak bisa dicek dari kartu — apa pun kuncinya.
 * Milik PEMERIKSA (kode): tanpa jaringan, tanpa jam, tanpa acak.
 *
 * Kenapa: di M2d-4 ULTJ omongan 1 ("Dividen … ga pernah bolos. Aman lah.")
 * lolos semua penilai dengan kunci "Betul" — pemain yang memilih "Betul"
 * seolah ikut menyetujui bahwa saham itu aman, padahal kartu hanya mencatat
 * pembagian dividen. Produk ini tidak menilai saham (K-05 aturan 7); omongan
 * teman yang MEMUAT penilaian menarik produk ikut menilai lewat kuncinya. Kritikus
 * cek makna menganggap "Aman lah." perasaan, bukan klaim — maka ini ditegakkan
 * kode, bukan model.
 *
 * **Daftar (diturunkan & didokumentasikan).** Tiga golongan, dari daftar
 * kontrak ("aman", "pasti naik", "pasti cuan", "layak beli", "beli aja",
 * "jual aja", "prospek cerah", "sehat", "bagus buat investasi") diperluas ke
 * kerabat yang maknanya sama:
 * 1. rasa aman / mutu saham — aman, sehat, bagus, jelek, buruk, murah, mahal,
 *    prospek, cerah, menjanjikan, potensial, layak beli/dibeli/investasi/…,
 *    worth it, undervalued, overvalued, salah harga, gorengan;
 * 2. kepastian hasil — pasti naik/turun/cuan/untung/rugi/terbang/…, dijamin,
 *    "ga mungkin turun/rugi", cuan, auto cuan, to the moon, untung besar;
 * 3. ajakan — beli/jual/hold/tahan/serok/borong + aja/sekarang/yuk/dong;
 *    buruan/gas/ayo/yuk/mending/sebaiknya/wajib + beli/jual/masuk/serok/…;
 *    serok, borong, all in, hajar.
 * Kata dicocokkan UTUH (juga dengan -nya/-lah/-kah): "keamanan",
 * "kesehatan", "memburuk" tidak ikut.
 *
 * **Pengecualian eksplisit** (`PENGECUALIAN_PENILAIAN`): frasa yang memuat
 * kata daftar tetapi bukan penilaian saham, masing-masing dengan alasannya.
 * Semua pesan manusia di `cases/*.json` lolos (tes).
 */
import { teksPolos } from '../skema/rujukan.ts';

export type GolonganPenilaian = 'rasa aman atau mutu saham' | 'kepastian hasil' | 'ajakan';

export interface PolaPenilaian {
  golongan: GolonganPenilaian;
  pola: RegExp;
}

const B = '(?<![\\p{L}\\p{N}])';
const E = '(?![\\p{L}\\p{N}])';
const akhiran = '(?:nya|lah|kah|an)?';
const pola = (golongan: GolonganPenilaian, inti: string): PolaPenilaian => ({ golongan, pola: new RegExp(`${B}(?:${inti})${E}`, 'giu') });

/** Daftar penilaian/ajakan yang ditolak di pesan teman. */
export const DAFTAR_PENILAIAN: readonly PolaPenilaian[] = [
  pola('rasa aman atau mutu saham', `(?:aman|sehat|bagus|jelek|buruk|murah|mahal|cerah|menjanjikan|potensial|gorengan)${akhiran}`),
  pola('rasa aman atau mutu saham', `prospek${akhiran}`),
  pola('rasa aman atau mutu saham', 'layak\\s+(?:beli|dibeli|investasi|diinvestasikan|dikoleksi|dipegang|dipertimbangkan|masuk|dicicil)'),
  pola('rasa aman atau mutu saham', 'worth(?:\\s+it)?|undervalued|overvalued|salah\\s+harga'),
  pola('kepastian hasil', 'pasti\\s+(?:naik|turun|cuan|untung|rugi|terbang|tembus|balik\\s+modal|nyangkut|anjlok|meroket|jebol|ara|arb|ngegas)'),
  pola('kepastian hasil', `dijamin|jaminan\\s+(?:untung|cuan|naik)`),
  pola('kepastian hasil', '(?:ga|gak|nggak|ngga|enggak|tidak|ndak)\\s+(?:mungkin|bakal|akan)\\s+(?:turun|rugi|jatuh|anjlok|nyangkut|merah)'),
  pola('kepastian hasil', `(?:auto\\s+)?cuan${akhiran}|to\\s+the\\s+moon|untung\\s+besar`),
  pola('ajakan', '(?:beli|jual|hold|tahan|serok|borong|lepas|buang)\\s+(?:aja|ajah|aj|sekarang|yuk|dong)'),
  pola('ajakan', '(?:buruan|gas|ayo|yuk|mending|sebaiknya|wajib)\\s+(?:di)?(?:beli|jual|masuk|serok|borong|hold|tahan|lepas)'),
  pola('ajakan', 'serok|borong|all\\s+in|hajar'),
];

export interface Pengecualian {
  frasa: string;
  alasan: string;
}

/**
 * Pengecualian eksplisit: frasa yang memuat kata daftar tetapi tidak menilai
 * saham. Dihapus dari pesan SEBELUM daftar dicocokkan.
 */
export const PENGECUALIAN_PENILAIAN: readonly Pengecualian[] = [
  {
    frasa: 'kabar buruk',
    alasan:
      'menilai KABAR, bukan saham; dugaan teman "pasti ada kabar buruk" adalah klaim yang dibantah kartu (turunnya harga = dividen). ' +
      'Dipakai soal manusia ULTJ omongan 1 yang disetujui pemilik.',
  },
];

export interface PutusanPenilaian {
  tolak: boolean;
  /** Potongan pesan yang cocok, dengan golongannya. */
  temuan: Array<{ frasa: string; golongan: GolonganPenilaian }>;
  alasan: string[];
}

/** Teks dengan frasa pengecualian dihapus (dipakai juga oleh gerbang kode M2d-8 untuk `KATA_PENILAIAN`). */
export function lepasPengecualian(teks: string): string {
  let t = teks;
  for (const p of PENGECUALIAN_PENILAIAN) {
    t = t.replace(new RegExp(`${B}${p.frasa.replace(/\s+/g, '\\s+')}${E}`, 'giu'), ' ');
  }
  return t;
}

/** G-penilaian atas pesan teman. */
export function gPenilaian(pesan: string): PutusanPenilaian {
  const teks = lepasPengecualian(teksPolos(pesan));
  const temuan: PutusanPenilaian['temuan'] = [];
  for (const p of DAFTAR_PENILAIAN) {
    for (const m of teks.matchAll(p.pola)) {
      const frasa = m[0].replace(/\s+/g, ' ').trim();
      if (!temuan.some((x) => x.frasa.toLowerCase() === frasa.toLowerCase())) temuan.push({ frasa, golongan: p.golongan });
    }
  }
  return {
    tolak: temuan.length > 0,
    temuan,
    alasan:
      temuan.length === 0
        ? []
        : [
            `Pesan teman memuat penilaian/ajakan yang tak bisa dicek kartu: ${temuan.map((t) => `"${t.frasa}" (${t.golongan})`).join(', ')}. ` +
              'Produk ini tidak menilai saham; kalau kuncinya "Betul", pemain seolah ikut menyetujui penilaian itu. ' +
              'Hapus penilaiannya — biarkan teman mengklaim hal yang bisa dicek (angka, tanggal, peristiwa).',
          ],
  };
}
