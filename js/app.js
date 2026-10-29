/**
 * ========================================================
 * APP.JS - ENGSPACE DYNAMIC FRONTEND (ALPINE.JS)
 * Pure Static GitHub Pages Architecture
 * Consumes: data/*.json & uploads/images/*
 * ========================================================
 */

(function () {
    'use strict';

    // Global Clipboard Helper
    window.copyToClipboard = function(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        }
        return new Promise(function(resolve, reject) {
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.top = '-9999px';
                ta.style.left = '-9999px';
                ta.style.opacity = '0';
                ta.setAttribute('readonly', '');
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                ta.setSelectionRange(0, text.length);
                const ok = document.execCommand('copy');
                document.body.removeChild(ta);
                if (ok) resolve();
                else reject(new Error('execCommand copy failed'));
            } catch (err) {
                reject(err);
            }
        });
    };

    // Helper: Parse Cloud Link (YouTube, Drive, Cloud)
    function parseCloudLink(url, customThumb) {
        if (!url) return null;
        const str = url.trim();
        const localThumb = customThumb ? resolveImageUrl(customThumb) : null;

        // 1. YouTube
        const ytMatch = str.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_\-]{11})/i);
        if (ytMatch) {
            const vid = ytMatch[1];
            return {
                icon: 'youtube',
                provider: 'youtube',
                label: 'YouTube Video',
                badgeClass: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900',
                originalUrl: str,
                previewUrl: 'https://www.youtube.com/watch?v=' + vid,
                embedUrl: 'https://www.youtube.com/embed/' + vid,
                fileId: vid,
                thumbnailUrl: 'https://img.youtube.com/vi/' + vid + '/mqdefault.jpg'
            };
        }

        // 2. Google Drive File (Gunakan /preview agar tidak memicu pemilih akun / popup login di mobile)
        const driveMatch = str.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_\-]+)/i);
        if (driveMatch) {
            const fid = driveMatch[1];
            return {
                icon: 'drive',
                provider: 'drive',
                label: 'Google Drive',
                badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900',
                originalUrl: str,
                previewUrl: 'https://drive.google.com/file/d/' + fid + '/preview',
                embedUrl: 'https://drive.google.com/file/d/' + fid + '/preview',
                fileId: fid,
                thumbnailUrl: localThumb || ('https://drive.google.com/thumbnail?id=' + fid + '&sz=w320'),
                fallbackThumbnailUrl: 'https://lh3.googleusercontent.com/d/' + fid + '=w320'
            };
        }

        // 3. Google Docs / Presentation / Spreadsheets (Gunakan /preview agar bebas login)
        const docsMatch = str.match(/docs\.google\.com\/(presentation|document|spreadsheets)\/d\/([a-zA-Z0-9_\-]+)/i);
        if (docsMatch) {
            const docType = docsMatch[1].toLowerCase();
            const fid = docsMatch[2];
            let label = 'Google Docs';
            let preview = 'https://docs.google.com/document/d/' + fid + '/preview';
            if (docType === 'presentation') {
                label = 'Google Slides';
                preview = 'https://docs.google.com/presentation/d/' + fid + '/preview';
            } else if (docType === 'spreadsheets') {
                label = 'Google Sheets';
                preview = 'https://docs.google.com/spreadsheets/d/' + fid + '/preview';
            }
            return {
                icon: 'drive',
                provider: docType,
                label: label,
                badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900',
                originalUrl: str,
                previewUrl: preview,
                embedUrl: preview,
                fileId: fid,
                thumbnailUrl: localThumb || ('https://drive.google.com/thumbnail?id=' + fid + '&sz=w320'),
                fallbackThumbnailUrl: 'https://lh3.googleusercontent.com/d/' + fid + '=w320'
            };
        }

        // 4. Google Drive Folder
        const folderMatch = str.match(/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_\-]+)/i);
        if (folderMatch) {
            const folderId = folderMatch[1];
            return {
                icon: 'drive',
                provider: 'drive',
                label: 'Google Drive Folder',
                badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900',
                originalUrl: str,
                previewUrl: 'https://drive.google.com/embeddedfolderview?id=' + folderId + '#list',
                embedUrl: 'https://drive.google.com/embeddedfolderview?id=' + folderId + '#list',
                fileId: folderId,
                thumbnailUrl: ''
            };
        }

        // 5. Fallback Google Drive
        const lower = str.toLowerCase();
        if (lower.includes('drive.google.com') || lower.includes('docs.google.com')) {
            return {
                icon: 'drive',
                provider: 'drive',
                label: 'Google Drive',
                badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900',
                originalUrl: str,
                previewUrl: str,
                embedUrl: str,
                fileId: '',
                thumbnailUrl: ''
            };
        }

        return {
            icon: 'cloud',
            provider: 'cloud',
            label: 'Cloud Link',
            badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-900',
            originalUrl: str,
            fileId: null,
            thumbnailUrl: null
        };
    }

    // Helper: Format Tanggal Indonesia
    function formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr.replace(' ', 'T'));
            if (isNaN(d.getTime())) return dateStr;
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
        } catch (e) {
            return dateStr;
        }
    }

    // Helper: URL Bersih untuk Tugas (Bypass Account Chooser / Login Prompt di Mobile & Tablet)
    function getTaskCleanUrl(task) {
        if (!task) return '#';
        if (task.parsed && task.parsed.previewUrl) return task.parsed.previewUrl;
        if (task.parsed && task.parsed.originalUrl) return task.parsed.originalUrl;
        return task.link_tugas || '#';
    }
    window.getTaskCleanUrl = getTaskCleanUrl;

    // Helper: Base Directory URL Resolver (Menjamin Trailing Slash di GitHub Pages / Tablet / Safari)
    function getAppBaseUrl() {
        try {
            const loc = window.location;
            let path = loc.pathname || '';
            if (!path.endsWith('/')) {
                const lastSlash = path.lastIndexOf('/');
                path = lastSlash >= 0 ? path.substring(0, lastSlash + 1) : '/';
            }
            return loc.origin + path;
        } catch (e) {
            return './';
        }
    }
    window.getAppBaseUrl = getAppBaseUrl;

    // Helper: Template Loading Frame Dinamis (Anti-Flashbang & Kompatibel Mode Gelap)
    function getFrameLoadingHtml(studentName) {
        const cleanName = (studentName || 'Mahasiswa').replace(/"/g, '&quot;');
        const isDark = document.documentElement.classList.contains('dark');
        const bg = isDark ? '#0f172a' : '#f8fafc';
        const text = isDark ? '#f1f5f9' : '#0f172a';
        const sub = isDark ? '#94a3b8' : '#64748b';
        const cardBg = isDark ? 'rgba(30, 41, 59, 0.75)' : 'rgba(255, 255, 255, 0.9)';
        const cardBorder = isDark ? 'rgba(51, 65, 85, 0.8)' : 'rgba(226, 232, 240, 0.8)';
        return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Memuat...</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 20px; width: 100%; height: 100vh;
    display: flex; align-items: center; justify-content: center;
    background: ${bg}; color: ${text}; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .card {
    background: ${cardBg}; border: 1px solid ${cardBorder};
    padding: 32px 28px; border-radius: 24px; text-align: center;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); max-width: 380px; width: 100%;
    backdrop-filter: blur(12px);
  }
  .spinner {
    width: 42px; height: 42px; border: 3.5px solid rgba(99, 102, 241, 0.2);
    border-top-color: #6366f1; border-radius: 50%;
    animation: spin 0.85s cubic-bezier(0.5, 0, 0.5, 1) infinite; margin: 0 auto 16px auto;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .name { font-size: 16px; font-weight: 800; margin-bottom: 6px; letter-spacing: -0.02em; }
  .desc { font-size: 12px; color: ${sub}; line-height: 1.5; }
</style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <div class="name">${cleanName}</div>
    <div class="desc">Connecting academic portfolio &amp; coursework...</div>
  </div>
</body>
</html>`;
    }

    // Endpoint Live API untuk Sinkronisasi Real-Time Instan (0 Detik)
    const AZURE_BASE_URL = 'https://portal-bahasa-inggris-admin-d4cbgafthwhgexb0.indonesiacentral-01.azurewebsites.net';
    const PURELOGIC_BASE_URL = 'https://fluxengineers.purelogic.my.id';
    let currentUploadsUrl = 'uploads/images/';

    // Helper: Daftar Endpoint API Berdasarkan Lingkungan (Localhost vs Production)
    function getApiEndpoints() {
        const isLocalHost = (typeof window !== 'undefined' && window.location && (
            window.location.hostname === '127.0.0.1' || 
            window.location.hostname === 'localhost' || 
            window.location.hostname === '0.0.0.0'
        ));

        if (isLocalHost) {
            // Pada simulasi lokal, prioritaskan Backend Lokal di Port 8080 & 8000
            return [
                'http://127.0.0.1:8080/api/data.php',
                'http://localhost:8080/api/data.php',
                'http://127.0.0.1:8000/api/data.php',
                PURELOGIC_BASE_URL + '/api/data.php',
                AZURE_BASE_URL + '/api/data.php'
            ];
        }

        // Pada production (GitHub Pages / domain kustom), prioritaskan backend cPanel Purelogic
        return [
            PURELOGIC_BASE_URL + '/api/data.php',
            AZURE_BASE_URL + '/api/data.php'
        ];
    }

    const CACHE_VERSION = 'v26_english_translations';

    // Helper: Pembersih Cache Usang (Validasi Struktur JSON & Purge Versi Lama)
    function sanitizeCachedStudents(rawJson) {
        if (!rawJson) return null;
        try {
            if (localStorage.getItem('app_cache_version') !== CACHE_VERSION) {
                localStorage.removeItem('students_cache');
                localStorage.removeItem('group_tasks_cache');
                localStorage.removeItem('individual_tasks_cache');
                localStorage.removeItem('site_settings');
                localStorage.setItem('app_cache_version', CACHE_VERSION);
                return null;
            }
            const parsed = JSON.parse(rawJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    // Helper: Logo / Image URL (Mendukung Live URL dari Azure, Server Purelogic & Fallback Lokal)
    function resolveImageUrl(filename) {
        if (!filename) return '';
        filename = String(filename).trim();
        if (filename.startsWith('http://') || filename.startsWith('https://') || filename.startsWith('data:')) {
            return filename;
        }

        // 1. Jika berjalan di localhost / 127.0.0.1, selalu prioritaskan asset lokal uploads/images/
        const isLocalHost = (typeof window !== 'undefined' && window.location && (
            window.location.hostname === '127.0.0.1' || 
            window.location.hostname === 'localhost' || 
            window.location.hostname === '0.0.0.0'
        ));
        if (isLocalHost) {
            return getAppBaseUrl() + 'uploads/images/' + filename;
        }

        // 2. Jika currentUploadsUrl sudah berupa URL absolut (http:// atau https://)
        if (currentUploadsUrl && (currentUploadsUrl.startsWith('http://') || currentUploadsUrl.startsWith('https://'))) {
            return currentUploadsUrl + filename;
        }

        // 3. Fallback relatif domain saat ini
        return getAppBaseUrl() + (currentUploadsUrl || 'uploads/images/') + filename;
    }
    window.resolveImageUrl = resolveImageUrl;

    // Helper: Image Error Fallback Handler (Anti Gambar Pecah / Broken Image Multi-Tier)
    window.handleImageError = function(img, filename, studentName) {
        if (!img) return;
        const cleanName = String(filename || '').trim();
        if (!cleanName) {
            img.style.display = 'none';
            return;
        }

        const step = parseInt(img.dataset.fallbackStep || '0', 10);
        const candidates = [
            getAppBaseUrl() + 'uploads/images/' + cleanName,
            AZURE_BASE_URL + '/uploads/images/' + cleanName,
            PURELOGIC_BASE_URL + '/uploads/images/' + cleanName
        ];

        // Coba kandidat berikutnya secara berurutan
        for (let i = step; i < candidates.length; i++) {
            const nextUrl = candidates[i];
            if (nextUrl && img.src !== nextUrl) {
                img.dataset.fallbackStep = String(i + 1);
                img.src = nextUrl;
                return;
            }
        }

        // Jika semua URL kandidat gagal, sembunyikan gambar agar tidak muncul icon silang / broken image
        img.style.display = 'none';
        const fallbackSibling = img.parentElement ? img.parentElement.querySelector('.fallback-avatar') : null;
        if (fallbackSibling) {
            fallbackSibling.classList.remove('hidden');
            fallbackSibling.style.display = 'flex';
        }
    };

    /**
     * Universal Data Fetcher:
     * 1. Prioritas Utama: Mengambil data real-time instan dari Backend Terdekat (Port 8000 / Purelogic).
     * 2. Fallback: Mengambil data static JSON dari GitHub Pages jika server backend offline.
     */
    async function fetchAllAppData() {
        const endpoints = getApiEndpoints();
        for (const ep of endpoints) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2500);
                const liveRes = await fetch(ep + '?_=' + Date.now(), { signal: controller.signal });
                clearTimeout(timeoutId);

                if (liveRes.ok) {
                    const json = await liveRes.json();
                    if (json && json.status === 'success' && json.data) {
                        const isLocal = (typeof window !== 'undefined' && window.location && (
                            window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
                        ));
                        let upUrl = 'uploads/images/';
                        if (!isLocal) {
                            upUrl = json.uploads_url || (PURELOGIC_BASE_URL + '/uploads/images/');
                            if (upUrl.startsWith('http://')) {
                                upUrl = upUrl.replace(/^http:\/\//, 'https://');
                            }
                        }
                        currentUploadsUrl = upUrl;
                        return {
                            source: ep.indexOf('8000') !== -1 ? 'local_simulation' : 'live_backend',
                            settings: json.data.settings || null,
                            students: Array.isArray(json.data.students) ? json.data.students : [],
                            groupTasks: Array.isArray(json.data.group_tasks) ? json.data.group_tasks : [],
                            individualTasks: Array.isArray(json.data.individual_tasks) ? json.data.individual_tasks : []
                        };
                    }
                }
            } catch (e) {
                // Lanjut ke endpoint berikutnya
            }
        }

        // Fallback ke Static JSON Lokal (GitHub Pages) dengan Path Absolut Aman
        currentUploadsUrl = 'uploads/images/';
        const ts = Date.now();
        const base = getAppBaseUrl();
        const [settRes, studRes, grpRes, indRes] = await Promise.all([
            fetch(base + 'data/site_settings.json?_=' + ts).then(r => r.ok ? r.json() : null).catch(() => null),
            fetch(base + 'data/students.json?_=' + ts).then(r => r.ok ? r.json() : null).catch(() => null),
            fetch(base + 'data/group_tasks.json?_=' + ts).then(r => r.ok ? r.json() : null).catch(() => null),
            fetch(base + 'data/individual_tasks.json?_=' + ts).then(r => r.ok ? r.json() : null).catch(() => null)
        ]);

        return {
            source: 'static_github',
            settings: settRes || null,
            students: Array.isArray(studRes) ? studRes : [],
            groupTasks: Array.isArray(grpRes) ? grpRes : [],
            individualTasks: Array.isArray(indRes) ? indRes : []
        };
    }

    // Helper: Update Favicon Dinamis dari Logo Website yang Diupload
    function updateFavicon(logoFilename) {
        if (!logoFilename) return;
        const url = resolveImageUrl(logoFilename);

        let fav = document.getElementById('dynamic-favicon');
        if (!fav) {
            fav = document.querySelector("link[rel~='icon']");
        }
        if (!fav) {
            fav = document.createElement('link');
            fav.rel = 'icon';
            fav.id = 'dynamic-favicon';
            document.head.appendChild(fav);
        }
        fav.href = url;

        let appleFav = document.getElementById('dynamic-apple-favicon');
        if (!appleFav) {
            appleFav = document.querySelector("link[rel='apple-touch-icon']");
        }
        if (!appleFav) {
            appleFav = document.createElement('link');
            appleFav.rel = 'apple-touch-icon';
            appleFav.id = 'dynamic-apple-favicon';
            document.head.appendChild(appleFav);
        }
        appleFav.href = url;
    }

    // Default Site Settings
    var DEFAULT_SETTINGS = {
        web_title: 'Universitas Negeri Yogyakarta',
        web_tagline: 'Dashboard Tugas & Portofolio',
        web_subtitle: 'Kelompok Bahasa Inggris',
        web_badge: 'Electrical Engginering',
        web_logo: 'web_logo_1790876671.webp',
        web_description: 'Platform kolaborasi tugas dan portofolio akademik mahasiswa. Menyajikan profil lengkap seluruh anggota tim serta rekapitulasi berkas tugas kelompok dan individu secara terintegrasi.',
        program_studi: 'Teknik Elektro',
        mata_kuliah: 'Bahasa Inggris',
        topik_utama: 'Presentation & Academic Essay',
        format_tugas: 'Google Drive, YouTube, Cloud Link',
        kelas: 'Kelas B',
        tahun_akademik: '2026/2027',
        card_matakuliah_title: 'Mata Kuliah Bahasa Inggris',
        card_matakuliah_desc: 'Mencakup penulisan esai akademis, analisis jurnal, dan penyusunan slide presentasi kelompok secara profesional.',
        card_arsip_title: 'Arsip Berkas Digital',
        card_arsip_desc: 'Setiap dokumen kelompok dan individu tersimpan aman di server dan dapat langsung diunduh sewaktu-waktu.',
        card_pendidikan_title: 'Riwayat Pendidikan',
        card_pendidikan_desc: 'Menampilkan jejak sekolah menengah dan latar belakang pendidikan asal masing-masing anggota mahasiswa.'
    };

    // ============================================================
    // 1. LANDING APP (index.html) - DUAL MODE: DASHBOARD + SPA MAHASISWA
    // ============================================================
    window.landingApp = function() {
        return {

            // Data State
            settings: Object.assign({}, DEFAULT_SETTINGS),
            students: [],
            groupTasks: [],
            individualTasks: [],
            totalTasks: 0,

            get isGroupOnlyMode() {
                return !!(this.settings && this.settings.task_display_mode === 'group_only');
            },

            get displayedTaskCount() {
                return this.isGroupOnlyMode ? this.groupTasks.length : this.totalTasks;
            },

            // View State (Dashboard vs Profil Mahasiswa)
            currentView: 'dashboard', // 'dashboard' | 'student'
            currentStudent: null,
            currentStudentTasks: [],
            prevStudent: null,
            nextStudent: null,
            externalSrc: '',
            externalSrcdoc: '',
            copiedNim: false,
            isNavigating: false,

            // Filter Dropdown State
            filter: 'all',
            filterLabel: 'All Task Files',
            dropdownOpen: false,
            isSwitching: false,
            filteredTasks: [],

            mobileMenuOpen: false,
            darkMode: document.documentElement.classList.contains('dark'),

            toggleMobileMenu(state) {
                this.mobileMenuOpen = (typeof state === 'boolean') ? state : !this.mobileMenuOpen;
                if (this.mobileMenuOpen) {
                    window.__openMobileNav && window.__openMobileNav();
                } else {
                    window.__closeMobileNav && window.__closeMobileNav();
                }
            },

            // Image Resolver
            getLogoUrl(filename) {
                return resolveImageUrl(filename);
            },

            // Theme Toggle
            toggleTheme() {
                this.darkMode = !this.darkMode;
                if (this.darkMode) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
                try {
                    localStorage.theme = this.darkMode ? 'dark' : 'light';
                } catch (e) {}
            },

            // Init: Selalu Buka Dashboard Utama Secara Default (Kecuali Ada ?id= di URL)
            async init() {
                updateFavicon(this.settings.web_logo);
                this.hydrateFromCache();

                // Listener untuk navigasi proxy & tugas kelompok jika iframe mengirim pesan
                window.addEventListener('message', (e) => {
                    if (e && e.data) {
                        if (e.data.type === 'engspace-proxy-navigate' && e.data.url) {
                            this.loadProxiedUrl(e.data.url, '');
                        } else if (e.data.type === 'engspace-navigate-group-tasks') {
                            window.location.href = 'group_tasks.html';
                        }
                    }
                });

                // Dukungan Tombol Back/Forward Browser (History Navigation)
                window.addEventListener('popstate', () => {
                    const p = new URLSearchParams(window.location.search);
                    const sid = p.get('id');
                    if (sid) {
                        this.showStudent(sid, false);
                    } else {
                        this.showDashboard(false);
                    }
                });

                const params = new URLSearchParams(window.location.search);
                const targetId = params.get('id');
                if (targetId) {
                    this.showStudentDirect(targetId, false);
                } else {
                    this.showDashboardDirect(false);
                }

                await this.loadData();

                if (targetId) {
                    this.showStudentDirect(targetId, false);
                }
            },

            hydrateFromCache() {
                try {
                    const cSettings = localStorage.getItem('site_settings');
                    if (cSettings) this.settings = Object.assign({}, DEFAULT_SETTINGS, JSON.parse(cSettings));
                    const sanitizedStudents = sanitizeCachedStudents(localStorage.getItem('students_cache'));
                    if (sanitizedStudents) this.students = sanitizedStudents;
                    const cGrp = localStorage.getItem('group_tasks_cache');
                    if (cGrp) this.groupTasks = JSON.parse(cGrp);
                    const cInd = localStorage.getItem('individual_tasks_cache');
                    if (cInd) this.individualTasks = JSON.parse(cInd);

                    this.totalTasks = this.groupTasks.length + this.individualTasks.length;
                    this.filterLabel = 'All Task Files (' + this.totalTasks + ')';
                    this.updateFilteredTasks();
                } catch (e) {}
            },

            async loadData() {
                try {
                    const result = await fetchAllAppData();

                    if (result.settings && typeof result.settings === 'object') {
                        this.settings = Object.assign({}, DEFAULT_SETTINGS, result.settings);
                        try { localStorage.setItem('site_settings', JSON.stringify(this.settings)); } catch (e) {}
                    }
                    updateFavicon(this.settings.web_logo);

                    if (Array.isArray(result.students)) {
                        this.students = result.students;
                        try { localStorage.setItem('students_cache', JSON.stringify(result.students)); } catch (e) {}
                    }
                    if (Array.isArray(result.groupTasks)) {
                        this.groupTasks = result.groupTasks;
                        try { localStorage.setItem('group_tasks_cache', JSON.stringify(result.groupTasks)); } catch (e) {}
                    }
                    if (Array.isArray(result.individualTasks)) {
                        this.individualTasks = result.individualTasks;
                        try { localStorage.setItem('individual_tasks_cache', JSON.stringify(result.individualTasks)); } catch (e) {}
                    }
                } catch (err) {
                    console.warn('Gagal memuat data:', err);
                }

                this.totalTasks = this.groupTasks.length + this.individualTasks.length;
                this.filterLabel = 'All Task Files (' + this.totalTasks + ')';
                this.updateFilteredTasks();

                if (this.currentView === 'dashboard' && this.settings.web_title) {
                    document.title = this.settings.web_title + ' - Coursework & Student Dashboard';
                }
            },

            // --- Helper Animasi Geser Layar Dekstop Super Halus (Direction-Aware) ---
            async transitionView(direction, updateFn) {
                if (this.isNavigating) return;
                this.isNavigating = true;

                const mainEl = document.getElementById('main-content');
                const bar = document.getElementById('nav-progress-bar');
                const isDesktop = (window.innerWidth >= 768);

                if (bar) {
                    bar.style.opacity = '1';
                    bar.style.width = '65%';
                }

                if (mainEl && isDesktop) {
                    const outClass = (direction === 'next') ? 'anim-slide-out-left' : 'anim-slide-out-right';
                    const inClass = (direction === 'next') ? 'anim-slide-in-right' : 'anim-slide-in-left';

                    // 1. Eksekusi animasi slide keluar (Out)
                    mainEl.classList.remove('anim-slide-out-left', 'anim-slide-out-right', 'anim-slide-in-left', 'anim-slide-in-right', 'page-enter-active');
                    mainEl.classList.add(outClass);

                    // Tunggu hingga slide keluar selesai (200ms)
                    await new Promise(r => setTimeout(r, 200));

                    // 2. Eksekusi pembaruan DOM / View saat tersembunyi
                    updateFn();
                    window.scrollTo({ top: 0, behavior: 'instant' });

                    // 3. Pasang animasi slide masuk (In)
                    mainEl.classList.remove(outClass);
                    mainEl.classList.add(inClass);

                    if (bar) {
                        bar.style.width = '100%';
                        setTimeout(() => {
                            bar.style.opacity = '0';
                            setTimeout(() => { bar.style.width = '0%'; }, 250);
                        }, 180);
                    }

                    // 4. Setelah slide masuk selesai (280ms), bersihkan kelas animasi
                    setTimeout(() => {
                        mainEl.classList.remove(inClass);
                        this.isNavigating = false;
                    }, 280);
                } else {
                    // Mode tablet / mobile: transisi fade cepat yang ringan
                    if (mainEl) {
                        mainEl.style.opacity = '0.3';
                    }
                    updateFn();
                    window.scrollTo({ top: 0, behavior: 'instant' });
                    if (mainEl) {
                        setTimeout(() => {
                            mainEl.style.opacity = '1';
                            if (bar) {
                                bar.style.width = '100%';
                                setTimeout(() => {
                                    bar.style.opacity = '0';
                                    setTimeout(() => { bar.style.width = '0%'; }, 250);
                                }, 150);
                            }
                            this.isNavigating = false;
                        }, 80);
                    } else {
                        this.isNavigating = false;
                    }
                }
            },

            // Tampilan langsung tanpa animasi (untuk inisialisasi awal)
            showDashboardDirect(updateHistory = false) {
                this.currentView = 'dashboard';
                this.currentStudent = null;
                this.externalSrc = '';
                this.externalSrcdoc = '';
                this.mobileMenuOpen = false;
                if (this.settings.web_title) {
                    document.title = this.settings.web_title + ' - Coursework & Student Dashboard';
                }
                if (updateHistory) {
                    try {
                        const url = new URL(window.location.href);
                        url.searchParams.delete('id');
                        window.history.pushState({}, '', url.pathname + (url.search ? url.search : ''));
                    } catch (e) {}
                }
            },

            showStudentDirect(studentId, updateHistory = false) {
                if (!this.students || this.students.length === 0) return;
                let std = this.students.find(s => s.id === studentId);
                if (!std) return;

                this.currentView = 'student';
                this.mobileMenuOpen = false;
                this.currentStudent = std;
                this.updateExternalFrame(std);

                this.currentStudentTasks = this.individualTasks
                    .filter(t => t.student_id === std.id)
                    .map(t => ({
                        ...t,
                        parsed: parseCloudLink(t.link_tugas, t.thumbnail),
                        formattedDate: formatDate(t.tanggal_upload)
                    }));

                const idx = this.students.findIndex(s => s.id === std.id);
                this.prevStudent = idx > 0 ? this.students[idx - 1] : null;
                this.nextStudent = (idx >= 0 && idx < this.students.length - 1) ? this.students[idx + 1] : null;

                if (this.currentStudent && this.currentStudent.nama_lengkap) {
                    document.title = this.currentStudent.nama_lengkap + ' - Profil Mahasiswa';
                }

                if (updateHistory) {
                    try {
                        const url = new URL(window.location.href);
                        url.searchParams.set('id', studentId);
                        window.history.pushState({}, '', url.toString());
                    } catch (e) {}
                }
            },

            // --- Navigasi SPA Super Mulus dengan Animasi Geser (Dashboard vs Mahasiswa) ---
            showDashboard(updateHistory = true, forcedDirection = null) {
                if (this.currentView === 'dashboard' && !this.currentStudent) return;
                const direction = forcedDirection || 'prev';

                const applyDashboard = () => {
                    this.currentView = 'dashboard';
                    this.currentStudent = null;
                    this.externalSrc = '';
                    this.externalSrcdoc = '';
                    this.mobileMenuOpen = false;
                    if (this.settings.web_title) {
                        document.title = this.settings.web_title + ' - Coursework & Student Dashboard';
                    }
                    if (updateHistory) {
                        try {
                            const url = new URL(window.location.href);
                            url.searchParams.delete('id');
                            window.history.pushState({}, '', url.pathname + (url.search ? url.search : ''));
                        } catch (e) {}
                    }
                    window.scrollTo({ top: 0, behavior: 'instant' });
                };

                this.transitionView(direction, applyDashboard);
            },

            showStudent(studentId, updateHistory = true, forcedDirection = null) {
                if (!this.students || this.students.length === 0) return;
                let std = this.students.find(s => s.id === studentId);
                if (!std) return;

                if (this.currentView === 'student' && this.currentStudent && this.currentStudent.id === std.id) {
                    return;
                }

                // Tentukan arah geser (next: geser ke kiri, prev: geser ke kanan)
                let direction = forcedDirection;
                if (!direction) {
                    if (this.currentView === 'dashboard') {
                        direction = 'next';
                    } else if (this.currentStudent) {
                        const curIdx = this.students.findIndex(s => s.id === this.currentStudent.id);
                        const targetIdx = this.students.findIndex(s => s.id === std.id);
                        direction = (targetIdx >= curIdx) ? 'next' : 'prev';
                    } else {
                        direction = 'next';
                    }
                }

                const applyStudent = () => {
                    this.currentView = 'student';
                    this.mobileMenuOpen = false;
                    const changed = (!this.currentStudent || this.currentStudent.id !== std.id || (!this.externalSrc && !this.externalSrcdoc));
                    this.currentStudent = std;

                    if (changed) {
                        this.updateExternalFrame(std);
                    }

                    this.currentStudentTasks = this.individualTasks
                        .filter(t => t.student_id === std.id)
                        .map(t => ({
                            ...t,
                            parsed: parseCloudLink(t.link_tugas, t.thumbnail),
                            formattedDate: formatDate(t.tanggal_upload)
                        }));

                    const idx = this.students.findIndex(s => s.id === std.id);
                    this.prevStudent = idx > 0 ? this.students[idx - 1] : null;
                    this.nextStudent = (idx >= 0 && idx < this.students.length - 1) ? this.students[idx + 1] : null;

                    if (this.currentStudent && this.currentStudent.nama_lengkap) {
                        document.title = this.currentStudent.nama_lengkap + ' - Profil Mahasiswa';
                    }

                    if (updateHistory) {
                        try {
                            const url = new URL(window.location.href);
                            url.searchParams.set('id', studentId);
                            window.history.pushState({}, '', url.toString());
                        } catch (e) {}
                    }
                    window.scrollTo({ top: 0, behavior: 'instant' });
                };

                this.transitionView(direction, applyStudent);
            },

            setStudent(studentId) {
                this.showStudent(studentId, true);
            },

            isExternal(student) {
                if (!student) return false;
                if (student.tipe === 'external' || student.tipe === 'embed_code') return true;
                return !!((student.link && String(student.link).trim() !== '') || (student.embed_code && String(student.embed_code).trim() !== ''));
            },

            isEmbedCode(student) {
                if (!student) return false;
                if (student.tipe === 'embed_code') return true;
                return !!(student.embed_code && String(student.embed_code).trim() !== '' && (!student.link || String(student.link).trim() === ''));
            },

            wrapEmbedCode(code, title) {
                const cleanTitle = (title || 'Profil Mahasiswa').replace(/"/g, '&quot;');
                return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="referrer" content="no-referrer">
<title>${cleanTitle}</title>
<style>
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow-x: hidden;
    background: #0b1120;
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .engspace-embed-container {
    width: 100%;
    min-height: 100vh;
    height: 100%;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
  }
  .engspace-embed-container iframe,
  .engspace-embed-container embed,
  .engspace-embed-container object {
    width: 100% !important;
    height: 100% !important;
    min-height: 100vh;
    border: 0 !important;
    flex: 1 1 auto;
    display: block;
  }
</style>
</head>
<body>
<div class="engspace-embed-container">
  ${code || ''}
</div>
</body>
</html>`;
            },

            needsExternalProxy(url) {
                if (!url) return false;
                try {
                    const u = new URL(url);
                    const h = u.hostname.toLowerCase();
                    return h === 'sites.google.com' || h.endsWith('.sites.google.com');
                } catch (e) {
                    return false;
                }
            },

            getExternalEmbedUrl(student) {
                if (!student || !student.link) return '';
                let raw = String(student.link).trim();
                if (!raw) return '';
                if (raw.startsWith('/data/') || raw.startsWith('data/')) {
                    return getAppBaseUrl() + raw.replace(/^\/+/, '');
                }
                if (!/^https?:\/\//i.test(raw)) {
                    raw = 'https://' + raw;
                }
                const parsed = parseCloudLink(raw);
                if (parsed && parsed.provider === 'youtube' && parsed.fileId) {
                    return 'https://www.youtube.com/embed/' + parsed.fileId;
                }
                if (parsed && parsed.provider === 'drive' && parsed.fileId) {
                    return 'https://drive.google.com/file/d/' + parsed.fileId + '/preview';
                }
                return raw;
            },

            async loadProxiedUrl(rawUrl, studentId) {
                const sid = studentId || (this.currentStudent ? this.currentStudent.id : '');
                if (sid && (!rawUrl || rawUrl === this.getExternalEmbedUrl(this.currentStudent))) {
                    const cacheUrl = getAppBaseUrl() + 'data/external_cache/' + encodeURIComponent(sid) + '.html';
                    try {
                        const res = await fetch(cacheUrl);
                        if (res.ok) {
                            const html = await res.text();
                            if (html && html.trim().length > 100 && this.currentStudent && (!sid || this.currentStudent.id === sid)) {
                                this.externalSrcdoc = html;
                                this.externalSrc = '';
                                return;
                            }
                        }
                    } catch (e) {}
                }

                // Fallback 1: Live Azure Proxy Endpoint (/api/proxy.php)
                if (this.currentStudent && (!sid || this.currentStudent.id === sid)) {
                    this.externalSrcdoc = '';
                    this.externalSrc = AZURE_BASE_URL + '/api/proxy.php?id=' + encodeURIComponent(sid) + '&url=' + encodeURIComponent(rawUrl);
                }
            },

            async updateExternalFrame(student) {
                if (!this.isExternal(student)) {
                    this.externalSrc = '';
                    this.externalSrcdoc = '';
                    return;
                }

                // Khusus Halaman Portofolio Lokal Mahasiswa (Manual / Local HTML seperti Febrian)
                const isLocalPage = (student.tipe === 'manual') || 
                                    (student.link && (student.link.indexOf('/data/') !== -1 || student.link.indexOf('data/') === 0));
                
                if (isLocalPage) {
                    this.externalSrcdoc = '';
                    let localUrl = String(student.link || 'data/febrian-alfarizzi/index.html').trim();
                    localUrl = localUrl.replace(/^\/+/, '');
                    const finalUrl = getAppBaseUrl() + localUrl + (localUrl.indexOf('?') === -1 ? '?' : '&') + 'v=' + Date.now();
                    this.externalSrc = finalUrl;
                    return;
                }

                // Jika tipe sematkan kode HTML (Google Sites embed code)
                if (this.isEmbedCode(student)) {
                    const embedCode = student.embed_code || '';
                    this.externalSrcdoc = this.wrapEmbedCode(embedCode, student.nama_lengkap);
                    this.externalSrc = '';
                    return;
                }

                const embedUrl = this.getExternalEmbedUrl(student);
                const cacheUrl = getAppBaseUrl() + 'data/external_cache/' + encodeURIComponent(student.id) + '.html';

                // Tampilkan loading placeholder yang halus & anti flashbang
                this.externalSrcdoc = getFrameLoadingHtml(student.nama_lengkap);
                this.externalSrc = '';

                try {
                    const res = await fetch(cacheUrl);
                    if (res.ok) {
                        const html = await res.text();
                        if (html && html.trim().length > 100 && this.currentStudent && this.currentStudent.id === student.id) {
                            this.externalSrcdoc = html;
                            this.externalSrc = '';
                            return;
                        }
                    }
                } catch (e) {
                    console.warn('Cache statis lokal tidak tersedia:', e);
                }

                // Fallback: Jika cache lokal belum ada / terkendala, gunakan proxy Azure untuk Google Sites
                if (this.currentStudent && this.currentStudent.id === student.id) {
                    if (this.needsExternalProxy(embedUrl)) {
                        this.externalSrcdoc = '';
                        this.externalSrc = AZURE_BASE_URL + '/api/proxy.php?id=' + encodeURIComponent(student.id) + '&url=' + encodeURIComponent(embedUrl);
                    } else if (embedUrl) {
                        this.externalSrcdoc = '';
                        this.externalSrc = embedUrl;
                    }
                }
            },

            copyNim(nim) {
                if (!nim) return;
                const success = () => {
                    this.copiedNim = true;
                    setTimeout(() => { this.copiedNim = false; }, 2000);
                };
                if (window.copyToClipboard) {
                    window.copyToClipboard(nim).then(success).catch(success);
                } else {
                    success();
                }
            },

            setFilter(filterValue, label) {
                this.isSwitching = true;
                this.filter = filterValue;
                this.filterLabel = label;
                this.dropdownOpen = false;
                this.updateFilteredTasks();
                setTimeout(() => { this.isSwitching = false; }, 300);
            },

            updateFilteredTasks() {
                const isGroupOnly = this.isGroupOnlyMode;
                const allTasks = [];

                // Tugas Kelompok
                this.groupTasks.forEach(t => {
                    allTasks.push({
                        ...t,
                        taskType: 'group',
                        uploaderName: 'Group',
                        parsed: parseCloudLink(t.link_tugas, t.thumbnail),
                        formattedDate: formatDate(t.tanggal_upload)
                    });
                });

                // Tugas Mandiri (Hanya jika bukan mode group_only)
                if (!isGroupOnly) {
                    this.individualTasks.forEach(t => {
                        const std = this.students.find(s => s.id === t.student_id);
                        allTasks.push({
                            ...t,
                            taskType: 'individual',
                            uploaderName: std ? std.nama_lengkap : 'Mahasiswa',
                            parsed: parseCloudLink(t.link_tugas, t.thumbnail),
                            formattedDate: formatDate(t.tanggal_upload)
                        });
                    });
                }

                this.totalTasks = allTasks.length;

                if (isGroupOnly || this.filter === 'group') {
                    this.filteredTasks = allTasks.filter(t => t.taskType === 'group');
                    this.filterLabel = 'Group Tasks (' + this.groupTasks.length + ')';
                } else if (this.filter === 'all') {
                    this.filteredTasks = allTasks;
                    this.filterLabel = 'All Task Files (' + this.totalTasks + ')';
                } else {
                    this.filteredTasks = allTasks.filter(t => t.taskType === 'individual' && t.student_id === this.filter);
                    const activeStd = this.students.find(s => s.id === this.filter);
                    this.filterLabel = (activeStd ? activeStd.nama_lengkap : 'Student') + ' (' + this.filteredTasks.length + ')';
                }
            },

            getStudentTaskCount(studentId) {
                return this.individualTasks.filter(t => t.student_id === studentId).length;
            },

            getStudentName(studentId) {
                const s = this.students.find(st => st.id === studentId);
                return s ? s.nama_lengkap : 'Mahasiswa';
            }
        };
    };

    // ============================================================
    // 2. DETAIL APP (detail.html)
    // ============================================================
    window.detailApp = function() {
        return {
            // Data State
            settings: Object.assign({}, DEFAULT_SETTINGS),
            students: [],
            groupTasks: [],
            individualTasks: [],

            // Current Profile
            currentStudent: null,
            currentStudentTasks: [],
            prevStudent: null,
            nextStudent: null,
            externalSrc: '',
            externalSrcdoc: '',

            // UI State
            mobileMenuOpen: false,
            copiedNim: false,
            darkMode: document.documentElement.classList.contains('dark'),

            toggleMobileMenu(state) {
                this.mobileMenuOpen = (typeof state === 'boolean') ? state : !this.mobileMenuOpen;
                if (this.mobileMenuOpen) {
                    window.__openMobileNav && window.__openMobileNav();
                } else {
                    window.__closeMobileNav && window.__closeMobileNav();
                }
            },

            getLogoUrl(filename) {
                return resolveImageUrl(filename);
            },

            toggleTheme() {
                this.darkMode = !this.darkMode;
                if (this.darkMode) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
                try {
                    localStorage.theme = this.darkMode ? 'dark' : 'light';
                } catch (e) {}
            },

            async init() {
                updateFavicon(this.settings.web_logo);
                this.hydrateFromCache();

                // Jika halaman detail diakses tanpa query parameter id, langsung alihkan ke Dashboard (Beranda)
                const params = new URLSearchParams(window.location.search);
                const targetId = params.get('id');
                if (!targetId) {
                    window.location.replace('index.html');
                    return;
                }

                window.addEventListener('message', (e) => {
                    if (e && e.data) {
                        if (e.data.type === 'engspace-proxy-navigate' && e.data.url) {
                            this.loadProxiedUrl(e.data.url, '');
                        } else if (e.data.type === 'engspace-navigate-group-tasks') {
                            window.location.href = 'group_tasks.html';
                        }
                    }
                });

                this.selectStudent(targetId);
                await this.loadData();
                this.selectStudent(targetId);
            },

            goToDashboard() {
                try {
                    window.location.href = 'index.html';
                } catch (e) {
                    window.location.replace('index.html');
                }
            },

            hydrateFromCache() {
                try {
                    const cSettings = localStorage.getItem('site_settings');
                    if (cSettings) this.settings = Object.assign({}, DEFAULT_SETTINGS, JSON.parse(cSettings));
                    const sanitizedStudents = sanitizeCachedStudents(localStorage.getItem('students_cache'));
                    if (sanitizedStudents) this.students = sanitizedStudents;
                    const cGrp = localStorage.getItem('group_tasks_cache');
                    if (cGrp) this.groupTasks = JSON.parse(cGrp);
                    const cInd = localStorage.getItem('individual_tasks_cache');
                    if (cInd) this.individualTasks = JSON.parse(cInd);
                } catch (e) {}
            },

            async loadData() {
                try {
                    const result = await fetchAllAppData();

                    if (result.settings && typeof result.settings === 'object') {
                        this.settings = Object.assign({}, DEFAULT_SETTINGS, result.settings);
                        try {
                            localStorage.setItem('site_settings', JSON.stringify(this.settings));
                        } catch (e) {}
                    }
                    updateFavicon(this.settings.web_logo);
                    if (Array.isArray(result.students)) {
                        this.students = result.students;
                        try { localStorage.setItem('students_cache', JSON.stringify(result.students)); } catch (e) {}
                    }
                    if (Array.isArray(result.groupTasks)) {
                        this.groupTasks = result.groupTasks;
                        try { localStorage.setItem('group_tasks_cache', JSON.stringify(result.groupTasks)); } catch (e) {}
                    }
                    if (Array.isArray(result.individualTasks)) {
                        this.individualTasks = result.individualTasks;
                        try { localStorage.setItem('individual_tasks_cache', JSON.stringify(result.individualTasks)); } catch (e) {}
                    }
                } catch (err) {
                    console.warn('Gagal memuat data:', err);
                }
            },

            isExternal(student) {
                if (!student) return false;
                if (student.tipe === 'external' || student.tipe === 'embed_code') return true;
                return !!((student.link && String(student.link).trim() !== '') || (student.embed_code && String(student.embed_code).trim() !== ''));
            },

            isEmbedCode(student) {
                if (!student) return false;
                if (student.tipe === 'embed_code') return true;
                return !!(student.embed_code && String(student.embed_code).trim() !== '' && (!student.link || String(student.link).trim() === ''));
            },

            wrapEmbedCode(code, title) {
                const cleanTitle = (title || 'Profil Mahasiswa').replace(/"/g, '&quot;');
                return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="referrer" content="no-referrer">
<title>${cleanTitle}</title>
<style>
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow-x: hidden;
    background: #0b1120;
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .engspace-embed-container {
    width: 100%;
    min-height: 100vh;
    height: 100%;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
  }
  .engspace-embed-container iframe,
  .engspace-embed-container embed,
  .engspace-embed-container object {
    width: 100% !important;
    height: 100% !important;
    min-height: 100vh;
    border: 0 !important;
    flex: 1 1 auto;
    display: block;
  }
</style>
</head>
<body>
<div class="engspace-embed-container">
  ${code || ''}
</div>
</body>
</html>`;
            },

            needsExternalProxy(url) {
                if (!url) return false;
                try {
                    const u = new URL(url);
                    const h = u.hostname.toLowerCase();
                    return h === 'sites.google.com' || h.endsWith('.sites.google.com');
                } catch (e) {
                    return false;
                }
            },

            getExternalEmbedUrl(student) {
                if (!student || !student.link) return '';
                let raw = String(student.link).trim();
                if (!raw) return '';
                if (raw.startsWith('/data/') || raw.startsWith('data/')) {
                    return getAppBaseUrl() + raw.replace(/^\/+/, '');
                }
                if (!/^https?:\/\//i.test(raw)) {
                    raw = 'https://' + raw;
                }
                const parsed = parseCloudLink(raw);
                if (parsed && parsed.provider === 'youtube' && parsed.fileId) {
                    return 'https://www.youtube.com/embed/' + parsed.fileId;
                }
                if (parsed && parsed.provider === 'drive' && parsed.fileId) {
                    return 'https://drive.google.com/file/d/' + parsed.fileId + '/preview';
                }
                return raw;
            },

            transformExternalHtmlClient(html, sourceUrl) {
                if (!html) return '';
                let out = html.replace(/<meta[^>]+http-equiv=["']?(?:Content-Security-Policy|X-Frame-Options)["']?[^>]*>/gi, '');
                out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
                out = out.replace(/<iframe\b([^>]*)>/gi, function(match, attrs) {
                    const dm = attrs.match(/\bdata-src=(["'])([^"']+)\1/i);
                    if (dm) {
                        const dsrc = dm[2];
                        let cleanAttrs = attrs.replace(/\bL6cTce-(?:purZT|pSzOP)\b/g, '').replace(/\bsandbox=(["'])[^"']*\1/gi, '');
                        if (!/(?:^|[^a-zA-Z0-9_\-])src=(["'])[^"']*\1/i.test(cleanAttrs)) {
                            cleanAttrs += ' src="' + dsrc + '"';
                        }
                        return '<iframe' + cleanAttrs + '>';
                    }
                    return match;
                });

                const headInject = '<meta name="referrer" content="no-referrer">' +
                    '<style id="engspace-ext-fix">' +
                    'html, body { margin: 0; padding: 0; overflow-x: hidden; } ' +
                    'iframe.YMEQtf[data-src], iframe.YMEQtf[src], iframe.YMEQtf { display: block !important; visibility: visible !important; opacity: 1 !important; } ' +
                    '.WIdY2d .JmGwdf { display: none !important; } ' +
                    '.dZA9kd, .LqzjUe, [jscontroller="RrXLpc"], .bKy5e, #atIdViewHeader { display: none !important; } ' +
                    '</style>';

                if (/<\/head>/i.test(out)) {
                    out = out.replace(/<\/head>/i, headInject + '</head>');
                } else if (/<head>/i.test(out)) {
                    out = out.replace(/<head>/i, '<head>' + headInject);
                } else {
                    out = headInject + out;
                }

                const bodyScript = '<script>(function(){' +
                    'document.querySelectorAll(".WIdY2d[data-embed-doc-id]").forEach(function(wrap){' +
                    'var docId=wrap.getAttribute("data-embed-doc-id");var ifr=wrap.querySelector("iframe");' +
                    'if(!ifr&&docId){ifr=document.createElement("iframe");ifr.className="YMEQtf";ifr.setAttribute("frameborder","0");ifr.setAttribute("allowfullscreen","");ifr.setAttribute("src","https://drive.google.com/file/d/"+docId+"/preview");wrap.appendChild(ifr);}' +
                    'var ov=wrap.querySelector(".JmGwdf");if(ov&&ifr)ov.style.display="none";});' +
                    'document.addEventListener("click",function(e){' +
                    'var a=e.target&&e.target.closest?e.target.closest("a[href]"):null;if(!a)return;' +
                    'var href=a.getAttribute("href")||"";if(!href||href.charAt(0)==="#")return;' +
                    'var abs=href.indexOf("/view/")===0?("https://sites.google.com"+href):(a.href||href);' +
                    'if(abs.indexOf("sites.google.com/")!==-1&&window.parent&&window.parent!==window){e.preventDefault();window.parent.postMessage({type:"engspace-proxy-navigate",url:abs},"*");}' +
                    '});})();<\/script>';

                if (/<\/body>/i.test(out)) {
                    out = out.replace(/<\/body>/i, bodyScript + '</body>');
                } else {
                    out += bodyScript;
                }
                return out;
            },

            async loadProxiedUrl(rawUrl, studentId) {
                const sid = studentId || (this.currentStudent ? this.currentStudent.id : '');
                if (sid && (!rawUrl || rawUrl === this.getExternalEmbedUrl(this.currentStudent))) {
                    const cacheUrl = getAppBaseUrl() + 'data/external_cache/' + encodeURIComponent(sid) + '.html';
                    try {
                        const res = await fetch(cacheUrl);
                        if (res.ok) {
                            const html = await res.text();
                            if (html && html.trim().length > 100 && this.currentStudent && (!sid || this.currentStudent.id === sid)) {
                                this.externalSrcdoc = html;
                                this.externalSrc = '';
                                return;
                            }
                        }
                    } catch (e) {}
                }

                // Fallback 1: Live Azure Proxy Endpoint (/api/proxy.php)
                if (this.currentStudent && (!sid || this.currentStudent.id === sid)) {
                    this.externalSrcdoc = '';
                    this.externalSrc = AZURE_BASE_URL + '/api/proxy.php?id=' + encodeURIComponent(sid) + '&url=' + encodeURIComponent(rawUrl);
                }
            },

            async updateExternalFrame(student) {
                if (!this.isExternal(student)) {
                    this.externalSrc = '';
                    this.externalSrcdoc = '';
                    return;
                }

                // Khusus Halaman Portofolio Lokal Mahasiswa (Manual / Local HTML seperti Febrian)
                const isLocalPage = (student.tipe === 'manual') || 
                                    (student.link && (student.link.indexOf('/data/') !== -1 || student.link.indexOf('data/') === 0));
                
                if (isLocalPage) {
                    this.externalSrcdoc = '';
                    let localUrl = String(student.link || 'data/febrian-alfarizzi/index.html').trim();
                    localUrl = localUrl.replace(/^\/+/, '');
                    const finalUrl = getAppBaseUrl() + localUrl + (localUrl.indexOf('?') === -1 ? '?' : '&') + 'v=' + Date.now();
                    this.externalSrc = finalUrl;
                    return;
                }

                // Jika tipe sematkan kode HTML (Google Sites embed code)
                if (this.isEmbedCode(student)) {
                    const embedCode = student.embed_code || '';
                    this.externalSrcdoc = this.wrapEmbedCode(embedCode, student.nama_lengkap);
                    this.externalSrc = '';
                    return;
                }

                const embedUrl = this.getExternalEmbedUrl(student);
                const cacheUrl = getAppBaseUrl() + 'data/external_cache/' + encodeURIComponent(student.id) + '.html';

                // Tampilkan loading placeholder yang halus & anti flashbang
                this.externalSrcdoc = getFrameLoadingHtml(student.nama_lengkap);
                this.externalSrc = '';

                try {
                    const res = await fetch(cacheUrl);
                    if (res.ok) {
                        const html = await res.text();
                        if (html && html.trim().length > 100 && this.currentStudent && this.currentStudent.id === student.id) {
                            this.externalSrcdoc = html;
                            this.externalSrc = '';
                            return;
                        }
                    }
                } catch (e) {
                    console.warn('Cache statis lokal tidak tersedia:', e);
                }

                // Fallback: Jika cache lokal belum ada / terkendala, gunakan proxy Azure untuk Google Sites
                if (this.currentStudent && this.currentStudent.id === student.id) {
                    if (this.needsExternalProxy(embedUrl)) {
                        this.externalSrcdoc = '';
                        this.externalSrc = AZURE_BASE_URL + '/api/proxy.php?id=' + encodeURIComponent(student.id) + '&url=' + encodeURIComponent(embedUrl);
                    } else if (embedUrl) {
                        this.externalSrcdoc = '';
                        this.externalSrc = embedUrl;
                    }
                }
            },

            selectStudent(studentId) {
                if (!studentId && !this.currentStudent) {
                    window.location.replace('index.html');
                    return;
                }
                if (!this.students || this.students.length === 0) return;

                let std = null;
                if (studentId) {
                    std = this.students.find(s => s.id === studentId);
                }
                if (!std) {
                    window.location.replace('index.html');
                    return;
                }

                const changed = (!this.currentStudent || this.currentStudent.id !== std.id || (!this.externalSrc && !this.externalSrcdoc));
                this.currentStudent = std;

                if (changed) {
                    this.updateExternalFrame(std);
                }

                // Tugas individu untuk mahasiswa ini
                this.currentStudentTasks = this.individualTasks
                    .filter(t => t.student_id === std.id)
                    .map(t => ({
                        ...t,
                        parsed: parseCloudLink(t.link_tugas, t.thumbnail),
                        formattedDate: formatDate(t.tanggal_upload)
                    }));

                // Navigasi prev / next
                const idx = this.students.findIndex(s => s.id === std.id);
                this.prevStudent = idx > 0 ? this.students[idx - 1] : null;
                this.nextStudent = (idx >= 0 && idx < this.students.length - 1) ? this.students[idx + 1] : null;

                if (this.currentStudent && this.currentStudent.nama_lengkap) {
                    document.title = this.currentStudent.nama_lengkap + ' - Profil Mahasiswa';
                }
            },

            async setStudent(studentId, forcedDirection = null) {
                if (this.currentStudent && this.currentStudent.id === studentId) return;
                let std = this.students.find(s => s.id === studentId);
                if (!std) return;

                const curIdx = this.students.findIndex(s => s.id === (this.currentStudent ? this.currentStudent.id : ''));
                const targetIdx = this.students.findIndex(s => s.id === std.id);
                const direction = forcedDirection || ((targetIdx >= curIdx) ? 'next' : 'prev');

                const mainEl = document.getElementById('main-content');
                const bar = document.getElementById('nav-progress-bar');
                const isDesktop = (window.innerWidth >= 768);

                if (bar) {
                    bar.style.opacity = '1';
                    bar.style.width = '65%';
                }

                if (mainEl && isDesktop) {
                    const outClass = (direction === 'next') ? 'anim-slide-out-left' : 'anim-slide-out-right';
                    const inClass = (direction === 'next') ? 'anim-slide-in-right' : 'anim-slide-in-left';

                    mainEl.classList.remove('anim-slide-out-left', 'anim-slide-out-right', 'anim-slide-in-left', 'anim-slide-in-right', 'page-enter-active');
                    mainEl.classList.add(outClass);

                    await new Promise(r => setTimeout(r, 200));

                    this.selectStudent(studentId);
                    const url = 'detail.html?id=' + encodeURIComponent(studentId);
                    window.history.pushState({}, '', url);
                    window.scrollTo({ top: 0, behavior: 'instant' });

                    mainEl.classList.remove(outClass);
                    mainEl.classList.add(inClass);

                    if (bar) {
                        bar.style.width = '100%';
                        setTimeout(() => {
                            bar.style.opacity = '0';
                            setTimeout(() => { bar.style.width = '0%'; }, 250);
                        }, 180);
                    }

                    setTimeout(() => {
                        mainEl.classList.remove(inClass);
                    }, 280);
                } else {
                    this.selectStudent(studentId);
                    const url = 'detail.html?id=' + encodeURIComponent(studentId);
                    window.history.pushState({}, '', url);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            },

            copyNim(nim) {
                if (!nim) return;
                const success = () => {
                    this.copiedNim = true;
                    setTimeout(() => { this.copiedNim = false; }, 2000);
                };
                if (window.copyToClipboard) {
                    window.copyToClipboard(nim).then(success).catch(success);
                } else {
                    success();
                }
            }
        };
    };

    // ============================================================
    // 3. GROUP TASKS APP (group_tasks.html)
    // ============================================================
    window.groupTasksApp = function() {
        return {

            // Data State
            settings: Object.assign({}, DEFAULT_SETTINGS),
            students: [],
            groupTasks: [],
            filteredTasks: [],

            // Search & Filter State
            searchQuery: '',
            selectedPlatform: 'all',
            viewMode: 'grid',
            platformStats: {
                total: 0,
                drive: 0,
                youtube: 0,
                members: 0
            },

            mobileMenuOpen: false,
            darkMode: document.documentElement.classList.contains('dark'),

            toggleMobileMenu(state) {
                this.mobileMenuOpen = (typeof state === 'boolean') ? state : !this.mobileMenuOpen;
                if (this.mobileMenuOpen) {
                    window.__openMobileNav && window.__openMobileNav();
                } else {
                    window.__closeMobileNav && window.__closeMobileNav();
                }
            },

            getLogoUrl(filename) {
                return resolveImageUrl(filename);
            },

            toggleTheme() {
                this.darkMode = !this.darkMode;
                if (this.darkMode) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
                try {
                    localStorage.theme = this.darkMode ? 'dark' : 'light';
                } catch (e) {}
            },

            async init() {
                updateFavicon(this.settings.web_logo);
                this.hydrateFromCache();
                await this.loadData();
                this.calculateStats();
                this.updateFilteredTasks();

                if (this.settings.web_title) {
                    document.title = 'Group Tasks Archive - ' + this.settings.web_title;
                }

                this.$watch('searchQuery', () => this.updateFilteredTasks());
                this.$watch('selectedPlatform', () => this.updateFilteredTasks());
            },

            hydrateFromCache() {
                try {
                    const cSettings = localStorage.getItem('site_settings');
                    if (cSettings) this.settings = Object.assign({}, DEFAULT_SETTINGS, JSON.parse(cSettings));
                    const sanitizedStudents = sanitizeCachedStudents(localStorage.getItem('students_cache'));
                    if (sanitizedStudents) this.students = sanitizedStudents;
                    const cGrp = localStorage.getItem('group_tasks_cache');
                    if (cGrp) {
                        const raw = JSON.parse(cGrp);
                        this.groupTasks = raw.map(t => ({
                            ...t,
                            parsed: parseCloudLink(t.link_tugas, t.thumbnail),
                            formattedDate: formatDate(t.tanggal_upload)
                        }));
                    }
                    this.calculateStats();
                    this.updateFilteredTasks();
                } catch (e) {}
            },

            async loadData() {
                try {
                    const result = await fetchAllAppData();

                    if (result.settings && typeof result.settings === 'object') {
                        this.settings = Object.assign({}, DEFAULT_SETTINGS, result.settings);
                        try {
                            localStorage.setItem('site_settings', JSON.stringify(this.settings));
                        } catch (e) {}
                    }
                    updateFavicon(this.settings.web_logo);
                    if (Array.isArray(result.students)) {
                        this.students = result.students;
                        try { localStorage.setItem('students_cache', JSON.stringify(result.students)); } catch (e) {}
                    }
                    if (Array.isArray(result.groupTasks)) {
                        try { localStorage.setItem('group_tasks_cache', JSON.stringify(result.groupTasks)); } catch (e) {}
                        this.groupTasks = result.groupTasks.map(t => ({
                            ...t,
                            parsed: parseCloudLink(t.link_tugas, t.thumbnail),
                            formattedDate: formatDate(t.tanggal_upload)
                        }));
                    }
                } catch (err) {
                    console.warn('Gagal memuat data:', err);
                }
                this.calculateStats();
                this.updateFilteredTasks();
            },

            calculateStats() {
                this.platformStats.total = this.groupTasks.length;
                this.platformStats.drive = this.groupTasks.filter(t => t.parsed && t.parsed.icon === 'drive').length;
                this.platformStats.youtube = this.groupTasks.filter(t => t.parsed && t.parsed.icon === 'youtube').length;
                this.platformStats.members = this.students.length;
            },

            updateFilteredTasks() {
                let tasks = [...this.groupTasks];

                if (this.selectedPlatform !== 'all') {
                    tasks = tasks.filter(t => t.parsed && t.parsed.icon === this.selectedPlatform);
                }

                if (this.searchQuery && this.searchQuery.trim()) {
                    const q = this.searchQuery.toLowerCase().trim();
                    tasks = tasks.filter(t =>
                        (t.judul_tugas && t.judul_tugas.toLowerCase().includes(q)) ||
                        (t.parsed && t.parsed.label && t.parsed.label.toLowerCase().includes(q))
                    );
                }

                this.filteredTasks = tasks;
            },

            clearSearch() {
                this.searchQuery = '';
                this.selectedPlatform = 'all';
                this.updateFilteredTasks();
            }
        };
    };

    // ============================================================
    // ALPINE.DATA REGISTRATION (Backup Support)
    // ============================================================
    document.addEventListener('alpine:init', function() {
        if (window.Alpine) {
            Alpine.data('landingApp', window.landingApp);
            Alpine.data('detailApp', window.detailApp);
            Alpine.data('groupTasksApp', window.groupTasksApp);
        }
    });

})();
