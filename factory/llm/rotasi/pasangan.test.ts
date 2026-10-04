/** M2d-23: penebak berpasangan (kunci lawan kembaran selabelnya) dan kalibrasinya. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { KunciOpsi, OmonganDraf } from '../draf.ts';
import { AKAR } from '../env.ts';
import { agregasiPasangan, AMBANG_P_PASANGAN, isiKembaran, pesanPasangan, PETUNJUK_PASANGAN, uraiPilih, VARIAN_PASANGAN } from './pasangan.ts';
import type { JawabanRotasi } from './rotasi.ts';

const o = { nama: 'Rara', jam: '20.10', pesan: 'Katanya hari ini sepi.', kunci: 'c' as KunciOpsi, pilihan: { a: 'Betul, alasan satu.', b: 'Betul, tercatat [[x|Rp48]].', c: 'Keliru, alasan tiga.', d: 'Keliru, alasan empat.' } } as unknown as OmonganDraf;

function jawab(kunci: number, lain: number, takTerbaca = 0): JawabanRotasi[] {
  const satu = (isi: number | null, i: number): JawabanRotasi => ({ model: `m${String(i % 3)}`, kondisi: 'pesan-pilihan', r: i % 4, huruf: null, isi, isi_kunci: 2, terbaca: isi !== null, salinan: '', skor: null, alasan: 'x', biaya_usd: 0, panggilan: 1 }) as JawabanRotasi;
  return [...Array<number>(kunci).fill(2), ...Array<number>(lain).fill(3), ...Array<null>(takTerbaca).fill(null)].map(satu);
}

describe('penebak berpasangan', () => {
  it('kembaran = pilihan lain yang selabel dengan kunci', () => {
    expect(isiKembaran(o)).toBe(3);
    expect(isiKembaran({ ...o, kunci: 'a' })).toBe(1);
  });
  it('pesan: disklaimer, label diberitahukan, hanya DUA pilihan (kunci + kembaran), rujukan dilucuti, urutan ditukar', () => {
    expect(PETUNJUK_PASANGAN).toMatch(/bisa betul, bisa keliru/);
    const [v1, v2, v3] = VARIAN_PASANGAN.map((v) => pesanPasangan(o, v)[1]?.content ?? '');
    expect(v1).toMatch(/Anggap omongan itu keliru/);
    expect(v1).toMatch(/1\) Keliru, alasan tiga\.\n2\) Keliru, alasan empat\./);
    expect(v2).toMatch(/1\) Keliru, alasan empat\.\n2\) Keliru, alasan tiga\./);
    expect(v3).toMatch(/Kalau ternyata omongan itu keliru/);
    expect(v1).not.toMatch(/Betul, alasan/);
    expect(pesanPasangan({ ...o, kunci: 'b' }, VARIAN_PASANGAN[0])[1]?.content).toMatch(/1\) Betul, tercatat Rp48\./);
  });
  it('jawaban diurai dari {"pilih": 1|2}; selain itu tak terbaca', () => {
    expect(uraiPilih('{"pilih": 2, "alasan": "lebih masuk akal"}')).toEqual({ pilih: 2, alasan: 'lebih masuk akal' });
    expect(uraiPilih('{"pilih": "1"}')).toEqual({ pilih: 1, alasan: '' });
    expect(uraiPilih('{"pilih": 3}')).toBeNull();
    expect(uraiPilih('saya tidak bisa menjawab')).toBeNull();
  });
  it('ambang: 10 dari 12 ditolak, 9 dari 12 lulus; tak terbaca dibuang; > sepertiga tak terbaca → tak-terukur', () => {
    expect(agregasiPasangan(jawab(10, 2))).toMatchObject({ putusan: 'tolak', n: 12, kunci: 10 });
    expect(agregasiPasangan(jawab(9, 3))).toMatchObject({ putusan: 'lulus', kunci: 9 });
    expect(agregasiPasangan(jawab(0, 12))).toMatchObject({ putusan: 'lulus', kunci: 0 });
    expect(agregasiPasangan(jawab(8, 0, 4))).toMatchObject({ putusan: 'tolak', n: 8, tak_terbaca: 4 });
    expect(agregasiPasangan(jawab(7, 0, 5)).putusan).toBe('tak-terukur');
    expect(agregasiPasangan(jawab(10, 2)).p as number).toBeLessThan(AMBANG_P_PASANGAN);
  });
});

describe('kalibrasi tersimpan (eval/penyusun/m2d23-pasangan-1)', () => {
  const h = JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d23-pasangan-1/hasil.json`, 'utf8')) as { butir: Array<{ id: string; kelompok: string; jawaban: string; pasangan: { putusan: string; kunci: number; n: number }; plasebo_tolak: boolean; penguji_opus: { kunci: number; n: number; putusan: string } | null }> };
  it('enam soal tayang tidak ada yang ditolak penebak berpasangan', () => {
    const t = h.butir.filter((b) => b.kelompok === 'tayang');
    expect(t).toHaveLength(6);
    expect(t.filter((b) => b.pasangan.putusan !== 'lulus').map((b) => b.id)).toEqual([]);
  });
  it('angka yang dikutip di laporan: 20 dari 48 kunci asli ditolak, 5 dari 48 plasebo; bank-Rara 12 dari 12', () => {
    expect(h.butir).toHaveLength(48);
    expect(h.butir.filter((b) => b.pasangan.putusan === 'tolak')).toHaveLength(20);
    expect(h.butir.filter((b) => b.plasebo_tolak)).toHaveLength(5);
    expect(h.butir.find((b) => b.id === 'bank-Rara')?.pasangan).toMatchObject({ kunci: 12, n: 12, putusan: 'tolak' });
  });
  it('penguji Opus menolak 1 dari 6 soal tayang → dipakai sebagai peringatan, bukan penolak', () => {
    const t = h.butir.filter((b) => b.kelompok === 'tayang');
    expect(t.filter((b) => b.penguji_opus?.putusan === 'tolak').map((b) => b.id)).toEqual(['tayang-ultj-turun-di-tanggal-ex']);
  });
});
