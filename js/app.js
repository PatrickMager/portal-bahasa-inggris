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
    function parseCloudLink(url) {
        if (!url) return null;
        const str = url.trim();

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
                fileId: vid,
                thumbnailUrl: 'https://img.youtube.com/vi/' + vid + '/mqdefault.jpg'
            };
        }

        // 2. Google Drive File
        const driveMatch = str.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_\-]+)/i);
        if (driveMatch) {
            const fid = driveMatch[1];
            return {
                icon: 'drive',
                provider: 'drive',
                label: 'Google Drive',
                badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900',
                originalUrl: str,
                fileId: fid,
                thumbnailUrl: 'https://drive.google.com/thumbnail?id=' + fid + '&sz=w320'
            };
        }

        // 3. Google Docs / Presentation / Spreadsheets
        const docsMatch = str.match(/docs\.google\.com\/(presentation|document|spreadsheets)\/d\/([a-zA-Z0-9_\-]+)/i);
        if (docsMatch) {
            const docType = docsMatch[1].toLowerCase();
            const fid = docsMatch[2];
            let label = 'Google Docs';
            if (docType === 'presentation') label = 'Google Slides';
            else if (docType === 'spreadsheets') label = 'Google Sheets';
            return {
                icon: 'drive',
                provider: docType,
                label: label,
                badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900',
                originalUrl: str,
                fileId: fid,
                thumbnailUrl: 'https://drive.google.com/thumbnail?id=' + fid + '&sz=w320'
            };
        }

        // 4. Fallback Google Drive
        const lower = str.toLowerCase();
        if (lower.includes('drive.google.com') || lower.includes('docs.google.com')) {
            return {
                icon: 'drive',
                provider: 'drive',
                label: 'Google Drive',
                badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900',
                originalUrl: str,
                fileId: null,
                thumbnailUrl: null
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
            const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
            return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
        } catch (e) {
            return dateStr;
        }
    }

    // Endpoint Live API Azure untuk Sinkronisasi Real-Time Instan (0 Detik)
    const AZURE_BASE_URL = 'https://portal-bahasa-inggris-admin-d4cbgafthwhgexb0.indonesiacentral-01.azurewebsites.net';
    const AZURE_API_ENDPOINT = AZURE_BASE_URL + '/api/data.php';
    let currentUploadsUrl = 'uploads/images/';

    // Helper: Logo / Image URL (Mendukung Live URL dari Azure & Fallback Lokal)
    function resolveImageUrl(filename) {
        if (!filename) return '';
        if (filename.startsWith('http://') || filename.startsWith('https://') || filename.startsWith('data:')) {
            return filename;
        }
        return currentUploadsUrl + filename;
    }

    /**
     * Universal Data Fetcher:
     * 1. Prioritas Utama: Mengambil data real-time instan dari Live API Azure (0 Detik delay).
     * 2. Fallback: Mengambil data static JSON dari GitHub Pages jika server Azure offline/istirahat.
     */
    async function fetchAllAppData() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);
            const liveRes = await fetch(AZURE_API_ENDPOINT + '?_=' + Date.now(), {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (liveRes.ok) {
                const json = await liveRes.json();
                if (json && json.status === 'success' && json.data) {
                    let upUrl = json.uploads_url || (AZURE_BASE_URL + '/uploads/images/');
                    if (upUrl.startsWith('http://')) {
                        upUrl = upUrl.replace(/^http:\/\//, 'https://');
                    }
                    currentUploadsUrl = upUrl;
                    return {
                        source: 'live_azure',
                        settings: json.data.settings || null,
                        students: Array.isArray(json.data.students) ? json.data.students : [],
                        groupTasks: Array.isArray(json.data.group_tasks) ? json.data.group_tasks : [],
                        individualTasks: Array.isArray(json.data.individual_tasks) ? json.data.individual_tasks : []
                    };
                }
            }
        } catch (e) {
            // Live API Azure offline/sleep, gunakan fallback lokal
        }

        // Fallback ke Static JSON Lokal (GitHub Pages)
        currentUploadsUrl = 'uploads/images/';
        const ts = Date.now();
        const [settRes, studRes, grpRes, indRes] = await Promise.all([
            fetch('data/site_settings.json?_=' + ts).then(r => r.ok ? r.json() : null).catch(() => null),
            fetch('data/students.json?_=' + ts).then(r => r.ok ? r.json() : null).catch(() => null),
            fetch('data/group_tasks.json?_=' + ts).then(r => r.ok ? r.json() : null).catch(() => null),
            fetch('data/individual_tasks.json?_=' + ts).then(r => r.ok ? r.json() : null).catch(() => null)
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
        web_logo: 'web_logo_1790876671.png',
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
    // 1. LANDING APP (index.html)
    // ============================================================
    window.landingApp = function() {
        return {
            // Data State
            settings: Object.assign({}, DEFAULT_SETTINGS),
            students: [],
            groupTasks: [],
            individualTasks: [],
            totalTasks: 0,

            // Filter Dropdown State
            filter: 'all',
            filterLabel: 'Semua Berkas Tugas',
            dropdownOpen: false,
            isSwitching: false,
            filteredTasks: [],

            // UI State
            mobileMenuOpen: false,
            darkMode: document.documentElement.classList.contains('dark'),

            // Image Resolver
            getLogoUrl(filename) {
                return resolveImageUrl(filename);
            },

            // Theme Toggle
            toggleTheme() {
                this.darkMode = !this.darkMode;
                if (this.darkMode) {
                    document.documentElement.classList.add('dark');
                    localStorage.theme = 'dark';
                } else {
                    document.documentElement.classList.remove('dark');
                    localStorage.theme = 'light';
                }
            },

            // Init
            async init() {
                updateFavicon(this.settings.web_logo);
                this.hydrateFromCache();
                await this.loadData();
            },

            hydrateFromCache() {
                try {
                    const cSettings = localStorage.getItem('site_settings');
                    if (cSettings) this.settings = Object.assign({}, DEFAULT_SETTINGS, JSON.parse(cSettings));
                    const cStudents = localStorage.getItem('students_cache');
                    if (cStudents) this.students = JSON.parse(cStudents);
                    const cGrp = localStorage.getItem('group_tasks_cache');
                    if (cGrp) this.groupTasks = JSON.parse(cGrp);
                    const cInd = localStorage.getItem('individual_tasks_cache');
                    if (cInd) this.individualTasks = JSON.parse(cInd);

                    this.totalTasks = this.groupTasks.length + this.individualTasks.length;
                    this.filterLabel = 'Semua Berkas Tugas (' + this.totalTasks + ')';
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
                this.filterLabel = 'Semua Berkas Tugas (' + this.totalTasks + ')';
                this.updateFilteredTasks();

                if (this.settings.web_title) {
                    document.title = this.settings.web_title + ' - Dashboard Tugas & Mahasiswa';
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
                const allTasks = [];

                // Tugas Kelompok
                this.groupTasks.forEach(t => {
                    allTasks.push({
                        ...t,
                        taskType: 'group',
                        uploaderName: 'Kelompok',
                        parsed: parseCloudLink(t.link_tugas),
                        formattedDate: formatDate(t.tanggal_upload)
                    });
                });

                // Tugas Mandiri
                this.individualTasks.forEach(t => {
                    const std = this.students.find(s => s.id === t.student_id);
                    allTasks.push({
                        ...t,
                        taskType: 'individual',
                        uploaderName: std ? std.nama_lengkap : 'Mahasiswa',
                        parsed: parseCloudLink(t.link_tugas),
                        formattedDate: formatDate(t.tanggal_upload)
                    });
                });

                if (this.filter === 'all') {
                    this.filteredTasks = allTasks;
                } else if (this.filter === 'group') {
                    this.filteredTasks = allTasks.filter(t => t.taskType === 'group');
                } else {
                    this.filteredTasks = allTasks.filter(t => t.taskType === 'individual' && t.student_id === this.filter);
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

            // UI State
            mobileMenuOpen: false,
            copiedNim: false,
            darkMode: document.documentElement.classList.contains('dark'),

            getLogoUrl(filename) {
                return resolveImageUrl(filename);
            },

            toggleTheme() {
                this.darkMode = !this.darkMode;
                if (this.darkMode) {
                    document.documentElement.classList.add('dark');
                    localStorage.theme = 'dark';
                } else {
                    document.documentElement.classList.remove('dark');
                    localStorage.theme = 'light';
                }
            },

            async init() {
                updateFavicon(this.settings.web_logo);
                this.hydrateFromCache();
                const params = new URLSearchParams(window.location.search);
                const targetId = params.get('id');
                if (targetId) this.selectStudent(targetId);
                await this.loadData();
                this.selectStudent(targetId);
            },

            hydrateFromCache() {
                try {
                    const cSettings = localStorage.getItem('site_settings');
                    if (cSettings) this.settings = Object.assign({}, DEFAULT_SETTINGS, JSON.parse(cSettings));
                    const cStudents = localStorage.getItem('students_cache');
                    if (cStudents) this.students = JSON.parse(cStudents);
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

            selectStudent(studentId) {
                if (!this.students || this.students.length === 0) return;

                let std = null;
                if (studentId) {
                    std = this.students.find(s => s.id === studentId);
                }
                if (!std) {
                    std = this.students[0];
                }

                this.currentStudent = std;

                // Tugas individu untuk mahasiswa ini
                this.currentStudentTasks = this.individualTasks
                    .filter(t => t.student_id === std.id)
                    .map(t => ({
                        ...t,
                        parsed: parseCloudLink(t.link_tugas),
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

            setStudent(studentId) {
                this.selectStudent(studentId);
                const url = 'detail.html?id=' + encodeURIComponent(studentId);
                window.history.pushState({}, '', url);
                window.scrollTo({ top: 0, behavior: 'smooth' });
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
            platformStats: {
                total: 0,
                drive: 0,
                youtube: 0,
                members: 0
            },

            // UI State
            mobileMenuOpen: false,
            darkMode: document.documentElement.classList.contains('dark'),

            getLogoUrl(filename) {
                return resolveImageUrl(filename);
            },

            toggleTheme() {
                this.darkMode = !this.darkMode;
                if (this.darkMode) {
                    document.documentElement.classList.add('dark');
                    localStorage.theme = 'dark';
                } else {
                    document.documentElement.classList.remove('dark');
                    localStorage.theme = 'light';
                }
            },

            async init() {
                updateFavicon(this.settings.web_logo);
                this.hydrateFromCache();
                await this.loadData();
                this.calculateStats();
                this.updateFilteredTasks();

                if (this.settings.web_title) {
                    document.title = 'Arsip Tugas Kelompok - ' + this.settings.web_title;
                }

                this.$watch('searchQuery', () => this.updateFilteredTasks());
                this.$watch('selectedPlatform', () => this.updateFilteredTasks());
            },

            hydrateFromCache() {
                try {
                    const cSettings = localStorage.getItem('site_settings');
                    if (cSettings) this.settings = Object.assign({}, DEFAULT_SETTINGS, JSON.parse(cSettings));
                    const cStudents = localStorage.getItem('students_cache');
                    if (cStudents) this.students = JSON.parse(cStudents);
                    const cGrp = localStorage.getItem('group_tasks_cache');
                    if (cGrp) {
                        const raw = JSON.parse(cGrp);
                        this.groupTasks = raw.map(t => ({
                            ...t,
                            parsed: parseCloudLink(t.link_tugas),
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
                            parsed: parseCloudLink(t.link_tugas),
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
