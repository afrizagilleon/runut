/**
 * Pengumpul peristiwa alpha (D-9).
 *
 * Node bawaan saja: `node:http` dan `node:fs`, nol dependensi. Setiap dependensi
 * adalah permukaan serangan untuk layanan yang menerima kiriman dari internet,
 * dan repo ini dinilai dari kesederhanaannya.
 *
 * Yang TIDAK ditulis ke berkas, dan tidak boleh pernah ditulis (INV-9):
 * alamat IP, User-Agent, dan header apa pun. Baris yang ditulis dibangun dari
 * nol memakai field yang lolos validator — bukan dari penyalinan badan
 * permintaan — supaya kiriman tidak bisa menyelundupkan field tambahan.
 *
 * Konfigurasi hanya lewat variabel lingkungan. Tidak membaca `.env`.
 *
 *   HOST             alamat dengar, default 127.0.0.1 (loopback)
 *   PORT             default 8787
 *   DATA_DIR         direktori berkas JSONL, default ./data
 *   ASAL_DIIZINKAN   daftar asal CORS dipisah koma; kosong berarti tanpa CORS
 *   MAKS_PER_MENIT   pembatas kasar seproses, default 600
 *
 * Di produksi pengumpul berada di belakang Caddy pada asal yang sama dengan
 * aplikasi, jadi CORS tidak terpakai; `ASAL_DIIZINKAN` ada untuk pengembangan
 * lokal lintas port.
 */
import { createServer } from 'node:http';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

/** Badan permintaan paling besar yang diterima (D-9). */
export const MAKS_BADAN = 8 * 1024;

/** Daftar peristiwa tertutup (D-6). Apa pun di luar ini dijawab 400. */
const MEDAN_ISI = {
  mulai: { lebar_layar: 'angka' },
  layar_masuk: { layar: 'teks' },
  kartu_buka: { soal_id: 'teks', fact_id: 'teks' },
  pilih: { soal_id: 'teks', kunci: 'teks', ganti_ke: 'angka' },
  kunci_jawaban: {
    soal_id: 'teks',
    kunci: 'teks',
    benar: 'boolean',
    ms_di_soal: 'angka',
    kartu_dibuka_sebelum: 'angka',
  },
  lihat_balik: { dari_layar: 'teks', ke_layar: 'teks' },
  pembukaan_masuk: {},
  pembukaan_selesai: { ms_di_pembukaan: 'angka', gulir_maks_persen: 'angka' },
  minat_kasus_lain: {},
  akhir_kirim: {
    rating: 'angka?',
    terasa: 'teks?',
    sumber_jawaban: 'teks?',
    teks: 'teks-panjang?',
  },
  tutup: { layar_terakhir: 'teks' },
};

const MAKS_TEKS = 200;
const MAKS_TEKS_PANJANG = 500;
const MAKS_ID = 64;

function teksSah(nilai, batas) {
  return typeof nilai === 'string' && nilai.length > 0 && nilai.length <= batas;
}

function angkaSah(nilai) {
  return typeof nilai === 'number' && Number.isFinite(nilai);
}

function medanSah(bentuk, nilai) {
  const bolehKosong = bentuk.endsWith('?');
  const inti = bolehKosong ? bentuk.slice(0, -1) : bentuk;
  if (nilai === null) return bolehKosong;
  if (nilai === undefined) return false;
  if (inti === 'angka') return angkaSah(nilai);
  if (inti === 'boolean') return typeof nilai === 'boolean';
  if (inti === 'teks') return teksSah(nilai, MAKS_TEKS);
  if (inti === 'teks-panjang') return typeof nilai === 'string' && nilai.length <= MAKS_TEKS_PANJANG;
  return false;
}

/**
 * Validator tulisan tangan (D-9): nama, tipe tiap field, panjang tiap teks.
 * Mengembalikan peristiwa **baru** yang hanya memuat field yang dikenal, atau
 * `{ galat }` yang menyebut sebabnya.
 */
export function periksaPeristiwa(mentah) {
  if (typeof mentah !== 'object' || mentah === null || Array.isArray(mentah)) {
    return { galat: 'peristiwa bukan obyek' };
  }
  const { nama, sesi, kasus_id, t_ms, urut, isi } = mentah;

  if (!Object.prototype.hasOwnProperty.call(MEDAN_ISI, nama)) {
    return { galat: `nama peristiwa "${String(nama)}" tidak ada di daftar tertutup` };
  }
  if (!teksSah(sesi, MAKS_ID)) return { galat: 'sesi bukan teks yang sah' };
  if (!teksSah(kasus_id, MAKS_ID)) return { galat: 'kasus_id bukan teks yang sah' };
  if (!angkaSah(t_ms) || t_ms < 0) return { galat: 't_ms bukan angka yang sah' };
  if (!angkaSah(urut) || urut < 1) return { galat: 'urut bukan angka yang sah' };
  if (typeof isi !== 'object' || isi === null || Array.isArray(isi)) {
    return { galat: 'isi bukan obyek' };
  }

  const bentuk = MEDAN_ISI[nama];
  const isiBersih = {};
  for (const [medan, jenis] of Object.entries(bentuk)) {
    if (!medanSah(jenis, isi[medan])) {
      return { galat: `medan "${medan}" di peristiwa "${nama}" tidak sah` };
    }
    isiBersih[medan] = isi[medan] ?? null;
  }
  for (const medan of Object.keys(isi)) {
    if (!Object.prototype.hasOwnProperty.call(bentuk, medan)) {
      return { galat: `medan "${medan}" tidak dikenal di peristiwa "${nama}"` };
    }
  }

  return { peristiwa: { nama, sesi, kasus_id, t_ms, urut, isi: isiBersih } };
}

function berkasHariIni(dataDir, sekarang) {
  const hari = sekarang.toISOString().slice(0, 10);
  return join(dataDir, `peristiwa-${hari}.jsonl`);
}

/** Satu baris JSON per peristiwa, ditambah waktu terima. Tanpa header apa pun. */
export function tulisPeristiwa(dataDir, daftar, sekarang = new Date()) {
  const baris = daftar
    .map((p) => JSON.stringify({ ...p, diterima_pada: sekarang.toISOString() }) + '\n')
    .join('');
  appendFileSync(berkasHariIni(dataDir, sekarang), baris, 'utf8');
}

function asalDiizinkan(env) {
  return String(env.ASAL_DIIZINKAN ?? '')
    .split(',')
    .map((a) => a.trim())
    .filter((a) => a !== '');
}

/** Pembatas kasar seproses: hitungan per menit berjalan. */
function buatPembatas(maksPerMenit) {
  let menit = 0;
  let hitung = 0;
  return () => {
    const sekarang = Math.floor(Date.now() / 60_000);
    if (sekarang !== menit) {
      menit = sekarang;
      hitung = 0;
    }
    hitung += 1;
    return hitung <= maksPerMenit;
  };
}

export function buatKolektor(env = process.env) {
  const dataDir = env.DATA_DIR ?? './data';
  const asal = asalDiizinkan(env);
  const bolehLewat = buatPembatas(Number(env.MAKS_PER_MENIT ?? 600));
  mkdirSync(dataDir, { recursive: true });

  const pasangCors = (permintaan, jawaban) => {
    const dari = permintaan.headers.origin;
    if (typeof dari === 'string' && asal.includes(dari)) {
      jawaban.setHeader('Access-Control-Allow-Origin', dari);
      jawaban.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      jawaban.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    }
  };

  return createServer((permintaan, jawaban) => {
    pasangCors(permintaan, jawaban);
    const jalur = (permintaan.url ?? '/').split('?')[0];

    if (permintaan.method === 'OPTIONS') {
      jawaban.writeHead(204).end();
      return;
    }
    if (permintaan.method === 'GET' && jalur === '/sehat') {
      jawaban.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end('sehat\n');
      return;
    }
    if (permintaan.method !== 'POST' || jalur !== '/e') {
      jawaban.writeHead(404).end();
      return;
    }
    if (!bolehLewat()) {
      jawaban.writeHead(429).end();
      return;
    }

    /**
     * Menolak badan yang terlalu besar tanpa memutus soket di tengah jalan.
     * Memanggil `destroy()` di sini akan me-reset sambungan sebelum jawaban 413
     * sempat terbaca klien, dan pengirim hanya melihat ECONNRESET — kegagalan
     * yang menyamar sebagai gangguan jaringan. Jadi: jawab, tandai sambungan
     * akan ditutup, lalu buang sisa badannya tanpa menyimpannya.
     */
    const tolakTerlaluBesar = () => {
      jawaban.writeHead(413, {
        Connection: 'close',
        'Content-Type': 'text/plain; charset=utf-8',
      });
      jawaban.end('badan lebih besar dari batas\n');
      permintaan.resume();
    };

    const panjang = Number(permintaan.headers['content-length'] ?? 0);
    if (Number.isFinite(panjang) && panjang > MAKS_BADAN) {
      tolakTerlaluBesar();
      return;
    }

    let badan = '';
    let terlaluBesar = false;
    permintaan.setEncoding('utf8');
    permintaan.on('data', (potongan) => {
      if (terlaluBesar) return;
      badan += potongan;
      if (badan.length > MAKS_BADAN) {
        terlaluBesar = true;
        tolakTerlaluBesar();
      }
    });
    permintaan.on('end', () => {
      if (terlaluBesar) return;
      let mentah;
      try {
        mentah = JSON.parse(badan);
      } catch {
        jawaban.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end('badan bukan JSON\n');
        return;
      }
      const daftar = Array.isArray(mentah) ? mentah : [mentah];
      if (daftar.length === 0) {
        jawaban.writeHead(400).end('kiriman kosong\n');
        return;
      }
      const bersih = [];
      for (const satu of daftar) {
        const hasil = periksaPeristiwa(satu);
        if (hasil.galat !== undefined) {
          // Satu peristiwa cacat menolak seluruh kiriman: menulis sebagiannya
          // akan membuat data alpha setengah benar tanpa jejak.
          jawaban
            .writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' })
            .end(`ditolak: ${hasil.galat}\n`);
          return;
        }
        bersih.push(hasil.peristiwa);
      }
      try {
        tulisPeristiwa(dataDir, bersih);
      } catch (galat) {
        console.error('kolektor: gagal menulis berkas', galat);
        jawaban.writeHead(500).end();
        return;
      }
      jawaban.writeHead(204).end();
    });
  });
}

/** Dijalankan langsung lewat `npm run kolektor`, tidak saat diimpor tes. */
if (process.argv[1] !== undefined && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const host = process.env.HOST ?? '127.0.0.1';
  const port = Number(process.env.PORT ?? 8787);
  buatKolektor().listen(port, host, () => {
    console.log(`kolektor mendengarkan di http://${host}:${String(port)}`);
    console.log(`berkas ditulis ke ${process.env.DATA_DIR ?? './data'}`);
  });
}
