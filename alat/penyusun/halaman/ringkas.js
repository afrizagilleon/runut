// Ringkasan tampilan pintu penyusun (M2d-12): fungsi murni, tanpa DOM.
// Halaman (app.js) dan tes Vitest memakai berkas yang SAMA, jadi kalimat yang
// tampil di layar dites langsung — termasuk aturan kejujuran: jalan yang tidak
// terbit tidak pernah disebut lulus atau terbit, dan tidak ada label
// label yang menyebut manusia sebagai penulis (penulisnya agen AI; manusia hanya menyetujui/menyunting).
//
// Semua angka berasal dari peristiwa log apa adanya; berkas ini hanya memilih
// dan menjumlah untuk papan ringkasan, tidak mengubah isi peristiwa.

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function usd(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return 'US$' + n.toFixed(n < 0.1 ? 4 : 2).replace('.', ',');
}

/** Biaya: selalu 4 angka di belakang koma di bawah US$1 (US$0,2112), seperti log. */
export function usdBiaya(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return 'US$' + n.toFixed(n < 1 ? 4 : 2).replace('.', ',');
}

export function tanggalId(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return String(iso);
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${BULAN[m - 1]} ${y}`;
}

/** Nama hari untuk tanggal TTTT-BB-HH (kalender, bukan zona waktu). */
export function hariId(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return '';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return HARI[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** 66700 → "66,7 d"; 212000 → "3 mnt 32 d". */
export function lama(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return '—';
  if (ms < 60_000) return `${(ms / 1000).toFixed(1).replace('.', ',')} d`;
  const d = Math.round(ms / 1000);
  return `${Math.floor(d / 60)} mnt ${d % 60} d`;
}

/** Urutan tahap jalan, sama untuk jalan langsung dan tayang ulang. */
export const URUTAN_TAHAP = [
  { kunci: 'data', nama: 'Data dimuat' },
  { kunci: 'aturan', nama: '33 aturan pemeriksa' },
  { kunci: 'paket', nama: 'Paket fakta' },
  { kunci: 'perkiraan', nama: 'Perkiraan biaya dan persetujuan' },
  { kunci: 'agen', nama: 'Agen AI menulis, gerbang menguji' },
  { kunci: 'hasil', nama: 'Hasil' },
  { kunci: 'penyetuju', nama: 'Penyetuju' },
];

const POLA_JUDUL_AGEN = /^(?:versi|putaran) (\d+) · (?:omongan (\d+) · )?([^:]+): (.+?) → (\S+)(?: — ([\s\S]*))?$/;

/** Uraikan judul peristiwa agen: versi, omongan, peran, tugas, putusan, alasan. */
export function uraiJudulAgen(judul) {
  const m = POLA_JUDUL_AGEN.exec(String(judul));
  if (m === null) return null;
  return { versi: Number(m[1]), omongan: m[2] === undefined ? null : Number(m[2]), peran: m[3], tugas: m[4], putusan: m[5].toLowerCase(), alasan: m[6] ?? '' };
}

/** 'lolos' | 'tolak' | 'tulis' | 'galat' | 'info' untuk satu peristiwa. */
export function statusPeristiwa(p) {
  const isi = p.isi || {};
  if (p.tahap === 'galat') return 'galat';
  if (p.tahap === 'hasil') return isi.terbit === true ? 'lolos' : 'tidak-terbit';
  if (p.tahap === 'agen' || p.tahap === 'uji-ulang') {
    if (isi.putusan === 'tolak' || isi.lolos === false) return 'tolak';
    if (isi.putusan === 'galat') return 'galat';
    if (isi.putusan === 'lolos' || isi.lolos === true) return 'lolos';
    if (isi.putusan === 'ditulis') return 'tulis';
    return 'info';
  }
  if (p.tahap === 'penyetuju') return isi.putusan === 'setujui' ? 'lolos' : 'tolak';
  return 'info';
}

/** Teks tanda status (di kolom kiri baris tahapan). */
export function teksStatus(status) {
  return { lolos: '✓ lolos', tolak: '✗ ditolak', tulis: 'ditulis', galat: '✗ galat', 'tidak-terbit': '✗ tidak terbit', berhenti: '✗ berhenti', info: '' }[status] ?? '';
}

/** Nomor tahap (1–7) untuk satu peristiwa, sama dengan nomor di papan. */
export function nomorTahap(p) {
  const kunci = p.tahap === 'suntingan' || p.tahap === 'uji-ulang' ? 'penyetuju' : p.tahap;
  const i = URUTAN_TAHAP.findIndex((t) => t.kunci === kunci);
  return i < 0 ? null : i + 1;
}

/** Sebab berhenti yang pendek untuk papan: "pagu", "batas versi", atau kalimat log pertama. */
export function sebabBerhenti(berhenti) {
  const b = String(berhenti || '');
  if (b.startsWith('pagu tercapai') || b.startsWith('terpotong pagu')) return 'pagu';
  if (b.startsWith('batas')) return 'batas versi';
  if (b.startsWith('paket hanya memberi')) return 'paket terlalu tipis';
  return b === '' ? '' : alasanSingkat(b, 40);
}

/** Label pendek di atas judul peristiwa. */
export function labelPeristiwa(p) {
  const tetap = {
    data: 'Data', aturan: '33 aturan', paket: 'Paket fakta', perkiraan: 'Perkiraan biaya', hasil: 'Hasil',
    suntingan: 'Suntingan penyetuju', 'uji-ulang': 'Uji ulang', penyetuju: 'Penyetuju', galat: 'Galat',
  };
  if (p.tahap !== 'agen') return tetap[p.tahap] || p.tahap;
  const u = uraiJudulAgen(p.judul);
  if (u === null) return 'Agen AI';
  return `Agen AI · versi ${u.versi}${u.omongan === null ? '' : ` · omongan ${u.omongan}`}`;
}

/**
 * Judul peristiwa agen tanpa awalan "versi n · omongan m · " (sudah tampil di
 * label di atasnya). Sisa kalimatnya tetap apa adanya dari log.
 */
export function judulTanpaAwalan(p) {
  if (p.tahap !== 'agen') return p.judul;
  const m = /^(?:versi|putaran) \d+ · (?:omongan \d+ · )?/.exec(p.judul);
  return m === null ? p.judul : p.judul.slice(m[0].length);
}

/** Bagian pertama alasan (sampai ";"), dipotong rapi; isi lengkap tetap di baris tahapan. */
export function alasanSingkat(teks, batas = 120) {
  const t = String(teks || '').split('; ')[0].trim();
  if (t.length <= batas) return t;
  const potong = t.slice(0, batas - 1);
  const spasi = potong.lastIndexOf(' ');
  return `${(spasi > batas * 0.5 ? potong.slice(0, spasi) : potong).trimEnd()}…`;
}

/** Buang awalan "peran: " di alasan bila sama dengan kata pertama nama peran (mis. "pemeriksa: …"). */
function tanpaAwalanPeran(alasan, peran) {
  const kata = String(peran).split(' ')[0];
  return String(alasan).startsWith(`${kata}: `) ? String(alasan).slice(kata.length + 2) : String(alasan);
}

/**
 * Kalimat berhenti untuk papan, dengan angka dari log bila polanya dikenal:
 * "... US$1.445791 + perkiraan maksimum US$0.184540 untuk <model> > pagu milestone US$1.58 ...".
 */
export function teksBerhenti(berhenti) {
  const b = String(berhenti || '');
  const m = /US\$(\d+(?:\.\d+)?) \+ perkiraan maksimum US\$(\d+(?:\.\d+)?) untuk \S+ > pagu (\w+) US\$(\d+(?:\.\d+)?)/.exec(b);
  if (m !== null) {
    const nama = m[3] === 'milestone' ? 'pagu milestone (semua jalan penyusun)' : `pagu ${m[3]}`;
    const empat = (x) => 'US$' + Number(x).toFixed(4).replace('.', ',');
    return `${nama} ${empat(m[4])}; sudah terpakai ${empat(m[1])} + panggilan berikutnya maks ${empat(m[2])}, jadi tidak dikirim.`;
  }
  return alasanSingkat(b.split(': ').slice(0, 2).join(': '), 80);
}

/** Nama peran yang mudah dibaca untuk papan gerbang. */
export function namaPeran(u) {
  if (u === null) return 'agen';
  return u.peran;
}

/**
 * Papan ringkasan dari peristiwa sejauh ini (jalan langsung maupun tayang ulang).
 * Mengembalikan data saja; app.js yang menggambar.
 */
export function ringkasPapan(daftar) {
  const terlihat = new Set(daftar.map((p) => p.tahap));
  let biaya = null;
  let pagu = null;
  let palsu = false;
  let panggilan = 0;
  let ditolak = 0;
  let versi = 0;
  let aktif = null;
  let hasil = null;
  let menungguPersetujuan = false;
  const omongan = new Map();
  const gerbang = [];
  for (const p of daftar) {
    const isi = p.isi || {};
    if (p.tahap === 'perkiraan') {
      menungguPersetujuan = true;
      palsu = Boolean(isi.mesin && isi.mesin.palsu);
    }
    if (p.tahap === 'agen' && typeof isi.pagu_usd === 'number') {
      pagu = isi.pagu_usd;
      menungguPersetujuan = false;
    }
    if (p.tahap === 'agen' || p.tahap === 'uji-ulang') {
      if (typeof isi.total_usd === 'number') biaya = isi.total_usd;
      if (typeof isi.panggilan === 'number') panggilan += isi.panggilan;
      if (isi.putusan === 'tolak') ditolak += 1;
    }
    if (p.tahap === 'hasil') {
      hasil = { terbit: isi.terbit === true, berhenti: typeof isi.berhenti === 'string' ? isi.berhenti : null, putaran: isi.putaran ?? null, ledger: typeof isi.biaya_ledger_usd === 'number' ? isi.biaya_ledger_usd : null, biaya: typeof isi.biaya_usd === 'number' ? isi.biaya_usd : null };
      if (hasil.ledger !== null) biaya = hasil.ledger;
      else if (hasil.biaya !== null) biaya = hasil.biaya;
    }
    if (p.tahap !== 'agen') continue;
    const u = uraiJudulAgen(p.judul);
    if (u === null) continue;
    if (u.versi !== versi || (u.omongan !== null && aktif !== null && u.omongan !== aktif)) gerbang.length = 0;
    versi = u.versi;
    if (u.omongan !== null) aktif = u.omongan;
    const st = statusPeristiwa(p);
    const sebelumnya = gerbang.at(-1);
    // B1: baris "ditulis" berturut-turut oleh peran yang sama digabung (papan tetap muat di 1080).
    if (st === 'tulis' && sebelumnya && sebelumnya.status === 'tulis' && sebelumnya.peran === namaPeran(u)) sebelumnya.tugas = `${sebelumnya.tugas} + ${u.tugas}`;
    else gerbang.push({ no: p.no, peran: namaPeran(u), tugas: u.tugas, status: st, alasan: alasanSingkat(tanpaAwalanPeran(u.alasan, u.peran), 90) });
    if (u.omongan !== null) {
      const o = omongan.get(u.omongan) || { no: u.omongan, dikunci: null, versi: u.versi, terakhir: null, ditolak: null };
      o.versi = u.versi;
      o.terakhir = { peran: u.peran, status: statusPeristiwa(p) };
      if (statusPeristiwa(p) === 'tolak') o.ditolak = { peran: u.peran, versi: u.versi, alasan: alasanSingkat(tanpaAwalanPeran(u.alasan, u.peran), 60) };
      if (u.peran === 'kritikus' && statusPeristiwa(p) === 'lolos') o.dikunci = u.versi;
      omongan.set(u.omongan, o);
    }
  }
  const sedang = hasil !== null
    ? (terlihat.has('penyetuju') ? 'penyetuju' : 'hasil')
    : terlihat.has('agen') ? 'agen' : terlihat.has('perkiraan') ? 'perkiraan' : terlihat.has('paket') ? 'paket' : terlihat.has('aturan') ? 'aturan' : terlihat.has('data') ? 'data' : null;
  const iSedang = URUTAN_TAHAP.findIndex((t) => t.kunci === sedang);
  const tahap = URUTAN_TAHAP.map((t, i) => {
    let keadaan = i < iSedang ? 'selesai' : i === iSedang ? 'sedang' : 'belum';
    let catatan = keadaan === 'selesai' ? '✓' : keadaan === 'sedang' ? 'sekarang' : '';
    if (t.kunci === 'agen' && hasil !== null && !hasil.terbit && terlihat.has('agen')) {
      keadaan = 'gagal';
      catatan = `✗ berhenti${sebabBerhenti(hasil.berhenti) ? ` (${sebabBerhenti(hasil.berhenti)})` : ''}`;
    }
    if (t.kunci === 'hasil' && hasil !== null) {
      keadaan = hasil.terbit ? 'selesai' : 'gagal';
      catatan = hasil.terbit ? '✓ draf terbit' : '✗ tidak terbit';
    }
    if (t.kunci === 'penyetuju' && hasil !== null && !hasil.terbit) {
      keadaan = 'lewat';
      catatan = 'tidak ada draf';
    }
    if (t.kunci === 'penyetuju' && hasil !== null && hasil.terbit && sedang === 'hasil') {
      keadaan = 'sedang';
      catatan = 'menunggu';
    }
    return { ...t, keadaan, catatan };
  });
  const daftarOmongan = [1, 2, 3].map((no) => {
    const o = omongan.get(no);
    if (!o) return { no, keadaan: 'belum', teks: hasil !== null ? 'tidak dicapai' : 'belum ditulis', ditolak: null };
    const tolakTerakhir = o.ditolak === null ? null : `terakhir ditolak: ${o.ditolak.peran} (versi ${o.ditolak.versi}) — ${o.ditolak.alasan}`;
    if (o.dikunci !== null) return { no, keadaan: 'dikunci', teks: `lolos semua gerbang di versi ${o.dikunci}`, ditolak: null };
    if (hasil !== null && !hasil.terbit) return { no, keadaan: 'tolak', teks: `berhenti di versi ${o.versi}, belum lolos semua gerbang`, ditolak: null };
    const t = o.terakhir;
    const kata = t.status === 'tolak' ? `ditolak ${t.peran}` : t.status === 'lolos' ? `lolos ${t.peran}` : t.status === 'tulis' ? `${t.peran} menulis` : t.peran;
    // B6: baris "terakhir ditolak" hanya bila baris utama bukan penolakan yang sama.
    const ulang = t.status === 'tolak' && o.ditolak !== null && o.ditolak.versi === o.versi;
    return { no, keadaan: t.status === 'tolak' ? 'tolak' : 'jalan', teks: `versi ${o.versi}: ${kata}`, ditolak: ulang ? null : tolakTerakhir };
  });
  // Jalan berhenti sebelum semua gerbang: baris penutup di daftar gerbang (dari peristiwa hasil, bukan gerbang sungguhan).
  if (hasil !== null && !hasil.terbit && gerbang.length > 0) {
    gerbang.push({ no: null, peran: 'jalan berhenti', tugas: `sebab: ${sebabBerhenti(hasil.berhenti) || 'lihat hasil'}`, status: 'berhenti', alasan: '' });
  }
  return { tahap, sedang, versi, omonganAktif: aktif, omongan: daftarOmongan, gerbang: [...gerbang], biaya, pagu, palsu, panggilan, ditolak, hasil, menungguPersetujuan };
}

/** Cap dan kalimat hasil. Jalan yang tidak terbit TIDAK pernah disebut lulus/terbit. */
export function teksHasil(h) {
  if (!h) return null;
  if (h.terbit === true) return { cap: 'Draf terbit', kelas: 'cap-cocok', kalimat: `Ketiga omongan lolos semua gerbang sesudah ${h.putaran} versi. Draf menunggu penyetuju; belum dipasang ke produk.` };
  return { cap: 'Tidak terbit', kelas: 'cap-belum', kalimat: `Berhenti sesudah ${h.putaran} versi. Draf belum lolos semua gerbang, jadi tidak ada yang diserahkan ke penyetuju.` };
}

/** Penanda jeda tayang ulang: jujur tentang waktu asli. */
export function teksJeda(t) {
  if (!t || t.asli_ms === null || t.asli_ms === undefined) return null;
  if (t.jenis === 'dipercepat') return `Dipercepat ×${t.faktor}: jeda asli ${lama(t.asli_ms)}, diputar ${lama(t.putar_ms)}`;
  if (t.jenis === 'diperlambat') return `Diperlambat agar terbaca: jeda asli ${lama(t.asli_ms)}, diputar ${lama(t.putar_ms)}`;
  return `Jeda asli ${lama(t.asli_ms)}`;
}

/** Penanda rekaman yang selalu tampil selama tayang ulang. */
export function teksRekaman(r) {
  if (!r) return null;
  return {
    label: r.label,
    rincian: `Diputar ulang dari log ${r.sumber_log}: ${r.jumlah_peristiwa} peristiwa, aslinya ${lama(r.asli_ms)}, diputar ±${lama(r.putar_ms)}. Tanpa panggilan model.`,
    konteks: r.catatan && r.catatan.konteks ? r.catatan.konteks : null,
  };
}

/** Pola teks terlarang (tes kejujuran). */
export const POLA_TERLARANG = [/ditulis\s+(oleh\s+)?manusia/i, /buatan\s+manusia/i];

/* ------------------------------------------------------------------ */
/* M2d-14 mode demo                                                    */
/* ------------------------------------------------------------------ */

/** Tanggal & jam WIB (UTC+7) dari stempel ISO: "3 Okt 2026, 00.01 WIB". */
export function waktuWib(iso) {
  const t = new Date(Date.parse(iso) + 7 * 3_600_000);
  if (Number.isNaN(t.getTime())) return String(iso);
  const dua = (n) => String(n).padStart(2, '0');
  return `${t.getUTCDate()} ${BULAN[t.getUTCMonth()]} ${t.getUTCFullYear()}, ${dua(t.getUTCHours())}.${dua(t.getUTCMinutes())} WIB`;
}

/** Penanda mode demo yang tampil sejak awal (bagian mana hidup, mana rekaman). */
export function teksModeDemo(d) {
  if (!d) return null;
  return `Mode demo. Tahap 1–4 berjalan langsung tanpa biaya model. Bagian agen diputar dari log jalan nyata ${d.id}. Penyetuju bekerja langsung.`;
}

/** Kalimat transisi saat persetujuan diklik (D-1): jujur bahwa tahap agen adalah rekaman. */
export function teksTransisiDemo(d) {
  if (!d) return null;
  return `Bagian agen diputar dari jalan nyata ${d.id} (biaya asli ${usdBiaya(d.biaya_asli_usd)}).`;
}

/** Tanpa pagu uji ulang dan tanpa hasil tersimpan: gerbang AI tidak diuji ulang. */
export const TEKS_AI_BELUM = 'Gerbang AI belum diuji ulang.';

/** Sumber hasil gerbang AI di panel penyetuju demo. */
export function teksSumberUji(u) {
  if (!u) return TEKS_AI_BELUM;
  const biaya = typeof u.biaya_ledger_usd === 'number' ? `biaya nyata ${usdBiaya(u.biaya_ledger_usd)} (ledger)` : 'biaya nyata belum tercatat';
  if (u.sumber === 'tersimpan') return `Hasil uji ulang sungguhan ${waktuWib(u.waktu_uji)}, ${biaya}. Diputar dari catatan, tanpa panggilan baru.`;
  return `Uji ulang sungguhan sekarang (${biaya}).`;
}
