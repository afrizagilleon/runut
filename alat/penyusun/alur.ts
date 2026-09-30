/**
 * Urutan satu jalan lewat pintu (M2d-9 D-4): siapkan (gratis: data → 33 aturan
 * → paket → perkiraan biaya) → MENUNGGU PERSETUJUAN klik → agen (berbayar) →
 * hasil (draf + jejak, atau penolakan beralasan).
 */
import { isAbsolute, relative, sep } from 'node:path';
import { tanggalId } from '../../factory/format.ts';
import { rencanaSudut } from '../../factory/llm/sudut.ts';
import { AWALAN_TAG_PENYUSUN, biayaAwalan, ringkasBiaya } from './biaya.ts';
import { alasanAwam, buatJalan, idJalan, Jalan, muatJalan, PAGU_JALAN_BAWAAN, PAGU_JALAN_MIN, POLA_ID, terapkanHasil, type UjiUlang } from './jalan.ts';
import { bolehSetujui, catatSuntingan, LOKASI_SUNTING, omonganDiuji, periksaSuntingan, teksDi, terapkanSuntingan, type LokasiSunting } from './penyetuju.ts';
import { statusKonfig } from './konfig.ts';
import type { MesinPenulis } from './mesin.ts';
import { bangunTahapGratis } from './tahapan.ts';
import { periksaTanggal } from './tanggal.ts';
import type { PemuatGudang } from './emiten.ts';

/** Bagian keadaan server yang dipakai alur (tanpa mengimpor server.ts). */
export interface KonteksAlur {
  akar: string;
  folderKeluaran: string;
  jam: () => Date;
  log: (b: string) => void;
  paguPenyusunUsd: number;
  proses?: Record<string, string | undefined>;
  gudang: PemuatGudang;
  mesin: MesinPenulis;
  jalan: Map<string, Jalan>;
  daftarAliran: (j: Jalan) => void;
}

export class GalatAlur extends Error {
  readonly status: number;
  constructor(status: number, pesan: string) {
    super(pesan);
    this.name = 'GalatAlur';
    this.status = status;
  }
}

export interface BatasPagu {
  sisa_penyusun_usd: number;
  sisa_llm_usd: number | null;
  /** Pagu jalan terbesar yang boleh diminta. */
  maks_usd: number;
  bawaan_usd: number;
  min_usd: number;
}

function turunkanSen(x: number): number {
  return Math.max(0, Math.floor(x * 100 + 1e-9) / 100);
}

export function batasPagu(k: KonteksAlur): BatasPagu {
  if (k.mesin.palsu) return { sisa_penyusun_usd: 99, sisa_llm_usd: 99, maks_usd: 99, bawaan_usd: PAGU_JALAN_BAWAAN, min_usd: PAGU_JALAN_MIN };
  const b = ringkasBiaya(k.akar, k.paguPenyusunUsd);
  const konfig = statusKonfig(k.akar, k.proses ?? process.env);
  const sisaPenyusun = turunkanSen(k.paguPenyusunUsd - b.terpakai_penyusun_usd);
  const sisaLlm = konfig.pagu_llm_usd === null ? null : turunkanSen(konfig.pagu_llm_usd - b.terpakai_ledger_usd);
  const maks = Math.min(sisaPenyusun, sisaLlm ?? 0);
  return { sisa_penyusun_usd: sisaPenyusun, sisa_llm_usd: sisaLlm, maks_usd: maks, bawaan_usd: Math.min(PAGU_JALAN_BAWAAN, maks), min_usd: PAGU_JALAN_MIN };
}

/** Jalan di memori, atau dimuat dari folder keluaran. */
export function ambilJalan(k: KonteksAlur, id: string): Jalan {
  if (!POLA_ID.test(id)) throw new GalatAlur(404, 'Jalan tidak dikenal.');
  let j = k.jalan.get(id) ?? null;
  if (j === null) {
    j = muatJalan(k.folderKeluaran, id);
    if (j === null) throw new GalatAlur(404, 'Jalan tidak dikenal.');
    k.jalan.set(id, j);
    k.daftarAliran(j);
  }
  return j;
}

export interface MasukanSiapkan {
  kode: string;
  tanggal: string;
  jendela: number;
  id?: string;
}

/** Buat jalan dan jalankan tahap gratis (data → aturan → paket → perkiraan). */
export function siapkan(k: KonteksAlur, m: MasukanSiapkan): Jalan {
  const data = k.gudang.emiten(m.kode);
  if (data === null) throw new GalatAlur(404, `Data ${m.kode} belum ada di cache.`);
  const hariIni = k.jam().toISOString().slice(0, 10);
  const cek = periksaTanggal(m.tanggal, data, k.gudang.kalender(), { jendela: m.jendela, hariIni });
  if (!cek.sah || cek.tanggal === null) throw new GalatAlur(400, cek.alasan);
  const id = m.id ?? idJalan(m.kode, cek.tanggal, k.jam());
  let j: Jalan;
  try {
    j = buatJalan(k.folderKeluaran, id, m.kode, cek.tanggal, m.jendela, k.jam);
  } catch (galat) {
    throw new GalatAlur(400, galat instanceof Error ? galat.message : 'jalan tidak bisa dibuat');
  }
  k.jalan.set(id, j);
  k.daftarAliran(j);
  setImmediate(() => tahapGratis(k, j));
  return j;
}

function tahapGratis(k: KonteksAlur, j: Jalan): void {
  const a = j.aliran;
  try {
    const t = bangunTahapGratis(j.data.kode, j.data.tanggal, j.data.jendela, k.gudang.gudang());
    j.data.sesudahnya = t.data.isi.sesudahnya;
    a.kirim('data', t.data.judul, t.data.isi);
    a.kirim('aturan', t.aturan.judul, t.aturan.isi);
    j.paket = t.paket;
    j.tulis('paket.json', t.paket);
    j.data.sumber_paket = { sumber: t.pilihan.sumber, keterangan: t.pilihan.keterangan };
    a.kirim('paket', t.ringkasPaket.judul, t.ringkasPaket.isi);
    const sudut = rencanaSudut(t.paket).length;
    if (sudut < 3) {
      // Lingkar akan berhenti di langkah perencana tanpa satu panggilan pun: tolak sekarang, sebelum biaya.
      j.data.hasil = { terbit: false, berhenti: `paket hanya memberi ${String(sudut)} sudut; simulasi tidak terbit`, putaran: 0, biaya_usd: 0, biaya_ledger_usd: 0, penolakan: [] };
      j.data.tahap = 'selesai';
      a.kirim('hasil', `Tidak terbit, tanpa biaya: paket fakta hanya memberi ${String(sudut)} calon sudut soal, perlu 3. Pilih hari lain yang datanya lebih kaya.`, { terbit: false, berhenti: j.data.hasil.berhenti, biaya_usd: 0 });
      j.simpan();
      a.tutup();
      return;
    }
    const perkiraan = k.mesin.perkiraan();
    j.data.perkiraan = perkiraan;
    j.data.mesin = { nama: k.mesin.nama, keterangan: k.mesin.keterangan, palsu: k.mesin.palsu };
    const batas = batasPagu(k);
    const siap = k.mesin.siap();
    j.data.tahap = 'menunggu-persetujuan';
    j.simpan();
    a.kirim(
      'perkiraan',
      `Siap menjalankan agen (${k.mesin.palsu ? 'PALSU, tanpa biaya' : 'berbayar'}). Perkiraan maksimum: satu omongan melewati semua gerbang ≤ US$${perkiraan.per_omongan_usd.toFixed(2)}, ` +
        `satu putaran tiga omongan ≤ US$${perkiraan.per_putaran_usd.toFixed(2)}, paling banyak ${String(perkiraan.maks_putaran)} putaran. Jalan dibatasi pagu yang kamu setujui; menunggu persetujuan.`,
      { perkiraan, batas, mesin: j.data.mesin, siap },
    );
  } catch (galat) {
    j.data.tahap = 'galat';
    j.data.galat = galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat tak dikenal';
    j.simpan();
    a.kirim('galat', `Tahap persiapan gagal: ${j.data.galat}`, {});
    a.tutup();
  }
}

/** Persetujuan klik → jalankan agen (berbayar). Menolak tanpa `setuju: true` dan pagu yang sah. */
export function mulai(k: KonteksAlur, j: Jalan, setuju: unknown, paguMentah: unknown): number {
  if (j.data.tahap !== 'menunggu-persetujuan') throw new GalatAlur(409, `Jalan ini tidak sedang menunggu persetujuan (tahap: ${j.data.tahap}).`);
  if (setuju !== true) throw new GalatAlur(400, 'Agen memakai biaya OpenRouter; setujui perkiraan biayanya di layar dulu.');
  const batas = batasPagu(k);
  const pagu = typeof paguMentah === 'number' ? paguMentah : Number(paguMentah);
  if (!Number.isFinite(pagu) || pagu < batas.min_usd) throw new GalatAlur(400, `Pagu jalan harus angka ≥ US$${batas.min_usd.toFixed(2)}.`);
  if (pagu > batas.maks_usd) throw new GalatAlur(400, `Pagu jalan US$${pagu.toFixed(2)} melebihi sisa pagu (US$${batas.maks_usd.toFixed(2)}).`);
  const siap = k.mesin.siap();
  if (!siap.siap) throw new GalatAlur(400, siap.alasan ?? 'Mesin belum siap.');
  if (j.paket === null) throw new GalatAlur(409, 'Paket fakta belum ada.');
  j.data.tahap = 'berjalan';
  j.data.pagu_jalan_usd = pagu;
  j.simpan();
  j.aliran.kirim('agen', `Persetujuan diterima: pagu jalan US$${pagu.toFixed(2)}. Agen mulai (${k.mesin.nama}).`, { pagu_usd: pagu, mesin: j.data.mesin });
  const paket = j.paket;
  void (async () => {
    try {
      const h = await k.mesin.jalankan({ id: j.data.id, paket, folder: j.folder, paguJalanUsd: pagu, lapor: (t, judul, isi) => j.aliran.kirim(t, judul, isi), jam: k.jam });
      const ledger = k.mesin.palsu ? null : biayaAwalan(k.akar, `${AWALAN_TAG_PENYUSUN}${j.data.id}/`);
      terapkanHasil(j, h, ledger);
      j.simpan();
      const biaya = ledger === null ? `biaya palsu US$${h.biaya_usd.toFixed(4)}` : `biaya nyata US$${ledger.toFixed(4)}`;
      j.aliran.kirim(
        'hasil',
        h.terbit
          ? `TERBIT sesudah ${String(h.putaran)} putaran: ketiga omongan lolos semua gerbang (${biaya}). Draf menunggu penyetuju.`
          : `TIDAK TERBIT sesudah ${String(h.putaran)} putaran (${biaya}). ${alasanAwam(h.berhenti, pagu)}`,
        { terbit: h.terbit, berhenti: h.berhenti, putaran: h.putaran, biaya_usd: h.biaya_usd, biaya_ledger_usd: ledger, penolakan: j.data.hasil?.penolakan ?? [] },
      );
      k.log(`jalan ${j.data.id}: ${h.terbit ? 'TERBIT' : 'TIDAK TERBIT'} (${String(h.putaran)} putaran, ${biaya})`);
    } catch (galat) {
      j.data.tahap = 'galat';
      j.data.galat = galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat tak dikenal';
      j.simpan();
      j.aliran.kirim('galat', `Agen berhenti karena galat: ${j.data.galat}`, {});
    } finally {
      j.aliran.tutup();
    }
  })();
  return pagu;
}

/* ---------------------------------------------------------------------- */
/* penyetuju (D-5)                                                         */
/* ---------------------------------------------------------------------- */

function wajibTerbitBelumDiputus(j: Jalan): void {
  if (j.data.tahap !== 'selesai' || j.data.hasil?.terbit !== true || j.data.draf === null) throw new GalatAlur(409, 'Hanya draf yang terbit yang bisa diperiksa penyetuju.');
  if (j.data.putusan !== null) throw new GalatAlur(409, 'Draf ini sudah diputuskan penyetuju.');
  if (j.sibuk) throw new GalatAlur(409, 'Uji ulang sedang berjalan; tunggu hasilnya.');
}

/** Perbaiki KATA: satu lokasi satu omongan; angka, rujukan, dan label dikunci; dicatat; draf menjadi "perlu uji ulang". */
export function sunting(k: KonteksAlur, j: Jalan, omongan: unknown, lokasi: unknown, teks: unknown): void {
  wajibTerbitBelumDiputus(j);
  const no = typeof omongan === 'number' ? omongan : Number(omongan);
  if (!Number.isInteger(no) || no < 1 || no > 3) throw new GalatAlur(400, 'Nomor omongan harus 1–3.');
  if (typeof lokasi !== 'string' || !(LOKASI_SUNTING as readonly string[]).includes(lokasi)) throw new GalatAlur(400, `Lokasi harus salah satu dari: ${LOKASI_SUNTING.join(', ')}.`);
  if (typeof teks !== 'string') throw new GalatAlur(400, 'Teks suntingan wajib diisi.');
  const o = j.data.draf?.omongan[no - 1];
  if (o === undefined) throw new GalatAlur(404, 'Omongan tidak ada.');
  const lok = lokasi as LokasiSunting;
  const alasanTolak = periksaSuntingan(o, lok, teks);
  if (alasanTolak !== null) throw new GalatAlur(400, alasanTolak);
  const dari = teksDi(o, lok);
  terapkanSuntingan(o, j.data.keadaan.find((x) => x.no === no), lok, teks);
  const s = catatSuntingan(j.data, no, lok, dari, teks, k.jam().toISOString());
  j.simpan();
  j.aliran.buka();
  j.aliran.kirim('suntingan', `Suntingan ${String(s.ke)} oleh manusia: omongan ${String(no)}, ${lok}. Draf perlu diuji ulang oleh gerbang yang sama sebelum boleh disetujui.`, { suntingan: s });
  j.aliran.tutup();
}

/** Perkiraan maksimum uji ulang untuk suntingan yang belum lolos. */
export function perkiraanUjiUlang(k: KonteksAlur, j: Jalan): { diuji: number[]; maks_usd: number } {
  const diuji = omonganDiuji(j.data);
  return { diuji, maks_usd: k.mesin.perkiraanUjiUlang(diuji.length) };
}

/** Uji ulang (berbayar) — wajib `setuju: true`; pagu = perkiraan maksimumnya (dibulatkan ke atas ke sen). */
export function ujiUlang(k: KonteksAlur, j: Jalan, setuju: unknown): { ke: number; pagu_usd: number } {
  wajibTerbitBelumDiputus(j);
  const { diuji, maks_usd } = perkiraanUjiUlang(k, j);
  if (diuji.length === 0) throw new GalatAlur(409, 'Tidak ada suntingan yang perlu diuji ulang.');
  if (setuju !== true) throw new GalatAlur(400, `Uji ulang memakai biaya OpenRouter (≤ US$${maks_usd.toFixed(2)}); setujui perkiraannya di layar dulu.`);
  const siap = k.mesin.siap();
  if (!siap.siap) throw new GalatAlur(400, siap.alasan ?? 'Mesin belum siap.');
  // Pagu uji ulang = perkiraan maksimumnya, dipotong sisa pagu. Bila sisa lebih kecil, kode tetap menghentikan
  // panggilan yang akan melewatinya, dan uji ulang berakhir TIDAK LOLOS dengan alasan pagu.
  const batas = batasPagu(k);
  if (batas.maks_usd < batas.min_usd) throw new GalatAlur(400, `Sisa pagu (US$${batas.maks_usd.toFixed(2)}) di bawah US$${batas.min_usd.toFixed(2)}; uji ulang tidak bisa dijalankan.`);
  const pagu = Math.min(Math.ceil(maks_usd * 100 - 1e-9) / 100, batas.maks_usd);
  if (j.paket === null) throw new GalatAlur(409, 'Paket fakta tidak ada.');
  const catatan: UjiUlang = {
    ke: j.data.uji_ulang.length + 1,
    waktu_mulai: k.jam().toISOString(),
    waktu_selesai: null,
    sampai_suntingan: j.data.suntingan.length,
    diuji,
    lolos: null,
    berhenti: null,
    masalah: [],
    per_omongan: [],
    pagu_usd: pagu,
    biaya_usd: 0,
  };
  j.data.uji_ulang.push(catatan);
  j.sibuk = true;
  j.simpan();
  j.aliran.buka();
  j.aliran.kirim('uji-ulang', `Uji ulang ${String(catatan.ke)} disetujui (pagu US$${pagu.toFixed(2)}): omongan ${diuji.join(', ')} lewat gerbang yang sama.`, { ke: catatan.ke, diuji, pagu_usd: pagu });
  const paket = j.paket;
  void (async () => {
    try {
      const h = await k.mesin.ujiUlang({ id: j.data.id, ke: catatan.ke, paket, folder: j.folder, keadaan: j.data.keadaan, diuji, paguUsd: pagu, lapor: (t, judul, isi) => j.aliran.kirim(t, judul, isi), jam: k.jam });
      catatan.lolos = h.lolos;
      catatan.berhenti = h.berhenti;
      catatan.masalah = h.masalah;
      catatan.per_omongan = h.per_omongan;
      catatan.biaya_usd = k.mesin.palsu ? h.biaya_usd : biayaAwalan(k.akar, `${AWALAN_TAG_PENYUSUN}${j.data.id}/uji-ulang-${String(catatan.ke)}/`);
    } catch (galat) {
      catatan.lolos = false;
      catatan.berhenti = galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat tak dikenal';
    } finally {
      catatan.waktu_selesai = k.jam().toISOString();
      j.sibuk = false;
      j.simpan();
      const alasan = [...catatan.masalah, ...catatan.per_omongan.filter((x) => !x.lolos).flatMap((x) => x.alasan.map((a) => `omongan ${String(x.no)}: ${a}`))];
      j.aliran.kirim(
        'uji-ulang',
        catatan.lolos === true
          ? `Uji ulang ${String(catatan.ke)} LOLOS: suntingan tidak membuat gerbang mana pun keberatan (biaya US$${catatan.biaya_usd.toFixed(4)}). Draf boleh disetujui.`
          : `Uji ulang ${String(catatan.ke)} TIDAK LOLOS${catatan.berhenti === null ? '' : ` (${catatan.berhenti})`}: ${alasan[0] ?? 'lihat rincian'}. Perbaiki lagi atau tolak.`,
        { ke: catatan.ke, lolos: catatan.lolos, alasan: alasan.slice(0, 6), biaya_usd: catatan.biaya_usd },
      );
      j.aliran.tutup();
    }
  })();
  return { ke: catatan.ke, pagu_usd: pagu };
}

function kartuDraf(j: Jalan): Record<string, { klaim: string; asal: string; jenis: string; terbit: string }> {
  const dirujuk = new Set((j.data.draf?.omongan ?? []).flatMap((o) => o.kartu));
  return Object.fromEntries((j.paket?.fakta ?? []).filter((f) => dirujuk.has(f.fact_id)).map((f) => [f.fact_id, { klaim: f.klaim, asal: f.asal, jenis: f.jenis, terbit: f.terbit }]));
}

function relatif(akar: string, jalur: string): string {
  const r = relative(akar, jalur);
  return r.startsWith('..') || isAbsolute(r) ? jalur.split(/[\\/]/).slice(-3).join('/') : r.split(sep).join('/');
}

/** Setujui: hanya bila semua suntingan lolos uji ulang. Keluaran ke folder jalan — BUKAN cases/. */
export function setujui(k: KonteksAlur, j: Jalan): string[] {
  wajibTerbitBelumDiputus(j);
  const b = bolehSetujui(j.data);
  if (!b.boleh) throw new GalatAlur(409, b.alasan ?? 'Belum boleh disetujui.');
  const waktu = k.jam().toISOString();
  const berkas = [
    j.tulis('draf-disetujui.json', {
      keterangan: 'Draf simulasi yang disetujui penyetuju manusia lewat pintu penyusun (M2d-9). BELUM dipasang ke produk: memasang ke cases/ adalah langkah terpisah dengan izin deploy.',
      id: j.data.id,
      emiten: j.data.kode,
      tanggal_t: j.data.tanggal,
      nama_samaran: j.paket?.nama_samaran ?? null,
      paket_id: j.paket?.paket_id ?? null,
      sumber_paket: j.data.sumber_paket,
      mesin: j.data.mesin,
      disetujui: { oleh: 'manusia', waktu },
      draf: j.data.draf,
      kartu: kartuDraf(j),
      jejak: ['jejak-agen.json', ...j.data.uji_ulang.map((u) => `uji-ulang-${String(u.ke)}.json`)],
      suntingan: j.data.suntingan.length,
      uji_ulang: j.data.uji_ulang.map((u) => ({ ke: u.ke, lolos: u.lolos, diuji: u.diuji, sampai_suntingan: u.sampai_suntingan })),
    }),
    j.tulis('catatan-suntingan.json', { suntingan: j.data.suntingan, uji_ulang: j.data.uji_ulang }),
  ].map((x) => relatif(k.akar, x));
  j.data.putusan = { putusan: 'setujui', waktu, alasan: null, berkas };
  j.simpan();
  j.aliran.buka();
  j.aliran.kirim('penyetuju', `Disetujui oleh manusia. Ditulis: ${berkas.join(', ')} (bukan cases/; memasang ke produk = langkah terpisah).`, { putusan: 'setujui', berkas });
  j.aliran.tutup();
  return berkas;
}

/** Tolak dengan alasan (wajib). */
export function tolak(k: KonteksAlur, j: Jalan, alasan: unknown): string[] {
  wajibTerbitBelumDiputus(j);
  const a = typeof alasan === 'string' ? alasan.trim() : '';
  if (a.length < 5) throw new GalatAlur(400, 'Tulis alasan penolakan (paling sedikit 5 huruf).');
  const waktu = k.jam().toISOString();
  const berkas = [
    j.tulis('penolakan-penyetuju.json', { id: j.data.id, emiten: j.data.kode, tanggal_t: j.data.tanggal, ditolak: { oleh: 'manusia', waktu, alasan: a }, draf: j.data.draf }),
    j.tulis('catatan-suntingan.json', { suntingan: j.data.suntingan, uji_ulang: j.data.uji_ulang }),
  ].map((x) => relatif(k.akar, x));
  j.data.putusan = { putusan: 'tolak', waktu, alasan: a, berkas };
  j.simpan();
  j.aliran.buka();
  j.aliran.kirim('penyetuju', `Ditolak oleh manusia: ${a}`, { putusan: 'tolak', alasan: a, berkas });
  j.aliran.tutup();
  return berkas;
}

/** Potret jalan untuk halaman: keadaan + kartu yang dirujuk draf + batas pagu. */
export function potret(k: KonteksAlur, j: Jalan): Record<string, unknown> {
  const dirujuk = new Set<string>();
  for (const o of [...(j.data.draf?.omongan ?? []), ...j.data.draf_terakhir]) for (const id of o?.kartu ?? []) dirujuk.add(id);
  const kartu = Object.fromEntries(
    (j.paket?.fakta ?? []).filter((f) => dirujuk.has(f.fact_id)).map((f) => [f.fact_id, { klaim: f.klaim, asal: f.asal, jenis: f.jenis, terbit: f.terbit }]),
  );
  return {
    ...j.data,
    judul: `${j.data.kode} · ${tanggalId(j.data.tanggal)}`,
    nama_samaran: j.paket?.nama_samaran ?? null,
    kartu,
    batas: batasPagu(k),
    mesin_siap: k.mesin.siap(),
    alasan_awam: j.data.hasil === null ? null : alasanAwam(j.data.hasil.berhenti, j.data.pagu_jalan_usd),
    penyetuju: { ...bolehSetujui(j.data), uji_ulang: perkiraanUjiUlang(k, j), sibuk: j.sibuk },
  };
}
