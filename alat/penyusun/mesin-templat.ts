/**
 * Mesin penulis "templat" untuk pintu penyusun (M2d-10 D-6). Dipasang di
 * belakang antarmuka `MesinPenulis` yang sama dengan lingkar M2d-8 — server
 * dan halaman tidak berubah; pilih dengan `npm run penyusun -- --mesin templat`.
 *
 * Isinya: lingkar templat (`factory/llm/templat/mesin.ts`) dengan setelan
 * tumpukan hasil kalibrasi M2d-10 (`SETELAN_TEMPLAT_M2D10`), tiga model
 * (DeepSeek penulis & pembaca kartu, Haiku penyempurna & penebak, GLM "high"
 * penebak & kritikus), pagu berlapis yang sama (pemanggil `panggilSungguhan`).
 */
import type { KeadaanOmongan } from '../../factory/llm/agen-pengecoh.ts';
import type { KunciSudut } from '../../factory/llm/bank-pengecoh.ts';
import { HARGA, biayaUsd } from '../../factory/llm/harga.ts';
import { MODEL_OR_DEEPSEEK, MODEL_OR_GLM, MODEL_OR_HAIKU, type ModelOpenRouter } from '../../factory/llm/model.ts';
import { PENEBAK_CAMPUR, SETELAN_KARTU, SETELAN_KRITIKUS, SETELAN_PENULIS, type SetelanTumpukan } from '../../factory/llm/templat/gerbang.ts';
import { jalankanTemplat, MAKS_RENCANA_POSISI, MAKS_VERSI_RENCANA, type HasilTemplat, type KunciTemplat } from '../../factory/llm/templat/mesin.ts';
import { panggilTemplatPalsu } from '../../factory/llm/templat/palsu.ts';
import type { PanggilTemplat } from '../../factory/llm/templat/penulis.ts';
import { SETELAN_PENYEMPURNA } from '../../factory/llm/templat/penyempurna.ts';
import { pilihRencanaSimulasi } from '../../factory/llm/templat/pilih.ts';
import type { PaketFakta } from '../../factory/llm/paket.ts';
import { SETELAN_TEMPLAT_A1 } from '../../factory/llm/templat/setelan.ts';
import { calonRencanaM2d11, SETELAN_TEMPLAT_M2D11 } from '../../factory/llm/templat/m2d11.ts';
import { MODEL_ROTASI } from '../../factory/llm/rotasi/rotasi.ts';
import { kritikusTerkunci, pagarKritikusTerkunci } from '../../factory/llm/templat/penyedia.ts';
import { ujiUlangTemplat } from '../../factory/llm/templat/uji-ulang.ts';
import { AWALAN_TAG_PENYUSUN } from './biaya.ts';
import {
  MASUKAN_MAKS_TOKEN,
  PencatatJejakAliran,
  ringkasLangkah,
  type HasilMesin,
  type HasilUjiUlang,
  type KonteksJalan,
  type KonteksUjiUlang,
  type MesinPenulis,
  type OpsiKritikusPintu,
  type PerkiraanBiaya,
} from './mesin.ts';

/** Pembuat pemanggil untuk satu awalan tag & pagu bagian (sungguhan: `panggilSungguhan`). */
export type BuatPanggilTemplat = (awalanTag: string, paguBagianUsd: number) => PanggilTemplat;

const maks = (model: ModelOpenRouter, maxTokens: number): number => biayaUsd(HARGA[model], MASUKAN_MAKS_TOKEN, maxTokens);
const bulat = (x: number): number => Math.round(x * 10_000) / 10_000;

export function perkiraanTemplat(): PerkiraanBiaya {
  const per = [
    { peran: 'penulis (pesan)', model: MODEL_OR_DEEPSEEK, maks_usd: maks(MODEL_OR_DEEPSEEK, SETELAN_PENULIS.pesan.berpikir.maxTokens) + maks(MODEL_OR_DEEPSEEK, SETELAN_PENULIS.pesan.cadangan.maxTokens) },
    { peran: 'penulis (penjelasan)', model: MODEL_OR_DEEPSEEK, maks_usd: maks(MODEL_OR_DEEPSEEK, SETELAN_PENULIS.penjelasan.berpikir.maxTokens) + maks(MODEL_OR_DEEPSEEK, SETELAN_PENULIS.penjelasan.cadangan.maxTokens) },
    { peran: 'penyempurna struktur', model: MODEL_OR_HAIKU, maks_usd: maks(MODEL_OR_HAIKU, SETELAN_PENYEMPURNA.maxTokens) },
    ...PENEBAK_CAMPUR.map((p, i) => ({ peran: `penebak ${String(i + 1)} tanpa kartu`, model: p.model, maks_usd: 2 * maks(p.model, p.setelan.maxTokens) })),
    { peran: 'pembaca kartu', model: MODEL_OR_DEEPSEEK, maks_usd: 2 * maks(MODEL_OR_DEEPSEEK, SETELAN_KARTU.maxTokens) },
    { peran: 'kritikus (dengan satu pemeriksaan ulang)', model: MODEL_OR_GLM, maks_usd: 4 * maks(MODEL_OR_GLM, SETELAN_KRITIKUS.maxTokens) },
  ];
  const perVersi = per.reduce((a, x) => a + x.maks_usd, 0);
  return {
    per_panggilan: per.map((x) => ({ ...x, maks_usd: bulat(x.maks_usd) })),
    per_omongan_usd: bulat(perVersi),
    per_putaran_usd: bulat(3 * perVersi),
    maks_putaran: MAKS_VERSI_RENCANA * MAKS_RENCANA_POSISI,
    catatan: [
      `Perkiraan per panggilan = ${MASUKAN_MAKS_TOKEN.toLocaleString('id-ID')} token masukan + max_tokens peran × harga daftar OpenRouter (factory/llm/harga.ts).`,
      'Per omongan = satu versi melewati semua peran sekali (dengan ulangan tebakan tak terbaca dan satu pemeriksaan ulang kritikus). Dalam praktik kritikus hanya dipanggil untuk versi yang lolos semua gerbang lain.',
      'Sebelum SETIAP panggilan kode memeriksa: biaya nyata tercatat + perkiraan maksimum panggilan itu ≤ pagu jalan, ≤ pagu semua jalan penyusun, dan ≤ LLM_PAGU_USD.',
    ],
  };
}

/** Keadaan omongan dikunci → bentuk `KeadaanOmongan` (panel penyetuju + uji ulang). */
export function keadaanDariKunci(k: KunciTemplat): KeadaanOmongan {
  const r = k.rencana;
  const kunci: KunciSudut = { fact_id: r.sudut, bentuk: 'peristiwa', teks: r.klaim.inti, rujukan: null, penanda: [], menjawab: r.asal, rujukan_lain: [] };
  const o = k.omongan;
  return {
    no: k.no,
    label: r.klaim.label,
    kunci,
    bank: [],
    pesan: { nama: o.nama, jam: o.jam, pesan: o.pesan, angka_pesan: o.angka_pesan, klaim_dari: null },
    pilihan: {
      a: { teks: o.pilihan.a, sumber: 'templat' },
      b: { teks: o.pilihan.b, sumber: 'templat' },
      c: { teks: o.pilihan.c, sumber: 'templat' },
      d: { teks: o.pilihan.d, sumber: 'templat' },
    },
    penjelasan: o.penjelasan,
    omongan: o,
    hurufKunci: o.kunci,
    templat: { rencana: r, varian: { kunci: k.pilihan.kunci.id, p1: k.pilihan.p1.id, p2: k.pilihan.p2.id, p3: k.pilihan.p3.id }, hurufKunci: o.kunci },
  };
}

/** Riwayat berbentuk lingkar (untuk "penolakan beralasan" pintu): versi terakhir tiap posisi yang tidak lolos. */
export function riwayatPintu(h: HasilTemplat): HasilTemplat & { riwayat: Array<{ putaran: number; omongan: Array<{ no: number; status: string; umpan: string[] }> }> } {
  const akhir = [1, 2, 3].map((no) => h.versi.filter((v) => v.no === no).at(-1)).filter((v) => v !== undefined);
  return {
    ...h,
    riwayat: [{ putaran: h.jumlah_versi, omongan: akhir.map((v) => ({ no: v.no, status: v.berhenti === 'lolos' ? 'lolos' : `ditolak-${v.berhenti}`, umpan: v.alasan })) }],
  };
}

export interface OpsiMesinTemplat {
  nama: string;
  keterangan: string;
  palsu: boolean;
  buatPanggil: BuatPanggilTemplat;
  siap: () => { siap: boolean; alasan: string | null };
  setelan?: SetelanTumpukan;
  /** M2d-11: detektor cacat + label + tebak rotasi + kartu 2 rotasi. */
  protokol?: 'm2d10' | 'm2d11';
}

/** Perkiraan M2d-11: penebak = 8 panggilan rotasi per keluarga (+ ulang), pembaca kartu × 2 rotasi. */
export function perkiraanTemplatM2d11(): PerkiraanBiaya {
  const dasar = perkiraanTemplat();
  const per = [
    ...dasar.per_panggilan.filter((x) => !x.peran.startsWith('penebak') && !x.peran.startsWith('pembaca kartu')),
    ...MODEL_ROTASI.map((m) => ({ peran: `penebak rotasi ${m.nama} (8 panggilan, tanpa kartu)`, model: m.model, maks_usd: bulat(16 * maks(m.model, m.setelan.maxTokens)) })),
    { peran: 'pembaca kartu (2 rotasi)', model: MODEL_OR_DEEPSEEK, maks_usd: bulat(4 * maks(MODEL_OR_DEEPSEEK, SETELAN_KARTU.maxTokens)) },
  ];
  const perVersi = per.reduce((a, x) => a + x.maks_usd, 0);
  return { ...dasar, per_panggilan: per, per_omongan_usd: bulat(perVersi), per_putaran_usd: bulat(3 * perVersi) };
}

export class MesinTemplat implements MesinPenulis {
  readonly nama: string;
  readonly keterangan: string;
  readonly palsu: boolean;
  private readonly o: OpsiMesinTemplat;
  constructor(o: OpsiMesinTemplat) {
    this.o = o;
    this.nama = o.nama;
    this.keterangan = o.keterangan;
    this.palsu = o.palsu;
  }

  get setelan(): SetelanTumpukan {
    return this.o.setelan ?? SETELAN_TEMPLAT_A1;
  }

  siap(): { siap: boolean; alasan: string | null } {
    return this.o.siap();
  }

  perkiraan(): PerkiraanBiaya {
    return this.o.protokol === 'm2d11' ? perkiraanTemplatM2d11() : perkiraanTemplat();
  }

  cukupPaket(paket: PaketFakta): { cukup: boolean; jumlah: number; satuan: string } {
    const n = (this.o.protokol === 'm2d11' ? pilihRencanaSimulasi(paket, calonRencanaM2d11(paket)) : pilihRencanaSimulasi(paket)).posisi.length;
    return { cukup: n >= 3, jumlah: n, satuan: 'rencana templat' };
  }

  perkiraanUjiUlang(jumlah: number): number {
    const p = perkiraanTemplat().per_panggilan.filter((x) => !x.peran.startsWith('penulis') && !x.peran.startsWith('penyempurna'));
    return bulat(jumlah * p.reduce((a, x) => a + x.maks_usd, 0));
  }

  async jalankan(k: KonteksJalan): Promise<HasilMesin> {
    let total = 0;
    const jejak = new PencatatJejakAliran(
      {
        paket: k.paket,
        model: MODEL_OR_DEEPSEEK,
        promptSistem: 'mesin templat M2d-10',
        pesanPaket: JSON.stringify(k.paket.fakta.map((f) => f.fact_id)),
        ringkasanPrompt:
          `Pintu penyusun, mesin "${this.nama}": templat dari pola soal tayang (factory/llm/templat/pola.ts), penulis kata DeepSeek, penyempurna Haiku 4.5, ` +
          'penebak keluarga campur Haiku/DeepSeek/GLM, pembaca kartu DeepSeek, kritikus GLM paling akhir; setelan SETELAN_TEMPLAT_M2D10. Di sini hanya hash.',
        jalur: `${k.folder}/jejak-agen.json`,
        jam: k.jam,
        versi: 2,
        dibuatOleh: 'factory/llm/templat/mesin.ts',
        modelPeran: { penulis: MODEL_OR_DEEPSEEK, penyempurna: MODEL_OR_HAIKU, penebak: PENEBAK_CAMPUR.map((p) => p.model).join(' + '), 'pembaca-kartu': MODEL_OR_DEEPSEEK, kritikus: MODEL_OR_GLM },
      },
      (l) => {
        total += l.biaya_usd;
        const r = ringkasLangkah(l, total);
        k.lapor('agen', r.judul.replace(/^putaran /, 'versi '), r.isi);
      },
    );
    const keadaan: KeadaanOmongan[] = [];
    const h = await jalankanTemplat({
      paket: k.paket,
      panggil: this.o.buatPanggil(`${AWALAN_TAG_PENYUSUN}${k.id}/`, k.paguJalanUsd),
      setelan: this.setelan,
      jejak,
      jam: k.jam,
      saatKunci: (x) => keadaan.push(keadaanDariKunci(x)),
      ...(this.o.protokol === undefined ? {} : { protokol: this.o.protokol }),
    });
    return {
      terbit: h.lolos,
      draf: h.draf,
      berhenti: h.berhenti,
      putaran: h.jumlah_versi,
      keadaan: keadaan.sort((a, b) => a.no - b.no),
      draf_terakhir: h.draf_terakhir,
      biaya_usd: Math.round(total * 1e6) / 1e6,
      jejak: jejak.jejak(),
      riwayat: riwayatPintu(h),
    };
  }

  async ujiUlang(k: KonteksUjiUlang): Promise<HasilUjiUlang> {
    const h = await ujiUlangTemplat({
      paket: k.paket,
      keadaan: k.keadaan,
      diuji: k.diuji,
      panggil: this.o.buatPanggil(`${AWALAN_TAG_PENYUSUN}${k.id}/uji-ulang-${String(k.ke)}/`, k.paguUsd),
      setelan: this.setelan,
    });
    for (const x of h.per_omongan) k.lapor('uji-ulang', `uji ulang ${String(k.ke)} · omongan ${String(x.no)}: ${x.lolos ? 'lolos' : `${x.status} — ${x.alasan[0] ?? ''}`}`, { ...x });
    return {
      lolos: h.lolos,
      berhenti: h.berhenti,
      masalah: h.masalah.map((m) => `${m.omongan === null ? 'seluruh draf' : `omongan ${String(m.omongan)}`}: [${m.kode}] ${m.pesan}`),
      per_omongan: h.per_omongan,
      biaya_usd: 0,
    };
  }
}

/** A-1: kritikus dikunci ke Wafer tanpa fallback; tak tersedia → berhenti. */
export const KRITIKUS_TERKUNCI_A1: OpsiKritikusPintu = { pagarKritikus: pagarKritikusTerkunci, bungkus: (p) => kritikusTerkunci(p) };

/** Mesin templat sungguhan (OpenRouter, pagu berlapis pintu). */
export function mesinTemplatSungguhan(buatPanggil: BuatPanggilTemplat, siap: () => { siap: boolean; alasan: string | null }): MesinTemplat {
  return new MesinTemplat({
    nama: 'templat-m2d10',
    keterangan: 'mesin templat M2d-10: struktur soal dari pola soal tayang (kunci tunggal dibuktikan kode), penulis kata DeepSeek, penyempurna Haiku 4.5, penebak campur Haiku/DeepSeek/GLM, kritikus GLM "high" paling akhir',
    palsu: false,
    buatPanggil,
    siap,
  });
}

/** Mesin templat M2d-11 sungguhan (pra-registrasi M2d-11 §5). */
export function mesinTemplatM2d11Sungguhan(buatPanggil: BuatPanggilTemplat, siap: () => { siap: boolean; alasan: string | null }): MesinTemplat {
  return new MesinTemplat({
    nama: 'templat-m2d11',
    keterangan: 'mesin templat M2d-11: templat berlabel jenis kesalahan + umpan balik, detektor cacat (ambang kalibrasi), tebak rotasi 4 × 3 keluarga × 2 kondisi, pembaca kartu 2 rotasi, kritikus GLM "high" (Wafer) paling akhir',
    palsu: false,
    buatPanggil,
    siap,
    setelan: SETELAN_TEMPLAT_M2D11,
    protokol: 'm2d11',
  });
}

/** Mesin templat M2d-11 palsu: kode sungguhan, model palsu. */
export function mesinTemplatM2d11Palsu(): MesinTemplat {
  let paketId = 'tirt';
  const m = new MesinTemplat({
    nama: 'templat-m2d11-palsu',
    keterangan: 'mesin templat M2d-11 dengan model PALSU, tanpa jaringan, tanpa biaya',
    palsu: true,
    buatPanggil: () => panggilTemplatPalsu(paketId).panggil,
    siap: () => ({ siap: true, alasan: null }),
    setelan: SETELAN_TEMPLAT_M2D11,
    protokol: 'm2d11',
  });
  const asli = m.jalankan.bind(m);
  m.jalankan = (k: KonteksJalan) => {
    paketId = k.paket.paket_id;
    return asli(k);
  };
  return m;
}

/** Mesin templat palsu (`--palsu --mesin templat`): gerbang kode & bukti sungguhan, model palsu. */
export function mesinTemplatPalsu(): MesinTemplat {
  let paketId = 'tirt';
  const m = new MesinTemplat({
    nama: 'templat-m2d10-palsu',
    keterangan: 'mesin templat M2d-10: templat, bukti kunci tunggal, dan gerbang kode sungguhan; model PALSU, tanpa jaringan, tanpa biaya',
    palsu: true,
    buatPanggil: () => panggilTemplatPalsu(paketId).panggil,
    siap: () => ({ siap: true, alasan: null }),
  });
  const asli = m.jalankan.bind(m);
  m.jalankan = (k: KonteksJalan) => {
    paketId = k.paket.paket_id;
    return asli(k);
  };
  return m;
}
