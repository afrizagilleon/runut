#!/usr/bin/env bash
#
# Ambil berkas peristiwa alpha dari server, hanya-baca.
#
#   bash deploy/ambil-data.sh
#   DEPLOY_DATA_HOST=nama-lain bash deploy/ambil-data.sh
#
# Memakai alias SSH kedua yang kuncinya dipaksa ke satu perintah:
#   tar -cz -C /var/lib/runut-alpha/data .
# Kunci itu tidak bisa menulis apa pun dan tidak bisa membuka shell.
#
# Hasilnya masuk ke .cache/alpha/, yang sudah di-gitignore.

set -euo pipefail

DEPLOY_DATA_HOST="${DEPLOY_DATA_HOST:-runut-alpha-data}"
TUJUAN=".cache/alpha"

mkdir -p "${TUJUAN}"

echo "ambil-data.sh: mengambil peristiwa dari alias SSH \"${DEPLOY_DATA_HOST}\"" >&2

# Sama seperti kirim.sh: `-T`, tanpa `2>&1`, dan `-C` dengan jalur relatif.
# Memberi tar nama berkas Windows absolut membuatnya mengira `C:` adalah host
# jauh dan gagal dengan "Cannot connect to C: resolve failed".
ssh -T -o BatchMode=yes "${DEPLOY_DATA_HOST}" | tar -xz -C "${TUJUAN}"

echo "ambil-data.sh: berkas ada di ${TUJUAN}/" >&2
ls -la "${TUJUAN}" >&2

echo >&2
echo "Ringkas dengan:" >&2
echo "  npm run alpha:ringkas -- ${TUJUAN}/peristiwa-*.jsonl" >&2
