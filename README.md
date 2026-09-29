# TrafficHub — MVP

Platform sederhana untuk menjual dan melacak traffic dari sumber yang kamu miliki/kelola.

## Jalankan di komputer
1. Install Node.js 22+
2. Buka folder ini.
3. Jalankan `npm install`
4. Salin `.env.example` menjadi `.env` dan ubah `ADMIN_KEY`.
5. Jalankan `npm start`
6. Buka `http://localhost:3000`

## Deploy
Project sudah memiliki Dockerfile dan bisa dideploy ke layanan hosting Node/Docker seperti Render, Railway, Fly.io, VPS, atau hosting yang mendukung Node.js.

Set environment:
- `ADMIN_KEY` = password admin yang panjang dan acak
- `IP_SALT` = string acak
- `PORT` biasanya diberikan oleh hosting

## Admin
Untuk melihat order:
GET `/api/admin/orders`
Header: `x-admin-key: ADMIN_KEY`

Untuk mengubah status:
POST `/api/admin/orders/ORDER_ID/status`
JSON: `{"status":"paid"}`

Status: pending, paid, running, completed, cancelled.

## Tracking
Setelah order paid/running, link `/go/ORDER_ID` akan mencatat klik lalu redirect ke URL pelanggan.

Penting: sistem ini hanya untuk traffic yang benar-benar berasal dari sumber yang sah/diizinkan. Jangan gunakan bot, klik palsu, cookie stuffing, atau cara lain yang memanipulasi metrik/iklan.

## Sebelum produksi
- Tambahkan login admin yang proper.
- Gunakan HTTPS.
- Tambahkan rate limiting.
- Tambahkan validasi domain/URL dan anti-abuse.
- Gunakan database managed untuk skala besar.
- Integrasikan payment gateway.
- Tambahkan sistem publisher/source untuk mendistribusikan campaign secara transparan.
- Tambahkan refund/dispute policy dan terms of service.