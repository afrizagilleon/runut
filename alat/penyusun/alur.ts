/**
 * Urutan satu jalan lewat pintu (M2d-9 D-4): siapkan (gratis: data → 33 aturan
 * → paket → perkiraan biaya) → MENUNGGU PERSETUJUAN klik → agen (berbayar) →
 * hasil (draf + jejak, atau penolakan beralasan).
 */
import { tanggalId } from '../../factory/format.ts';
import { rencanaSudut } from '../../factory/llm/sudut.ts';
import { AWALAN_TAG_PENYUSUN, biayaAwalan, ringkasBiaya } from './biaya.ts';
import { alasanAwam, buatJalan, idJalan, Jalan, muatJalan, PAGU_JALAN_BAWAAN, PAGU_JALAN_MIN, POLA_ID, terapkanHasil } from './jalan.ts';
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
  };
}
