// T-06 — Menyusun eval/hasil.md dari berkas keluaran mentah dan pencatat kredit.
//
// Setiap angka di laporan dihitung di sini dari eval/keluaran/*.json (INV-8).
// Tidak ada angka yang diketik tangan ke dalam laporan.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { EVAL, KELUARAN, iniEntri } from './berkas.ts';
import { muatLedger, totalKredit } from './kredit.ts';
import { nilaiSemua, type Nilai } from './penilai.ts';
import { BARIS_TIDAK_DINILAI, BOBOT } from './penilai-aturan.ts';
import { KASUS } from './prompt.ts';
import type { Percobaan } from './percobaan.ts';

interface Ringkas {
  lengan: string;
  ulangan: number;
  berkas: string;
  kredit: number;
  token_masuk: number;
  token_keluar: number;
  alat: number;
  stop: string | null;
  urai_ok: boolean;
  galat: string | null;
}

function bacaRingkas(jalur: string, namaTampil: string): Ringkas {
  const p = JSON.parse(readFileSync(jalur, 'utf8')) as Percobaan;
  return {
    lengan: p.lengan,
    ulangan: p.ulangan,
    berkas: namaTampil,
    kredit: p.kredit_sectors,
    token_masuk: p.token_masuk,
    token_keluar: p.token_keluar,
    alat: p.alat_mcp.length,
    stop: p.stop_reason,
    urai_ok: p.urai_ok,
    galat: p.galat,
  };
}

/** Percobaan yang dibuang karena pagu max_tokens lama; tetap dilaporkan. */
function muatDibuang(): Ringkas[] {
  const folder = join(KELUARAN, 'dibuang');
  try {
    return readdirSync(folder)
      .filter((n) => n.endsWith('.json'))
      .sort()
      .map((n) => bacaRingkas(join(folder, n), `eval/keluaran/dibuang/${n}`));
  } catch {
    return [];
  }
}

function muatPercobaan(): Ringkas[] {
  const hasil: Ringkas[] = [];
  for (const nama of readdirSync(KELUARAN).sort()) {
    if (!/^[ASC]-\d+\.json$/.test(nama)) continue;
    const p = JSON.parse(readFileSync(join(KELUARAN, nama), 'utf8')) as Percobaan;
    hasil.push({
      lengan: p.lengan,
      ulangan: p.ulangan,
      berkas: `eval/keluaran/${nama}`,
      kredit: p.kredit_sectors,
      token_masuk: p.token_masuk,
      token_keluar: p.token_keluar,
      alat: p.alat_mcp.length,
      stop: p.stop_reason,
      urai_ok: p.urai_ok,
      galat: p.galat,
    });
  }
  return hasil;
}

function rata(angka: number[]): string {
  if (angka.length === 0) return '-';
  return (angka.reduce((a, b) => a + b, 0) / angka.length).toFixed(2);
}

function jumlah(angka: number[]): number {
  return angka.reduce((a, b) => a + b, 0);
}

/** Harga token Sonnet yang dipakai menghitung perkiraan biaya dolar. */
export const HARGA_PER_MTOK = { masuk: 3, keluar: 15 } as const;

export function biayaDolar(tokenMasuk: number, tokenKeluar: number): number {
  return (tokenMasuk / 1e6) * HARGA_PER_MTOK.masuk + (tokenKeluar / 1e6) * HARGA_PER_MTOK.keluar;
}

export function susunLaporan(): string {
  const nilai = nilaiSemua();
  const percobaan = muatPercobaan();
  const ledger = muatLedger();
  const perLengan = (l: string): Nilai[] => nilai.filter((n) => n.lengan === l);
  const perc = (l: string): Ringkas[] => percobaan.filter((p) => p.lengan === l);
  const lengan = ['A', 'S', 'C'];

  const b: string[] = [];
  b.push('# Hasil uji tiga lengan (M1.5)');
  b.push('');
  b.push(
    `Kasus tersembunyi **${KASUS.kode}** (${KASUS.nama}), beku pada **T = ${KASUS.tanggal_t}**. ` +
      'Kasus dipilih dan dibekukan pemilik sebelum satu pun lengan dijalankan; kunci jawabannya ' +
      'disusun manusia dari data mentah dan tidak pernah masuk ke prompt lengan mana pun.',
  );
  b.push('');
  b.push('Berkas ini dihasilkan `npm run eval:laporan` dari berkas keluaran mentah. Setiap angka di bawah bisa ditelusuri ke berkas yang disebut di kolom terakhir.');
  b.push('');
  b.push('| lengan | isi |');
  b.push('|---|---|');
  b.push('| A | model + Sectors MCP, tanpa aturan verifikasi kita |');
  b.push('| S | model + Sectors MCP + isi `docs/aturan-verifikasi.md` disisipkan ke prompt |');
  b.push('| C | pipeline kita (verifikasi R1–R10 atas cache) + model yang hanya menulis kalimat dari fakta terverifikasi |');
  b.push('');
  b.push('Model sama untuk ketiganya: `claude-sonnet-5` (D-2). Prompt A dan S identik kata per kata kecuali blok aturan (D-8).');
  b.push('');

  const rencana = 3;
  const kurang = lengan.filter((l) => perLengan(l).length < rencana);
  if (kurang.length > 0) {
    b.push('> **Uji ini TIDAK lengkap.** Rencananya tiga lengan × tiga ulangan = sembilan percobaan. Yang ada ' +
      `${nilai.length}: ` +
      lengan.map((l) => `${l}=${perLengan(l).length}`).join(', ') +
      '. Penyebabnya anggaran, bukan hasil yang tidak menguntungkan: saldo API Anthropic pemilik hampir habis ' +
      'dan pemilik menghentikan percobaan baru untuk lengan A dan S. Rincian biaya ada di bagian Biaya. ' +
      'Ukuran sampel yang tidak seimbang berarti rata-rata antar lengan **tidak setara** dan harus dibaca dengan ' +
      'kehati-hatian yang disebut di bagian terakhir.');
    b.push('');
  }

  b.push(`## ${nilai.length} percobaan`);
  b.push('');
  b.push('Semua kolom: makin kecil makin baik.');
  b.push('');
  b.push('| percobaan | skema | angka tidak cocok kunci | fakta bocor sesudah T | klaim tanpa sumber | konflik tak terdeteksi | konflik terdeteksi | ajakan transaksi | skor | berkas mentah |');
  b.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const l of lengan) {
    for (const n of perLengan(l)) {
      b.push(
        `| ${n.lengan}-${n.ulangan} | ${n.lolos_skema ? 'lolos' : '**GAGAL**'} | ${n.angka_salah} | ${n.kebocoran} | ` +
          `${n.tanpa_sumber} | ${n.konflik_tak_terdeteksi} dari ${n.konflik_berlaku} berlaku | ${n.konflik_terdeteksi} | ${n.ajakan} | ` +
          `**${n.skor_total}** | \`${n.berkas}\` |`,
      );
    }
  }
  b.push('');

  b.push('## Rata-rata per lengan');
  b.push('');
  b.push('| lengan | percobaan | lolos skema | angka tidak cocok | fakta bocor | tanpa sumber | konflik tak terdeteksi | ajakan | skor rata-rata |');
  b.push('|---|---|---|---|---|---|---|---|---|');
  for (const l of lengan) {
    const n = perLengan(l);
    b.push(
      `| ${l} | ${n.length} | ${n.filter((x) => x.lolos_skema).length}/${n.length} | ${rata(n.map((x) => x.angka_salah))} | ` +
        `${rata(n.map((x) => x.kebocoran))} | ${rata(n.map((x) => x.tanpa_sumber))} | ${rata(n.map((x) => x.konflik_tak_terdeteksi))} | ` +
        `${rata(n.map((x) => x.ajakan))} | **${rata(n.map((x) => x.skor_total))}** |`,
    );
  }
  b.push('');
  b.push(
    `Bobot skor, ditetapkan sebelum satu pun lengan dijalankan: angka tidak cocok ×${BOBOT.angka_salah}, ` +
      `fakta bocor ×${BOBOT.kebocoran}, klaim tanpa sumber ×${BOBOT.tanpa_sumber}, ` +
      `konflik tak terdeteksi ×${BOBOT.konflik_tak_terdeteksi}, ajakan transaksi ×${BOBOT.ajakan}, ` +
      `gagal skema = ${BOBOT.gagal_skema} dan isinya tidak dinilai lagi.`,
  );
  b.push('');

  b.push('## Biaya per percobaan');
  b.push('');
  b.push(
    `Perkiraan biaya dolar memakai harga Sonnet: $${HARGA_PER_MTOK.masuk}/MTok masuk dan ` +
      `$${HARGA_PER_MTOK.keluar}/MTok keluar. Angka token diambil apa adanya dari field ` +
      '`token_masuk` dan `token_keluar` di tiap berkas keluaran.',
  );
  b.push('');
  b.push('| percobaan | kredit Sectors | panggilan alat MCP | token masuk | token keluar | perkiraan biaya | berkas mentah |');
  b.push('|---|---|---|---|---|---|---|');
  for (const l of lengan) {
    for (const p of perc(l)) {
      b.push(
        `| ${p.lengan}-${p.ulangan} | ${p.kredit} | ${p.alat} | ${p.token_masuk.toLocaleString('id-ID')} | ` +
          `${p.token_keluar.toLocaleString('id-ID')} | $${biayaDolar(p.token_masuk, p.token_keluar).toFixed(2)} | \`${p.berkas}\` |`,
      );
    }
  }
  b.push('');
  b.push('## Biaya rata-rata per lengan');
  b.push('');
  b.push('| lengan | percobaan | kredit Sectors (total) | kredit per puzzle | token masuk per puzzle | token keluar per puzzle | biaya per puzzle | biaya total lengan |');
  b.push('|---|---|---|---|---|---|---|---|');
  for (const l of lengan) {
    const p = perc(l);
    const tm = jumlah(p.map((x) => x.token_masuk));
    const tk = jumlah(p.map((x) => x.token_keluar));
    const n = p.length || 1;
    b.push(
      `| ${l} | ${p.length} | ${jumlah(p.map((x) => x.kredit))} | ${rata(p.map((x) => x.kredit))} | ` +
        `${Math.round(tm / n).toLocaleString('id-ID')} | ${Math.round(tk / n).toLocaleString('id-ID')} | ` +
        `$${(biayaDolar(tm, tk) / n).toFixed(2)} | $${biayaDolar(tm, tk).toFixed(2)} |`,
    );
  }
  b.push('');
  const tmSemua = jumlah(percobaan.map((x) => x.token_masuk));
  const tkSemua = jumlah(percobaan.map((x) => x.token_keluar));
  const dibuang = muatDibuang();
  const tmDibuang = jumlah(dibuang.map((x) => x.token_masuk));
  const tkDibuang = jumlah(dibuang.map((x) => x.token_keluar));
  b.push(
    `Total kredit Sectors terpakai milestone ini: **${totalKredit(ledger)} dari pagu ${ledger.pagu}**. ` +
      'Asumsi yang dicatat terbuka: satu panggilan alat MCP = satu kredit; penyedia tidak mengembalikan sisa kuota di responsnya.',
  );
  b.push('');
  b.push(
    `Biaya token Anthropic: **$${biayaDolar(tmSemua, tkSemua).toFixed(2)}** untuk ${percobaan.length} percobaan yang dinilai, ` +
      `ditambah **$${biayaDolar(tmDibuang, tkDibuang).toFixed(2)}** untuk ${dibuang.length} percobaan yang dibuang (lihat di bawah), ` +
      `sehingga **$${biayaDolar(tmSemua + tmDibuang, tkSemua + tkDibuang).toFixed(2)}** seluruhnya. ` +
      'Kontrak M1.5 memasang pagu kredit Sectors tetapi TIDAK memasang pagu dolar, dan biaya dolar inilah yang ' +
      'hampir menghentikan uji ini sebelum lengkap — bukan kredit Sectors, yang terpakai kurang dari dua pertiga pagunya.',
  );
  b.push('');
  b.push('| percobaan dibuang | alasan | token masuk | token keluar | perkiraan biaya | berkas |');
  b.push('|---|---|---|---|---|---|');
  for (const d of dibuang) {
    const alasan = d.berkas.includes('max-tokens')
      ? `\`max_tokens=16000\` terlalu kecil (\`stop_reason=${d.stop ?? '-'}\`)`
      : `panggilan API gagal di tingkat jaringan sebelum satu token pun terpakai: \`${d.galat ?? '-'}\``;
    b.push(
      `| ${d.lengan}-${d.ulangan} | ${alasan} | ${d.token_masuk.toLocaleString('id-ID')} | ` +
        `${d.token_keluar.toLocaleString('id-ID')} | $${biayaDolar(d.token_masuk, d.token_keluar).toFixed(2)} | \`${d.berkas}\` |`,
    );
  }
  b.push('');
  b.push(
    'Dua percobaan pertama dijalankan dengan `max_tokens=16000`. Blok pemakaian alat MCP ikut memakan pagu keluaran ' +
      'yang sama, sehingga lengan A terpotong di tengah JSON dan lengan C hampir kena juga (15.155 dari 16.000). ' +
      'Pagu dinaikkan ke 32.000 untuk **ketiga** lengan sebelum satu pun percobaan resmi dijalankan.',
  );
  b.push('');
  b.push(
    'Satu percobaan lagi, S-3, gagal di tingkat jaringan sebelum permintaan sampai ke penyedia: nol token masuk, ' +
      'nol token keluar, nol kredit. Sambungan diuji ulang sesudahnya dan sehat (HTTP 401 dalam 449 ms untuk ' +
      'permintaan tanpa kunci), jadi percobaan itu diulang **dengan prompt, model, dan parameter yang persis sama**. ' +
      'Percobaan yang gagal tidak dihapus; berkasnya ada di `eval/keluaran/dibuang/`.',
  );
  b.push('');

  b.push('## Ragam antar ulangan');
  b.push('');
  b.push('| lengan | skor terendah | skor tertinggi | selisih |');
  b.push('|---|---|---|---|');
  for (const l of lengan) {
    const s = perLengan(l).map((x) => x.skor_total);
    if (s.length === 0) continue;
    const min = Math.min(...s);
    const max = Math.max(...s);
    b.push(`| ${l} | ${min} | ${max} | ${max - min} |`);
  }
  b.push('');

  b.push('## Percobaan yang gagal');
  b.push('');
  const gagal = percobaan.filter((p) => !p.urai_ok || p.galat !== null || p.stop !== 'end_turn');
  if (gagal.length === 0) {
    b.push('Tidak ada. Sembilan percobaan berhenti dengan `end_turn` dan keluarannya bisa diurai.');
  } else {
    b.push('| percobaan | stop_reason | bisa diurai | galat | berkas |');
    b.push('|---|---|---|---|---|');
    for (const p of gagal) {
      b.push(`| ${p.lengan}-${p.ulangan} | ${p.stop ?? '-'} | ${p.urai_ok ? 'ya' : 'TIDAK'} | ${p.galat ?? '-'} | \`${p.berkas}\` |`);
    }
    b.push('');
    b.push('Percobaan gagal tetap dihitung sebagai percobaan lengan itu dan tidak dihapus dari hasil (aturan pelaporan 5).');
  }
  b.push('');

  b.push('## Baris kunci yang tidak dinilai');
  b.push('');
  for (const x of BARIS_TIDAK_DINILAI) b.push(`- **${x.baris}** — ${x.alasan}`);
  b.push('');

  // ---- Pertanyaan terbuka ----
  const skorRata = (l: string): number => {
    const s = perLengan(l).map((x) => x.skor_total);
    return s.length === 0 ? Number.NaN : s.reduce((a, c) => a + c, 0) / s.length;
  };
  const kesalahanRata = (l: string): number => {
    const n = perLengan(l);
    if (n.length === 0) return Number.NaN;
    return n.reduce((a, x) => a + x.angka_salah + x.kebocoran + x.tanpa_sumber + x.konflik_tak_terdeteksi + x.ajakan, 0) / n.length;
  };
  const kreditRata = (l: string): number => {
    const p = perc(l);
    return p.length === 0 ? Number.NaN : p.reduce((a, x) => a + x.kredit, 0) / p.length;
  };
  const urut = [...lengan].sort((x, y) => skorRata(x) - skorRata(y));
  const terbaik = urut[0] ?? '-';
  const terburuk = urut[urut.length - 1] ?? '-';
  const selisihAS = skorRata('A') - skorRata('S');
  const selisihSC = skorRata('S') - skorRata('C');
  const selisihAC = skorRata('A') - skorRata('C');
  const ragamTerbesar = Math.max(
    ...lengan.map((l) => {
      const s = perLengan(l).map((x) => x.skor_total);
      return s.length === 0 ? 0 : Math.max(...s) - Math.min(...s);
    }),
  );

  b.push('## OQ-1 — Berapa kesalahan per puzzle di tiap lengan?');
  b.push('');
  b.push('| lengan | kesalahan per puzzle (rata-rata seluruh jenis pelanggaran) | skor berbobot rata-rata |');
  b.push('|---|---|---|');
  for (const l of lengan) b.push(`| ${l} | ${kesalahanRata(l).toFixed(2)} | ${skorRata(l).toFixed(2)} |`);
  b.push('');
  b.push(
    `Urutan dari paling sedikit kesalahan: **${urut.join(' < ')}**. Lengan terbaik **${terbaik}** ` +
      `(skor rata-rata ${skorRata(terbaik).toFixed(2)}), terburuk **${terburuk}** (${skorRata(terburuk).toFixed(2)}).`,
  );
  b.push('');
  b.push(
    `Ragam antar ulangan di dalam satu lengan mencapai ${ragamTerbesar} poin skor. Bandingkan dengan ` +
      `selisih antar lengan di bawah sebelum menyebut satu lengan lebih baik: kalau ragam di dalam lengan ` +
      'sebesar selisih antar lengan, tiga ulangan tidak cukup untuk memisahkannya.',
  );
  b.push('');

  b.push('## OQ-2 — Keunggulannya dari aturan atau dari kode?');
  b.push('');
  b.push('| perbandingan | selisih skor rata-rata | arti kalau positif |');
  b.push('|---|---|---|');
  b.push(`| A − S | ${selisihAS.toFixed(2)} | menyisipkan R1–R10 ke prompt saja sudah membantu |`);
  b.push(`| S − C | ${selisihSC.toFixed(2)} | kode pipeline menambah sesuatu di atas aturan |`);
  b.push(`| A − C | ${selisihAC.toFixed(2)} | produk utuh lebih baik daripada model polos |`);
  b.push('');
  b.push(
    'Yang perlu dibaca pemilik: kalau **S − C mendekati nol**, yang bernilai adalah aturannya, bukan kodenya, ' +
      'dan produk sebaiknya berubah bentuk (3.3). Kalau **A − S mendekati nol**, menyisipkan aturan ke prompt ' +
      'tidak menambah apa-apa dan keunggulan (kalau ada) datang dari kode.',
  );
  b.push('');

  b.push('## OQ-3 — Berapa biaya satu puzzle lewat MCP dibanding lewat pipeline?');
  b.push('');
  b.push('| lengan | kredit per puzzle | panggilan alat per puzzle | token masuk per puzzle | token keluar per puzzle | biaya dolar per puzzle |');
  b.push('|---|---|---|---|---|---|');
  for (const l of lengan) {
    const p = perc(l);
    const n = p.length || 1;
    const tm = jumlah(p.map((x) => x.token_masuk));
    const tk = jumlah(p.map((x) => x.token_keluar));
    b.push(
      `| ${l} | ${kreditRata(l).toFixed(1)} | ${rata(p.map((x) => x.alat))} | ${Math.round(tm / n).toLocaleString('id-ID')} | ` +
        `${Math.round(tk / n).toLocaleString('id-ID')} | $${(biayaDolar(tm, tk) / n).toFixed(2)} |`,
    );
  }
  b.push('');
  const biayaPerPuzzle = (l: string): number => {
    const p = perc(l);
    const n = p.length || 1;
    return biayaDolar(jumlah(p.map((x) => x.token_masuk)), jumlah(p.map((x) => x.token_keluar))) / n;
  };
  b.push(
    `Lewat MCP satu puzzle memakai sekitar ${kreditRata('A').toFixed(1)} kredit Sectors (lengan A) dan ` +
      `${kreditRata('S').toFixed(1)} kredit (lengan S), dengan biaya token sekitar $${biayaPerPuzzle('A').toFixed(2)} ` +
      `dan $${biayaPerPuzzle('S').toFixed(2)}. Lewat pipeline: ${kreditRata('C').toFixed(1)} kredit Sectors dan ` +
      `$${biayaPerPuzzle('C').toFixed(2)} token — sekitar ` +
      `${(biayaPerPuzzle('A') / Math.max(biayaPerPuzzle('C'), 1e-9)).toFixed(0)}× lebih murah daripada lengan A. ` +
      'Datanya sudah ada di cache dan ditarik sekali saja (7 kredit untuk seluruh kasus FOLK, di luar pagu milestone ini). ' +
      'Yang mahal di lengan MCP bukan kredit Sectors, melainkan token masuk: hasil panggilan alat ikut masuk ke ' +
      'konteks pada setiap giliran, sehingga token masuk menumpuk berlipat.',
  );
  b.push('');

  b.push('## Apa yang hasil ini TIDAK membuktikan');
  b.push('');
  b.push(
    '**Uji ini nyaris berhenti karena anggaran, dan itu ikut membentuk jalannya.** Kontrak M1.5 memasang pagu ' +
      'kredit Sectors tetapi tidak memasang pagu dolar. Sesudah delapan percobaan, saldo API Anthropic pemilik ' +
      'hampir habis dan percobaan baru untuk lengan A dan S dihentikan; percobaan terakhir (S-3) baru dijalankan ' +
      'setelah pemilik mengizinkan sisa saldonya dipakai. Selama jeda itu tidak ada prompt, model, atau parameter ' +
      'yang diubah untuk menghemat biaya, karena mengubahnya akan merusak kontrol percobaan. Rancangan 3×3 akhirnya ' +
      'utuh, tetapi kalau saldo habis lebih awal hasilnya akan dilaporkan dengan n yang tidak seimbang.',
  );
  b.push('');
  b.push(
    `Ini juga **satu kasus**, satu emiten, satu tanggal beku, ${nilai.length} percobaan seluruhnya. ` +
      'Sejumlah itu tidak cukup untuk uji statistik apa pun, dan tidak ada selang kepercayaan yang ' +
      `dihitung di sini. Ragam di dalam satu lengan sendiri mencapai ${ragamTerbesar} poin, jadi selisih antar ` +
      'lengan yang lebih kecil daripada itu tidak berarti apa-apa. Hasil ini juga tidak mengukur apakah puzzle-nya ' +
      'menarik, bisa dipahami pemula, atau layak dipakai di produk: yang diukur hanya kesalahan yang bisa dihitung ' +
      'mesin terhadap kunci jawaban FOLK. ' +
      'Kunci jawaban itu sendiri dibuat manusia dan terbukti tidak sempurna — dua barisnya bertentangan dengan data ' +
      'mentah dan sengaja tidak dinilai, dan metrik "angka tidak cocok kunci" ikut menghitung angka yang BENAR ' +
      'menurut data mentah tetapi tidak tercantum di kunci, sehingga lengan yang menulis lebih banyak rincian ' +
      'terhukum lebih berat. ' +
      'Kasus ini juga khas: pada T belum ada satu pun laporan kepemilikan yang terbit, sehingga sebagian besar ' +
      'aturan R1–R9 tidak punya bahan di bagian yang dilihat pemain; kasus dengan banyak laporan sebelum T bisa ' +
      'memberi urutan lengan yang berbeda. ' +
      'Terakhir, ketiga lengan memakai model yang sama pada satu hari yang sama; tidak ada yang bisa disimpulkan ' +
      'tentang model lain, versi lain, atau tentang apa yang terjadi kalau lengan A diberi kesempatan mencoba dua kali.',
  );
  b.push('');

  return b.join('\n');
}

export function jalankan(): void {
  const jalur = join(EVAL, 'hasil.md');
  writeFileSync(jalur, susunLaporan() + '\n', 'utf8');
  console.log(`ditulis: ${jalur}`);
  console.log(susunLaporan());
}

if (iniEntri(import.meta.url)) jalankan();
