/**
 * Bantuan uji lingkar PENGECOH (M2d-7): validator dan semua gerbang kode
 * sungguhan; hanya model yang dipalsukan. Tulisan palsu: `bantu-uji-tulisan.ts`.
 */
import { teksPolos } from '../skema/rujukan.ts';
import { GENERASI_M2D7, jalankanPengecoh, type GenerasiPengecoh, type HasilPengecoh } from './agen-pengecoh.ts';
import type { InfoPeran, PanggilPeran } from './agen-peran.ts';
import type { KunciOpsi, MasalahDraf } from './draf.ts';
import { PencatatJejak } from './jejak.ts';
import type { PesanChat } from './klien.ts';
import { MODEL_OR_DEEPSEEK } from './model.ts';
import { PAKET_T, TULISAN, type TulisanPalsu } from './bantu-uji-tulisan.ts';
import type { PaketFakta } from './paket.ts';
import { promptPesan, susunHuruf } from './penulis-pecah.ts';
import { hurufKunciKode } from './posisi-kunci.ts';
import type { JawabanModel, SetelanPanggil } from './susun.ts';
import { validasiDraf } from './validasi.ts';

export interface RekamanP {
  pesan: PesanChat[];
  setelan: SetelanPanggil;
  info: InfoPeran;
}

export interface SkenarioP {
  /** Ganti tulisan untuk (omongan, putaran, bagian); `undefined` = TULISAN. Teks mentah = dikirim apa adanya. */
  tulis?: (no: number, putaran: number, bagian: 'pesan' | 'pilihan' | 'penjelasan', permintaan: string) => unknown;
  pilihanSajaKena?: (no: number, putaran: number, ke: number) => boolean;
  /** Keyakinan penebak pilihan-saja yang memilih kunci (bawaan 70). */
  yakinPilihanSaja?: number;
  kartu?: (no: number, putaran: number, kunci: KunciOpsi) => string | undefined;
  kritikus?: (no: number, putaran: number) => string | undefined;
  tertebak?: (no: number, putaran: number, ke: number) => boolean;
  tokenPenalaran?: (info: InfoPeran) => number | undefined;
}

const HURUF: readonly KunciOpsi[] = ['a', 'b', 'c', 'd'];

/** Huruf pilihan kunci di soal yang dikirim: pilihan yang teksnya = pilihan kunci tulisan (polos). */
export function kunciDi(soal: string, kunciTeks: readonly string[]): KunciOpsi {
  for (const h of HURUF) {
    const m = new RegExp(`^${h}\\) (.*)$`, 'm').exec(soal);
    if (m !== null && kunciTeks.includes(m[1] ?? '')) return h;
  }
  throw new Error('kunci tidak ditemukan di soal');
}

export const TANPA_KEBERATAN_P = JSON.stringify({
  cek_klaim: { bagian_tak_tercek: [], kunci_menyatakan_tak_pasti: false },
  cek_pilihan: { juga_benar: [], alasan: '' },
  keberatan: [],
  arahan: '',
});

export function palsuP(s: SkenarioP, kunciTeks: () => string[]): { panggil: PanggilPeran; rekaman: RekamanP[] } {
  const rekaman: RekamanP[] = [];
  const panggil: PanggilPeran = async (pesan, setelan, info) => {
    rekaman.push({ pesan: pesan.map((p) => ({ ...p })), setelan: { ...setelan }, info: { ...info } });
    const no = info.omongan ?? 0;
    const glm = info.peran === 'kritikus' || info.jenis === 'gerbang-tebak';
    const j = (teks: string): JawabanModel => ({
      teks, token_masuk: 1000, token_keluar: 500, latensi_ms: 3, finish_reason: 'stop', biaya_usd: 0.001, penyedia: glm ? 'Wafer' : 'DeepInfra',
      token_penalaran: s.tokenPenalaran?.(info) ?? (glm ? 5000 : 300),
    });
    const permintaan = pesan[1]?.content ?? '';
    const t = TULISAN[no] as TulisanPalsu;
    if (info.jenis === 'tulis-pesan' || info.jenis === 'tulis-pilihan' || info.jenis === 'tulis-penjelasan') {
      const bagian = info.jenis === 'tulis-pesan' ? 'pesan' : info.jenis === 'tulis-pilihan' ? 'pilihan' : 'penjelasan';
      const ganti = s.tulis?.(no, info.putaran, bagian, permintaan);
      if (typeof ganti === 'string') return j(ganti);
      if (ganti !== undefined) return j(JSON.stringify(ganti));
      if (bagian === 'pesan') return j(JSON.stringify(t.pesan));
      if (bagian === 'pilihan') {
        const sebagian = /TULIS ULANG HANYA huruf: ([a-d, ]+)\./.exec(permintaan)?.[1];
        if (sebagian !== undefined) {
          const set = susunHuruf(t.pilihan, hurufKunciKode('tirt', no));
          const huruf = sebagian.split(',').map((x) => x.trim()) as KunciOpsi[];
          return j(JSON.stringify({ pilihan: Object.fromEntries(huruf.map((h) => [h, set?.[h]])) }));
        }
        return j(JSON.stringify({ pilihan: t.pilihan }));
      }
      return j(JSON.stringify({ penjelasan: t.penjelasan }));
    }
    const kunci = kunciDi(permintaan, kunciTeks());
    const lain: KunciOpsi = kunci === 'a' ? 'b' : 'a';
    if (info.jenis === 'gerbang-pilihan-saja') {
      const kena = s.pilihanSajaKena?.(no, info.putaran, info.ke) ?? false;
      return j(JSON.stringify({ pilihan: kena ? kunci : lain, yakin: kena ? (s.yakinPilihanSaja ?? 70) : 40, alasan: 'bentuknya' }));
    }
    if (info.jenis === 'gerbang-kartu') {
      return j(s.kartu?.(no, info.putaran, kunci) ?? JSON.stringify({ pilihan: kunci, kartu: [1], alasan: 'dari kartu 1', membingungkan: [] }));
    }
    if (info.jenis === 'gerbang-tebak') {
      const kena = s.tertebak?.(no, info.putaran, info.ke) ?? false;
      return j(JSON.stringify({ pilihan: kena ? kunci : lain, yakin: 45, alasan: 'nadanya' }));
    }
    return j(s.kritikus?.(no, info.putaran) ?? TANPA_KEBERATAN_P);
  };
  return { panggil, rekaman };
}

/** Teks polos pilihan kunci semua tulisan (termasuk ganti skenario, didaftarkan tes). */
export function teksKunci(extra: readonly string[] = []): string[] {
  return [...[1, 2, 3].map((no) => teksPolos((TULISAN[no] as TulisanPalsu).pilihan.find((p) => p.sumber === 'kunci')?.teks ?? '')), ...extra.map(teksPolos)];
}

export { PAKET_T, TULISAN, type TulisanPalsu };

export async function jalanP(
  s: SkenarioP,
  maksPutaran?: number,
  kunciExtra: readonly string[] = [],
  generasi: GenerasiPengecoh = GENERASI_M2D7,
  validasi: (draf: unknown, paket: PaketFakta) => MasalahDraf[] = validasiDraf,
): Promise<{ hasil: HasilPengecoh; rekaman: RekamanP[]; jejak: PencatatJejak }> {
  const { panggil, rekaman } = palsuP(s, () => teksKunci(kunciExtra));
  const jam = (): Date => new Date('2026-09-30T00:00:00Z');
  const jejak = new PencatatJejak({
    paket: PAKET_T, model: MODEL_OR_DEEPSEEK, promptSistem: promptPesan(), pesanPaket: 'uji', ringkasanPrompt: 'uji',
    jalur: null, jam, versi: 2, dibuatOleh: 'factory/llm/agen-pengecoh.ts',
  });
  const hasil = await jalankanPengecoh({
    paket: PAKET_T, panggil, validasi, jam, jejak, generasi, ...(maksPutaran === undefined ? {} : { maksPutaran }),
  });
  return { hasil, rekaman, jejak };
}
