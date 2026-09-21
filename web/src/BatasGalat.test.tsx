import { isValidElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BatasGalat, LABEL_MUAT_ULANG, PESAN_MACET } from './BatasGalat.tsx';

/**
 * Proyek ini tidak punya jsdom, jadi batas galat diuji dari sisi yang memang
 * bisa diuji tanpa DOM: keputusan keadaannya, apa yang dicatat, dan **pohon
 * elemen** yang dikembalikan `render()`. Yang dijaga adalah apa yang sampai ke
 * mata pemain, dan itu seluruhnya ada di pohon itu.
 */

/** Kumpulkan semua teks di dalam pohon elemen React. */
function teksDi(simpul: ReactNode): string[] {
  if (simpul === null || simpul === undefined || typeof simpul === 'boolean') return [];
  if (typeof simpul === 'string') return [simpul];
  if (typeof simpul === 'number') return [String(simpul)];
  if (Array.isArray(simpul)) return simpul.flatMap(teksDi);
  if (isValidElement(simpul)) {
    const anak = (simpul.props as { children?: ReactNode }).children;
    return teksDi(anak);
  }
  return [];
}

function buat(props: Partial<React.ComponentProps<typeof BatasGalat>> = {}): BatasGalat {
  return new BatasGalat({ children: 'isi asli', ...props });
}

describe('BatasGalat — sebelum ada galat', () => {
  it('merender isinya apa adanya', () => {
    const batas = buat();
    expect(batas.render()).toBe('isi asli');
  });
});

describe('BatasGalat — sesudah render jatuh', () => {
  it('menandai keadaannya jatuh', () => {
    expect(BatasGalat.getDerivedStateFromError()).toEqual({ jatuh: true });
  });

  it('menampilkan kalimat berbahasa orang dan tombol Muat ulang', () => {
    const batas = buat();
    batas.state = { jatuh: true };
    const teks = teksDi(batas.render());
    expect(teks).toContain(PESAN_MACET);
    expect(teks).toContain(LABEL_MUAT_ULANG);
    expect(PESAN_MACET).toBe('Ada yang macet di halaman ini. Coba muat ulang.');
  });

  it('TIDAK menampilkan teks teknis apa pun ke pemain', () => {
    const batas = buat();
    batas.state = { jatuh: true };
    batas.componentDidCatch(
      new TypeError('crypto.randomUUID is not a function'),
      { componentStack: '\n    at Aplikasi (http://192.168.50.200:5173/src/Aplikasi.tsx:61:20)' },
    );
    const semua = teksDi(batas.render()).join(' ');
    for (const bocor of [
      'crypto.randomUUID',
      'TypeError',
      'Aplikasi',
      // Bingkai tumpukan, bukan kata "at" lepas: "Muat ulang" memuat "at ".
      '    at ',
      '.tsx',
      'http',
      'Error',
      'stack',
    ]) {
      expect(semua, `tidak boleh memuat "${bocor}"`).not.toContain(bocor);
    }
    // Yang tampil hanya dua kalimat itu.
    expect(teksDi(batas.render())).toEqual([PESAN_MACET, LABEL_MUAT_ULANG]);
  });

  it('menulis galatnya ke pencatat, bukan ke layar', () => {
    const catat = vi.fn();
    const batas = buat({ catat });
    const galat = new TypeError('crypto.randomUUID is not a function');
    batas.componentDidCatch(galat, { componentStack: '    at Aplikasi' });
    expect(catat).toHaveBeenCalledTimes(1);
    const [pesan, isi] = catat.mock.calls[0] as [string, { galat: unknown; komponen: unknown }];
    expect(pesan).toContain('Runut');
    expect(isi.galat).toBe(galat);
    expect(isi.komponen).toContain('Aplikasi');
  });

  it('tombolnya memanggil pemuat ulang yang disuntikkan', () => {
    const muatUlang = vi.fn();
    const batas = buat({ muatUlang });
    batas.state = { jatuh: true };
    const pohon = batas.render();
    // Telusuri pohon sampai menemukan tombolnya, lalu panggil onClick-nya.
    const cariTombol = (simpul: ReactNode): (() => void) | null => {
      if (Array.isArray(simpul)) {
        for (const s of simpul) {
          const t = cariTombol(s);
          if (t !== null) return t;
        }
        return null;
      }
      if (!isValidElement(simpul)) return null;
      const props = simpul.props as { onClick?: () => void; children?: ReactNode };
      if (simpul.type === 'button' && typeof props.onClick === 'function') return props.onClick;
      return cariTombol(props.children ?? null);
    };
    const onClick = cariTombol(pohon);
    expect(onClick).not.toBeNull();
    onClick?.();
    expect(muatUlang).toHaveBeenCalledTimes(1);
  });

  it('memberi peran alert supaya pembaca layar mengumumkannya', () => {
    const batas = buat();
    batas.state = { jatuh: true };
    const cariPeran = (simpul: ReactNode): string | null => {
      if (!isValidElement(simpul)) return null;
      const props = simpul.props as { role?: string; children?: ReactNode };
      if (props.role !== undefined) return props.role;
      return cariPeran(props.children ?? null);
    };
    expect(cariPeran(batas.render())).toBe('alert');
  });
});
