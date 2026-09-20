/** Bentuk berkas kasus: dua spasi, akhiran baris baru. Sama di setiap build (D-5). */
export function keJson(nilai: unknown): string {
  return JSON.stringify(nilai, null, 2) + '\n';
}
