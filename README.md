# EngSpace - Frontend Landing Page (GitHub Pages)

Landing page statis, responsif, dan ultra-cepat untuk portal tugas dan portofolio akademik mahasiswa.

## 🚀 Fitur Utama
- **Ultra-Fast Static Hosting:** Didesain murni untuk GitHub Pages menggunakan HTML, Vanilla CSS, dan Alpine.js tanpa dependensi runtime server.
- **Dark Mode Support:** Mode terang dan gelap otomatis dengan deteksi preferensi sistem & persistensi `localStorage`.
- **Responsive 1:1 Layout:** Tampilan optimal di smartphone, tablet, maupun desktop.
- **Otomatis Tersinkronisasi dengan Azure Admin:** Data mahasiswa, berkas tugas, dan logo otomatis ter-update saat administrator melakukan perubahan melalui dashboard backend di Azure.

## 🛠️ Cara Deploy ke GitHub Pages
1. Buat repository baru di GitHub (misalnya: `engspace-frontend`).
2. Masuk ke folder ini (`landing page html`) dan lakukan push:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - EngSpace Frontend"
   git branch -M main
   git remote add origin https://github.com/<username>/<repo-name>.git
   git push -u origin main
   ```
3. Di GitHub repository:
   - Buka **Settings** > **Pages**.
   - Pada bagian **Build and deployment** > **Branch**, pilih `main` dan folder `/(root)`.
   - Klik **Save**.
4. Website Anda akan aktif di: `https://<username>.github.io/<repo-name>/`.
