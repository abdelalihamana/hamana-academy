import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, updateDoc, deleteDoc, increment, writeBatch, query, limit, limitToLast, orderBy, getDocs, where, startAfter, startAt, endBefore, documentId, getCountFromServer } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        const firebaseConfig = {
            apiKey: "AIzaSyDuuYHwmSW0UV1TO3gDGyETrvOimE7iGLs",
            authDomain: "physique-58073.firebaseapp.com",
            projectId: "physique-58073",
            storageBucket: "physique-58073.firebasestorage.app",
            messagingSenderId: "744073429659",
            appId: "1:744073429659:web:0859514e70482543d13c3e",
            measurementId: "G-D6BHHHVBX6"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        
        const usersCol = collection(db, 'physics_db', 'public', 'profiles');
        const programCol = collection(db, 'physics_db', 'public', 'curriculum');
        const chatsPath = 'physics_db/public/chats';

        const XP_PER_ITEM = 10;

        let isAuthReady = false;
        window.GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbybNb0NY-bSd-lbwuC-0yLeD55xcbws7_IS5O2Vc9qZge0aSDnOErkJm2eatZHY7wXJ/exec";
        window.currentUserRecord = null;
        window.originalAdminRecord = null; 
        
        let unsubscribeProgram = null;
        let unsubscribeUsers = null;
        let unsubscribeStudentData = null;
        let unsubscribeChat = null;
        let unsubscribeChatMeta = null;
        
        window.activeChatUser = null; 
        window.currentSections = [];
        window.currentUpdates = []; 
        window.currentLiveUrl = "";
        window.currentEditParams = null; 
        
        // حالات الإدارة والتلميذ
        window.adminContentStep = 'parts'; 
        window.adminActivePart = null;
        window.adminActiveYear = {}; 
        window.adminActiveBranch = {}; 

        window.studentViewMode = 'grid'; 
        window.studentActiveBranchTab = null;
        
        window.adminMainFilter = 'all'; 
        window.adminSubFilter = 'all'; 
        
        window.adminUsersList = [];
        window.adminChatsData = {};
        window.allStudentsProgress = []; 

        window.tempAdminCode = null;
        window.tempAdminData = null;
        window.tempAdminUsername = null;
        
        // متغيرات الترحيل والتصفح الخاص بالأدمن (Pagination)
        window.adminCurrentPage = 1;
        window.adminPageCursors = [];
        window.adminLastVisible = null;
        window.adminFirstVisible = null;

        // إعدادات مؤقت بومودورو
        let pomodoroTime = 45 * 60; 
        let pomodoroInterval = null;
        let isPomodoroRunning = false;
        let isStudySession = true; 

        window.initPomodoro = () => {
            if (!window.currentUserRecord) return;
            const user = window.currentUserRecord.username;
            const savedState = localStorage.getItem(`pomodoro_${user}`);
            
            if (pomodoroInterval) clearInterval(pomodoroInterval);
            
            if (savedState) {
                const state = JSON.parse(savedState);
                isStudySession = state.isStudySession;
                isPomodoroRunning = state.isRunning;
                
                if (isPomodoroRunning && state.endTime) {
                    const now = Date.now();
                    const diff = Math.floor((state.endTime - now) / 1000);
                    if (diff > 0) {
                        pomodoroTime = diff;
                        window.startPomodoroTick();
                    } else {
                        window.handlePomodoroEnd(true);
                    }
                } else {
                    pomodoroTime = state.remainingTime;
                }
            } else {
                pomodoroTime = 45 * 60;
                isStudySession = true;
                isPomodoroRunning = false;
            }
            window.updatePomodoroUI();
        };

        window.savePomodoroState = () => {
            if (!window.currentUserRecord) return;
            const user = window.currentUserRecord.username;
            const state = {
                isRunning: isPomodoroRunning,
                isStudySession: isStudySession,
                remainingTime: pomodoroTime,
                endTime: isPomodoroRunning ? Date.now() + pomodoroTime * 1000 : null
            };
            localStorage.setItem(`pomodoro_${user}`, JSON.stringify(state));
        };

                window.updatePomodoroUI = () => {
            const minutes = Math.floor(pomodoroTime / 60);
            const seconds = pomodoroTime % 60;
            const displayStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            const timerEl = document.getElementById('pomodoro-timer-display');
            if (timerEl) timerEl.innerText = displayStr;

            const titleEl = document.getElementById('pomodoro-status-title');
            if (titleEl) titleEl.innerText = isStudySession ? "وقت التركيز" : "وقت الراحة";

            const btn = document.getElementById('pomodoro-toggle-btn');
            if (btn) {
                if (isPomodoroRunning) {
                    btn.innerHTML = '<i class="ph-fill ph-pause"></i>';
                    btn.className = "w-12 h-12 bg-amber-400 text-slate-900 hover:bg-amber-500 rounded-xl text-xl transition shadow-sm flex items-center justify-center shrink-0";
                } else {
                    btn.innerHTML = '<i class="ph-fill ph-play"></i>';
                    btn.className = "w-12 h-12 bg-white text-blue-700 hover:bg-blue-50 rounded-xl text-xl transition shadow-sm flex items-center justify-center shrink-0";
                }
            }
        };


        window.startPomodoroTick = () => {
            if (pomodoroInterval) clearInterval(pomodoroInterval);
            pomodoroInterval = setInterval(() => {
                if (pomodoroTime > 0) {
                    pomodoroTime--;
                    const minutes = Math.floor(pomodoroTime / 60);
                    const seconds = pomodoroTime % 60;
                    const timerEl = document.getElementById('pomodoro-timer-display');
                    if (timerEl) timerEl.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    
                    if (pomodoroTime % 5 === 0) window.savePomodoroState();
                } else {
                    window.handlePomodoroEnd(false);
                }
            }, 1000);
        };

        window.handlePomodoroEnd = (offline) => {
            clearInterval(pomodoroInterval);
            isPomodoroRunning = false;
            
            if (isStudySession) {
                if(!offline) { showToast("انتهت جلسة الدراسة! وقت الراحة الآن ☕ (15 دقيقة)", "success"); window.fireConfetti(); }
                pomodoroTime = 15 * 60;
                isStudySession = false;
            } else {
                if(!offline) { showToast("انتهت استراحة الراحة! فلنرجع للتركيز والدراسة 🚀", "success"); }
                pomodoroTime = 45 * 60;
                isStudySession = true;
            }
            window.savePomodoroState();
            window.updatePomodoroUI();
        };

        window.togglePomodoro = () => {
            if (isPomodoroRunning) {
                clearInterval(pomodoroInterval);
                isPomodoroRunning = false;
                window.savePomodoroState();
                window.updatePomodoroUI();
            } else {
                isPomodoroRunning = true;
                window.savePomodoroState();
                window.updatePomodoroUI();
                window.startPomodoroTick();
            }
        };

        window.resetPomodoro = () => {
            clearInterval(pomodoroInterval);
            isPomodoroRunning = false;
            isStudySession = true;
            pomodoroTime = 45 * 60;
            window.savePomodoroState();
            window.updatePomodoroUI();
        };

        // دوال ميزة التضمين والتحميل المباشر والبث المباشر
         window.convertUrlToEmbed = (url) => {
            if (!url) return '';
            
            // 🚀 التحديث السحري: التعرف على البث المباشر (live)، والفيديوهات العادية، والقصيرة
            let ytRegex = /(?:youtube\.com\/(?:watch\?v=|live\/|shorts\/)|youtu\.be\/)([^&?/]+)/i;
            let matchYt = url.match(ytRegex);
            if (matchYt && matchYt[1]) {
                // أضفنا autoplay=1 لكي يشتغل البث المباشر تلقائياً فور فتح النافذة
                return `https://www.youtube.com/embed/${matchYt[1]}?rel=0&modestbranding=1&autoplay=1`;
            }
            
            // التعرف على روابط جوجل درايف
            let driveRegex = /(?:drive\.google\.com\/file\/d\/|drive\.google\.com\/open\?id=)([^/&?]+)/i;
            let matchDrive = url.match(driveRegex);
            if (matchDrive && matchDrive[1]) {
                return `https://drive.google.com/file/d/${matchDrive[1]}/preview`;
            }
            
            return url; 
        };

        window.getDownloadUrl = (url) => {
            if (!url) return null;
            let driveRegex = /(?:drive\.google\.com\/file\/d\/|drive\.google\.com\/open\?id=)([^/&?]+)/i;
            let matchDrive = url.match(driveRegex);
            if (matchDrive && matchDrive[1]) {
                return `https://drive.google.com/uc?export=download&id=${matchDrive[1]}`;
            }
            return null; 
        };

        window.openEmbedModal = (url) => {
            const embedUrl = window.convertUrlToEmbed(url);
            const downloadUrl = window.getDownloadUrl(url);
            
            const modal = document.getElementById('embed-modal');
            const iframe = document.getElementById('embed-iframe');
            const extBtn = document.getElementById('embed-external-btn');
            const dlBtn = document.getElementById('embed-download-btn');
            const statusText = document.getElementById('embed-status-text');

            statusText.innerText = 'جاري التحميل...';
            extBtn.href = url; 
            iframe.src = embedUrl;

            if (downloadUrl) {
                dlBtn.href = downloadUrl;
                dlBtn.classList.remove('hidden');
                dlBtn.classList.add('flex');
            } else {
                dlBtn.classList.add('hidden');
                dlBtn.classList.remove('flex');
            }

            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.body.style.overflow = 'hidden'; 
        };

        window.closeEmbedModal = () => {
            const modal = document.getElementById('embed-modal');
            const iframe = document.getElementById('embed-iframe');

            modal.classList.add('hidden');
            modal.classList.remove('flex');
            iframe.src = ''; 
            document.body.style.overflow = ''; 
        };

        window.updateLiveStreamUI = (url) => {
            const studentBanner = document.getElementById('student-live-banner');
            const adminStatus = document.getElementById('admin-live-status-text');
            const adminInput = document.getElementById('admin-live-url');

            if (url && url.trim() !== "") {
                if (studentBanner) {
                    studentBanner.classList.remove('hidden');
                    studentBanner.classList.add('flex');
                }
                if (adminStatus) {
                    adminStatus.innerHTML = '<span class="text-red-500 font-black flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-500 animate-ping"></span> البث شغال حالياً</span>';
                }
                if (adminInput) adminInput.value = url;
            } else {
                if (studentBanner) {
                    studentBanner.classList.add('hidden');
                    studentBanner.classList.remove('flex');
                }
                if (adminStatus) {
                    adminStatus.innerText = 'لا يوجد بث حالياً';
                }
                if (adminInput) adminInput.value = "";
            }
        };

        // تم التعديل: تحديث البث المباشر في مستند meta
        window.startLiveStream = async () => {
            const url = document.getElementById('admin-live-url').value.trim();
            if (!url) return showToast("يرجى إدخال رابط البث أولاً", "error");
            if (!url.startsWith('http')) return showToast("الرابط غير صحيح، تأكد أنه يبدأ بـ http", "error");
            
            try {
                await updateDoc(doc(programCol, 'meta'), { liveStreamUrl: url });
                showToast("تم إطلاق البث بنجاح! سيظهر الزر للتلاميذ الآن 🔴", "success");
            } catch (e) {
                console.error(e);
                showToast("حدث خطأ أثناء إطلاق البث", "error");
            }
        };

        window.stopLiveStream = async () => {
            if (!window.currentLiveUrl) return;
            if(await confirmAction("هل أنت متأكد من إنهاء البث وإخفاء الزر عن التلاميذ؟")) {
                try {
                    await updateDoc(doc(programCol, 'meta'), { liveStreamUrl: "" });
                    showToast("تم إنهاء البث وإخفاء الزر بنجاح", "success");
                } catch (e) {
                    console.error(e);
                    showToast("حدث خطأ", "error");
                }
            }
        };

        window.openLiveStream = () => {
            if (window.currentLiveUrl) {
                let isExternalOnly = window.currentLiveUrl.includes('zoom.us') || window.currentLiveUrl.includes('meet.google.com') || window.currentLiveUrl.includes('teams.microsoft');
                if (isExternalOnly) {
                    window.open(window.currentLiveUrl, '_blank');
                } else {
                    window.openEmbedModal(window.currentLiveUrl);
                }
            }
        };

        const levelNames = {
            "m_y1": "الأولى متوسط", "m_y2": "الثانية متوسط", "m_y3": "الثالثة متوسط", "m_y4": "الرابعة متوسط",
            "h_y1": "أولى ثانوي", "h_y2": "الثانية ثانوي", "h_y3": "الثالثة ثانوي"
        };

        const gridColors = [
            'from-red-500 to-rose-600 shadow-red-500/40 text-white',
            'from-orange-500 to-amber-600 shadow-orange-500/40 text-white',
            'from-yellow-400 to-yellow-500 shadow-yellow-500/40 text-slate-800', 
            'from-emerald-400 to-teal-500 shadow-emerald-500/40 text-white',
            'from-blue-500 to-indigo-600 shadow-blue-500/40 text-white',
            'from-indigo-500 to-violet-600 shadow-indigo-500/40 text-white',
            'from-purple-500 to-fuchsia-600 shadow-purple-500/40 text-white'
        ];

        const getStudentBadge = (xp) => {
            if (xp >= 500) return { name: 'عالم (أينشتاين)', icon: '<i class="ph-fill ph-atom"></i>', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400 border-purple-200 dark:border-purple-800' };
            if (xp >= 200) return { name: 'باحث', icon: '<i class="ph-fill ph-microscope"></i>', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' };
            if (xp >= 50) return { name: 'مكتشف', icon: '<i class="ph-fill ph-compass"></i>', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' };
            return { name: 'مبتدئ', icon: '<i class="ph-fill ph-student"></i>', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
        };

        const checkAndUpdateStreak = async (userRef, userData) => {
            if (userData.role === 'admin') return;

            const today = new Date().toLocaleDateString('en-CA'); 
            let lastLogin = userData.lastLoginDate;
            let currentStreak = userData.streak || 0;
            let needsUpdate = false;

            if (lastLogin !== today) {
                if (!lastLogin) {
                    currentStreak = 1;
                } else {
                    let lastDate = new Date(lastLogin);
                    let currDate = new Date(today);
                    let diffTime = Math.abs(currDate - lastDate);
                    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays === 1) {
                        currentStreak += 1;
                        showToast(`شعلة الحماس تزداد! 🔥 يومك الـ ${currentStreak} متتالٍ!`, "success");
                    } else if (diffDays > 1) {
                        currentStreak = 1;
                        showToast("لقد فقدت شعلة الحماس بغيابك، ابدأ من جديد اليوم! 🔥", "error");
                    }
                }
                needsUpdate = true;
            }

            if (needsUpdate) {
                await updateDoc(userRef, { lastLoginDate: today, streak: currentStreak });
                window.currentUserRecord.lastLoginDate = today;
                window.currentUserRecord.streak = currentStreak;
            }

            const streakEl = document.getElementById('student-streak-count');
            if (streakEl) streakEl.innerText = currentStreak;
        };

        window.openAdminSection = (section) => {
            document.getElementById('admin-dashboard-grid').classList.add('hidden');
            if (section === 'accounts') {
                document.getElementById('admin-accounts-section').classList.remove('hidden');
                document.getElementById('admin-accounts-section').classList.add('flex');
                // تم التعديل: استدعاء دالة التحميل المجزأ بدلاً من الانتظار
                window.loadAdminPage('init');
            } else {
                document.getElementById('admin-content-section').classList.remove('hidden');
                document.getElementById('admin-content-section').classList.add('block');
                window.adminContentStep = 'parts';
                window.renderProgramUI(window.currentSections, 'admin-program-view', true);
            }
        };

        window.returnToAdminDashboard = () => {
            document.getElementById('admin-accounts-section').classList.add('hidden');
            document.getElementById('admin-accounts-section').classList.remove('flex');
            document.getElementById('admin-content-section').classList.add('hidden');
            document.getElementById('admin-content-section').classList.remove('block');
            document.getElementById('admin-dashboard-grid').classList.remove('hidden');
            window.adminContentStep = 'parts';
        };

        window.toggleDarkMode = () => {
            document.documentElement.classList.toggle('dark');
            const isDark = document.documentElement.classList.contains('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        };

        const getBranchIcon = (title) => {
            if(title.includes('شهادتك') || title.includes('شهادات') || title.includes('تجريبية')) return '<i class="ph-fill ph-certificate"></i>';
            if(title.includes('الكهرباء') || title.includes('كهربائية')) return '<i class="ph-fill ph-lightning"></i>';
            if(title.includes('المادة') || title.includes('كيمياء') || title.includes('تحولات')) return '<i class="ph-fill ph-flask"></i>';
            if(title.includes('ميكانيك') || title.includes('حركة')) return '<i class="ph-fill ph-gear-six"></i>';
            if(title.includes('ضوء') || title.includes('بصريات') || title.includes('الضوئية')) return '<i class="ph-fill ph-lightbulb"></i>';
            if(title.includes('طاقة') || title.includes('عمل')) return '<i class="ph-fill ph-battery-full"></i>';
            if(title.includes('مغناطيس') || title.includes('كهرومغناطيسية')) return '<i class="ph-fill ph-magnet"></i>';
            if(title.includes('الفصل')) return '<i class="ph-fill ph-folder-open"></i>';
            return '<i class="ph-fill ph-book-bookmark"></i>'; 
        };

        window.showToast = (msg, type = 'success') => {
            const toast = document.createElement('div');
            const icon = type === 'error' ? '<i class="ph-fill ph-warning-circle text-2xl"></i>' : '<i class="ph-fill ph-check-circle text-2xl"></i>';
            const bgClass = type === 'error' ? 'bg-red-500/95 dark:bg-red-600/95' : 'bg-slate-800/95 dark:bg-emerald-600/95';
            toast.className = `px-6 py-4 rounded-2xl shadow-2xl text-white font-black text-base text-center transform transition-all duration-300 translate-y-[-20px] opacity-0 border border-white/10 flex items-center justify-center gap-3 backdrop-blur-md z-[120] ${bgClass}`;
            toast.innerHTML = `${icon} <span>${msg}</span>`;
            document.getElementById('toast-container').appendChild(toast);
            setTimeout(() => toast.classList.remove('translate-y-[-20px]', 'opacity-0'), 10);
            setTimeout(() => { 
                toast.classList.add('translate-y-[-20px]', 'opacity-0'); 
                setTimeout(() => toast.remove(), 400);
            }, 4000);
        };

        window.fireConfetti = () => {
            var duration = 3 * 1000; var end = Date.now() + duration;
            (function frame() {
                confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#22c55e', '#3b82f6', '#f59e0b'] });
                confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#22c55e', '#3b82f6', '#f59e0b'] });
                if (Date.now() < end) requestAnimationFrame(frame);
            }());
        };

        window.closeConfirm = null;
        const confirmAction = (msg) => {
            return new Promise((resolve) => {
                document.getElementById('confirm-message').innerText = msg;
                const modal = document.getElementById('confirm-modal');
                modal.classList.remove('hidden'); modal.classList.add('flex');
                
                window.closeConfirm = (isConfirmed) => {
                    modal.classList.add('hidden'); modal.classList.remove('flex');
                    resolve(isConfirmed);
                };
            });
        };

        window.closeRegModal = () => {
            document.getElementById('registration-success-modal').classList.add('hidden');
            document.getElementById('registration-success-modal').classList.remove('flex');
            window.toggleAuthMode();
        };

        const switchScreen = (screenId) => {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById(screenId).classList.add('active');
        };

                           const sendTelegramCode = async (code) => {
            // ضع الرابط الطويل الذي حصلت عليه من Google Apps Script
            const scriptUrl = "https://script.google.com/macros/s/AKfycbzthWfE9JKl6i--6AfczqTTgj6WKzg0THpt8UeptPymHfr3k62gDn7ipJYQyWU8r8wv/exec"; 
            const secretKey = "ALMOJTAHID_SECURE_2026_KEY!"; // نفس المفتاح الموجود في الخادم
            
            try {
                // نرسل الكود والمفتاح السري معاً
                await fetch(`${scriptUrl}?code=${code}&key=${secretKey}`, { mode: 'no-cors' });
                console.log("تم طلب الإرسال من الخادم المجاني المشفر بنجاح ☁️🔒");
            } catch(e) {
                console.error("فشل الاتصال بالخادم", e);
                showToast("حدث خطأ في طلب كود التحقق", "error");
            }
        };




        window.cancel2FA = async () => {
            window.tempAdminCode = null;
            window.tempAdminData = null;
            window.tempAdminUsername = null;
            document.getElementById('two-fa-modal').classList.add('hidden');
            document.getElementById('two-fa-modal').classList.remove('flex');
            document.getElementById('two-fa-input').value = '';
            await signOut(auth); 
            switchScreen('auth-screen');
            document.getElementById('auth-screen').classList.remove('blur-sm', 'pointer-events-none');
        };

        window.verifyAdminCode = async () => {
            const inputCode = document.getElementById('two-fa-input').value.trim();
            const btn = document.getElementById('verify-2fa-btn');
            
            if(!inputCode || inputCode.length < 6) return showToast("يرجى إدخال الكود المكون من 6 أرقام", "error");
            
            const originalHTML = btn.innerHTML;
            btn.disabled = true; btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> جاري التحقق...';

            try {
                // إرسال الكود للخادم للتحقق منه
               const url = `${window.GAS_WEB_APP_URL}?action=verify2FA&code=${encodeURIComponent(inputCode)}`;
                const response = await fetch(url);
                const result = await response.json();

                if (result.success) {
                    // نجح التحقق! نسجل الدخول بالكلمة المعقدة
                    const complexPassword = result.complexPassword;
                    const pseudoEmail = `${window.tempAdminUsername}@almojtahid.com`;
                    
                    await signInWithEmailAndPassword(auth, pseudoEmail, complexPassword);
                    const userSnap = await getDoc(doc(usersCol, window.tempAdminUsername));
                    
                    window.currentUserRecord = { username: window.tempAdminUsername, ...userSnap.data() };
                    
                    window.tempAdminUsername = null;
                    document.getElementById('two-fa-input').value = '';
                    document.getElementById('two-fa-modal').classList.add('hidden');
                    document.getElementById('two-fa-modal').classList.remove('flex');
                    document.getElementById('auth-screen').classList.remove('blur-sm', 'pointer-events-none');

                    showToast("تم التحقق بنجاح! أهلاً بك أستاذ.", "success");
                    switchScreen('admin-screen');
                    startAdminListeners();
                } else {
                    btn.classList.add('bg-red-600', 'animate-shake');
                    setTimeout(() => btn.classList.remove('bg-red-600', 'animate-shake'), 500);
                    showToast(result.error || "الكود غير صحيح، يرجى المحاولة مرة أخرى", "error");
                }
            } catch (e) {
                showToast("حدث خطأ في الاتصال بالخادم", "error");
            }
            
            btn.disabled = false; btn.innerHTML = originalHTML;
        };

           window.requestPasswordReset = async () => {
            const usernameInput = document.getElementById('login-username').value.trim();
            
            if (!usernameInput) return showToast("يرجى كتابة الاسم واللقب أولاً في حقل الدخول لطلب استرجاع كلمة المرور", "error");

            // تحويل الاسم ليتطابق تماماً مع قاعدة البيانات
            const username = usernameInput.replace(/\s+/g, '_').toLowerCase(); 

            // 🛡️ الحماية: منع إرسال طلب باسم الإدارة
            if (username === 'admin') return showToast("عذراً، لا يمكن إرسال طلب لحساب الإدارة", "error");

            if(!await confirmAction(`هل أنت متأكد أنك تريد إرسال طلب استرجاع كلمة مرور لحساب "${usernameInput}" للأستاذ؟`)) return;

            try {
                const userRef = doc(usersCol, username);
                await updateDoc(userRef, { passwordResetRequest: true });
                showToast("تم إرسال الطلب للأستاذ بنجاح! سيتم مراجعة طلبك وإخبارك.", "success");
            } catch (error) {
                console.error("Error:", error);
                if (error.code === 'not-found' || error.code === 'permission-denied') {
                    showToast("أنت غير مسجل . قم بالتسجيل في المنصة أولا", "error");
                } else {
                    showToast("حدث خطأ في الاتصال بالإنترنت، حاول مرة أخرى.", "error");
                }
            }
        };
 
        window.resolvePasswordReset = async (username) => {
            try {
                const userRef = doc(usersCol, username);
                const userSnap = await getDoc(userRef);
                
                if(userSnap.exists()) {
                    const data = userSnap.data();
                    const pass = data.password || "غير متوفرة";
                    const phone = data.phoneNumber; 
                    const displayName = username.replace(/_/g, ' ');

                    if(await confirmAction(`🔑 كلمة المرور للتلميذ (${displayName}) هي:\n\n[ ${pass} ]\n\nهل تريد إرسالها لولي التلميذ عبر الواتساب وإخفاء هذا الإشعار؟`)) {
                        
                        await updateDoc(userRef, { passwordResetRequest: false });
                        
                        // الإخفاء الفوري من الواجهة دون الحاجة لتحديث الصفحة
                        const userIndex = window.adminUsersList.findIndex(u => u.id === username);
                        if(userIndex !== -1) {
                            window.adminUsersList[userIndex].data.passwordResetRequest = false;
                        }
                        if (typeof renderAdminTable === 'function') renderAdminTable();

                        showToast("تم إخفاء الإشعار، وتجهيز رسالة الواتساب للولي!", "success");

                        if(phone) {
                            const waPhone = `213${phone.substring(1)}`;
                            const waMessage = encodeURIComponent(`السلام عليكم.\nبناءً على طلبكم، هذه بيانات الدخول الخاصة بالتلميذ(ة) ${displayName} في منصة المجتهد للعلوم الفيزيائية:\n\nالاسم واللقب: ${displayName}\nكلمة المرور: ${pass}\n\nبالتوفيق!`);
                            window.open(`https://wa.me/${waPhone}?text=${waMessage}`, '_blank');
                        } else {
                            showToast("لا يوجد رقم هاتف مسجل لهذا التلميذ!", "error");
                        }
                    }
                }
            } catch(e) {
                showToast("حدث خطأ في جلب البيانات", "error");
            }
        };
         window.handleAuth = async () => {
            if (!isAuthReady) return showToast("يتم الاتصال بالسحابة... يرجى الانتظار", "error");
            
            let rawName = "";
            
            if (window.isRegistering) {
                const fNameEl = document.getElementById('reg-firstname');
                const lNameEl = document.getElementById('reg-lastname');
                if(!fNameEl || !lNameEl) return showToast("حدث خطأ في الواجهة", "error");
                
                const fName = fNameEl.value.trim();
                const lName = lNameEl.value.trim();
                
                if (fName && lName) {
                    rawName = `${fName} ${lName}`.toLowerCase();
                } else {
                    return showToast("يرجى كتابة الاسم واللقب", "error");
                }
            } else {
                const loginUserEl = document.getElementById('login-username');
                if(loginUserEl) {
                    rawName = loginUserEl.value.trim().toLowerCase();
                } else {
                    return showToast("حدث خطأ في الواجهة", "error");
                }
            }

            const password = document.getElementById('password')?.value.trim() || "";
            const level = document.getElementById('user-level')?.value || "";
            const parentName = document.getElementById('parent-name')?.value.trim() || "";
            const phoneNumber = document.getElementById('phone-number')?.value.trim() || "";

            if (!rawName || !password) return showToast("يرجى ملء جميع البيانات المطلوبة", "error");
            
            if (window.isRegistering) {
                if (!level || !parentName || !phoneNumber) return showToast("يرجى تعبئة جميع الحقول بدقة", "error");
                const phoneRegex = /^(05|06|07)\d{8}$/;
                if(!phoneRegex.test(phoneNumber)) return showToast("رقم الهاتف غير صحيح", "error");
            }

            const btn = document.getElementById('auth-action-btn');
            const originalHTML = btn.innerHTML;
            btn.disabled = true; btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin text-2xl"></i> جاري التحقق...';

            // --- الكود السحري للتوافق مع قواعد الأمان ---
            // نستبدل المسافة بـ _ لكي تقبله قاعدة البيانات بسلاسة (مثال: محمد_علي)
            const username = rawName.replace(/\s+/g, '_');
            const pseudoEmail = `${username}@almojtahid.com`;
            const userRef = doc(usersCol, username); 

            try {
                if (window.isRegistering) {
                    await createUserWithEmailAndPassword(auth, pseudoEmail, password);
                    
                    await setDoc(userRef, { 
                        role: 'student', 
                        approved: false, 
                        clickedLinks: [],
                        level: level, 
                        parentName: parentName, 
                        phoneNumber: phoneNumber,
                        password: password,
                        streak: 0,
                        xp: 0, 
                        lastLoginDate: ''
                    });
                    
                    document.getElementById('registration-success-modal').classList.remove('hidden');
                    document.getElementById('registration-success-modal').classList.add('flex');
                    if(document.getElementById('reg-firstname')) document.getElementById('reg-firstname').value = ''; 
                    if(document.getElementById('reg-lastname')) document.getElementById('reg-lastname').value = ''; 
                    if(document.getElementById('password')) document.getElementById('password').value = '';
                    await signOut(auth); 
                    
                } else {
                    // --- النظام الأمني للأدمن ---
                    if (username === 'admin') {
                        try {
                           const url = `${window.GAS_WEB_APP_URL}?action=request2FA&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
                            const response = await fetch(url);
                            const result = await response.json();
                            
                            if (result.success) {
                                window.tempAdminUsername = username;
                                document.getElementById('two-fa-modal').classList.remove('hidden');
                                document.getElementById('two-fa-modal').classList.add('flex');
                                document.getElementById('auth-screen').classList.add('blur-sm', 'pointer-events-none');
                            } else {
                                showToast(result.error || "بيانات الدخول غير صحيحة", "error");
                            }
                        } catch (e) {
                            showToast("حدث خطأ في الاتصال بالخادم الآمن", "error");
                        }
                    } else {
                        // --- دخول التلاميذ المعتاد ---
                        await signInWithEmailAndPassword(auth, pseudoEmail, password);
                        const userSnap = await getDoc(userRef);
                        
                        if (!userSnap.exists()) {
                            showToast("حدث خطأ: الحساب موجود لكن البيانات مفقودة.", "error");
                            await signOut(auth);
                            btn.disabled = false; btn.innerHTML = originalHTML;
                            return;
                        }

                        let data = userSnap.data();
                        window.currentUserRecord = { username, ...data };
                        
                        if (!window.currentUserRecord.password) {
                             await updateDoc(userRef, { password: password });
                             window.currentUserRecord.password = password;
                        }
                        
                        if (!window.currentUserRecord.approved) {
                            switchScreen('pending-screen');
                            await signOut(auth);
                        } else {
                            await checkAndUpdateStreak(userRef, window.currentUserRecord);
                            
                            // إرجاع المسافة لكي يظهر الاسم بشكل جميل في الواجهة
                            document.getElementById('display-username').innerText = username.replace(/_/g, ' ');
                            
                            document.getElementById('student-level-display').innerText = levelNames[window.currentUserRecord.level] || "مستوى غير محدد";
                            switchScreen('app-screen');
                            startStudentListeners();
                            if (typeof window.initPomodoro === 'function') {
                                window.initPomodoro();
                            }
                            if(document.getElementById('login-username')) document.getElementById('login-username').value = '';
                            if(document.getElementById('password')) document.getElementById('password').value = '';
                        }
                    }
                }
            } catch (err) { 
                console.error("Auth Error:", err);
                
                // تنظيف الحسابات الشبحية إذا فشلت العملية
                if (window.isRegistering && auth.currentUser) {
                    try { await auth.currentUser.delete(); } catch(e) {}
                }

                if (err.code === 'auth/invalid-email') {
                    showToast("صيغة الاسم غير مقبولة", "error");
                } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                    showToast("بيانات الدخول غير صحيحة", "error");
                } else if (err.code === 'auth/email-already-in-use') {
                    // رسالة مخصصة ليتجاوز التلميذ الحساب الشبح
                    showToast("هذا الاسم علق في النظام بسبب محاولة سابقة. يرجى إضافة اسم الأب لجعله مميزاً (مثال: محمد علي أحمد).", "error");
                } else if (err.code === 'auth/network-request-failed') {
                    showToast("ضعف في الاتصال بالإنترنت، يرجى المحاولة مرة أخرى.", "error");
                } else {
                    showToast("حدث خطأ في الاتصال، يرجى المحاولة لاحقاً.", "error");
                }
            }
            
            btn.disabled = false; btn.innerHTML = originalHTML;
        };

        const defaultProgramData = [
            { 
                id: "part_middle", 
                title: "التعليم المتوسط", 
                color: "blue", 
                years: [
                    { 
                        id: "m_y1", 
                        title: "السنة الأولى متوسط", 
                        branches: [
                            { id: "m1_b1", title: "الظواهر الكهربائية", categories: { lessons: [], exercises: [] } },
                            { id: "m1_b2", title: "المادة وتحولاتها", categories: { lessons: [], exercises: [] } },
                            { id: "m1_b3", title: "الظواهر الضوئية", categories: { lessons: [], exercises: [] } },
                            { id: "m1_s1", title: "الفصل 1", categories: { terms: [], exams: [] } },
                            { id: "m1_s2", title: "الفصل 2", categories: { terms: [], exams: [] } },
                            { id: "m1_s3", title: "الفصل 3", categories: { terms: [], exams: [] } }
                        ] 
                    },
                    { 
                        id: "m_y2", 
                        title: "السنة الثانية متوسط", 
                        branches: [
                            { id: "m2_b1", title: "المادة وتحولاتها", categories: { lessons: [], exercises: [] } },
                            { id: "m2_b2", title: "الظواهر الميكانيكية", categories: { lessons: [], exercises: [] } },
                            { id: "m2_b3", title: "الظواهر الكهرومغناطيسية", categories: { lessons: [], exercises: [] } },
                            { id: "m2_s1", title: "الفصل 1", categories: { terms: [], exams: [] } },
                            { id: "m2_s2", title: "الفصل 2", categories: { terms: [], exams: [] } },
                            { id: "m2_s3", title: "الفصل 3", categories: { terms: [], exams: [] } }
                        ] 
                    },
                    { 
                        id: "m_y3", 
                        title: "السنة الثالثة متوسط", 
                        branches: [
                            { id: "m3_b1", title: "المادة وتحولاتها", categories: { lessons: [], exercises: [] } },
                            { id: "m3_b2", title: "الطاقة", categories: { lessons: [], exercises: [] } },
                            { id: "m3_b3", title: "الظواهر الكهربائية", categories: { lessons: [], exercises: [] } },
                            { id: "m3_b4", title: "الظواهر الضوئية", categories: { lessons: [], exercises: [] } },
                            { id: "m3_s1", title: "الفصل 1", categories: { terms: [], exams: [] } },
                            { id: "m3_s2", title: "الفصل 2", categories: { terms: [], exams: [] } },
                            { id: "m3_s3", title: "الفصل 3", categories: { terms: [], exams: [] } }
                        ] 
                    },
                    { 
                        id: "m_y4", 
                        title: "السنة الرابعة متوسط", 
                        branches: [
                            { id: "m4_b1", title: "الظواهر الكهربائية", categories: { lessons: [], exercises: [] } },
                            { id: "m4_b2", title: "المادة وتحولاتها", categories: { lessons: [], exercises: [] } },
                            { id: "m4_b3", title: "الظواهر الميكانيكية", categories: { lessons: [], exercises: [] } },
                            { id: "m4_b4", title: "الظواهر الضوئية", categories: { lessons: [], exercises: [] } },
                            { id: "m4_s1", title: "الفصل 1", categories: { terms: [], exams: [] } },
                            { id: "m4_s2", title: "الفصل 2", categories: { terms: [], exams: [] } },
                            { id: "m4_s3", title: "الفصل 3", categories: { terms: [], exams: [] } },
                            { id: "m4_b5", title: "شهادتك 🎓", categories: { past_exams: [], mock_exams: [] } }
                        ] 
                    }
                ] 
            },
            { 
                id: "part_high", 
                title: "التعليم الثانوي", 
                color: "indigo", 
                years: [
                    { 
                        id: "h_y1", 
                        title: "السنة أولى ثانوي", 
                        branches: [
                            { id: "h1_b1", title: "بنية وهندسة أفراد بعض الأنواع الكيميائية", categories: { lessons: [], exercises: [] } },
                            { id: "h1_b2", title: "القوة والحركات المستقيمة", categories: { lessons: [], exercises: [] } },
                            { id: "h1_s1", title: "الفصل 1", categories: { terms: [], exams: [] } },
                            { id: "h1_s2", title: "الفصل 2", categories: { terms: [], exams: [] } },
                            { id: "h1_s3", title: "الفصل 3", categories: { terms: [], exams: [] } }
                        ] 
                    },
                    { 
                        id: "h_y2", 
                        title: "السنة الثانية ثانوي", 
                        branches: [
                            { id: "h2_b1", title: "المقاربة الكيفية لطاقة جملة وانحفاظها", categories: { lessons: [], exercises: [] } },
                            { id: "h2_b2", title: "العمل والطاقة الحركية", categories: { lessons: [], exercises: [] } },
                            { id: "h2_s1", title: "الفصل 1", categories: { terms: [], exams: [] } },
                            { id: "h2_s2", title: "الفصل 2", categories: { terms: [], exams: [] } },
                            { id: "h2_s3", title: "الفصل 3", categories: { terms: [], exams: [] } }
                        ] 
                    },
                    { 
                        id: "h_y3", 
                        title: "السنة الثالثة ثانوي", 
                        branches: [
                            { id: "h3_b1", title: "تطور جملة كيميائية نحو حالة التوازن", categories: { lessons: [], exercises: [] } },
                            { id: "h3_b2", title: "التحولات النووية", categories: { lessons: [], exercises: [] } },
                            { id: "h3_b3", title: "الظواهر الكهربائية", categories: { lessons: [], exercises: [] } },
                            { id: "h3_s1", title: "الفصل 1", categories: { terms: [], exams: [] } },
                            { id: "h3_s2", title: "الفصل 2", categories: { terms: [], exams: [] } },
                            { id: "h3_s3", title: "الفصل 3", categories: { terms: [], exams: [] } }
                        ] 
                    }
                ] 
            }
        ];

        onAuthStateChanged(auth, async (user) => {
            isAuthReady = true;
            if (user) {
                try {
                    // سكريبت ترحيل قاعدة البيانات (Migration) وتقسيم المنهج
                    if (user.email === 'admin@almojtahid.com') {
                        const adminDoc = await getDoc(doc(usersCol, 'admin'));
                        if (!adminDoc.exists()) await setDoc(doc(usersCol, 'admin'), { role: 'admin', approved: true, clickedLinks: [] });
                        
                        const oldMainDoc = await getDoc(doc(programCol, 'main'));
                        if (oldMainDoc.exists()) {
                            let data = oldMainDoc.data();
                            console.log("Migration Starting...");
                            if(data.sections && data.sections.length >= 2) {
                                await setDoc(doc(programCol, 'part_middle'), data.sections[0]);
                                await setDoc(doc(programCol, 'part_high'), data.sections[1]);
                            }
                            await setDoc(doc(programCol, 'meta'), {
                                liveStreamUrl: data.liveStreamUrl || "",
                                latestUpdates: data.latestUpdates || []
                            });
                            await deleteDoc(doc(programCol, 'main')); 
                            console.log("Migration Successful!");
                        } else {
                            const metaDoc = await getDoc(doc(programCol, 'meta'));
                            if (!metaDoc.exists()) {
                                if (typeof defaultProgramData !== 'undefined') {
                                    await setDoc(doc(programCol, 'part_middle'), defaultProgramData[0]);
                                    await setDoc(doc(programCol, 'part_high'), defaultProgramData[1]);
                                }
                                await setDoc(doc(programCol, 'meta'), { liveStreamUrl: "", latestUpdates: [] });
                            }
                        }
                    }

                    if (user.email && !window.currentUserRecord && !window.isRegistering) {
                        const username = user.email.split('@')[0];
                        const userRef = doc(usersCol, username);
                        const userSnap = await getDoc(userRef);
                        
                        if (userSnap.exists()) {
                            let data = userSnap.data();
                            
                            // --- كود الأستاذ (الإصلاح الجديد للـ Refresh) ---
                            if (data.role === 'admin') {
                                window.currentUserRecord = { username: 'admin', ...data };
                                
                                document.getElementById('two-fa-modal').classList.add('hidden');
                                document.getElementById('two-fa-modal').classList.remove('flex');
                                document.getElementById('auth-screen').classList.remove('blur-sm', 'pointer-events-none');
                                
                                switchScreen('admin-screen');
                                startAdminListeners();
                                return; 
                            } 
                            
                            // --- كود التلميذ ---
                            window.currentUserRecord = { username, ...data };

                            if (!window.currentUserRecord.approved) {
                                switchScreen('pending-screen');
                                await signOut(auth);
                            } else {
                                await checkAndUpdateStreak(userRef, window.currentUserRecord);

                                document.getElementById('display-username').innerText = username.replace(/_/g, ' ');
                                document.getElementById('student-level-display').innerText = levelNames[window.currentUserRecord.level] || "مستوى غير محدد";
                                switchScreen('app-screen');
                                startStudentListeners();
                                if (typeof window.initPomodoro === 'function') {
                                    window.initPomodoro();
                                }
                            }
                        }
                    }
                } catch(e) { console.error("OnAuthState Error:", e); }
                        } else {
                const currentHash = window.location.hash.substring(1);
                
                // إذا كان المستخدم أصلاً في شاشة الدخول وعمل تحديث، أبقه هناك
                if (currentHash === 'auth-screen') {
                    switchScreen('auth-screen');
                } else {
                    // وإلا، اعرض له الواجهة الترحيبية الرائعة كأول شاشة يراها
                    switchScreen('landing-screen'); 
                }
                
                document.getElementById('auth-screen').classList.remove('blur-sm', 'pointer-events-none');
            }

        });
        window.startNewJourney = () => {
            if (!window.isRegistering) window.toggleAuthMode();
            switchScreen('auth-screen');
        };

        window.openExistingAccount = () => {
            if (window.isRegistering) window.toggleAuthMode();
            switchScreen('auth-screen');
        };


        window.toggleAuthMode = () => {
            window.isRegistering = !window.isRegistering;
            
            const titleEl = document.getElementById('auth-title');
            if(titleEl) titleEl.innerText = window.isRegistering ? "حساب جديد" : "منصة المجتهد";
            
            const btnEl = document.getElementById('auth-action-btn');
            if(btnEl) btnEl.innerHTML = window.isRegistering ? '<i class="ph-bold ph-paper-plane-tilt"></i> إرسال الطلب' : '<i class="ph-bold ph-sign-in"></i> تسجيل الدخول';
            
            const switchEl = document.getElementById('switch-mode-text');
            if(switchEl) switchEl.innerHTML = window.isRegistering ? 'لديك حساب بالفعل؟ سجل دخولك <i class="ph-bold ph-arrow-left"></i>' : '<i class="ph-fill ph-rocket-launch"></i> إنشاء حساب تلميذ جديد';
            
            const loginNameCont = document.getElementById('login-name-container');
            const regNamesCont = document.getElementById('register-names-container');
            const levelSelect = document.getElementById('user-level'); 
            const levelIcon = document.getElementById('level-icon');
            const parentNameCont = document.getElementById('parent-name-container'); 
            const phoneNumCont = document.getElementById('phone-number-container');
            const forgotPassCont = document.getElementById('forgot-password-container');
            
            if(window.isRegistering) {
                if(loginNameCont) loginNameCont.classList.add('hidden');
                if(regNamesCont) { regNamesCont.classList.remove('hidden'); regNamesCont.classList.add('flex'); }
                if(levelSelect) levelSelect.classList.remove('hidden'); 
                if(levelIcon) levelIcon.classList.remove('hidden');
                if(parentNameCont) parentNameCont.classList.remove('hidden'); 
                if(phoneNumCont) phoneNumCont.classList.remove('hidden');
                if(forgotPassCont) forgotPassCont.classList.add('hidden');
            } else {
                if(loginNameCont) loginNameCont.classList.remove('hidden');
                if(regNamesCont) { regNamesCont.classList.add('hidden'); regNamesCont.classList.remove('flex'); }
                if(levelSelect) levelSelect.classList.add('hidden'); 
                if(levelIcon) levelIcon.classList.add('hidden');
                if(parentNameCont) parentNameCont.classList.add('hidden'); 
                if(phoneNumCont) phoneNumCont.classList.add('hidden');
                if(forgotPassCont) forgotPassCont.classList.remove('hidden');
            }
        };


        window.closeWelcomeScreen = () => {
            const screen = document.getElementById('welcome-quote-screen');
            screen.classList.remove('welcome-visible');
            screen.classList.add('welcome-hidden');
        };

        window.loginAsStudent = (studentUsername) => {
            const studentObj = window.adminUsersList.find(u => u.id === studentUsername);
            if(!studentObj) return;

            window.originalAdminRecord = { ...window.currentUserRecord };
            window.currentUserRecord = { username: studentObj.id, ...studentObj.data };
            window.studentViewMode = 'grid'; 
            
            document.getElementById('display-username').innerText = window.currentUserRecord.username;
            document.getElementById('student-level-display').innerText = levelNames[window.currentUserRecord.level] || "مستوى غير محدد";
            
            const streakEl = document.getElementById('student-streak-count');
            if(streakEl) streakEl.innerText = window.currentUserRecord.streak || 0;
            
            document.getElementById('return-admin-btn').classList.remove('hidden');
            document.getElementById('student-settings-btn').classList.add('hidden'); 
            document.getElementById('student-chat-btn').classList.add('hidden'); 
            document.getElementById('student-dark-btn').classList.add('hidden'); 
            document.getElementById('student-logout-btn').classList.add('hidden'); 
            document.getElementById('student-notif-btn').classList.add('hidden');

            if(unsubscribeChatMeta) unsubscribeChatMeta();

            switchScreen('app-screen');
            startStudentListeners();
            window.initPomodoro();
            showToast(`أنت الآن داخل حساب التلميذ في وضع المراقبة`);
        };

        window.returnToAdmin = () => {
            if(!window.originalAdminRecord) return;
            window.currentUserRecord = { ...window.originalAdminRecord };
            window.originalAdminRecord = null;
            
            document.getElementById('return-admin-btn').classList.add('hidden');
            document.getElementById('student-settings-btn').classList.remove('hidden');
            document.getElementById('student-chat-btn').classList.remove('hidden');
            document.getElementById('student-dark-btn').classList.remove('hidden');
            document.getElementById('student-logout-btn').classList.remove('hidden');
            document.getElementById('student-notif-btn').classList.remove('hidden');

            if(unsubscribeStudentData) unsubscribeStudentData();
            if(unsubscribeChatMeta) unsubscribeChatMeta();
            if(pomodoroInterval) clearInterval(pomodoroInterval);

            switchScreen('admin-screen');
            returnToAdminDashboard();
            startAdminListeners();
            showToast("تمت العودة للوحة الإدارة بنجاح");
        };

        window.logout = async () => {
            if (typeof closeSettings === 'function') closeSettings();
            if(await confirmAction("هل أنت متأكد أنك تريد تسجيل الخروج من حسابك؟")) {
                try {
                    await signOut(auth);
                } catch(e) { console.error("Logout error", e); }
                
                window.currentUserRecord = null; window.originalAdminRecord = null;
                document.getElementById('password').value = '';
                
                document.getElementById('return-admin-btn').classList.add('hidden');
                document.getElementById('student-settings-btn').classList.remove('hidden');
                document.getElementById('student-chat-btn').classList.remove('hidden');
                document.getElementById('student-dark-btn').classList.remove('hidden');
                document.getElementById('student-logout-btn').classList.remove('hidden');
                document.getElementById('student-notif-btn').classList.remove('hidden');

                if(unsubscribeProgram) unsubscribeProgram();
                if(unsubscribeUsers) unsubscribeUsers();
                if(unsubscribeStudentData) unsubscribeStudentData();
                if(unsubscribeChat) unsubscribeChat();
                if(unsubscribeChatMeta) unsubscribeChatMeta();
                if(pomodoroInterval) clearInterval(pomodoroInterval);
                if (typeof closeChat === 'function') closeChat();
                switchScreen('auth-screen');
                document.getElementById('auth-screen').classList.remove('blur-sm', 'pointer-events-none');
            }
        };

        window.openSettings = () => {
            document.getElementById('settings-username').value = window.currentUserRecord.username;
            document.getElementById('settings-current-password').value = window.currentUserRecord.password || 'غير متوفرة';            
            const phoneContainer = document.getElementById('settings-phone-container');
            const phoneInput = document.getElementById('settings-new-phone');
            
            if(window.currentUserRecord.role === 'admin') {
                phoneContainer.style.display = 'none';
            } else {
                phoneContainer.style.display = 'block';
                phoneInput.value = window.currentUserRecord.phoneNumber || '';
            }

            const modal = document.getElementById('settings-modal'); const content = document.getElementById('settings-content');
            modal.classList.remove('hidden'); modal.classList.add('flex');
            setTimeout(() => { content.classList.remove('scale-95'); content.classList.add('scale-100'); }, 10);
        };

        window.closeSettings = () => {
            const modal = document.getElementById('settings-modal'); const content = document.getElementById('settings-content');
            content.classList.remove('scale-100'); content.classList.add('scale-95');
            setTimeout(() => { modal.classList.add('hidden'); modal.classList.remove('flex'); }, 300);
        };

                window.saveSettingsData = async () => {
            const phoneInput = document.getElementById('settings-new-phone');
            let updates = {};

            if(window.currentUserRecord.role !== 'admin') {
                const newPhone = phoneInput.value.trim();
                const phoneRegex = /^(05|06|07)\d{8}$/;
                
                if(newPhone && !phoneRegex.test(newPhone)) return showToast("رقم الهاتف غير صحيح! يجب أن يبدأ بـ 05، 06، أو 07", "error");
                if(newPhone && newPhone !== window.currentUserRecord.phoneNumber) updates.phoneNumber = newPhone;
            }

            if (Object.keys(updates).length === 0) {
                closeSettings();
                return showToast("لم تقم بإجراء أي تغييرات", "success");
            }

            try {
                await updateDoc(doc(usersCol, window.currentUserRecord.username), updates);
                if(updates.phoneNumber) window.currentUserRecord.phoneNumber = updates.phoneNumber;
                
                showToast("تم تحديث رقم الهاتف بنجاح 💾");
                closeSettings();
            } catch(e) { 
                showToast("حدث خطأ أثناء الحفظ", "error"); 
            }
        };

        window.openBroadcastModal = () => {
            document.getElementById('broadcast-modal').classList.remove('hidden');
            document.getElementById('broadcast-modal').classList.add('flex');
            document.getElementById('broadcast-message').value = '';
        };

        window.closeBroadcastModal = () => {
            document.getElementById('broadcast-modal').classList.add('hidden');
            document.getElementById('broadcast-modal').classList.remove('flex');
        };

        window.executeBroadcast = async () => {
            const target = document.getElementById('broadcast-target').value;
            const message = document.getElementById('broadcast-message').value.trim();

            if (!message) return showToast("يرجى كتابة نص الإعلان أولاً!", "error");

            let targetName = document.querySelector(`#broadcast-target option[value="${target}"]`).innerText;
            if (!await confirmAction(`هل أنت متأكد من إرسال هذا الإعلان إلى: ${targetName}؟`)) return;

            const btn = document.getElementById('send-broadcast-btn');
            const origHTML = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin text-xl"></i> جاري الإرسال...';

            try {
                // لإرسال رسالة جماعية، سنضطر لجلب المستهدفين (يمكن تطويرها لتعمل عبر Cloud Functions مستقبلاً)
                let targetQuery = query(usersCol, where('role', '==', 'student'), where('approved', '==', true));
                if (target !== 'all') {
                    targetQuery = query(usersCol, where('role', '==', 'student'), where('approved', '==', true), where('level', '==', target));
                }
                const snap = await getDocs(targetQuery);
                
                if (snap.empty) {
                    showToast("لا يوجد تلاميذ مفعلين في هذا المستوى حالياً", "error");
                    btn.disabled = false; btn.innerHTML = origHTML;
                    return;
                }
                
                const batch = writeBatch(db);
                const timestamp = Date.now();
                let count = 0;

                snap.forEach(user => {
                    const username = user.id;
                    const msgId = timestamp.toString() + '_' + count;
                    const msgRef = doc(collection(db, chatsPath, username, 'messages'), msgId);
                    const chatDocRef = doc(db, chatsPath, username);

                    batch.set(msgRef, {
                        sender: 'admin',
                        text: `📢 إعلان إداري:\n\n${message}`, 
                        timestamp: timestamp + count, 
                        isSystemMessage: true 
                    });

                    batch.set(chatDocRef, { unreadStudent: increment(1) }, { merge: true });
                    count++;
                });

                await batch.commit();
                showToast(`تم إرسال الإعلان إلى ${count} تلميذ بنجاح 🚀`, "success");
                window.closeBroadcastModal();

            } catch (e) {
                console.error("Broadcast Error", e);
                showToast("حدث خطأ أثناء إرسال الإعلان. تحقق من الإنترنت", "error");
            }

            btn.disabled = false; btn.innerHTML = origHTML;
        };

        window.markStudentNotificationsAsRead = () => {
            if (!window.currentUpdates || !window.currentUserRecord || window.currentUserRecord.role === 'admin') return;
            let myUpdates = window.currentUpdates.filter(u => u.level === window.currentUserRecord.level);
            let seenUpdates = myUpdates.map(u => u.id);
            localStorage.setItem(`seen_updates_${window.currentUserRecord.username}`, JSON.stringify(seenUpdates));

            const badge = document.getElementById('student-global-badge');
            if (badge) badge.classList.add('hidden');

            document.querySelectorAll('#student-notifications-container .bg-blue-50').forEach(el => {
                el.classList.remove('bg-blue-50', 'dark:bg-blue-900/20', 'border-blue-200', 'dark:border-blue-800');
                el.classList.add('bg-slate-50', 'dark:bg-slate-800/50', 'border-slate-100', 'dark:border-slate-700');
            });
            document.querySelectorAll('#student-notifications-container .text-blue-600').forEach(el => {
                el.classList.remove('text-blue-600', 'dark:text-blue-400');
                el.classList.add('text-slate-400', 'dark:text-slate-500');
            });
        };

        window.renderStudentNotifications = (myUpdates, seenUpdates) => {
            let unreadCount = 0;
            let notifHtml = '';
            
            let sortedUpdates = [...myUpdates].sort((a, b) => b.timestamp - a.timestamp);

            sortedUpdates.forEach(update => {
                let isNew = !seenUpdates.includes(update.id);
                if (isNew) unreadCount++;

                let bgClass = isNew ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700';
                let iconColor = isNew ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500';

                notifHtml += `
                    <div class="flex items-start gap-3 p-3 rounded-xl border ${bgClass} transition shadow-sm">
                        <div class="w-8 h-8 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm ${iconColor}">
                            <i class="ph-bold ph-bell-ringing"></i>
                        </div>
                        <div class="flex-1">
                            <div class="font-black text-sm text-slate-800 dark:text-white leading-tight mb-1">${update.title}</div>
                            <div class="text-[11px] font-bold text-slate-500 dark:text-slate-400">في وحدة: ${update.branch}</div>
                        </div>
                    </div>`;
            });

            const badge = document.getElementById('student-global-badge');
            const container = document.getElementById('student-notifications-container');

            if (badge) {
                if (unreadCount > 0) {
                    badge.innerText = unreadCount > 9 ? '9+' : unreadCount;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }

            if (container) {
                if (sortedUpdates.length > 0) {
                    container.innerHTML = notifHtml;
                } else {
                    container.innerHTML = '<div class="text-center text-slate-500 dark:text-slate-400 text-sm font-bold p-4 opacity-70"><i class="ph-fill ph-bell-slash text-4xl mb-2"></i><br>لا توجد إشعارات جديدة</div>';
                }
            }
        };

        const calculateProgressXP = (levelId, data, sections) => {
            if(!sections || !levelId) return { xp: 0, percent: 0 };
            let xp = 0; let totalLinks = 0; let clickedLinks = data.clickedLinks || [];
            sections.forEach(p => p.years.forEach(y => {
                if(y.id === levelId) {
                    y.branches.forEach(b => {
                        let cats = b.id === 'm4_b5' ? ['past_exams', 'mock_exams'] : (b.id.includes('_s') ? ['terms', 'exams'] : ['lessons', 'exercises']);
                        cats.forEach(cat => {
                            let links = b.categories[cat] || [];
                            totalLinks += links.length;
                            links.forEach((_, lIdx) => { if(clickedLinks.includes(`${b.id}_${cat}_${lIdx}`)) xp += XP_PER_ITEM; });
                        });
                    });
                }
            }));
            let percent = totalLinks === 0 ? 0 : Math.round(( (xp / XP_PER_ITEM) / totalLinks) * 100);
            return { xp, percent };
        };

        const updateProgressUI = (sections) => {
            if(!window.currentUserRecord || window.currentUserRecord.role === 'admin') return;
            let result = calculateProgressXP(window.currentUserRecord.level, window.currentUserRecord, sections);
            const bar = document.getElementById('progress-bar-fill'); const txt = document.getElementById('progress-text-xp');
            if(bar) bar.style.width = `${result.percent}%`; 
            if(txt) txt.innerText = `${result.xp}`;

            const badgeInfo = getStudentBadge(result.xp);
            const rankBadgeEl = document.getElementById('student-rank-badge');
            const iconBadgeEl = document.getElementById('student-badge-icon');
            
            if (rankBadgeEl) {
                rankBadgeEl.innerHTML = `${badgeInfo.icon} ${badgeInfo.name}`;
                rankBadgeEl.className = `text-sm font-black px-3 py-1 rounded-lg border shadow-sm transition-colors flex items-center gap-1 ${badgeInfo.cls}`;
            }
            if (iconBadgeEl) {
                iconBadgeEl.innerHTML = badgeInfo.icon;
                iconBadgeEl.className = `w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center text-3xl transition-colors ${badgeInfo.cls}`;
            }
            
            const streakEl = document.getElementById('student-streak-count');
            if (streakEl) streakEl.innerText = window.currentUserRecord.streak || 0;
        };

        window.trackLinkClick = async (branchId, cat, lIdx, url) => {
            window.openEmbedModal(url);
            
            if (window.currentUserRecord && window.currentUserRecord.role !== 'admin') {
                if (window.originalAdminRecord) {
                    showToast("أنت في وضع المراقبة، لن يتم تسجيل هذا الدرس كمقروء ولن تحسب النقاط للتلميذ.", "error");
                    return;
                }

                let clickedLinks = [...(window.currentUserRecord.clickedLinks || [])];
                let linkId = `${branchId}_${cat}_${lIdx}`;
                if (!clickedLinks.includes(linkId)) {
                    clickedLinks.push(linkId);
                    window.currentUserRecord.clickedLinks = clickedLinks;
                    window.fireConfetti();
                    
                    let result = calculateProgressXP(window.currentUserRecord.level, window.currentUserRecord, window.currentSections);
                    showToast(`+${XP_PER_ITEM} XP ! أحسنت 🌟`);
                    updateProgressUI(window.currentSections);
                    
                    if(document.getElementById('lesson-search').value.trim() === '') {
                        window.renderProgramUI(window.currentSections, 'student-program-view', false);
                    } else { window.executeStudentSearch(); }

                    // تم التعديل: حفظ نقاط الخبرة مباشرة في المستند لتسهيل ترتيب المتفوقين لاحقاً
                    await updateDoc(doc(usersCol, window.currentUserRecord.username), { clickedLinks: clickedLinks, xp: result.xp });
                }
            }
        };

        const catConfig = {
            'lessons': { title: 'الدروس', icon: '<i class="ph-fill ph-books"></i>', bg: 'bg-blue-50/50 dark:bg-blue-900/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-900/30' },
            'exercises': { title: 'التمارين', icon: '<i class="ph-fill ph-pencil-simple"></i>', bg: 'bg-orange-50/50 dark:bg-orange-900/10', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-100 dark:border-orange-900/30' },
            'terms': { title: 'الفروض', icon: '<i class="ph-fill ph-exam"></i>', bg: 'bg-emerald-50/50 dark:bg-emerald-900/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-900/30' },
            'exams': { title: 'الاختبارات', icon: '<i class="ph-fill ph-files"></i>', bg: 'bg-purple-50/50 dark:bg-purple-900/10', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-100 dark:border-purple-900/30' },
            'past_exams': { title: 'مواضيع سابقة', icon: '<i class="ph-fill ph-certificate"></i>', bg: 'bg-indigo-50/50 dark:bg-indigo-900/10', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-100 dark:border-indigo-900/30' },
            'mock_exams': { title: 'مواضيع مقترحة', icon: '<i class="ph-fill ph-file-text"></i>', bg: 'bg-amber-50/50 dark:bg-amber-900/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-900/30' }
        };

        const escapeHtml = (unsafeText) => {
            if (typeof unsafeText !== 'string') return '';
            return unsafeText
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };

        window.executeStudentSearch = () => {
            const searchInput = document.getElementById('lesson-search').value.trim();
            const query = searchInput.toLowerCase(); 
            const safeQuery = escapeHtml(searchInput); 
            const container = document.getElementById('student-program-view');
            
            if (query === '') { window.renderProgramUI(window.currentSections, 'student-program-view', false); return; }

            let html = `<div class="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-[2rem] border border-blue-200 dark:border-blue-800 p-6 shadow-lg animate-[fadeInTab_0.3s_ease]">
                            <h3 class="text-xl font-black text-blue-600 dark:text-blue-400 mb-6 flex items-center gap-2"><i class="ph-bold ph-magnifying-glass"></i> نتائج البحث عن: "${safeQuery}"</h3>
                            <div class="space-y-4">`;
            let found = false; let userLevel = window.currentUserRecord.level; let clickedLinks = window.currentUserRecord.clickedLinks || [];

            window.currentSections.forEach(p => p.years.forEach(y => {
                if(y.id === userLevel) {
                    y.branches.forEach(branch => {
                        let cats = branch.id === 'm4_b5' ? ['past_exams', 'mock_exams'] : (branch.id.includes('_s') ? ['terms', 'exams'] : ['lessons', 'exercises']);
                        cats.forEach(cat => {
                            let links = branch.categories[cat] || []; let conf = catConfig[cat];
                            links.forEach((lnk, lIdx) => {
                                if(lnk.title.toLowerCase().includes(query) || branch.title.toLowerCase().includes(query)) {
                                    found = true; 
                                    let linkId = `${branch.id}_${cat}_${lIdx}`; 
                                    let isRead = clickedLinks.includes(linkId);

                                    html += `
                                    <div class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:shadow-md">
                                        <div>
                                            <div class="flex items-center gap-2 mb-1">
                                                <span class="text-xs font-black bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 px-2 py-1 rounded">${branch.title}</span>
                                                <span class="text-xs font-black bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 px-2 py-1 rounded flex items-center gap-1">${conf.icon} ${conf.title}</span>
                                            </div>
                                            <h4 class="font-bold text-slate-800 dark:text-white text-lg">${lnk.title}</h4>
                                        </div>
                                        <div class="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                                            ${isRead ? `<span class="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 text-xs font-black px-3 py-1.5 rounded-lg flex items-center gap-1"><i class="ph-bold ph-check"></i> مكتمل</span>` : ''}
                                            <button onclick="trackLinkClick('${branch.id}', '${cat}', ${lIdx}, '${lnk.url}')" aria-label="مشاهدة المحتوى" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-black shadow-sm transition flex items-center gap-2 text-sm whitespace-nowrap">
                                                مشاهدة <i class="ph-bold ph-play-circle"></i>
                                            </button>
                                        </div>
                                    </div>`;
                                }
                            });
                        });
                    });
                }
            }));
            if (!found) { html += `<div class="text-center p-8 opacity-60"><i class="ph-fill ph-magnifying-glass text-6xl text-slate-400 mb-3"></i><h4 class="text-lg font-bold text-slate-500">لا توجد نتائج مطابقة لبحثك في مستواك.</h4></div>`; }
            html += `</div></div>`; container.innerHTML = html;
        };
        
        // تم التعديل: تصفية السنوات الخاصة بالأدمن (لا تعتمد على onSnapshot بعد الآن)
        window.filterMainStudents = (mainType) => {
            window.adminMainFilter = mainType;
            window.adminSubFilter = 'all'; 
            
            ['all', 'middle', 'high'].forEach(t => {
                let btn = document.getElementById(`filter-main-${t}`);
                if(btn) {
                    if(t === mainType) { btn.classList.add('bg-white', 'dark:bg-slate-700', 'text-blue-600', 'dark:text-white', 'shadow-sm'); btn.classList.remove('text-slate-500', 'dark:text-slate-400'); } 
                    else { btn.classList.remove('bg-white', 'dark:bg-slate-700', 'text-blue-600', 'dark:text-white', 'shadow-sm'); btn.classList.add('text-slate-500', 'dark:text-slate-400'); }
                }
            });

            const subContainer = document.getElementById('sub-filter-container');
            if (mainType === 'all') {
                subContainer.classList.add('hidden'); subContainer.classList.remove('flex');
            } else {
                subContainer.classList.remove('hidden'); subContainer.classList.add('flex');
                let html = `<button onclick="filterSubStudents('all')" id="filter-sub-all" class="px-4 py-1.5 rounded-lg font-black text-xs bg-indigo-600 text-white shadow-sm transition-all flex items-center gap-1"><i class="ph-fill ph-circles-four"></i> كل السنوات</button>`;
                
                if (mainType === 'middle') {
                    const years = [{id: 'm_y1', t: 'الأولى متوسط'}, {id: 'm_y2', t: 'الثانية متوسط'}, {id: 'm_y3', t: 'الثالثة متوسط'}, {id: 'm_y4', t: 'الرابعة متوسط'}];
                    years.forEach(y => { html += `<button onclick="filterSubStudents('${y.id}')" id="filter-sub-${y.id}" class="px-4 py-1.5 rounded-lg font-black text-xs bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center gap-1"><i class="ph-fill ph-door"></i> ${y.t}</button>`; });
                } else if (mainType === 'high') {
                    const years = [{id: 'h_y1', t: 'أولى ثانوي'}, {id: 'h_y2', t: 'الثانية ثانوي'}, {id: 'h_y3', t: 'الثالثة ثانوي'}];
                    years.forEach(y => { html += `<button onclick="filterSubStudents('${y.id}')" id="filter-sub-${y.id}" class="px-4 py-1.5 rounded-lg font-black text-xs bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center gap-1"><i class="ph-fill ph-door"></i> ${y.t}</button>`; });
                }
                subContainer.innerHTML = html;
            }
            renderAdminTable(); // تصفية النتائج الحالية (Client-side)
        };

        window.filterSubStudents = (subType) => {
            window.adminSubFilter = subType;
            const subContainer = document.getElementById('sub-filter-container');
            if(subContainer) {
                Array.from(subContainer.children).forEach(btn => {
                    if (btn.id === `filter-sub-${subType}`) {
                        btn.className = "px-4 py-1.5 rounded-lg font-black text-xs bg-indigo-600 text-white shadow-sm transition-all flex items-center gap-1";
                    } else {
                        btn.className = "px-4 py-1.5 rounded-lg font-black text-xs bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center gap-1";
                    }
                });
            }
            renderAdminTable(); // تصفية النتائج الحالية (Client-side)
        };

        window.toggleSelectAll = () => { const state = document.getElementById('select-all-cb').checked; document.querySelectorAll('.student-cb').forEach(cb => cb.checked = state); };
        
        window.toggleUserStatus = async (uid, isApproved, phone) => {
            if (isApproved) {
                if(await confirmAction("هل أنت متأكد من إلغاء تفعيل هذا الحساب؟")) {
                    await updateDoc(doc(usersCol, uid), { approved: false });
                    showToast("تم إلغاء التفعيل");
                    window.loadAdminPage('init'); // تحديث سريع للبيانات
                }
            } else {
                let waLink = null;
                if (phone) {
                    let waMessage = encodeURIComponent("السلام عليكم. معكم منصة المجتهد للعلوم الفيزيائية نعلمكم أنه تم قبول إبنكم على مستوى المنصة نتمنى له النجاح والتوفيق. لأي إستفسار راسلونا عبر المنصة");
                    waLink = `https://wa.me/213${phone.substring(1)}?text=${waMessage}`;
                }
                let win = null; if(waLink) win = window.open(waLink, '_blank'); 
                
                try {
                    await updateDoc(doc(usersCol, uid), { approved: true });
                    showToast("تم تفعيل الحساب بنجاح ✅");
                    window.loadAdminPage('init'); // تحديث سريع للبيانات
                } catch(e) {
                    if(win) win.close(); showToast("حدث خطأ أثناء التفعيل", "error");
                }
            }
        };

        window.bulkAction = async (action) => {
            const checked = Array.from(document.querySelectorAll('.student-cb:checked')).map(cb => cb.value);
            if(checked.length === 0) return showToast("يرجى تحديد تلميذ واحد على الأقل", "error");
            
            const actionText = action === 'approve' ? 'تفعيل' : (action === 'deactivate' ? 'إلغاء تفعيل' : 'حذف نهائي لـ');
            if(!await confirmAction(`هل أنت متأكد من ${actionText} ${checked.length} حساب(ات)؟`)) return;

            showToast("جاري تنفيذ الإجراء، يرجى الانتظار...", "success");

            for(let username of checked) {
                if(action === 'approve') { await updateDoc(doc(usersCol, username), { approved: true }); } 
                else if (action === 'deactivate') { await updateDoc(doc(usersCol, username), { approved: false }); } 
                else if (action === 'delete') { await deleteDoc(doc(usersCol, username)); }
            }
            showToast(`تم ${actionText} الحسابات المحددة بنجاح 🚀`);
            document.getElementById('select-all-cb').checked = false;
            window.loadAdminPage('init'); // تحديث سريع
        };

        window.loadLeaderboard = async () => {
             if(!window.currentUserRecord || window.currentUserRecord.role === 'admin') return;
             
             try {
                 // جلب تلاميذ نفس المستوى فقط
                 const q = query(usersCol, where('level', '==', window.currentUserRecord.level), where('approved', '==', true), limit(50));
                 const snap = await getDocs(q);
                 window.allStudentsProgress = [];
                 snap.forEach(d => {
                      let data = d.data();
                      // نعتمد على حقل xp المحدث مسبقاً بدلاً من حسابه لكل مستخدم
                      let currentXp = data.xp || calculateProgressXP(data.level, data, window.currentSections).xp;
                      window.allStudentsProgress.push({ id: d.id, level: data.level, xp: currentXp, approved: data.approved });
                 });
                 renderLeaderboard();
             } catch(e) { console.error("Error loading leaderboard", e); }
        };

        const renderLeaderboard = () => {
            if(!window.currentUserRecord || window.currentUserRecord.role === 'admin') return;
            const container = document.getElementById('leaderboard-container');
            container.innerHTML = '';
            
            // تحديد أفضل 10 تلاميذ فقط
            let levelMates = window.allStudentsProgress.sort((a, b) => b.xp - a.xp).slice(0, 10);
            
            if(levelMates.length === 0) { container.innerHTML = `<div class="flex flex-col items-center justify-center p-6 opacity-50"><i class="ph-fill ph-ghost text-5xl mb-2"></i><div class="text-slate-500 dark:text-slate-400 font-bold text-center">لا يوجد منافسون بعد.. كن أنت المتصدر!</div></div>`; return; }

            let html = '<div class="flex flex-col gap-2">';
            levelMates.forEach((student, index) => {
                let rank = index + 1; let rankClass = ''; let medal = '';
                if(rank === 1) { 
                rankClass = 'rank-1 shadow-sm border border-amber-200 dark:border-amber-800'; 
                medal = `<span class="text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 rounded-full w-8 h-8 flex items-center justify-center text-sm font-black shadow-inner">1</span>`; 
            }
            else if(rank === 2) { 
                rankClass = 'rank-2 shadow-sm border border-slate-200 dark:border-slate-600'; 
                medal = `<span class="text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-full w-8 h-8 flex items-center justify-center text-sm font-black shadow-inner">2</span>`; 
            }
            else if(rank === 3) { 
                rankClass = 'rank-3 shadow-sm border border-orange-200 dark:border-orange-800'; 
                medal = `<span class="text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/50 rounded-full w-8 h-8 flex items-center justify-center text-sm font-black shadow-inner">3</span>`; 
            }
            else { 
                rankClass = 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700'; 
                medal = `<span class="text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-full w-7 h-7 flex items-center justify-center text-xs font-black">${rank}</span>`; 
            }
                let isMe = student.id === window.currentUserRecord.username;
                html += `
                    <div class="leaderboard-row flex items-center justify-between p-3 rounded-2xl ${rankClass} ${isMe ? 'ring-2 ring-blue-500 shadow-md scale-[1.02] z-10' : ''}">
                        <div class="flex items-center gap-3">
                            <div class="text-2xl w-6 flex justify-center">${medal}</div>
                            <div class="text-slate-700 dark:text-slate-200 font-bold text-sm ${isMe ? 'text-blue-700 dark:text-blue-400 font-black' : ''}">${isMe ? 'أنت (بطل المنصة)' : student.id}</div>
                        </div>
                        <div class="bg-gradient-to-r from-emerald-400 to-teal-500 text-white px-3 py-1 rounded-lg text-xs font-black shadow-inner flex items-center gap-1">${student.xp} XP</div>
                    </div>`;
            });
            html += '</div>'; container.innerHTML = html;
        };

        const renderAdminTable = () => {
            const tbody = document.getElementById('students-table-body');
            tbody.innerHTML = ''; 
            let levelStats = {}; 
            
            const searchInput = document.getElementById('admin-student-search');
            const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';

            // تم التعديل: التصفية تتم فقط على الصفحة الحالية (50 مستخدم كأقصى حد)
            let displayCount = 0;

            window.adminUsersList.forEach(d => {
                const data = d.data;
                if(data.level) levelStats[data.level] = (levelStats[data.level] || 0) + 1;

                let isMiddle = data.level && data.level.startsWith('m_');
                let isHigh = data.level && data.level.startsWith('h_');
                
                if(window.adminMainFilter === 'middle' && !isMiddle) return;
                if(window.adminMainFilter === 'high' && !isHigh) return;
                if(window.adminSubFilter !== 'all' && data.level !== window.adminSubFilter) return;

                if (searchQuery) {
                    const studentName = d.id.toLowerCase();
                    const parentName = (data.parentName || '').toLowerCase();
                    if (!studentName.includes(searchQuery) && !parentName.includes(searchQuery)) {
                        return; 
                    }
                }

                displayCount++; 

                let levelDisplay = data.level ? (levelNames[data.level] || data.level) : "غير محدد";
                let prog = calculateProgressXP(data.level, data, window.currentSections);
                
                let waProgMsg = encodeURIComponent(`السلام عليكم ولي أمر التلميذ(ة) ${d.id}. نعلمكم من منصة المجتهد للعلوم الفيزيائية أن نسبة إنجاز ابنكم في الدروس هي ${prog.percent}% بمجموع نقاط ${prog.xp} XP. لأي استفسار يرجى مراسلتنا.`);
                let waProgLink = data.phoneNumber ? `https://wa.me/213${data.phoneNumber.substring(1)}?text=${waProgMsg}` : '#';

                               let parentInfo = data.parentName ? 
                    `<div class="flex items-center flex-wrap gap-2">
                        <span class="font-black text-slate-800 dark:text-slate-200">${data.parentName}</span>
                        ${data.phoneNumber ? `<a href="${waProgLink}" target="_blank" class="text-[#25D366] hover:text-[#128C7E] transition hover:scale-110" title="إعلام بالتقدم عبر الواتساب"><i class="ph-fill ph-whatsapp-logo text-2xl drop-shadow-sm"></i></a>` : ''}
                        
                        <!-- زر إشعار نسيان كلمة المرور -->
                        ${data.passwordResetRequest ? `<button onclick="resolvePasswordReset('${d.id}')" class="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded-lg text-xs font-black animate-pulse border border-red-200 dark:border-red-800 flex items-center gap-1 hover:bg-red-100 transition-colors" title="التلميذ يطلب كلمة المرور"><i class="ph-bold ph-key"></i> إظهار الكلمة</button>` : ''}
                    </div>` 
                    : '<div class="text-sm text-slate-400 dark:text-slate-500 font-bold">غير متوفر</div>';


                let unreadCount = window.adminChatsData[d.id]?.unreadAdmin || 0;
                let chatBadge = unreadCount > 0 ? `<span class="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full animate-bounce shadow-md border border-white">${unreadCount}</span>` : '';

                let statusBtn = data.approved 
                    ? `<button onclick="toggleUserStatus('${d.id}', true, '${data.phoneNumber||''}')" aria-label="تغيير الحالة" class="px-4 py-1.5 rounded-full text-xs font-black shadow-sm bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:scale-105 transition" title="انقر لإلغاء التفعيل">مفعل ✅</button>`
                    : `<button onclick="toggleUserStatus('${d.id}', false, '${data.phoneNumber||''}')" aria-label="تغيير الحالة" class="px-4 py-1.5 rounded-full text-xs font-black shadow-sm bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:scale-105 transition" title="اضغط للتفعيل ومراسلة الولي">انتظار ⏳</button>`;

                let passDisplay = data.password ? data.password : "مفقودة ⚠";
                
                const badgeInfo = getStudentBadge(prog.xp);
                const streakCount = data.streak || 0;

                tbody.innerHTML += `
                    <tr class="hover:bg-blue-50/40 dark:hover:bg-blue-900/20 transition duration-200 group">
                        <td class="p-4 text-center border-b border-slate-100 dark:border-slate-700"><input type="checkbox" aria-label="تحديد التلميذ" class="student-cb custom-cb" value="${d.id}"></td>
                        <td class="p-4 border-b border-slate-100 dark:border-slate-700">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 text-2xl flex-shrink-0 shadow-inner border border-blue-200/50 dark:border-blue-800/50"><i class="ph-fill ph-user"></i></div>
                                <div>
                                    <div class="font-black text-slate-800 dark:text-white text-lg group-hover:text-blue-600 transition">${d.id}</div>
                                    <div class="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1 flex items-center gap-1.5"><i class="ph-fill ph-key opacity-70"></i> <span class="text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-200/50 dark:border-blue-800/50">${passDisplay}</span></div>
                                </div>
                            </div>
                            <div class="mt-3 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">${parentInfo}</div>
                        </td>
                        <td class="p-4 text-sm font-black text-slate-600 dark:text-slate-300 text-center border-b border-slate-100 dark:border-slate-700">${levelDisplay}</td>
                        <td class="p-4 text-center border-b border-slate-100 dark:border-slate-700">
                            <div class="flex items-center justify-center gap-2 mb-1">
                                <div class="inline-flex bg-gradient-to-r from-emerald-400 to-teal-500 text-white px-2 py-1 rounded text-xs font-black shadow-sm">${prog.xp} XP</div>
                                <div class="inline-flex bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400 px-2 py-1 rounded text-xs font-black shadow-sm border border-orange-200 dark:border-orange-800"><i class="ph-fill ph-fire ml-1"></i>${streakCount}</div>
                            </div>
                            <div class="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 flex justify-center items-center gap-1"><span class="${badgeInfo.cls.replace('border', '')} px-1.5 py-0.5 rounded-sm">${badgeInfo.icon} ${badgeInfo.name}</span> إنجاز: ${prog.percent}%</div>
                        </td>
                        <td class="p-4 text-center border-b border-slate-100 dark:border-slate-700">${statusBtn}</td>
                        <td class="p-4 text-left border-b border-slate-100 dark:border-slate-700">
                            <div class="flex gap-2 justify-end">
                                <button onclick="loginAsStudent('${d.id}')" aria-label="مراقبة حساب التلميذ" class="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-3 py-1.5 rounded-lg text-xs font-black hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition border border-indigo-200 dark:border-indigo-800 shadow-sm flex items-center gap-1" title="مراقبة حساب التلميذ"><i class="ph-bold ph-sign-in"></i> دخول للحساب</button>
                                <button onclick="openChat('${d.id}')" aria-label="مراسلة التلميذ" class="relative icon-btn w-9 h-9 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-lg shadow-sm border border-blue-200 dark:border-blue-800" title="مراسلة"><i class="ph-bold ph-chat-circle-dots"></i>${chatBadge}</button>
                            </div>
                        </td>
                    </tr>`;
            });

            if (displayCount === 0) {
                 tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 opacity-60"><i class="ph-fill ph-ghost text-4xl text-slate-400 mb-2"></i><br>لا يوجد تلاميذ في هذه الصفحة</td></tr>';
            }
        };

        // تم التعديل: تفعيل نظام الصفحات (Pagination) لتقليل تكلفة القراءة
        window.loadAdminPage = async (direction = 'init') => {
            const tbody = document.getElementById('students-table-body');
            tbody.innerHTML = '<tr><td colspan="6" class="text-center p-10"><i class="ph-bold ph-spinner animate-spin text-3xl text-blue-500"></i> جاري التحميل...</td></tr>';
            
            const pageSize = 50; 
            let queryConstraints = [where('role', '==', 'student')];

            const searchQuery = document.getElementById('admin-student-search').value.trim();
            if (searchQuery) {
                // تصحيح البحث باستخدام documentId
                queryConstraints.push(
                    where(documentId(), '>=', searchQuery.toLowerCase()), 
                    where(documentId(), '<=', searchQuery.toLowerCase() + '\uf8ff'),
                    orderBy(documentId())
                );
                direction = 'init'; 
            } else {
                queryConstraints.push(orderBy(documentId())); // الترتيب الافتراضي
            }

            if (direction === 'next' && window.adminLastVisible) {
                window.adminPageCursors.push(window.adminFirstVisible);
                queryConstraints.push(startAfter(window.adminLastVisible));
                window.adminCurrentPage++;
            } else if (direction === 'prev' && window.adminPageCursors.length > 0) {
                let prevStart = window.adminPageCursors.pop();
                queryConstraints.push(startAt(prevStart));
                window.adminCurrentPage--;
            } else if (direction === 'init') {
                window.adminCurrentPage = 1;
                window.adminPageCursors = [];
            }
            queryConstraints.push(limit(pageSize));

            try {
                const q = query(usersCol, ...queryConstraints);
                const snap = await getDocs(q);

                if (snap.empty) {
                    if (direction === 'next') showToast('لا يوجد المزيد من التلاميذ في الصفحة التالية');
                    if (direction === 'init') tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 opacity-60">لا يوجد بيانات مطابقة</td></tr>';
                    else renderAdminTable(); // إعادة عرض آخر بيانات ناجحة
                    return;
                }

                window.adminFirstVisible = snap.docs[0];
                window.adminLastVisible = snap.docs[snap.docs.length - 1];

                window.adminUsersList = [];
                snap.forEach(d => { window.adminUsersList.push({ id: d.id, data: d.data() }); });
                
                renderAdminTable();
                document.getElementById('page-indicator').innerText = `الصفحة ${window.adminCurrentPage}`;

            } catch (e) {
                console.error("Pagination Error:", e);
                showToast("حدث خطأ في تحميل البيانات", "error");
            }
        };

                const startAdminListeners = () => {
            // 1. جلب الإحصائيات
            window.loadAdminStats();

            // 2. مستمع المنهج الدراسي
            unsubscribeProgram = onSnapshot(programCol, (snapshot) => {
                let mid = null, hi = null, meta = null;
                snapshot.forEach(d => {
                    if(d.id === 'part_middle') mid = d.data();
                    if(d.id === 'part_high') hi = d.data();
                    if(d.id === 'meta') meta = d.data();
                });
                
                if(mid && hi && meta) {
                    window.currentSections = [mid, hi];
                    window.currentUpdates = meta.latestUpdates || [];
                    if (meta.liveStreamUrl !== undefined) {
                        window.currentLiveUrl = meta.liveStreamUrl;
                        window.updateLiveStreamUI(meta.liveStreamUrl);
                    }
                    if (!document.getElementById('admin-content-section').classList.contains('hidden')) {
                        window.renderProgramUI(window.currentSections, 'admin-program-view', true);
                    }
                }
            });

            // --- نظام الإشعارات الموحد للأستاذ (دردشة + كلمات مرور) ---
            window.adminAlerts = { chats: {}, resets: {} };

            window.renderAdminAlerts = () => {
                let totalUnread = 0;
                let notifHtml = '';

                // 1. إشعارات طلبات كلمات المرور
                for (let username of Object.keys(window.adminAlerts.resets)) {
                    totalUnread++;
                    let studentName = username.replace(/_/g, ' ');
                    notifHtml += `
                        <button onclick="openAdminSection('accounts'); document.getElementById('admin-student-search').value='${username}'; window.loadAdminPage('init');" class="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition border border-red-100 dark:border-red-800/50 group text-right w-full mb-2 shadow-sm">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300 flex items-center justify-center text-xl shadow-inner animate-pulse"><i class="ph-fill ph-key"></i></div>
                                <div>
                                    <div class="font-black text-slate-800 dark:text-white text-sm group-hover:text-red-600 transition">${studentName}</div>
                                    <div class="text-xs text-red-500 dark:text-red-400 font-bold mt-0.5">طلب استرجاع كلمة المرور!</div>
                                </div>
                            </div>
                            <i class="ph-bold ph-arrow-left text-red-500 text-xl group-hover:-translate-x-1 transition"></i>
                        </button>
                    `;
                }

                // 2. إشعارات الدردشة
                for (let [username, data] of Object.entries(window.adminAlerts.chats)) {
                    totalUnread += data.unreadAdmin;
                    let studentName = username.replace(/_/g, ' ');
                    notifHtml += `
                        <button onclick="openChat('${username}')" class="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/40 transition border border-amber-100 dark:border-amber-800/50 group text-right w-full mb-2 shadow-sm">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xl shadow-inner"><i class="ph-fill ph-user"></i></div>
                                <div>
                                    <div class="font-black text-slate-800 dark:text-white text-sm group-hover:text-amber-600 transition">${studentName}</div>
                                    <div class="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">لديك ${data.unreadAdmin} رسالة/إشعار</div>
                                </div>
                            </div>
                            <i class="ph-bold ph-chat-circle-dots text-amber-500 text-xl group-hover:scale-110 transition"></i>
                        </button>
                    `;
                }

                const globalBadge = document.getElementById('admin-global-badge');
                const notifContainer = document.getElementById('admin-notifications-container');
                
                if (globalBadge) {
                    if (totalUnread > 0) {
                        globalBadge.innerText = totalUnread > 99 ? '99+' : totalUnread;
                        globalBadge.classList.remove('hidden');
                        if(notifContainer) notifContainer.innerHTML = notifHtml;
                    } else {
                        globalBadge.classList.add('hidden');
                        if(notifContainer) notifContainer.innerHTML = '<div class="text-center text-slate-500 dark:text-slate-400 text-sm font-bold p-4 opacity-70"><i class="ph-fill ph-bell-slash text-4xl mb-2"></i><br>لا توجد إشعارات جديدة</div>';
                    }
                }
            };
            // 3. التقاط طلبات الدردشة
            if(unsubscribeChatMeta) unsubscribeChatMeta();
            const unreadQuery = query(collection(db, chatsPath), where('unreadAdmin', '>', 0));
            unsubscribeChatMeta = onSnapshot(unreadQuery, (snapshot) => {
                window.adminAlerts.chats = {}; 
                window.adminChatsData = {}; 
                snapshot.forEach(d => { 
                    let data = d.data();
                    window.adminChatsData[d.id] = data; 
                    if(data.unreadAdmin > 0) {
                        window.adminAlerts.chats[d.id] = data;
                    }
                }); 
                renderAdminTable(); 
                if (typeof window.renderAdminAlerts === 'function') window.renderAdminAlerts();
            });

            // 4. التقاط طلبات كلمات المرور (بدون نافذة منبثقة)
            const resetQuery = query(usersCol, where('passwordResetRequest', '==', true));
            if (window.unsubscribeResetRequests) window.unsubscribeResetRequests();
            window.unsubscribeResetRequests = onSnapshot(resetQuery, (snapshot) => {
                window.adminAlerts.resets = {}; 
                
                snapshot.forEach((doc) => {
                    window.adminAlerts.resets[doc.id] = doc.data();
                    // تحديث الزر الأحمر في القائمة فوراً
                    const userIndex = window.adminUsersList.findIndex(u => u.id === doc.id);
                    if(userIndex !== -1) {
                        window.adminUsersList[userIndex].data.passwordResetRequest = true;
                    }
                });
                
                if (typeof renderAdminTable === 'function') renderAdminTable();
                if (typeof window.renderAdminAlerts === 'function') window.renderAdminAlerts();
            });
        };


        // دالة جلب الإحصائيات الفعالة (بدون تكلفة باهظة)
        window.loadAdminStats = async () => {
            const container = document.getElementById('header-stats-container');
            if(!container) return;
            container.innerHTML = '<div class="col-span-2 text-center text-sm font-bold text-slate-500 py-4"><i class="ph-bold ph-spinner animate-spin text-2xl mb-2"></i><br>جاري جلب الإحصائيات...</div>';
            
            try {
                const levels = ["m_y1", "m_y2", "m_y3", "m_y4", "h_y1", "h_y2", "h_y3"];
                let total = 0;
                const colors = ['bg-blue-50 text-blue-700 border-blue-200', 'bg-emerald-50 text-emerald-700 border-emerald-200', 'bg-amber-50 text-amber-700 border-amber-200', 'bg-purple-50 text-purple-700 border-purple-200'];
                
                // حساب عدد التلاميذ لكل مستوى باستخدام Aggregation Query (سريعة جداً وتكلفتها معدومة تقريباً)
                let fetchPromises = levels.map(async (lvl, i) => {
                    const q = query(usersCol, where('role', '==', 'student'), where('level', '==', lvl));
                    const snapshot = await getCountFromServer(q);
                    const count = snapshot.data().count;
                    if(count > 0) {
                        total += count;
                        let c = colors[i % colors.length];
                        return `<div class="p-3 rounded-xl border flex justify-between items-center text-center shadow-sm ${c} dark:bg-slate-700/50 dark:border-slate-600 dark:text-white"><span class="text-xs font-black">${levelNames[lvl]}</span><span class="text-lg font-black">${count}</span></div>`;
                    }
                    return '';
                });

                const results = await Promise.all(fetchPromises);
                document.getElementById('hover-total-students').innerText = total;
                container.innerHTML = results.join('') || '<div class="col-span-2 text-center text-sm font-bold text-slate-500">لا يوجد تلاميذ حالياً</div>';
            } catch(e) {
                console.error("Stats Error:", e);
                container.innerHTML = '<div class="col-span-2 text-center text-red-500 text-sm font-bold">خطأ في جلب البيانات</div>';
            }
        };

        const startStudentListeners = () => {
            let isInitialProgramLoad = true;

            // تم التعديل: استماع للمستندات المجزأة بدلاً من main
            // تحديد الطور الخاص بالتلميذ لجلب بياناته فقط
let targetPart = window.currentUserRecord.level.startsWith('m_') ? 'part_middle' : 'part_high';
const progQuery = query(programCol, where(documentId(), 'in', ['meta', targetPart]));

unsubscribeProgram = onSnapshot(progQuery, (snapshot) => {
    let loadedSections = []; 
    let meta = null;

    snapshot.forEach(d => {
        if(d.id === 'meta') meta = d.data();
        else loadedSections.push(d.data());
    });

    if(loadedSections.length > 0 && meta) {
        window.currentSections = loadedSections;

                    window.currentUpdates = meta.latestUpdates || [];

                    if (meta.liveStreamUrl !== undefined) {
                        window.currentLiveUrl = meta.liveStreamUrl;
                        window.updateLiveStreamUI(meta.liveStreamUrl);
                    }

                    if(document.getElementById('lesson-search').value.trim() === '') { 
                        window.renderProgramUI(window.currentSections, 'student-program-view', false); 
                    }
                    updateProgressUI(window.currentSections); 

                    if (window.currentUserRecord && window.currentUserRecord.role === 'student') {
                        let myUpdates = window.currentUpdates.filter(u => u.level === window.currentUserRecord.level);
                        let seenUpdates = JSON.parse(localStorage.getItem(`seen_updates_${window.currentUserRecord.username}`)) || [];

                        if (!isInitialProgramLoad) {
                            myUpdates.forEach(u => {
                                if (!seenUpdates.includes(u.id) && (Date.now() - u.timestamp < 15000)) {
                                    showToast(`محتوى جديد متاح: ${u.title}`, 'success');
                                }
                            });
                        }
                        
                        renderStudentNotifications(myUpdates, seenUpdates);
                    }
                    
                    isInitialProgramLoad = false;
                }
            });
            
            // تم التعديل: التلميذ يستمع لمستنده الخاص فقط لمنع قراءة كل المستخدمين
            if(unsubscribeStudentData) unsubscribeStudentData();
            unsubscribeStudentData = onSnapshot(doc(usersCol, window.currentUserRecord.username), (docSnap) => {
                if(docSnap.exists()) {
                    let data = docSnap.data();
                    window.currentUserRecord.clickedLinks = data.clickedLinks || [];
                    window.currentUserRecord.phoneNumber = data.phoneNumber || ''; 
                    
                    if(data.streak !== undefined) window.currentUserRecord.streak = data.streak;
                    if(data.lastLoginDate !== undefined) window.currentUserRecord.lastLoginDate = data.lastLoginDate;
                    
                    updateProgressUI(window.currentSections || []); 
                    
                    if(document.getElementById('lesson-search').value.trim() === '') { window.renderProgramUI(window.currentSections || [], 'student-program-view', false); } 
                    else { window.executeStudentSearch(); }
                }
            });

            // تحميل المتصدرين (لوحة الشرف) مرة واحدة عند الدخول
            window.loadLeaderboard();

            if(unsubscribeChatMeta) unsubscribeChatMeta();
            unsubscribeChatMeta = onSnapshot(doc(db, chatsPath, window.currentUserRecord.username), (docSnap) => {
                const badge = document.getElementById('student-chat-badge');
                if(docSnap.exists() && docSnap.data().unreadStudent > 0) { badge.innerText = docSnap.data().unreadStudent; badge.classList.remove('hidden'); } 
                else { badge.classList.add('hidden'); }
            });
        };

        window.openChat = async (targetUser) => {
            window.activeChatUser = targetUser; 
            let displayTarget = window.currentUserRecord.role === 'admin' ? targetUser : "الأستاذ";
            document.getElementById('chat-target-name').innerText = displayTarget;
            
            const modal = document.getElementById('chat-modal');
            modal.classList.remove('hidden'); modal.classList.add('flex');
            
            let chatRoomId = window.currentUserRecord.role === 'admin' ? targetUser : window.currentUserRecord.username;
            let messagesRef = collection(db, chatsPath, chatRoomId, 'messages');
            
            const chatDocRef = doc(db, chatsPath, chatRoomId);
            await setDoc(chatDocRef, { [window.currentUserRecord.role === 'admin' ? 'unreadAdmin' : 'unreadStudent']: 0 }, { merge: true });

            if(unsubscribeChat) unsubscribeChat();
            
            const q = query(messagesRef, orderBy("timestamp", "asc"), limit(100));
            
            unsubscribeChat = onSnapshot(q, (snapshot) => {
                let msgs = []; snapshot.forEach(d => msgs.push({ id: d.id, ...d.data() }));
                
                let chatHtml = '';
                msgs.forEach(m => {
                    let isMine = m.sender === window.currentUserRecord.role; let isAdminMsg = m.sender === 'admin';
                    let bubbleClass = isMine ? 'chat-mine dark:bg-blue-900/30 dark:border-blue-800' : 'chat-other dark:bg-slate-800 dark:border-slate-700';
                    let alignment = isMine ? 'self-end' : 'self-start';
                    let textColor = isAdminMsg && !isMine ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-700 dark:text-slate-200';
                    
                    if (m.isSystemMessage) {
                        bubbleClass = 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 border-2 w-full max-w-[95%] text-center mx-auto shadow-md';
                        alignment = 'self-center';
                        textColor = 'text-amber-900 dark:text-amber-400 font-black';
                    }

                    chatHtml += `<div class="chat-bubble ${bubbleClass} ${alignment} shadow-sm transition hover:shadow-md"><p class="text-[14px] whitespace-pre-wrap break-words ${textColor}" dir="auto">${escapeHtml(m.text)}</p></div>`;
                });
                
                const msgBox = document.getElementById('chat-messages');
                msgBox.innerHTML = chatHtml || `<div class="h-full flex flex-col items-center justify-center opacity-50"><i class="ph-fill ph-hand-waving text-6xl text-slate-400 mb-3"></i><div class="text-center text-slate-500 font-bold bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-sm">أهلاً بك! يمكنك المراسلة هنا.</div></div>`;
                msgBox.scrollTop = msgBox.scrollHeight;
                if (window.activeChatUser) setDoc(doc(db, chatsPath, chatRoomId), { [window.currentUserRecord.role === 'admin' ? 'unreadAdmin' : 'unreadStudent']: 0 }, { merge: true });
            }, e => { console.error("Chat Error", e); });
        };

        window.closeChat = () => { document.getElementById('chat-modal').classList.add('hidden'); document.getElementById('chat-modal').classList.remove('flex'); if(unsubscribeChat) unsubscribeChat(); window.activeChatUser = null; };

        window.sendChatMessage = async () => {
            let inputEl = document.getElementById('chat-input'); let text = inputEl.value.trim();
            if(!text) return; 
            
            let btn = document.getElementById('send-msg-btn'); const origHtml = btn.innerHTML;
            btn.disabled = true; btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i>';

            try {
                let chatRoomId = window.currentUserRecord.role === 'admin' ? window.activeChatUser : window.currentUserRecord.username;
                let chatDocRef = doc(db, chatsPath, chatRoomId); let messagesRef = collection(db, chatsPath, chatRoomId, 'messages');
                await setDoc(doc(messagesRef, Date.now().toString()), { sender: window.currentUserRecord.role, text: text, timestamp: Date.now() });
                await setDoc(chatDocRef, { [window.currentUserRecord.role === 'admin' ? 'unreadStudent' : 'unreadAdmin']: increment(1) }, { merge: true });
                inputEl.value = ''; setTimeout(() => { const msgBox = document.getElementById('chat-messages'); msgBox.scrollTop = msgBox.scrollHeight; }, 100);
            } catch(e) { console.error(e); showToast("فشل الإرسال. تأكد من اتصالك بالإنترنت", "error"); }
            btn.disabled = false; btn.innerHTML = origHtml;
        };

        // تم التعديل: تحديث الرابط يتم على المستند الفرعي المناسب للطور
        window.adminAddLink = async (pIdx, yIdx, bIdx, cat, branchId) => {
            let title = document.getElementById(`title_${branchId}_${cat}`).value.trim(); 
            let url = document.getElementById(`url_${branchId}_${cat}`).value.trim();
            
            if(!title || !url) return showToast("يرجى إدخال العنوان والرابط", "error");
            if(!url.startsWith('http')) url = 'https://' + url;
            
            let sections = window.currentSections;
            if (!sections[pIdx].years[yIdx].branches[bIdx].categories[cat]) {
                sections[pIdx].years[yIdx].branches[bIdx].categories[cat] = [];
            }
            sections[pIdx].years[yIdx].branches[bIdx].categories[cat].push({title, url});

            let levelId = sections[pIdx].years[yIdx].id;
            let branchTitle = sections[pIdx].years[yIdx].branches[bIdx].title;
            
            let updates = window.currentUpdates || [];
            updates.push({
                id: Date.now().toString(),
                title: title,
                level: levelId,
                branch: branchTitle,
                timestamp: Date.now()
            });
            if (updates.length > 50) updates = updates.slice(updates.length - 50);

            try {
                // تحديث مستند الطور المعني (المتوسط أو الثانوي) لتجنب الحجم الكبير
                const docRef = doc(programCol, sections[pIdx].id); 
                await updateDoc(docRef, { years: sections[pIdx].years }); 
                
                // تحديث مستند meta للإشعارات
                await updateDoc(doc(programCol, 'meta'), { latestUpdates: updates });
                showToast("تمت الإضافة بنجاح وتنبيه التلاميذ 📚");
            } catch (e) { console.error(e); showToast("خطأ في الإضافة", "error"); }
        };

        // تم التعديل: حذف الرابط من المستند الفرعي
        window.adminDeleteLink = async (pIdx, yIdx, bIdx, cat, lIdx) => {
            if(await confirmAction("هل أنت متأكد من مسح هذا الرابط نهائياً؟")) {
                let sections = window.currentSections;
                sections[pIdx].years[yIdx].branches[bIdx].categories[cat].splice(lIdx, 1);
                
                const docRef = doc(programCol, sections[pIdx].id); 
                await updateDoc(docRef, { years: sections[pIdx].years }); 
                showToast("تم مسح الرابط");
            }
        };

        window.adminEditLinkModal = (pIdx, yIdx, bIdx, cat, lIdx) => {
            let currentLink = window.currentSections[pIdx].years[yIdx].branches[bIdx].categories[cat][lIdx];
            document.getElementById('edit-link-title').value = currentLink.title; document.getElementById('edit-link-url').value = currentLink.url;
            window.currentEditParams = { pIdx, yIdx, bIdx, cat, lIdx };
            const modal = document.getElementById('edit-modal'); modal.classList.remove('hidden'); modal.classList.add('flex');
        };

        window.closeEditModal = () => { document.getElementById('edit-modal').classList.add('hidden'); document.getElementById('edit-modal').classList.remove('flex'); window.currentEditParams = null; };

        // تم التعديل: حفظ الرابط المعدل في المستند الفرعي
        window.saveEditedLink = async () => {
            let newTitle = document.getElementById('edit-link-title').value.trim(); let newUrl = document.getElementById('edit-link-url').value.trim();
            if(!newTitle || !newUrl) return showToast("يرجى إدخال العنوان والرابط", "error"); if(!newUrl.startsWith('http')) newUrl = 'https://' + newUrl;
            if(window.currentEditParams) {
                let { pIdx, yIdx, bIdx, cat, lIdx } = window.currentEditParams; let sections = window.currentSections;
                sections[pIdx].years[yIdx].branches[bIdx].categories[cat][lIdx] = { title: newTitle, url: newUrl };
                
                const docRef = doc(programCol, sections[pIdx].id); 
                await updateDoc(docRef, { years: sections[pIdx].years }); 
                showToast("تم التعديل بنجاح ✏️"); closeEditModal();
            }
        };

        const getEmptyStateHTML = (title) => `<div class="flex flex-col items-center justify-center p-6 text-center bg-white/50 dark:bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 h-32"><i class="ph-fill ph-folder-open text-4xl text-slate-300 dark:text-slate-600 mb-2"></i><h3 class="text-sm font-black text-slate-500 dark:text-slate-400">لا يوجد ${title} حالياً</h3></div>`;

        window.renderProgramUI = (sections, containerId, isAdmin) => {
            if(!sections) return; 
            window.currentSections = sections; 
            let html = '';
            
            if (isAdmin) {
                if (!window.adminContentStep) window.adminContentStep = 'parts';

                html += `<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">`;
                
                if (window.adminContentStep === 'parts') {
                    html += `<button onclick="returnToAdminDashboard()" class="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl flex items-center gap-2 font-black text-slate-700 dark:text-slate-300 transition-all shadow-sm border border-slate-200 dark:border-slate-600"><i class="ph-bold ph-arrow-right"></i> عودة للوحة الرئيسية</button>`;
                    html += `<h3 class="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2"><div class="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center text-xl shadow-inner"><i class="ph-fill ph-books"></i></div> اختيار الطور التعليمي</h3>`;
                }
                else if (window.adminContentStep === 'years') {
                    html += `<button onclick="window.adminContentStep='parts'; window.renderProgramUI(window.currentSections, 'admin-program-view', true);" class="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl flex items-center gap-2 font-black text-slate-700 dark:text-slate-300 transition-all shadow-sm border border-slate-200 dark:border-slate-600"><i class="ph-bold ph-arrow-right"></i> عودة للأطوار</button>`;
                    let part = sections.find(p => p.id === window.adminActivePart);
                    html += `<h3 class="text-2xl font-black text-slate-800 dark:text-white">إدارة سنوات: ${part.title}</h3>`;
                }
                else if (window.adminContentStep === 'branches') {
                    html += `<button onclick="window.adminContentStep='years'; window.renderProgramUI(window.currentSections, 'admin-program-view', true);" class="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl flex items-center gap-2 font-black text-slate-700 dark:text-slate-300 transition-all shadow-sm border border-slate-200 dark:border-slate-600"><i class="ph-bold ph-arrow-right"></i> عودة للسنوات</button>`;
                    let part = sections.find(p => p.id === window.adminActivePart);
                    let year = part.years.find(y => y.id === window.adminActiveYear[part.id]);
                    html += `<h3 class="text-2xl font-black text-slate-800 dark:text-white">إدارة وحدات: ${year.title}</h3>`;
                }
                else if (window.adminContentStep === 'details') {
                    html += `<button onclick="window.adminContentStep='branches'; window.renderProgramUI(window.currentSections, 'admin-program-view', true);" class="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl flex items-center gap-2 font-black text-slate-700 dark:text-slate-300 transition-all shadow-sm border border-slate-200 dark:border-slate-600"><i class="ph-bold ph-arrow-right"></i> عودة للوحدات</button>`;
                    let part = sections.find(p => p.id === window.adminActivePart);
                    let year = part.years.find(y => y.id === window.adminActiveYear[part.id]);
                    let branch = year.branches.find(b => b.id === window.adminActiveBranch[year.id]);
                    html += `<div class="text-left"><h3 class="text-2xl font-black text-blue-600 dark:text-blue-400 flex items-center justify-end gap-2">${getBranchIcon(branch.title)} ${branch.title}</h3><p class="text-sm font-bold text-slate-500 mt-1">${part.title} - ${year.title}</p></div>`;
                }
                html += `</div>`;

                if (window.adminContentStep === 'parts') {
                    html += `<div class="grid grid-cols-1 md:grid-cols-2 gap-6 animate-[fadeInTab_0.3s_ease]">`;
                    sections.forEach((part, idx) => {
                        let color = gridColors[idx % 7];
                        let icon = part.id === 'part_middle' ? '<i class="ph-fill ph-student"></i>' : '<i class="ph-fill ph-graduation-cap"></i>';
                        html += `<button onclick="window.adminActivePart='${part.id}'; window.adminContentStep='years'; window.renderProgramUI(window.currentSections, 'admin-program-view', true);" class="bg-gradient-to-br ${color} p-8 rounded-[2rem] shadow-lg hover:scale-[1.03] transition-all duration-300 flex flex-col items-center justify-center gap-4 text-center min-h-[220px]">
                            <div class="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-5xl shadow-inner mb-2">${icon}</div>
                            <h3 class="text-3xl font-black drop-shadow-sm">${part.title}</h3>
                        </button>`;
                    });
                    html += `</div>`;
                }
                else if (window.adminContentStep === 'years') {
                    let part = sections.find(p => p.id === window.adminActivePart);
                    html += `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-[fadeInTab_0.3s_ease]">`;
                    part.years.forEach((year, idx) => {
                        let color = gridColors[(idx + 2) % 7]; 
                        html += `<button onclick="window.adminActiveYear['${part.id}']='${year.id}'; window.adminContentStep='branches'; window.renderProgramUI(window.currentSections, 'admin-program-view', true);" class="bg-gradient-to-br ${color} p-6 rounded-[2rem] shadow-lg hover:scale-[1.03] transition-all duration-300 flex flex-col items-center justify-center gap-3 text-center min-h-[180px]">
                            <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-4xl shadow-inner"><i class="ph-fill ph-calendar-blank"></i></div>
                            <h3 class="text-2xl font-black drop-shadow-sm">${year.title}</h3>
                        </button>`;
                    });
                    html += `</div>`;
                }
                else if (window.adminContentStep === 'branches') {
                    let part = sections.find(p => p.id === window.adminActivePart);
                    let year = part.years.find(y => y.id === window.adminActiveYear[part.id]);
                    html += `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-[fadeInTab_0.3s_ease]">`;
                    year.branches.forEach((branch, idx) => {
                        let color = gridColors[idx % 7];
                        html += `<button onclick="window.adminActiveBranch['${year.id}']='${branch.id}'; window.adminContentStep='details'; window.renderProgramUI(window.currentSections, 'admin-program-view', true);" class="bg-gradient-to-br ${color} p-6 rounded-[2rem] shadow-lg hover:scale-[1.03] transition-all duration-300 flex flex-col items-center justify-center gap-4 text-center min-h-[200px]">
                            <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-4xl shadow-inner">${getBranchIcon(branch.title)}</div>
                            <h3 class="text-xl font-black drop-shadow-sm leading-snug">${branch.title}</h3>
                        </button>`;
                    });
                    html += `</div>`;
                }
                else if (window.adminContentStep === 'details') {
                    let pIdx = sections.findIndex(p => p.id === window.adminActivePart);
                    let part = sections[pIdx];
                    let yIdx = part.years.findIndex(y => y.id === window.adminActiveYear[part.id]);
                    let year = part.years[yIdx];
                    let bIdx = year.branches.findIndex(b => b.id === window.adminActiveBranch[year.id]);
                    let branch = year.branches[bIdx];

                    let cats = branch.id === 'm4_b5' ? ['past_exams', 'mock_exams'] : (branch.id.includes('_s') ? ['terms', 'exams'] : ['lessons', 'exercises']);
                    
                    html += `<div class="border-2 rounded-[2.5rem] p-5 md:p-8 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 shadow-sm animate-[fadeInTab_0.3s_ease]">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">`;
                    
                    cats.forEach(cat => {
                        let links = branch.categories[cat] || []; let conf = catConfig[cat];
                        let linksList = links.length ? links.map((lnk, lIdx) => `<div class="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm text-sm mb-3 group interactive-card hover:border-blue-300 transition-colors">
                            <a href="${lnk.url}" target="_blank" class="${conf.text} font-bold flex-1 leading-relaxed text-right hover:underline flex items-start sm:items-center gap-3 break-words" style="word-break: break-word; white-space: normal;">
                                <div class="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center flex-shrink-0 mt-1 sm:mt-0 shadow-inner"><i class="ph-bold ph-link text-xl"></i></div>
                                <span class="flex-1 text-base">${lnk.title}</span>
                            </a>
                            <div class="flex gap-2 flex-shrink-0 mr-4">
                                <button onclick="adminEditLinkModal(${pIdx}, ${yIdx}, ${bIdx}, '${cat}', ${lIdx})" aria-label="تعديل الرابط" class="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white bg-slate-50 hover:bg-amber-500 dark:bg-slate-700 dark:hover:bg-amber-600 rounded-xl transition shadow-sm"><i class="ph-bold ph-pencil text-lg"></i></button>
                                <button onclick="adminDeleteLink(${pIdx}, ${yIdx}, ${bIdx}, '${cat}', ${lIdx})" aria-label="حذف الرابط" class="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white bg-slate-50 hover:bg-red-500 dark:bg-slate-700 dark:hover:bg-red-600 rounded-xl transition shadow-sm"><i class="ph-bold ph-trash text-lg"></i></button>
                            </div>
                        </div>`).join('') : getEmptyStateHTML('محتوى');
                        
                        html += `<div class="${conf.bg} ${conf.border} p-6 rounded-[2rem] border flex flex-col h-full shadow-inner">
                            <h5 class="font-black ${conf.text} text-xl mb-5 flex items-center gap-3"><div class="w-12 h-12 rounded-full bg-white/60 dark:bg-slate-900/40 flex items-center justify-center text-2xl shadow-sm">${conf.icon}</div> ${conf.title}</h5>
                            <div class="mb-4 max-h-[400px] overflow-y-auto pr-2 scroll-smooth flex-1 custom-scrollbar">${linksList}</div>
                            <div class="mt-4 pt-6 border-t-2 border-slate-200/60 dark:border-slate-700/60 space-y-3 mt-auto">
                                <input type="text" id="title_${branch.id}_${cat}" aria-label="عنوان المحتوى" class="w-full text-sm font-bold p-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 bg-white dark:bg-slate-900 text-slate-700 dark:text-white transition-all shadow-sm" placeholder="عنوان المحتوى الجديد...">
                                <input type="text" id="url_${branch.id}_${cat}" aria-label="رابط المحتوى" class="w-full text-sm p-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 bg-white dark:bg-slate-900 text-slate-600 dark:text-white text-left font-bold transition-all shadow-sm" dir="ltr" placeholder="https://...">
                                <button onclick="adminAddLink(${pIdx}, ${yIdx}, ${bIdx}, '${cat}', '${branch.id}')" aria-label="إضافة" class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-base font-black py-4 rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 mt-2"><i class="ph-bold ph-plus-circle text-xl"></i> إضافة المحتوى</button>
                            </div>
                        </div>`;
                    });
                    html += `</div></div>`;
                }

            } else {
                let clickedLinks = window.currentUserRecord ? (window.currentUserRecord.clickedLinks || []) : [];
                let userLevel = window.currentUserRecord ? window.currentUserRecord.level : null;

                if (!window.studentViewMode) window.studentViewMode = 'grid';

                if (userLevel) {
                    let userYearData = null; sections.forEach(p => p.years.forEach(y => { if (y.id === userLevel) userYearData = y; }));
                    
                    if (userYearData && userYearData.branches && userYearData.branches.length > 0) {
                        
                        if (window.studentViewMode === 'grid') {
                            html += `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-[fadeInTab_0.3s_ease]">`;
                            
                            userYearData.branches.forEach((branch, idx) => {
                                let color = gridColors[idx % 7];
                                let branchLinksTotal = 0; let branchLinksClicked = 0;
                                let cats = branch.id === 'm4_b5' ? ['past_exams', 'mock_exams'] : (branch.id.includes('_s') ? ['terms', 'exams'] : ['lessons', 'exercises']);
                                cats.forEach(cat => {
                                    let links = branch.categories[cat] || []; branchLinksTotal += links.length;
                                    links.forEach((_, lIdx) => { if(clickedLinks.includes(`${branch.id}_${cat}_${lIdx}`)) branchLinksClicked++; });
                                });
                                let unitProg = branchLinksTotal === 0 ? 0 : Math.round((branchLinksClicked / branchLinksTotal) * 100);
                                
                                html += `<button onclick="window.studentActiveBranchTab='${branch.id}'; window.studentViewMode='details'; window.renderProgramUI(window.currentSections, 'student-program-view', false);" class="bg-gradient-to-br ${color} p-6 md:p-8 rounded-[2rem] shadow-lg hover:scale-[1.03] transition-all duration-300 flex flex-col items-center justify-center gap-4 text-center relative overflow-hidden group min-h-[220px]">
                                    ${unitProg === 100 && branchLinksTotal > 0 ? '<div class="absolute top-4 right-4 bg-white/30 backdrop-blur-sm rounded-full p-2"><i class="ph-bold ph-check text-white text-xl"></i></div>' : ''}
                                    <div class="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-5xl shadow-inner group-hover:scale-110 transition-transform">${getBranchIcon(branch.title)}</div>
                                    <h3 class="text-2xl font-black drop-shadow-sm leading-tight text-white">${branch.title}</h3>
                                    
                                    <div class="w-full mt-auto pt-4 text-white">
                                        <div class="flex justify-between text-xs font-black mb-2 px-1"><span>التقدم</span><span>${unitProg}%</span></div>
                                        <div class="w-full bg-black/30 rounded-full h-2.5 shadow-inner overflow-hidden">
                                            <div class="bg-white h-full rounded-full transition-all duration-1000" style="width: ${unitProg}%"></div>
                                        </div>
                                    </div>
                                </button>`;
                            });
                            html += `</div>`;
                        } 
                        else if (window.studentViewMode === 'details') {
                            html += `<div class="mb-6 flex justify-between items-center animate-[fadeInTab_0.3s_ease]">
                                <button onclick="window.studentViewMode='grid'; window.renderProgramUI(window.currentSections, 'student-program-view', false);" class="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl flex items-center gap-2 font-black text-slate-700 dark:text-slate-300 transition-all shadow-sm"><i class="ph-bold ph-arrow-right"></i> عودة للوحدات</button>
                            </div>`;

                            userYearData.branches.forEach(branch => {
                                if (window.studentActiveBranchTab !== branch.id) return; 
                                
                                let branchLinksTotal = 0; let branchLinksClicked = 0;
                                let cats = branch.id === 'm4_b5' ? ['past_exams', 'mock_exams'] : (branch.id.includes('_s') ? ['terms', 'exams'] : ['lessons', 'exercises']);
                                
                                cats.forEach(cat => {
                                    let links = branch.categories[cat] || []; branchLinksTotal += links.length;
                                    links.forEach((_, lIdx) => { if(clickedLinks.includes(`${branch.id}_${cat}_${lIdx}`)) branchLinksClicked++; });
                                });
                                let unitProg = branchLinksTotal === 0 ? 0 : Math.round((branchLinksClicked / branchLinksTotal) * 100);
                                let isComp = branchLinksTotal > 0 && unitProg === 100;
                                let cardCls = isComp ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/30 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90';
                                
                                html += `
                                <div class="student-branch-wrapper rounded-[2.5rem] shadow-lg border-2 overflow-hidden interactive-card backdrop-blur-xl ${cardCls} animate-[fadeInTab_0.3s_ease]">
                                    <div class="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
                                        <div class="flex items-center gap-5">
                                            <div class="w-20 h-20 rounded-2xl bg-white dark:bg-slate-700 shadow-inner border border-slate-100 dark:border-slate-600 flex items-center justify-center text-5xl relative text-blue-600 dark:text-amber-400">
                                                ${getBranchIcon(branch.title)}
                                                ${isComp ? `<div class="absolute -top-3 -right-3 bg-emerald-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-base font-black shadow-lg border-2 border-white dark:border-slate-800"><i class="ph-bold ph-check"></i></div>` : ''}
                                            </div>
                                            <div>
                                                <h3 class="branch-title text-3xl font-black text-slate-800 dark:text-white leading-tight">${branch.title}</h3>
                                                <p class="text-base text-slate-500 dark:text-slate-400 font-bold mt-1">تقدمك الحالي في هذا القسم</p>
                                            </div>
                                        </div>
                                        <div class="w-full md:w-72 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                            <div class="flex items-center justify-between mb-2">
                                                <span class="text-sm font-black ${isComp ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}">إنجاز ${unitProg}%</span>
                                            </div>
                                            <div class="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-3 overflow-hidden shadow-inner">
                                                <div class="${isComp ? 'bg-emerald-500' : 'bg-blue-500'} h-full transition-all duration-1000" style="width: ${unitProg}%"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="p-6 md:p-8 bg-slate-50/80 dark:bg-slate-900/80">
                                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">`;

                                cats.forEach(cat => {
                                    let links = branch.categories[cat] || []; let conf = catConfig[cat];
                                    
                                    let linksList = links.length ? links.map((lnk, lIdx) => {
                                        let linkId = `${branch.id}_${cat}_${lIdx}`; 
                                        let isRead = clickedLinks.includes(linkId);

                                        let btnClass = isRead ? 'border-emerald-200 dark:border-emerald-800 shadow-sm bg-emerald-50/20' : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-md hover:border-blue-300';

                                        return `<button onclick="trackLinkClick('${branch.id}', '${cat}', ${lIdx}, '${lnk.url}')" aria-label="مشاهدة المحتوى" class="w-full flex items-center justify-between gap-3 p-4 rounded-2xl border transition-all duration-200 group/link relative overflow-hidden text-right mb-3 ${btnClass}">
                                            <div class="flex items-start sm:items-center gap-4 flex-1 w-full">
                                                <div class="w-12 h-12 flex-shrink-0 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl group-hover/link:bg-blue-600 group-hover/link:text-white transition-colors shadow-inner mt-1 sm:mt-0 border border-blue-100 dark:border-blue-800">
                                                    <i class="ph-bold ph-play-circle"></i>
                                                </div>
                                                <span class="${conf.text} font-bold text-base flex-1 leading-relaxed text-right group-hover/link:underline decoration-2 underline-offset-4 break-words" style="word-break: break-word; white-space: normal;">${lnk.title}</span>
                                            </div>
                                            ${isRead ? `<span class="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 text-xs font-black px-3 py-1.5 rounded-lg flex items-center flex-shrink-0 gap-1 ml-1 border border-emerald-200 dark:border-emerald-800"><i class="ph-bold ph-check"></i> مكتمل</span>` : ''}
                                        </button>`;
                                    }).join('') : getEmptyStateHTML(conf.title);
                                    
                                    html += `<div class="${conf.bg} ${conf.border} p-6 rounded-[2rem] border shadow-inner"><h5 class="font-black ${conf.text} text-xl mb-5 flex items-center gap-3"><div class="w-12 h-12 rounded-full bg-white/60 dark:bg-slate-900/40 flex items-center justify-center text-2xl shadow-sm">${conf.icon}</div> ${conf.title}</h5><div>${linksList}</div></div>`;
                                });
                                html += `</div></div></div>`; 
                            });
                        }
                    } else { html += `<div class="text-center p-12 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm"><i class="ph-fill ph-ghost text-6xl text-slate-300 dark:text-slate-600 mb-4"></i><h3 class="text-xl font-bold text-slate-500 dark:text-slate-400">لا يوجد محتوى متاح لمستواك حالياً</h3></div>`; }
                }
            }
            document.getElementById(containerId).innerHTML = html;
        };
