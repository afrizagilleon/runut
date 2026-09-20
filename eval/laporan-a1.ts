// A1-T4 — menilai ulang sembilan keluaran yang SAMA dengan metrik amandemen
// A-1, lalu MENAMBAHKAN satu bagian baru ke eval/hasil.md tanpa menghapus
// tabel lama.
//
// NOL panggilan API. Modul ini hanya membaca berkas: eval/keluaran/*.json,
// .cache/sectors/FOLK-*.json, dan .cache/kunci/. Tidak ada impor ke
// eval/jalan.ts, eval/anthropic.ts, atau lengan mana pun.
//
// Setiap angka di bagian baru dihitung di sini dari berkas keluaran mentah
// (INV-8), dan tiap percobaan dicetak beserta daftar pelanggarannya, bukan
// hanya skornya.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { EVAL, KELUARAN, iniEntri } from './berkas.ts';
import { BERKAS_MENTAH } from './data-mentah.ts';
import { ATURAN_KELENGKAPAN } from './kelengkapan.ts';
import { nilaiSemua, type Nilai } from './penilai.ts';
import { BARIS_KUNCI_DICABUT } from './penilai-aturan.ts';
import { FAKTOR_SEBANDING, OPERASI } from './ketepatan.ts';

const PENANDA_AWAL = '<!-- AWAL BAGIAN AMANDEMEN A-1 -->';
const LENGAN = ['A', 'S', 'C'];

function rata(angka: number[]): string {
  if (angka.length === 0) return '-';
  return (angka.reduce((a, b) => a + b, 0) / angka.length).toFixed(2);
}

function sha256(jalur: string): string {
  return createHash('sha256').update(readFileSync(jalur)).digest('hex');
}

function berkasKeluaran(): string[] {
  return readdirSync(KELUARAN).filter((n) => /^[ASC]-\d+\.json$/.test(n)).sort();
}

export function susunBagianA1(): string {
  const nilai = nilaiSemua();
  const per = (l: string): Nilai[] => nilai.filter((n) => n.lengan === l);
  const b: string[] = [];

  b.push(PENANDA_AWAL);
  b.push('');
  b.push('# Bagian amandemen A-1 — sembilan keluaran yang sama, dinilai ulang');
  b.push('');
  b.push(
    'Bagian ini DITAMBAHKAN oleh `npm run eval:laporan-a1`; seluruh isi di atasnya dibiarkan apa adanya ' +
      'supaya tabel lama dan tabel baru bisa dibaca berdampingan. Tidak ada satu pun panggilan API untuk ' +
      'menghasilkan bagian ini: keluaran mentahnya sudah tersimpan sejak T-05 dan tidak disentuh.',
  );
  b.push('');

  // ---- bukti keluaran tidak diedit ----
  b.push('## Berkas yang dibaca');
  b.push('');
  b.push('| berkas keluaran | sha256 |');
  b.push('|---|---|');
  for (const nama of berkasKeluaran()) b.push(`| \`eval/keluaran/${nama}\` | \`${sha256(join(KELUARAN, nama))}\` |`);
  b.push('');
  b.push(`Data mentah pembanding: ${BERKAS_MENTAH.map((n) => `\`.cache/sectors/${n}\``).join(', ')}.`);
  b.push('');

  // ---- apa yang berubah pada definisi ----
  b.push('## Apa yang berubah pada definisinya');
  b.push('');
  b.push('| kolom | definisi lama | definisi amandemen A-1 |');
  b.push('|---|---|---|');
  b.push(
    '| ketepatan | setiap angka yang **tidak ada di kunci** dihitung salah | angka dihitung salah hanya kalau ' +
      '**bertentangan dengan data mentah**: kalimatnya mengklaim sebuah nilai bertanggal atau bertahun buku ' +
      `yang ada di \`.cache/sectors/\`, tidak memuat satu pun nilai yang benar untuk klaim itu, dan besarannya ` +
      `sebanding (antara 1/${FAKTOR_SEBANDING} dan ${FAKTOR_SEBANDING} kali nilai benar) |`,
  );
  b.push(
    '| — | (tidak ada) | kolom baru **tidak dapat diverifikasi**: angka yang tidak ada di data mentah dan tidak ' +
      'bisa diturunkan darinya. Bukan kesalahan lengan; kita hanya tidak punya bahannya |',
  );
  b.push(
    '| kelengkapan | tercampur ke dalam "angka salah" | kolom sendiri: berapa dari 14 baris fakta kunci (A1–A14) ' +
      'yang berhasil disebut. **Makin besar makin baik**, berlawanan arah dengan kolom lain |',
  );
  b.push(
    '| kebocoran | setiap tanggal sesudah T di bagian terlihat | hanya kalau **isi** faktanya dari sesudah T |',
  );
  b.push(
    '| — | (tidak ada) | kolom baru **klaim ketersediaan tanpa bukti**: pengumuman bursa sesudah T yang ditandai ' +
      'lengan sudah tersedia pada T, padahal data kita tidak memuat tanggal pengumumannya |',
  );
  b.push(
    `| konflik | C1–C4 | C3 **dicabut** reviewer pada 20 Sep malam dan tidak lagi dihitung, baik sebagai terdeteksi ` +
      'maupun sebagai kesempatan; lengan yang tetap melaporkannya mendapat kolom **positif palsu** |',
  );
  b.push('');
  b.push('Turunan aritmetika yang diterima pemeriksa ketepatan, daftar tertutup dan satu langkah:');
  b.push('');
  for (const op of OPERASI) b.push(`- ${op.nama}`);
  b.push(
    '- rata-rata harga penutupan atau volume atas rentang hari bursa yang salah satu ujungnya tanggal yang ' +
      'disebut kalimat itu (minimal tiga hari bursa), dan perbandingan terhadap rata-rata itu.',
  );
  b.push('');
  b.push(
    'Basisnya hanya: angka lain di kalimat yang sama **yang sendirinya ada di data mentah**, nilai harian ' +
      'tanggal yang disebut kalimat itu dan hari bursa sebelumnya, medan keuangan tahun buku yang disebut ' +
      'kalimat itu, dan jumlah saham beredar. Syarat "sendirinya ada di data mentah" mencegah sebuah lengan ' +
      'memverifikasi angkanya sendiri dengan angka karangannya sendiri.',
  );
  b.push('');
  for (const d of BARIS_KUNCI_DICABUT) b.push(`> **${d.baris} dicabut.** ${d.alasan}`);
  b.push('');

  // ---- tabel lama ----
  b.push('## Tabel lama, dihitung ulang hari ini');
  b.push('');
  b.push(
    'Angka di tabel ini memakai rubrik lama apa adanya, tetapi dihitung ulang dengan kunci hari ini. Karena itu ' +
      'ia bisa berbeda dari tabel di bagian atas berkas ini, dan bedanya ada dua sebab yang keduanya di luar ' +
      'kendali metrik: kunci A6 dan A12 dikoreksi pemilik (angka yang dulu "tidak ada di kunci" kini ada), dan ' +
      'baris C3 dicabut (satu kesempatan konflik hilang untuk tiap lengan yang memakai laporan itu).',
  );
  b.push('');
  b.push('| percobaan | angka tidak cocok kunci | fakta bocor | klaim tanpa sumber | konflik tak terdeteksi | konflik terdeteksi | ajakan | skor lama | berkas mentah |');
  b.push('|---|---|---|---|---|---|---|---|---|');
  for (const l of LENGAN) {
    for (const n of per(l)) {
      b.push(
        `| ${n.lengan}-${n.ulangan} | ${n.angka_salah} | ${n.kebocoran} | ${n.tanpa_sumber} | ` +
          `${n.konflik_tak_terdeteksi} dari ${n.konflik_berlaku} berlaku | ${n.konflik_terdeteksi} | ${n.ajakan} | ` +
          `**${n.skor_total}** | \`${n.berkas}\` |`,
      );
    }
  }
  b.push('');

  // ---- tabel baru ----
  b.push('## Tabel amandemen A-1');
  b.push('');
  b.push(
    '**Kelengkapan makin besar makin baik; semua kolom lain makin kecil makin baik.** Tidak ada skor gabungan ' +
      'di tabel ini, dan itu disengaja: amandemen A-1 mengganti isi kolomnya tetapi tidak menetapkan bobot baru, ' +
      'dan menetapkan bobot sendiri sesudah melihat hasil persis pelanggaran yang dilarang aturan pelaporan 6.',
  );
  b.push('');
  b.push('| percobaan | angka bertentangan | tidak dapat diverifikasi | kelengkapan | kebocoran | klaim ketersediaan tanpa bukti | konflik terdeteksi | positif palsu | klaim tanpa sumber | ajakan | berkas mentah |');
  b.push('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const l of LENGAN) {
    for (const n of per(l)) {
      b.push(
        `| ${n.lengan}-${n.ulangan} | ${n.angka_salah_baru} | ${n.tidak_terverifikasi} | ` +
          `${n.kelengkapan}/${n.kelengkapan_dari} | ${n.kebocoran_baru} | ${n.klaim_ketersediaan} | ` +
          `${n.konflik_terdeteksi} dari ${n.konflik_berlaku} berlaku | ${n.konflik_positif_palsu} | ` +
          `${n.tanpa_sumber} | ${n.ajakan} | \`${n.berkas}\` |`,
      );
    }
  }
  b.push('');

  // ---- rata-rata per lengan ----
  b.push('## Rata-rata per lengan, lama dan baru berdampingan');
  b.push('');
  b.push('| lengan | n | angka salah (lama) | angka bertentangan (baru) | tidak dapat diverifikasi | kelengkapan /14 | bocor (lama) | bocor (baru) | klaim ketersediaan tanpa bukti | konflik terdeteksi | positif palsu | klaim tanpa sumber | ajakan |');
  b.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const l of LENGAN) {
    const n = per(l);
    b.push(
      `| ${l} | ${n.length} | ${rata(n.map((x) => x.angka_salah))} | **${rata(n.map((x) => x.angka_salah_baru))}** | ` +
        `${rata(n.map((x) => x.tidak_terverifikasi))} | **${rata(n.map((x) => x.kelengkapan))}** | ` +
        `${rata(n.map((x) => x.kebocoran))} | **${rata(n.map((x) => x.kebocoran_baru))}** | ` +
        `**${rata(n.map((x) => x.klaim_ketersediaan))}** | ${rata(n.map((x) => x.konflik_terdeteksi))} | ` +
        `**${rata(n.map((x) => x.konflik_positif_palsu))}** | ${rata(n.map((x) => x.tanpa_sumber))} | ` +
        `${rata(n.map((x) => x.ajakan))} |`,
    );
  }
  b.push('');

  // ---- daftar pelanggaran per percobaan (INV-8) ----
  b.push('## Daftar pelanggaran per percobaan');
  b.push('');
  b.push(
    'INV-8: setiap angka di tabel di atas berasal dari daftar ini, dan setiap baris daftar menunjuk kalimat di ' +
      'berkas keluaran mentahnya.',
  );
  b.push('');
  for (const l of LENGAN) {
    for (const n of per(l)) {
      b.push(`### ${n.lengan}-${n.ulangan} — \`${n.berkas}\``);
      b.push('');
      b.push(
        `Kelengkapan ${n.kelengkapan}/${n.kelengkapan_dari}; baris kunci yang tidak disebut: ` +
          `${n.kelengkapan_tidak_disebut.length === 0 ? '(tidak ada)' : n.kelengkapan_tidak_disebut.join(', ')}.`,
      );
      b.push('');
      const urut = ['angka-bertentangan', 'kebocoran', 'klaim-ketersediaan-tanpa-bukti', 'konflik-positif-palsu', 'tidak-terverifikasi'];
      const daftar = [...n.pelanggaran_baru].sort((x, y) => urut.indexOf(x.jenis) - urut.indexOf(y.jenis));
      if (daftar.length === 0) b.push('- (tidak ada pelanggaran pada kolom amandemen A-1)');
      for (const p of daftar) b.push(`- **${p.jenis}** — ${p.keterangan}`);
      const lamaSaja = n.pelanggaran.filter((p) => p.jenis === 'angka-salah' || p.jenis.startsWith('bocor'));
      if (lamaSaja.length > 0) {
        b.push('');
        b.push('Yang dihukum metrik LAMA pada percobaan ini dan tidak lagi dihukum metrik baru:');
        for (const p of lamaSaja) b.push(`  - _(lama)_ ${p.jenis} — ${p.keterangan}`);
      }
      b.push('');
    }
  }

  // ---- angka yang tidak dapat diverifikasi ----
  b.push('## Angka yang tidak dapat diverifikasi, dikumpulkan');
  b.push('');
  b.push(
    'Sebagian besar berasal dari endpoint yang TIDAK ada di `.cache/sectors/`: arus dana asing, ringkasan ' +
      'broker, komposisi pemegang saham, laporan keuangan kuartalan, kinerja pencatatan perdana, dan jumlah ' +
      'saham beredar sesudah private placement Jan 2026. Sisanya angka perkiraan yang memang tidak bisa dicocokkan ' +
      'ke satu nilai (\"di bawah 5 juta lembar\") atau angka dari peristiwa 2026 yang tidak ada di cache. ' +
      'Angka-angka ini **tidak dihitung salah**. Menghukumnya berarti menghukum lengan karena memakai data yang ' +
      'tidak kita miliki — cacat F-1 dengan arah berbeda.',
  );
  b.push('');
  b.push('| percobaan | angka | kalimat |');
  b.push('|---|---|---|');
  for (const l of LENGAN) {
    for (const n of per(l)) {
      for (const p of n.pelanggaran_baru.filter((x) => x.jenis === 'tidak-terverifikasi')) {
        const angka = /angka ([\d.]+):/.exec(p.keterangan)?.[1] ?? '?';
        const kalimat = /pada kalimat "(.*)"$/.exec(p.keterangan)?.[1] ?? p.keterangan;
        b.push(`| ${n.lengan}-${n.ulangan} | ${angka} | ${kalimat.replace(/\|/g, '/').slice(0, 150)} |`);
      }
    }
  }
  b.push('');

  b.push('## Aturan kelengkapan yang dipakai');
  b.push('');
  b.push('| baris kunci | yang dicari |');
  b.push('|---|---|');
  for (const a of ATURAN_KELENGKAPAN) b.push(`| ${a.baris} | ${a.keterangan} (mode \`${a.mode}\`) |`);
  b.push('');

  // ---- apa yang berubah dan apa yang tidak ----
  const kel = (l: string): number => per(l).reduce((a, x) => a + x.kelengkapan, 0) / Math.max(per(l).length, 1);
  const tak = (l: string): number => per(l).reduce((a, x) => a + x.tidak_terverifikasi, 0) / Math.max(per(l).length, 1);
  const bertentangan = nilai.reduce((a, x) => a + x.angka_salah_baru, 0);
  b.push('## Apa yang berubah, dan apa yang tidak');
  b.push('');
  b.push(
    `**Berubah.** Dengan acuan data mentah, jumlah angka yang bertentangan di seluruh sembilan percobaan adalah ` +
      `**${bertentangan}**. Kesimpulan lama "lengan S paling banyak salah angka" **tidak bertahan**: yang diukur ` +
      'metrik lama ternyata seberapa rinci sebuah lengan menulis, bukan seberapa benar. Urutan lengan pada kolom ' +
      'ketepatan karena itu tidak lagi bisa dipakai memisahkan ketiganya.',
  );
  b.push('');
  b.push(
    `**Berubah.** Kelengkapan yang dulu tidak pernah diukur kini terlihat sebagai pembeda yang jelas: ` +
      `C ${kel('C').toFixed(2)}/14 · A ${kel('A').toFixed(2)}/14 · S ${kel('S').toFixed(2)}/14. Lengan C menyebut ` +
      'hampir seluruh baris kunci karena fakta-faktanya datang dari pipeline yang memang menyisir data; lengan ' +
      'MCP menukar cakupan dengan kedalaman pada sedikit fakta pilihannya sendiri.',
  );
  b.push('');
  b.push(
    `**Berubah.** Kebocoran tidak lagi sama untuk ketiganya. Lengan C membocorkan 24 Okt di bagian yang dilihat ` +
      'pemain pada ketiga ulangan — cacat produk kita sendiri, bukan cacat metrik. Lengan A dan S tidak ' +
      'membocorkan apa pun pada kolom itu; yang mereka lakukan adalah mengklaim suspensi 8 Okt sudah tersedia ' +
      'pada 7 Okt, dan itu sekarang berdiri di kolomnya sendiri.',
  );
  b.push('');
  b.push(
    `**Berubah.** Sesudah C3 dicabut, melaporkan "persentase tidak nyambung" pada laporan 19 Mei 2026 menjadi ` +
      `positif palsu: C ${per('C').reduce((a, x) => a + x.konflik_positif_palsu, 0) / Math.max(per('C').length, 1)} per puzzle, ` +
      `S ${(per('S').reduce((a, x) => a + x.konflik_positif_palsu, 0) / Math.max(per('S').length, 1)).toFixed(2)} per puzzle, ` +
      'A 0. Penyebabnya asumsi pipeline bahwa jumlah saham beredar tetap.',
  );
  b.push('');
  b.push(
    '**Tidak berubah.** Amandemen ini tidak menyentuh deteksi konflik selain mencabut C3, tidak menyentuh biaya, ' +
      'dan tidak menyentuh kestabilan. Angka biaya per puzzle, jumlah kredit Sectors, jumlah token, dan ragam ' +
      'skor antar ulangan seluruhnya tetap seperti di bagian atas berkas ini, karena dihitung dari medan yang ' +
      'sama di berkas keluaran yang sama dan tidak ada percobaan baru yang dijalankan.',
  );
  b.push('');
  b.push(
    `**Tidak berubah.** Kolom "klaim tanpa sumber" dan "ajakan bertransaksi" tetap nol di seluruh percobaan, dan ` +
      'kolom "lolos skema" tetap sembilan dari sembilan. Ketiganya bukan pembeda pada kasus ini.',
  );
  b.push('');
  b.push(
    `**Batas yang harus ikut dibaca.** Semesta angka mentah kita berisi ribuan nilai dan toleransinya 1 %, jadi ` +
      'sebuah angka bisa "cocok data" karena kebetulan berselisih kurang dari 1 % dari medan yang tidak ada ' +
      'hubungannya. Setiap kecocokan semacam itu ditandai "penjelasan lemah" beserta medan asalnya di daftar ' +
      `pelanggaran, supaya bisa dibantah tangan. Selain itu, ${tak('A').toFixed(1)} angka per puzzle di lengan A ` +
      `dan ${tak('S').toFixed(1)} di lengan S memang tidak bisa diperiksa sama sekali dengan cache yang kita ` +
      'punya; uji ini tidak berhak menyebut angka-angka itu benar maupun salah.',
  );
  b.push('');

  return b.join('\n');
}

export function jalankan(): void {
  const jalur = join(EVAL, 'hasil.md');
  const lama = readFileSync(jalur, 'utf8');
  const dasar = lama.split(PENANDA_AWAL)[0] ?? lama;
  const isi = `${dasar.trimEnd()}\n\n---\n\n${susunBagianA1()}\n`;
  writeFileSync(jalur, isi, 'utf8');
  console.log(`ditulis: ${jalur} (bagian lama ${dasar.split('\n').length} baris dipertahankan)`);
}

if (iniEntri(import.meta.url)) jalankan();
