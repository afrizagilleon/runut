#!/usr/bin/env bash
#
# Perintah paksa untuk kunci kirim. Dipasang di server sebagai
# /usr/local/bin/runut-terima dan dirujuk dari ~/.ssh/authorized_keys:
#
#   command="/usr/local/bin/runut-terima",no-pty,no-agent-forwarding,\
#   no-port-forwarding,no-X11-forwarding ssh-ed25519 AAAA... runut-kirim
#
# Karena perintahnya dipaksa, apa pun yang dikirim klien diabaikan: kunci ini
# hanya bisa melakukan satu hal, yaitu menerima satu arsip tar.gz lewat stdin
# dan memasangnya. Tidak ada shell, tidak ada sudo, tidak ada jalur lain.
#
# Membaca dari stdin, menulis catatan ke stderr supaya tidak mencemari apa pun.

set -euo pipefail

SINGGAH="/var/www/runut-alpha-masuk"
TERBIT="/var/www/runut-alpha"

echo "runut-terima: menerima arsip" >&2

# Direktori singgah selalu dikosongkan lebih dulu. Kalau tidak, berkas lama
# dari kiriman sebelumnya bisa ikut terbit walau sudah dihapus dari sumber.
rm -rf "${SINGGAH}"
mkdir -p "${SINGGAH}"

# --no-same-owner dan --no-same-permissions: arsip datang dari Windows, di mana
# kepemilikan dan bit izinnya tidak berarti apa-apa di sini.
tar -xz --no-same-owner --no-same-permissions -C "${SINGGAH}"

if [ ! -f "${SINGGAH}/index.html" ]; then
	echo "runut-terima: DITOLAK — arsip tidak memuat index.html." >&2
	echo "runut-terima: ${TERBIT} tidak disentuh." >&2
	rm -rf "${SINGGAH}"
	exit 1
fi

mkdir -p "${TERBIT}"

# rsync lokal di server (server punya rsync; laptop pemilik tidak).
# --delete supaya berkas lama dengan nama hash lama tidak menumpuk.
rsync -a --delete "${SINGGAH}/" "${TERBIT}/"
rm -rf "${SINGGAH}"

JUMLAH="$(find "${TERBIT}" -type f | wc -l | tr -d ' ')"
echo "runut-terima: terbit. ${JUMLAH} berkas di ${TERBIT}" >&2
