/// <reference types="vite/client" />

/**
 * Satu-satunya variabel lingkungan yang dibaca aplikasi web.
 *
 * Dideklarasikan dengan namanya supaya `import.meta.env.VITE_KOLEKTOR_URL`
 * bertipe `string | undefined`, bukan `any` (INV-1) — dan, yang lebih penting,
 * supaya aksesnya memakai **titik**: Vite hanya mengganti bentuk titik dengan
 * nilai harfiah saat build. Akses kurung siku tidak diganti, sehingga cabang
 * matinya tidak bisa dibuang dan `sendBeacon` ikut masuk ke bundle (INV-2).
 */
interface ImportMetaEnv {
  readonly VITE_KOLEKTOR_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
