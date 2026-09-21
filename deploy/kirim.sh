#!/usr/bin/env bash
#
# Kirim hasil build ke server alpha.
#
#   bash deploy/kirim.sh
#   DEPLOY_HOST=nama-lain bash deploy/kirim.sh
#
# Tidak ada nama host, nama pengguna, port, atau jalur kunci di berkas ini.
# Yang dipakai hanya alias host SSH yang didefinisikan pemilik di ~/.ssh/config.
# Kunci di sisi server dipasang sebagai perintah paksa (lihat deploy/README.md),
# jadi perintah apa pun yang dikirim dari sini diabaikan server: ia selalu
# menjalankan runut-terima.
#
# Dikirim lewat tar di atas stdin/stdout, bukan rsync: laptop pemilik
# (Windows + Git Bash) tidak punya rsync.

set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:-runut-alpha}"
ASAL="web/dist"

if [ ! -f "${ASAL}/index.html" ]; then
	echo "kirim.sh: ${ASAL}/index.html tidak ada." >&2
	echo "Bangun dulu, dan ingat memberi alamat pengumpulnya:" >&2
	echo "  VITE_KOLEKTOR_URL=/e npm run build" >&2
	echo "Di Git Bash, jalankan itu lewat PowerShell — lihat deploy/README.md," >&2
	echo "bagian \"Kalau gagal\", soal /e yang berubah menjadi E:/." >&2
	exit 1
fi

echo "kirim.sh: mengirim ${ASAL} ke alias SSH \"${DEPLOY_HOST}\"" >&2

# Catatan yang mahal dipelajari:
#  - `ssh -T` supaya tidak ada permintaan pseudo-terminal; server mencetak
#    banner login panjang ke stderr dan tanpa -T ssh mengeluh.
#  - JANGAN menggabungkan stderr ke stdout di sini (`2>&1`). Aliran keluar tar
#    adalah data biner; mencampurnya dengan banner akan merusak arsip.
#  - Jalur diberikan lewat `-C` dengan nama relatif, bukan nama Windows
#    absolut: GNU tar di Git Bash membaca `C:\...` sebagai host jauh.
tar -cz -C "${ASAL}" . | ssh -T -o BatchMode=yes "${DEPLOY_HOST}"

echo "kirim.sh: selesai." >&2
