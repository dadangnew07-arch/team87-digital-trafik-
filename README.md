# TEAM87 Paid Traffic Store

Toko frontend + database Supabase + pembayaran Midtrans Snap + pemrosesan order manual oleh admin. **Belum aktif sampai konfigurasi dan pengujian di bawah selesai.** Tidak ada pesanan contoh atau data penjualan palsu.

## File
- `index.html`, `store.js`: halaman toko dan checkout.
- `admin.html`, `admin.js`: login admin, pengelolaan paket, daftar pesanan, pembaruan status proses.
- `supabase/schema.sql`: skema database dan kebijakan akses.
- `supabase/functions/create-payment/index.ts`: membuat pesanan dan transaksi Midtrans.
- `supabase/functions/midtrans-webhook/index.ts`: memverifikasi notifikasi Midtrans dan memperbarui status pembayaran.

## A. Buat Supabase
1. Buat project di https://supabase.com/ dan simpan password database di tempat aman.
2. Buka **SQL Editor → New query**, salin seluruh isi `supabase/schema.sql`, lalu jalankan.
3. Buka **Project Settings → API**. Catat Project URL dan `anon`/publishable key. Jangan gunakan `service_role` key di browser.
4. Di `store.js` dan `admin.js`, ganti `ISI_SUPABASE_PROJECT_URL` dan `ISI_SUPABASE_ANON_KEY` dengan nilai project Anda.

## B. Buat akun admin dengan aman
1. Di Supabase, buka **Authentication → Users → Add user**. Buat akun admin dengan email sendiri dan password kuat.
2. Salin UUID user itu.
3. Di SQL Editor jalankan perintah berikut dengan UUID akun Anda:
   `insert into public.admin_users (user_id) values ('UUID-USER-ANDA');`
4. Jangan membuat akses admin berdasarkan email dari browser. Hanya UUID yang dimasukkan ke tabel `admin_users` melalui dashboard/SQL yang memiliki hak admin.

## C. Konfigurasi Midtrans
1. Buat/masuk akun merchant Midtrans dan selesaikan persyaratan verifikasi yang diminta Midtrans.
2. Mulai dari **Sandbox** untuk pengujian. Ambil Server Key sandbox dan Client Key sandbox dari dashboard Midtrans.
3. Deploy Supabase Edge Functions (lihat bagian D), lalu atur secrets:
   - `MIDTRANS_SERVER_KEY` = Server Key sandbox (rahasia)
   - `MIDTRANS_IS_PRODUCTION` = `false`
   - `STORE_FINISH_URL` = URL toko Anda, misalnya `https://NAMA-SITUS-ANDA.netlify.app`
   - `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` biasanya tersedia otomatis di Supabase Edge Functions. Jangan pernah masukkan service role key ke `store.js` atau `admin.js`.
4. Di pengaturan notifikasi/Payment Notification URL Midtrans, masukkan:
   `https://PROJECT-REF.supabase.co/functions/v1/midtrans-webhook`
5. Pastikan URL notifikasi dapat diakses publik dari server Midtrans. Webhook memvalidasi `signature_key` dan jumlah pembayaran sebelum mengubah status order.
6. Setelah seluruh alur Sandbox berhasil diuji, baru pertimbangkan Production. Ganti secret ke Server Key Production dan set `MIDTRANS_IS_PRODUCTION=true`. Jangan menerima pembayaran sungguhan sebelum akun dan notifikasi diverifikasi.

## D. Deploy Edge Functions
Paling mudah lewat komputer dengan Supabase CLI; melalui HP, gunakan editor web GitHub untuk mengunggah file lalu lingkungan CLI/CI yang sudah diamankan. Jangan menaruh secret di GitHub.
Dari komputer dengan Supabase CLI:
```bash
supabase login
supabase link --project-ref PROJECT_REF
supabase secrets set MIDTRANS_SERVER_KEY=SERVER_KEY_SANDBOX MIDTRANS_IS_PRODUCTION=false STORE_FINISH_URL=https://YOUR-SITE.netlify.app
supabase functions deploy create-payment --no-verify-jwt
supabase functions deploy midtrans-webhook --no-verify-jwt
```
`create-payment` dibuat publik karena checkout pelanggan tidak memerlukan login. Validasi paket, jumlah, dan total dilakukan di server. `midtrans-webhook` publik agar Midtrans bisa mengirim notifikasi, tetapi setiap notifikasi diverifikasi dengan signature. Kedua function hanya boleh menggunakan service-role key dari environment server.

## E. Tambahkan paket yang benar
1. Deploy frontend ke Netlify dari repository GitHub.
2. Buka `https://SITUS-ANDA.netlify.app/admin.html`, login dengan akun admin.
3. Tambahkan paket yang memang Anda jual, harga sebenarnya, label unit, dan batas quantity.
4. Paket yang aktif akan tampil di toko. Tidak ada paket/order contoh yang otomatis dimasukkan.

## F. Uji sebelum digunakan
- Pastikan katalog kosong sampai admin memasukkan paket.
- Buat paket uji yang jelas untuk Sandbox.
- Buat pesanan pelanggan uji, lanjutkan pembayaran dengan metode Sandbox Midtrans.
- Pastikan status `payment_status` berubah hanya setelah webhook Midtrans diterima dan signature/nominal valid.
- Pastikan admin dapat mengubah `fulfillment_status` menjadi `in_progress`, `completed`, atau `rejected`.
- Uji akses: pengguna anonim tidak boleh membaca daftar order; akun non-admin tidak boleh mengubah paket atau order.
- Jangan menganggap halaman kembali dari Midtrans sebagai bukti pembayaran. Status valid berasal dari webhook.

## Catatan penting
- Sistem ini mengelola pesanan; pemenuhan traffic dilakukan manual oleh admin.
- Jangan menjual bot traffic, klik palsu, atau menjanjikan kualitas/asal traffic yang tidak dapat diverifikasi. Patuhi kebijakan jaringan iklan dan platform tujuan.
- Untuk perlindungan data tambahan sebelum peluncuran: tambahkan rate limiting/CAPTCHA pada checkout, kebijakan privasi, syarat layanan, proses refund, serta pemantauan log.
- Harga dihitung sebagai `harga paket × quantity`. Definisikan unit paket secara jelas agar pelanggan memahami jumlah yang dibeli.
