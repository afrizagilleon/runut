/**
 * `npm run patokan:pemanasan` — soal pemanasan TIRT ditulis ulang dengan
 * templat M2d-11 (kontrak D-6, pra-registrasi §7). Pagu ≤ US$0,30 (tag
 * `m2d11/pemanasan/`) ditegakkan kode. Tidak dipasang ke produk.
 *
 * Syarat (mode dipandu; tebak buta tidak disyaratkan): 1 pembaca kartu r0+r2,
 * 2 nol bendera detektor (ambang kalibrasi), 4 label pengecoh sah (rencana
 * berlabel), 5 umpan balik sah, 6 kritikus GLM "high" dikunci ke Wafer
 * (tingkat 1; tidak menjawab dua kali = gagal). ≤ 4 percobaan; penolakan di
 * pilihan → penyempurna Haiku; di pesan/penjelasan → penulis DeepSeek.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { AMBANG_M2D11 } from '../cacat/ambang.ts';
import { deteksi, menolak } from '../cacat/detektor.ts';
import { bacaBank, nadaUntuk, pilihContoh, URUT_NADA_V2 } from '../bank-gaya.ts';
import type { OmonganDraf } from '../draf.ts';
import { gPenilaian } from '../gerbang-penilaian.ts';
import { HURUF_KUNCI_PEMANASAN } from '../kalibrasi-pemanasan.ts';
import type { PutusanKritik } from '../kritikus.ts';
import { umpanKritik } from '../kritikus.ts';
import { MODEL_OPENROUTER, MODEL_OR_DEEPSEEK } from '../model.ts';
import { chatBerpagu, PaguTercapai } from '../pagu.ts';
import { DEFINISI_PAKET, bangunPaket, type PaketFakta } from '../paket.ts';
import { ubahGalatSaldo } from '../peran-susun.ts';
import { kartuRotasi } from '../rotasi/jalan.ts';
import { buktiKunciTunggal } from '../templat/bukti.ts';
import { kritikusMakna, kritikusMenolakTemplat, SETELAN_PENULIS } from '../templat/gerbang.ts';
import { lokasiDetektor } from '../templat/kode.ts';
import { umpanBalik, validasiUmpanBalik, type UmpanBalikSoal } from '../templat/label.ts';
import { calonRencanaM2d11, pilihVarianBersih, SETELAN_TEMPLAT_M2D11 } from '../templat/m2d11.ts';
import { pagarKritikusTerkunci, kritikusTerkunci } from '../templat/penyedia.ts';
import { pesanTulisPenjelasanTemplat, pesanTulisPesanTemplat, periksaTulisanPenjelasan, periksaTulisanPesan, tulisBercadangan, uraiPenjelasan, uraiTulisanPesan, type PanggilTemplat } from '../templat/penulis.ts';
import { MODEL_PENYEMPURNA, pesanPenyempurna, SETELAN_PENYEMPURNA, uraiPenyempurna, verifikasiPerbaikan } from '../templat/penyempurna.ts';
import { pilihRencanaPemanasan } from '../templat/pilih.ts';
import { hurufSlotSeimbang, rakitOmonganTemplat, type PilihanAktif, type TulisanPesan } from '../templat/rakit.ts';
import { FOLDER_M2D11, PAGU_BAGIAN_M2D11, siapkanM2d11 } from './konfig.ts';

export const FOLDER_PEMANASAN_M2D11 = `${FOLDER_M2D11}/pemanasan`;
export const MAKS_PERCOBAAN_PEMANASAN_M2D11 = 4;

interface Masalah {
  lokasi: 'pesan' | 'pilihan' | 'penjelasan' | 'struktur';
  alasan: string;
}

export interface PercobaanPemanasanM2d11 {
  ke: number;
  omongan: OmonganDraf | null;
  varian: Record<string, string>;
  menolak: Masalah[];
  kartu: Array<{ r: number; kunci: string; pilihan: string | null; benar: boolean }> | null;
  kritik: Pick<PutusanKritik, 'menjawab' | 'keberatan' | 'arahan'> | null;
}

export interface HasilPemanasanM2d11 {
  lolos: boolean;
  rencana: string;
  omongan: OmonganDraf | null;
  umpan_balik: UmpanBalikSoal | null;
  percobaan: PercobaanPemanasanM2d11[];
  berhenti: string | null;
}

export async function jalankanPemanasanM2d11(paket: PaketFakta, panggil: PanggilTemplat): Promise<HasilPemanasanM2d11> {
  const r = pilihRencanaPemanasan(paket, calonRencanaM2d11(paket));
  if (r === null) return { lolos: false, rencana: '-', omongan: null, umpan_balik: null, percobaan: [], berhenti: 'tidak ada pola soal pertama berlabel untuk paket ini' };
  const kr = `${r.pola}:${r.sudut}`;
  const bank = bacaBank(2).filter((k) => !gPenilaian(k.teks).tolak);
  let pilihan: PilihanAktif = pilihVarianBersih(r, HURUF_KUNCI_PEMANASAN);
  let tulisan: TulisanPesan | null = null;
  let penjelasan: string | null = null;
  let umpanPesan: string[] = [];
  let umpanPenjelasan: string[] = [];
  const percobaan: PercobaanPemanasanM2d11[] = [];
  for (let ke = 1; ke <= MAKS_PERCOBAAN_PEMANASAN_M2D11; ke++) {
    const c: PercobaanPemanasanM2d11 = { ke, omongan: null, varian: {}, menolak: [], kartu: null, kritik: null };
    percobaan.push(c);
    try {
      if (tulisan === null) {
        const nada = nadaUntuk(1, ke, URUT_NADA_V2);
        const pesan = pesanTulisPesanTemplat({ paket, r, no: 1, namaLain: [], gaya: { nada, contoh: pilihContoh({ topik: [r.topik], nada, paket_id: paket.paket_id }, bank) }, umpan: umpanPesan });
        tulisan = await tulisBercadangan(panggil, pesan, SETELAN_PENULIS.pesan, { jenis: 'tulis-pesan', putaran: ke, omongan: 1, ke: 1, peran: 'penulis', model: MODEL_OR_DEEPSEEK }, uraiTulisanPesan, () => undefined);
        penjelasan = null;
        if (tulisan === null) {
          c.menolak.push({ lokasi: 'pesan', alasan: 'keluaran penulis pesan tak terbaca dua kali' });
          continue;
        }
      }
      if (penjelasan === null) {
        const { penjelasan: _p, ...inti } = rakitOmonganTemplat(r, pilihan, tulisan, '', HURUF_KUNCI_PEMANASAN, hurufSlotSeimbang(HURUF_KUNCI_PEMANASAN, r));
        void _p;
        penjelasan = await tulisBercadangan(panggil, pesanTulisPenjelasanTemplat({ paket, r, o: inti, umpan: umpanPenjelasan }), SETELAN_PENULIS.penjelasan, { jenis: 'tulis-penjelasan', putaran: ke, omongan: 1, ke: 1, peran: 'penulis', model: MODEL_OR_DEEPSEEK }, uraiPenjelasan, () => undefined);
        if (penjelasan === null) {
          c.menolak.push({ lokasi: 'penjelasan', alasan: 'keluaran penulis penjelasan tak terbaca dua kali' });
          continue;
        }
      }
      c.varian = Object.fromEntries(Object.entries(pilihan).map(([s, v]) => [s, v.id]));
      const o = rakitOmonganTemplat(r, pilihan, tulisan, penjelasan, HURUF_KUNCI_PEMANASAN, hurufSlotSeimbang(HURUF_KUNCI_PEMANASAN, r));
      c.omongan = o;
      // syarat 2, 4, 5 + struktur (gratis)
      c.menolak.push(
        ...buktiKunciTunggal(r, paket, pilihan).masalah.map((m) => ({ lokasi: 'struktur' as const, alasan: `templat: ${m}` })),
        ...periksaTulisanPesan(tulisan, r, []).map((m) => ({ lokasi: 'pesan' as const, alasan: m })),
        ...periksaTulisanPenjelasan(penjelasan, r).map((m) => ({ lokasi: 'penjelasan' as const, alasan: m })),
        ...menolak(deteksi({ pesan: o.pesan, pilihan: o.pilihan, kunci: o.kunci }, AMBANG_M2D11)).map((b) => ({ lokasi: lokasiDetektor(b.kode), alasan: `detektor ${b.kode} (${b.nama}): ${b.alasan}` })),
        ...validasiUmpanBalik(umpanBalik(r, paket, o.kunci), r).map((m) => ({ lokasi: 'struktur' as const, alasan: m })),
      );
      if (c.menolak.some((m) => m.lokasi === 'struktur')) return { lolos: false, rencana: kr, omongan: null, umpan_balik: null, percobaan, berhenti: 'struktur templat ditolak kode' };
      if (c.menolak.length === 0) {
        // syarat 1: pembaca kartu r0 + r2
        const k = await kartuRotasi(o, paket, { panggil, putaran: ke, omongan: 1 });
        c.kartu = k.per_rotasi.map((x) => ({ r: x.r, kunci: x.kunci, pilihan: x.pilihan, benar: x.benar }));
        if (!k.lulus) c.menolak.push({ lokasi: 'pilihan', alasan: `pembaca kartu: ${k.per_rotasi.map((x) => `r${String(x.r)} memilih ${String(x.pilihan)} (kunci ${x.kunci}): ${x.alasan}`).join('; ')}` });
        else {
          // syarat 6: kritikus (tidak menjawab → sekali lagi)
          let kt = await kritikusMakna(o, paket, k.per_rotasi[0]?.putusan ?? null, panggil, ke, 1);
          if (!kt.menjawab) kt = await kritikusMakna(o, paket, k.per_rotasi[0]?.putusan ?? null, panggil, ke, 1);
          c.kritik = { menjawab: kt.menjawab, keberatan: kt.keberatan, arahan: kt.arahan };
          if (!kritikusMenolakTemplat(kt, SETELAN_TEMPLAT_M2D11.kritikus)) return { lolos: true, rencana: kr, omongan: o, umpan_balik: umpanBalik(r, paket, o.kunci), percobaan, berhenti: null };
          c.menolak.push(...(kt.menjawab ? umpanKritik(kt) : ['kritikus tidak menjawab (dua kali)']).map((a) => ({ lokasi: 'pilihan' as const, alasan: `kritikus: ${a}` })));
        }
      }
      const di = (l: Masalah['lokasi']): string[] => c.menolak.filter((m) => m.lokasi === l).map((m) => m.alasan);
      if (di('pesan').length > 0) {
        umpanPesan = di('pesan');
        tulisan = null;
      }
      if (di('penjelasan').length > 0) {
        umpanPenjelasan = di('penjelasan');
        penjelasan = null;
      }
      if (di('pilihan').length > 0) {
        const j = await panggil(pesanPenyempurna({ paket, r, pilihan, jenis: c.kartu !== null && c.kritik === null ? 'pembaca-kartu' : c.kritik !== null ? 'kritikus' : 'kode', alasan: di('pilihan') }), { ...SETELAN_PENYEMPURNA }, { jenis: 'sempurnakan-pilihan', putaran: ke, omongan: 1, ke: 1, peran: 'penyempurna', model: MODEL_PENYEMPURNA });
        const u = uraiPenyempurna(j.teks);
        const v = u === null ? null : verifikasiPerbaikan(r, paket, pilihan, u.pilihan);
        if (v !== null && v.diterima.length > 0) {
          pilihan = v.pilihan;
          penjelasan = null;
        }
      }
    } catch (galat) {
      if (galat instanceof PaguTercapai) return { lolos: false, rencana: kr, omongan: null, umpan_balik: null, percobaan, berhenti: `${galat.name}: ${galat.message}` };
      c.menolak.push({ lokasi: 'struktur', alasan: galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat' });
    }
  }
  return { lolos: false, rencana: kr, omongan: null, umpan_balik: null, percobaan, berhenti: `${String(MAKS_PERCOBAAN_PEMANASAN_M2D11)} percobaan tanpa soal yang lolos` };
}

async function utama(): Promise<number> {
  if (existsSync(`${FOLDER_PEMANASAN_M2D11}/hasil.json`)) {
    console.error('pemanasan M2d-11 sudah dijalankan; tidak diulang.');
    return 1;
  }
  const { klien, biaya } = siapkanM2d11();
  mkdirSync(FOLDER_PEMANASAN_M2D11, { recursive: true });
  const paket = bangunPaket(DEFINISI_PAKET.tirt);
  const awalan = PAGU_BAGIAN_M2D11.pemanasan.awalanTag;
  const klienKritikus = { ...klien, pagar: pagarKritikusTerkunci };
  const dasar: PanggilTemplat = async (pesan, setelan, info) => {
    if (!(MODEL_OPENROUTER as readonly string[]).includes(info.model)) throw new Error(`Model ${info.model} tidak diizinkan M2d-11.`);
    const tag = `${awalan}c${String(info.putaran)}/${info.jenis}/t${String(info.ke)}${info.ulang !== undefined && info.ulang > 0 ? `/u${String(info.ulang)}` : ''}`;
    try {
      const j = await chatBerpagu(
        info.jenis === 'kritikus' ? klienKritikus : klien,
        biaya,
        { model: info.model, pesan, suhu: setelan.suhu, maxTokens: setelan.maxTokens, tambahanBadan: setelan.tambahanBadan, ...(setelan.abaikanPenyedia === undefined ? {} : { abaikanPenyedia: setelan.abaikanPenyedia }) },
        tag,
        setelan.ambangPenalaran === undefined ? {} : { ambangPenalaran: setelan.ambangPenalaran },
      );
      console.log(`  ${new Date().toISOString().slice(11, 19)} ${tag}: ${String(j.penyedia)} ${String(j.finish_reason)} penalaran ${String(j.token_penalaran)} US$${j.biaya_usd.toFixed(6)}; pemanasan US$${biaya.totalAwalan(awalan).toFixed(4)}`);
      return j;
    } catch (galat) {
      throw ubahGalatSaldo(galat, info.model);
    }
  };
  const terkunci = kritikusTerkunci(dasar);
  const panggil: PanggilTemplat = (p, s, i) => (i.jenis === 'kritikus' ? terkunci(p, s, i) : dasar(p, s, i));
  const h = await jalankanPemanasanM2d11(paket, panggil);
  writeFileSync(`${FOLDER_PEMANASAN_M2D11}/hasil.json`, JSON.stringify({ ...h, huruf_kunci: HURUF_KUNCI_PEMANASAN, biaya_usd: biaya.totalAwalan(awalan) }, null, 2) + '\n', 'utf8');
  for (const c of h.percobaan) console.log(`percobaan ${String(c.ke)}: ${c.menolak.length === 0 ? 'LOLOS' : `ditolak (${c.menolak.map((m) => `${m.lokasi}: ${m.alasan}`).join(' | ').slice(0, 600)})`}`);
  console.log(`${h.lolos ? 'SOAL PEMANASAN M2d-11 LOLOS' : `TIDAK LOLOS (${String(h.berhenti)})`}; US$${biaya.totalAwalan(awalan).toFixed(6)}.`);
  return h.lolos ? 0 : 2;
}

if (/(^|[\\/])patokan[\\/]pemanasan\.ts$/.test(process.argv[1] ?? '')) {
  utama().then(
    (k) => {
      process.exitCode = k;
    },
    (g: unknown) => {
      console.error(g instanceof Error ? `${g.name}: ${g.message}` : 'galat tak dikenal');
      process.exitCode = 1;
    },
  );
}
