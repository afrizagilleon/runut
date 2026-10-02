/**
 * Model palsu untuk mesin templat (tes dan `npm run penyusun -- --palsu
 * --mesin templat`): tanpa jaringan, tanpa biaya. Penulis membaca permintaan
 * (angka yang boleh, kata wajib, rujukan yang boleh) dan menjawab sesuai
 * aturan; penebak tidak memilih kunci; pembaca kartu memilih kunci (huruf
 * kunci dari `hurufKunciKode`); kritikus tanpa keberatan — kecuali skenario
 * berkata lain. Gerbang kode dan bukti kunci tunggal tetap SUNGGUHAN.
 */
import type { KunciOpsi } from '../draf.ts';
import type { PesanChat } from '../klien.ts';
import { hurufKunciKode } from '../posisi-kunci.ts';
import type { JawabanModel } from '../susun.ts';
import type { InfoTemplat, PanggilTemplat } from './penulis.ts';

const NAMA = ['Sinta', 'Maya', 'Rizky'];

export const KRITIK_BERSIH = JSON.stringify({ keberatan: [], arahan: '', cek_klaim: { bagian_tak_tercek: [], kunci_menyatakan_tak_pasti: false }, cek_pilihan: { juga_benar: [], alasan: '' } });

export interface SkenarioPalsu {
  tebak?: (info: InfoTemplat, n: number) => { pilihan: KunciOpsi; yakin: number };
  kartu?: (info: InfoTemplat, n: number) => KunciOpsi;
  kritikus?: (info: InfoTemplat, n: number) => string;
  penyempurna?: (pesan: PesanChat[], info: InfoTemplat) => string;
  /** M2d-11: penebak rotasi (salin teks). Bawaan: huruf ke-(2r mod 4) → isi berganti tiap rotasi, kunci 1/4. */
  rotasi?: (info: InfoTemplat, opsi: Record<KunciOpsi, string>) => string;
}

const HURUF_PALSU: readonly KunciOpsi[] = ['a', 'b', 'c', 'd'];
function opsiPesan(user: string): Record<KunciOpsi, string> {
  const h = {} as Record<KunciOpsi, string>;
  for (const x of HURUF_PALSU) h[x] = new RegExp(`^${x}\\) (.*)$`, 'm').exec(user)?.[1] ?? '';
  return h;
}

export function jawabPalsu(teks: string, tokenPenalaran = 2_000): JawabanModel {
  return { teks, token_masuk: 100, token_keluar: 50, latensi_ms: 1, finish_reason: 'stop', biaya_usd: 0.001, penyedia: 'Palsu', token_penalaran: tokenPenalaran };
}

export const lainDari = (k: KunciOpsi): KunciOpsi => (k === 'a' ? 'b' : 'a');

export function panggilTemplatPalsu(paketId: string, s: SkenarioPalsu = {}): { panggil: PanggilTemplat; log: InfoTemplat[] } {
  const log: InfoTemplat[] = [];
  const hitung = new Map<string, number>();
  const kunci = (no: number): KunciOpsi => hurufKunciKode(paketId, no);
  // M2d-11: pembaca kartu rotasi — teks kunci dicatat di r0 (ke 1), dicari lagi di rotasi lain.
  const teksKunci = new Map<number, string>();
  const panggil: PanggilTemplat = async (pesan, _setelan, info) => {
    log.push(info);
    const k = `${info.jenis}/${String(info.omongan)}`;
    const n = (hitung.get(k) ?? 0) + 1;
    hitung.set(k, n);
    const user = pesan[1]?.content ?? '';
    const no = info.omongan ?? 1;
    if (info.jenis === 'tulis-pesan') {
      const angka = /ANGKA YANG BOLEH[^:]*: (.*)/.exec(user)?.[1] ?? '';
      const boleh = [...angka.matchAll(/"([^"]+)"/g)].map((m) => m[1]).join(' ');
      const wajib = [...(/WAJIB DISEBUT: (.*)/.exec(user)?.[1] ?? '').matchAll(/"([^"]+)"/g)].map((m) => m[1])[0] ?? '';
      return jawabPalsu(JSON.stringify({ nama: NAMA[no - 1], jam: '19.20', pesan: `Gw denger ${wajib} ${boleh} gitu deh`.replace(/\s+/g, ' ') }));
    }
    if (info.jenis === 'tulis-penjelasan') {
      const tok = [...user.matchAll(/^- (\[\[[^\]]+\]\])$/gm)].map((m) => m[1]).slice(0, 6).join(', ');
      return jawabPalsu(JSON.stringify({ penjelasan: `Menurut dokumennya: ${tok}. Salah-kaprah yang umum: orang sering salah baca kartunya.` }));
    }
    if (info.jenis === 'gerbang-tebak' && (pesan[0]?.content ?? '').includes('SALIN teks')) {
      const opsi = opsiPesan(user);
      if (s.rotasi !== undefined) return jawabPalsu(s.rotasi(info, opsi), 0);
      const r = (info.ke - 1) % 4;
      return jawabPalsu(JSON.stringify({ teks: opsi[HURUF_PALSU[(2 * r) % 4] as KunciOpsi], alasan: 'tebakan' }), 0);
    }
    if (info.jenis === 'gerbang-tebak') {
      const t = s.tebak?.(info, n) ?? { pilihan: lainDari(kunci(no)), yakin: 50 };
      return jawabPalsu(JSON.stringify({ ...t, alasan: 'tebakan' }), info.ke === 3 ? 600 : 0);
    }
    if (info.jenis === 'gerbang-kartu') {
      let h = s.kartu?.(info, n) ?? kunci(no);
      if (s.kartu === undefined && info.ke > 1) {
        const opsi = opsiPesan(user);
        h = HURUF_PALSU.find((x) => opsi[x] === teksKunci.get(no)) ?? h;
      } else if (info.ke === 1) teksKunci.set(no, opsiPesan(user)[kunci(no)]);
      return jawabPalsu(JSON.stringify({ pilihan: h, kartu: [1], alasan: 'kartu 1', membingungkan: [] }));
    }
    if (info.jenis === 'kritikus') return jawabPalsu(s.kritikus?.(info, n) ?? KRITIK_BERSIH, 5_000);
    if (info.jenis === 'sempurnakan-pilihan') return jawabPalsu(s.penyempurna?.(pesan, info) ?? '{"pilihan":{},"alasan":"-"}', 0);
    throw new Error(`jenis ${info.jenis}`);
  };
  return { panggil, log };
}
