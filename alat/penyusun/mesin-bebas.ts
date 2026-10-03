/**
 * Mesin penulis "bebas" M2d-13 untuk pintu penyusun:
 * `npm run penyusun -- --mesin bebas --penulis opus|haiku|deepseek`.
 *
 * Penulis bebas (`factory/llm/bebas/mesin.ts`): satu model, tanpa
 * penyempurna, gerbang M2d-11 (kode + detektor + tebak rotasi + kartu 2 rotasi
 * + kritikus GLM terkunci Wafer) + angka-di-kartu. Paket WAJIB sama persis
 * dengan paket TIRT-7 M2d-11 (sha256 pra-registrasi §3); selain itu ditolak.
 */
import { createHash } from 'node:crypto';
import { HARGA, biayaUsd } from '../../factory/llm/harga.ts';
import { jalankanBebas, MAKS_VERSI_BEBAS, PROFIL_M2D13, PROFIL_M2D15, type HasilBebas, type ProfilBebas } from '../../factory/llm/bebas/mesin.ts';
import type { VersiPrompt } from '../../factory/llm/bebas/prompt.ts';
import { panggilBebasPalsu } from '../../factory/llm/bebas/palsu.ts';
import type { NamaPenulis } from '../../factory/llm/bebas/pagu-adil.ts';
import { drafDari } from '../../factory/llm/bebas/skema.ts';
import { MODEL_OR_DEEPSEEK, MODEL_OR_GLM, MODEL_OR_HAIKU, MODEL_OR_OPUS, type ModelOpenRouter } from '../../factory/llm/model.ts';
import type { PaketFakta } from '../../factory/llm/paket.ts';
import { MODEL_ROTASI } from '../../factory/llm/rotasi/rotasi.ts';
import { SETELAN_KARTU, SETELAN_KRITIKUS } from '../../factory/llm/templat/gerbang.ts';
import type { PanggilTemplat } from '../../factory/llm/templat/penulis.ts';
import { AWALAN_TAG_PENYUSUN } from './biaya.ts';
import { MASUKAN_MAKS_TOKEN, PencatatJejakAliran, ringkasLangkah, type HasilMesin, type HasilUjiUlang, type KonteksJalan, type MesinPenulis, type PerkiraanBiaya } from './mesin.ts';
import type { BuatPanggilTemplat } from './mesin-templat.ts';

export const MODEL_PENULIS: Readonly<Record<NamaPenulis, ModelOpenRouter>> = { opus: MODEL_OR_OPUS, haiku: MODEL_OR_HAIKU, deepseek: MODEL_OR_DEEPSEEK };
export const SHA_PAKET_BEKU = 'f7cabc6b2c9abca5ceb36d127b279438c9c3586e3c727de76da3a412fb85a45a';

/** sha256 paket seperti ditulis pintu (`paket.json`). Murni. */
export const shaPaket = (p: PaketFakta): string => createHash('sha256').update(`${JSON.stringify(p, null, 2)}\n`, 'utf8').digest('hex');

const maks = (model: ModelOpenRouter, maxTokens: number, masuk = MASUKAN_MAKS_TOKEN): number => biayaUsd(HARGA[model], masuk, maxTokens);
const bulat = (x: number): number => Math.round(x * 10_000) / 10_000;

/** Profil menurut versi prompt (v2 = M2d-15). */
export const profilDari = (prompt: VersiPrompt | undefined): ProfilBebas => (prompt === 'v2' ? PROFIL_M2D15 : PROFIL_M2D13);

export function perkiraanBebas(penulis: ModelOpenRouter, profil: ProfilBebas = PROFIL_M2D13): PerkiraanBiaya {
  const masuk = profil.prompt === 'v2' ? 12_000 : 9_000;
  const per = [
    {
      peran: `penulis bebas ${penulis} (≈ ${masuk.toLocaleString('id-ID')} token masuk; satu panggilan per putaran versi + 1 ulangan${profil.praPeriksa > 0 ? ` + ≤ ${String(profil.praPeriksa)} tulis-ulang pra-periksa` : ''})`,
      model: penulis,
      maks_usd: bulat((2 + profil.praPeriksa) * maks(penulis, profil.setelan.maxTokens, masuk)),
    },
    ...MODEL_ROTASI.map((m) => ({ peran: `penebak rotasi ${m.nama} (8 panggilan, tanpa kartu)`, model: m.model, maks_usd: bulat(16 * maks(m.model, m.setelan.maxTokens)) })),
    { peran: 'pembaca kartu (2 rotasi)', model: MODEL_OR_DEEPSEEK, maks_usd: bulat(4 * maks(MODEL_OR_DEEPSEEK, SETELAN_KARTU.maxTokens)) },
    { peran: 'kritikus (dengan satu pemeriksaan ulang)', model: MODEL_OR_GLM, maks_usd: bulat(4 * maks(MODEL_OR_GLM, SETELAN_KRITIKUS.maxTokens)) },
  ];
  const gerbang = per.slice(1).reduce((a, x) => a + x.maks_usd, 0);
  return {
    per_panggilan: per,
    per_omongan_usd: bulat(gerbang),
    per_putaran_usd: bulat(3 * gerbang + (per[0]?.maks_usd ?? 0)),
    maks_putaran: MAKS_VERSI_BEBAS,
    catatan: [
      profil.nama === 'm2d15'
        ? 'Pra-registrasi M2d-15 §3–§4 + amandemen teknis T2: Opus effort "low" (effort "medium" dan reasoning.max_tokens 8.000 diabaikan penyedia), max_tokens 16.000, prompt v2, penjaga probe dulu; tiap versi: tulis → pra-periksa kode gratis (≤ 2 tulis-ulang) → gerbang 1 kode → gerbang berbayar; maks 3 versi per omongan.'
        : 'Pra-registrasi M2d-13 §3: versi 1 satu panggilan penulis untuk tiga omongan; versi 2–3 satu panggilan per putaran untuk semua omongan yang ditolak; maks 3 versi per omongan.',
      'Sebelum SETIAP panggilan kode memeriksa: biaya nyata tercatat + perkiraan maksimum panggilan itu ≤ pagu jalan, ≤ pagu semua jalan penyusun, dan ≤ LLM_PAGU_USD.',
    ],
  };
}

/** Riwayat berbentuk lingkar untuk "penolakan beralasan" pintu. */
export function riwayatBebas(h: HasilBebas): HasilBebas & { riwayat: Array<{ putaran: number; omongan: Array<{ no: number; status: string; umpan: string[] }> }> } {
  const akhir = [1, 2, 3].map((no) => h.versi.filter((v) => v.no === no).at(-1)).filter((v) => v !== undefined);
  const putaran = Math.max(0, ...h.versi.map((v) => v.versi));
  return { ...h, riwayat: [{ putaran, omongan: akhir.map((v) => ({ no: v.no, status: v.berhenti === 'lolos' ? 'lolos' : `ditolak-${v.berhenti}`, umpan: v.alasan })) }] };
}

export interface OpsiMesinBebas {
  penulis: NamaPenulis;
  /** M2d-15: profil (bawaan M2d-13). */
  profil?: ProfilBebas;
  palsu: boolean;
  buatPanggil: BuatPanggilTemplat;
  siap: () => { siap: boolean; alasan: string | null };
}

export class MesinBebas implements MesinPenulis {
  readonly nama: string;
  readonly keterangan: string;
  readonly palsu: boolean;
  private readonly o: OpsiMesinBebas;
  constructor(o: OpsiMesinBebas) {
    this.o = o;
    const v2 = (o.profil ?? PROFIL_M2D13).nama === 'm2d15';
    this.nama = `bebas-${o.penulis}${v2 ? '-v2' : ''}${o.palsu ? '-palsu' : ''}`;
    this.keterangan = v2
      ? `penulis Opus ditingkatkan M2d-15 (${MODEL_PENULIS[o.penulis]}, effort "low" [amandemen T2; effort "medium" dan batas 8.000 token diabaikan penyedia], prompt v2, penjaga probe + bank sudut, pra-periksa kode gratis), tanpa penyempurna; gerbang M2d-11 + angka-di-kartu${o.palsu ? '; model PALSU, tanpa jaringan' : ''}`
      : `penulis bebas M2d-13 (${MODEL_PENULIS[o.penulis]}), tanpa penyempurna; gerbang M2d-11 + angka-di-kartu${o.palsu ? '; model PALSU, tanpa jaringan' : ''}`;
    this.palsu = o.palsu;
  }

  siap(): { siap: boolean; alasan: string | null } {
    return this.o.siap();
  }

  perkiraan(): PerkiraanBiaya {
    return perkiraanBebas(MODEL_PENULIS[this.o.penulis], this.o.profil ?? PROFIL_M2D13);
  }

  cukupPaket(paket: PaketFakta): { cukup: boolean; jumlah: number; satuan: string } {
    // Pra-registrasi §3: hanya paket TIRT-7 apa adanya (mode palsu: paket apa pun).
    const sama = this.palsu || shaPaket(paket) === SHA_PAKET_BEKU;
    return { cukup: sama, jumlah: sama ? paket.fakta.length : 0, satuan: sama ? 'fakta (paket TIRT-7 sama persis)' : 'fakta — paket TIDAK sama dengan paket TIRT-7 pra-registrasi' };
  }

  perkiraanUjiUlang(): number {
    return 0;
  }

  async jalankan(k: KonteksJalan): Promise<HasilMesin> {
    if (!this.palsu && shaPaket(k.paket) !== SHA_PAKET_BEKU) throw new Error(`paket ${shaPaket(k.paket)} ≠ paket TIRT-7 pra-registrasi ${SHA_PAKET_BEKU}; mesin bebas menolak berjalan`);
    const model = MODEL_PENULIS[this.o.penulis];
    let total = 0;
    const jejak = new PencatatJejakAliran(
      {
        paket: k.paket,
        model,
        promptSistem: (this.o.profil ?? PROFIL_M2D13).prompt === 'v2' ? 'penulis Opus v2 M2d-15 (factory/llm/bebas/prompt-penulis-opus-v2.md + bank sudut)' : 'penulis bebas M2d-13 (factory/llm/bebas/prompt-penulis-bebas.md)',
        pesanPaket: JSON.stringify(k.paket.fakta.map((f) => f.fact_id)),
        ringkasanPrompt: `Pintu penyusun, mesin "${this.nama}": penulis bebas ${model} tanpa penyempurna; gerbang M2d-11 + angka-di-kartu. Di sini hanya hash.`,
        jalur: `${k.folder}/jejak-agen.json`,
        jam: k.jam,
        versi: 2,
        dibuatOleh: 'factory/llm/bebas/mesin.ts',
        modelPeran: { penulis: model, penebak: MODEL_ROTASI.map((m) => m.model).join(' + '), 'pembaca-kartu': MODEL_OR_DEEPSEEK, kritikus: MODEL_OR_GLM },
      },
      (l) => {
        total += l.biaya_usd;
        const r = ringkasLangkah(l, total);
        k.lapor('agen', r.judul.replace(/^putaran /, 'versi '), r.isi);
      },
    );
    const profil = this.o.profil ?? PROFIL_M2D13;
    const h = await jalankanBebas({
      paket: k.paket,
      penulis: model,
      panggil: this.o.buatPanggil(`${AWALAN_TAG_PENYUSUN}${k.id}/`, k.paguJalanUsd),
      jejak,
      jam: k.jam,
      prompt: profil.prompt,
      setelan: profil.setelan,
      praPeriksa: profil.praPeriksa,
      ...(profil.penjagaPanjang === true ? { penjagaPanjang: true } : {}),
    });
    return {
      terbit: h.terbit,
      draf: h.draf,
      berhenti: h.berhenti,
      putaran: Math.max(0, ...h.versi.map((v) => v.versi)),
      keadaan: [],
      draf_terakhir: h.akhir.map((a) => (a === null ? null : drafDari(a.omongan))),
      biaya_usd: Math.round(total * 1e6) / 1e6,
      jejak: jejak.jejak(),
      riwayat: riwayatBebas(h),
    };
  }

  ujiUlang(): Promise<HasilUjiUlang> {
    return Promise.resolve({ lolos: false, berhenti: 'mesin bebas M2d-13 tidak menguji ulang suntingan (draf tidak dipasang ke produk)', masalah: [], per_omongan: [], biaya_usd: 0 });
  }
}

export function mesinBebasSungguhan(penulis: NamaPenulis, buatPanggil: BuatPanggilTemplat, siap: () => { siap: boolean; alasan: string | null }, prompt?: VersiPrompt): MesinBebas {
  return new MesinBebas({ penulis, palsu: false, buatPanggil, siap, profil: profilDari(prompt) });
}

export function mesinBebasPalsu(penulis: NamaPenulis, prompt?: VersiPrompt): MesinBebas {
  return new MesinBebas({ penulis, palsu: true, buatPanggil: (): PanggilTemplat => panggilBebasPalsu().panggil, siap: () => ({ siap: true, alasan: null }), profil: profilDari(prompt) });
}
