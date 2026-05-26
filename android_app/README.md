# ST3GG Mobile 📱

ST3GG Mobile adalah aplikasi Android sederhana dan aman untuk menyembunyikan pesan rahasia di dalam gambar menggunakan teknik **Steganografi**. Aplikasi ini dirancang agar mudah digunakan oleh siapa saja untuk menjaga privasi pesan mereka.

## ✨ Fitur Utama

*   **Sembunyikan Pesan (Encoding):** Masukkan teks rahasia Anda ke dalam gambar apa pun tanpa mengubah tampilan gambar secara kasat mata.
*   **Buka Pesan (Decoding):** Ambil kembali pesan rahasia dari gambar yang telah diproses.
*   **Bagikan Aman (WhatsApp):** Fitur khusus untuk mengirim hasil steganografi lewat WhatsApp sebagai dokumen (`.stg`) agar data tidak rusak oleh kompresi otomatis WhatsApp.
*   **Simpan ke Galeri:** Simpan hasil steganografi langsung ke folder `Pictures/ST3GG` di perangkat Anda.
*   **Privasi Total:** Semua proses dilakukan secara lokal di perangkat Anda tanpa mengirim data ke server mana pun.

## 🚀 Cara Penggunaan

### Menyembunyikan Pesan:
1.  Buka aplikasi dan pilih **Sembunyikan Pesan**.
2.  Pilih gambar dari galeri Anda.
3.  Tuliskan pesan rahasia Anda di kolom teks.
4.  Tekan **Proses & Sembunyikan**.
5.  Pilih **Simpan ke Galeri** atau **Bagikan Aman** untuk mengirim ke teman.

### Membuka Pesan:
1.  Pilih **Buka Pesan Rahasia**.
2.  Pilih gambar stego (atau file `.stg`) yang Anda terima.
3.  Tekan **Buka Pesan** untuk melihat isi rahasianya.

## 🛠 Detail Teknis

Aplikasi ini dibangun menggunakan arsitektur **Hybrid (WebView + Kotlin Bridge)**:
*   **Frontend:** HTML5, CSS3, dan Vanilla JavaScript.
*   **Core Logic:** `f5stego-lib.js` dan `steg-core.js` (Implementasi algoritma F5 dan LSB).
*   **Backend (Android):** Kotlin dengan WebView JavascriptInterface untuk menangani akses MediaStore, FileProvider, dan Native Sharing.
*   **Compatibility:** Android 5.0 (API 21) ke atas.

## 📦 Build Manual

Jika Anda ingin melakukan build sendiri:
1. Pastikan Java 17 terpasang.
2. Jalankan perintah:
   ```bash
   ./gradlew assembleDebug
   ```
3. APK akan tersedia di `app/build/outputs/apk/debug/app-debug.apk`.

## 📄 Lisensi

Proyek ini menggunakan pustaka pihak ketiga:
- `f5stegojs` oleh desudesutalk (MIT License).

---
*Dibuat dengan ❤️ untuk privasi digital.*
