/**
 * Kontrak bentuk untuk agen penulis (M2d-20).
 *
 * Akar masalah M2d-18/19: agen menemukan aturan bentuk lewat coba-salah
 * berbayar — tiap draf pertama ditolak 12–21 kali, 13 dari 35 panggilan model
 * (US$1,10) hanya memperbaiki bentuk — karena aturan yang DITEGAKKAN kode
 * tidak pernah DIBERITAHUKAN. Berkas ini satu-satunya tempat aturan itu ditulis
 * untuk agen, dan tiap butir menyebut kode penolakan yang diwakilinya, supaya
 * tes bisa memastikan: tidak ada penolakan yang pernah terjadi tanpa butir di
 * sini (`bentuk.test.ts` memutar ulang semua penolakan yang tersimpan).
 *
 * Angka batas diambil dari konstanta kode bila konstanta itu diekspor.
 */
import { batasPanjang } from '../gerbang-gaya.ts';
import { NAMA_KESALAHAN } from '../templat/label.ts';
import { BATAS } from '../validasi.ts';

export interface ButirBentuk {
  /** Pola yang cocok dengan awalan teks penolakan (`sumber: alasan`). */
  kode: readonly RegExp[];
  /** Kalimat untuk agen; `null` = ditangani kode, agen tidak perlu tahu. */
  baris: string | null;
}

/** Batas yang belum diekspor sebagai konstanta (disalin dari pesan penolakan tersimpan; dites lewat putar ulang). */
const UMPAN_BALIK_MAKS = 200;
const RASIO_PANJANG_PILIHAN = '1,6';

export function butirBentuk(): ButirBentuk[] {
  const p = batasPanjang();
  const nama = Object.entries(NAMA_KESALAHAN).map(([k, v]) => `\`${k}\` = "${v}"`).join(', ');
  return [
    { kode: [/^bentuk JSON/], baris: 'Satu omongan = satu objek dengan 12 field seperti contoh: `no`, `nama`, `jam`, `pesan`, `angka_pesan`, `kartu`, `kartu_penentu`, `pilihan` (a–d), `kunci`, `penjelasan`, `pengecoh` (tiga huruf selain kunci), `pertanyaan_cek`.' },
    { kode: [/^pemeriksa: NAMA_TERLARANG/], baris: null },
    { kode: [/^pemeriksa: KARTU_JUMLAH/], baris: `\`kartu\`: ${String(BATAS.kartuMin)}–${String(BATAS.kartuMaks)} id kartu; \`kartu_penentu\`: ${String(BATAS.penentuMin)}–${String(BATAS.penentuMaks)} di antaranya.` },
    { kode: [/^pemeriksa: G-panjang/], baris: `\`pesan\` paling banyak ${String(p.pesan)} kata dan ${String(BATAS.pesan)} karakter; \`jam\` berbentuk HH.MM, ${BATAS.jamMulai} atau lebih.` },
    { kode: [/^pemeriksa: OPSI_TAK_DUA_DUA/, /^detektor D8/], baris: 'Empat pilihan: tepat dua diawali "Betul," dan dua diawali "Keliru,".' },
    { kode: [/^pemeriksa: G-satu-klausa/], baris: 'Tiap pilihan satu klausa: "Betul, …" atau "Keliru, …". Koma kedua hanya untuk kontras (", bukan …", ", tetapi …").' },
    { kode: [/^pemeriksa: OPSI_PANJANG_TIMPANG/, /^detektor D1/], baris: `Tiap pilihan paling banyak ${String(p.pilihan)} kata dan ${String(BATAS.opsi)} karakter, dan panjangnya seragam: yang terpanjang paling banyak ${RASIO_PANJANG_PILIHAN} kali yang terpendek, dan kunci bukan pilihan terpanjang.` },
    { kode: [/^pemeriksa: G-pilihan-kembar/], baris: 'Tidak ada dua pilihan yang isinya sama.' },
    { kode: [/^detektor D5/], baris: 'Pilihan kunci tidak boleh menjadi "titik tengah": jangan biarkan kunci berbagi lebih banyak kata dengan pilihan lain daripada pengecoh mana pun.' },
    { kode: [/^gerbang artefak/], baris: 'Pilihan kunci tidak boleh mengulang kata dari pesan teman yang tidak muncul di pengecoh mana pun; penebak tanpa kartu cukup memilih pilihan yang "meresmikan" omongan teman.' },
    { kode: [/^pemeriksa: ANGKA_TANPA_RUJUKAN/, /^M2d-13: angka-di-kartu/], baris: 'Setiap angka dan tanggal di pilihan, penjelasan, dan umpan balik ditulis sebagai rujukan `[[id_kartu|teks]]`, dan kartu itu ada di `kartu`. Angka yang tidak tertulis di kartu tidak boleh dipakai. `pertanyaan_cek` tanpa angka. Di `penjelasan` jangan menyebut nomor kartu ("kartu 1"): nomor itu terbaca sebagai angka tanpa rujukan; nomor kartu hanya dipakai di `umpan_balik`.' },
    { kode: [/^pemeriksa: ANGKA_TAK_COCOK/], baris: 'Angka yang dirujuk ke sebuah kartu harus persis angka yang tertulis di kartu itu (juga di `angka_pesan`); jangan merujuk angka bulatan atau angka turunanmu sendiri.' },
    { kode: [/^pemeriksa: KUNCI_TAK_TERBUKTI_KARTU/], baris: 'Bila jawabannya "Betul" dan pesan teman memuat angka, kartu asal angka itu harus ada di `kartu` omongan ini.' },
    { kode: [/^detektor D7/], baris: 'Kata pelunak (sekitar, kira-kira, hampir, kurang lebih) tidak boleh hanya muncul di pengecoh atau hanya di kunci.' },
    { kode: [/^pemeriksa: RUJUKAN_PANJANG/], baris: `Teks di dalam rujukan paling banyak ${String(BATAS.label)} karakter.` },
    { kode: [/^pemeriksa: ANGKA_PESAN_TANPA_JEJAK/], baris: 'Setiap angka di `pesan` dicatat di `angka_pesan`: `{"teks": "…", "fact_id": "id_kartu"}`, dan angka itu harus ada di kartu omongan ini. Angka karangan teman yang tidak ada di kartu mana pun tidak diterima.' },
    { kode: [/^detektor D9/], baris: 'Bila pilihan memuat angka, susun pilihan a–d urut dari angka terkecil ke terbesar atau sebaliknya.' },
    { kode: [/^pemeriksa: G-angka-cukup/], baris: 'Jangan menaruh di pesan dan pilihan semua angka yang cukup untuk menghitung jawabannya; angka penentu hanya ada di kartu.' },
    { kode: [/^pemeriksa: G-penilaian/, /^pemeriksa: KATA_PENILAIAN/, /^pemeriksa: AJAKAN_TRANSAKSI/], baris: 'Tanpa kata penilaian saham (bagus, jelek, sehat, buruk, murah, mahal, cuan) dan tanpa ajakan membeli atau menjual, juga di pesan teman.' },
    { kode: [/^pemeriksa: PENJELASAN_TANPA_SALAH_KAPRAH/], baris: `\`penjelasan\` paling banyak ${String(BATAS.penjelasan)} karakter dan ditutup satu kalimat "Salah-kaprah yang umum: …".` },
    { kode: [/^M2d-13: umpan balik/], baris: `\`pengecoh\`: tiap huruf punya \`jenis\`, \`rujukan\` (id kartu), dan \`umpan_balik\` paling banyak ${String(UMPAN_BALIK_MAKS)} karakter yang memuat nama jenis kesalahannya dan "kartu N" (N = urutan kartu rujukan itu di \`kartu\`). Nama jenis: ${nama}.` },
    { kode: [/^M2d-13: label pengecoh/], baris: '`percaya-otoritas` hanya untuk pengecoh "Betul, …" ketika kuncinya "Keliru, …". Huruf kunci tidak punya entri di `pengecoh`.' },
    { kode: [/^anti-salin teladan/], baris: 'Jangan menyalin kalimat contoh (lima kata berurutan yang sama), kecuali nama jenis kesalahan.' },
  ];
}

/** Aturan tingkat simulasi (perakit): tidak terlihat dari satu omongan. */
export const BARIS_SIMULASI: readonly string[] = [
  'Dari tiga omongan satu simulasi, minimal satu ternyata BETUL (kuncinya "Betul, …") dan minimal satu ternyata KELIRU (kuncinya "Keliru, …").',
  'Huruf kunci ketiga omongan tidak boleh sama semua.',
];

/** Teks kontrak bentuk untuk prompt agen. */
export function kontrakBentuk(): string {
  return [...butirBentuk().flatMap((b) => (b.baris === null ? [] : [`- ${b.baris}`])), ...BARIS_SIMULASI.map((b) => `- ${b}`)].join('\n');
}

/** Butir yang mewakili satu teks penolakan; `null` = penolakan tanpa butir (harus merah di tes). */
export function butirUntuk(penolakan: string): ButirBentuk | null {
  return butirBentuk().find((b) => b.kode.some((k) => k.test(penolakan))) ?? null;
}
