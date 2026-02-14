// ========================================================
// سكربت المصادقة المحسن - Supabase Auth Manager
// الإصدار: 2.0 - مصحح بالكامل
// ========================================================

// ========================================================
// 1. تحميل مكتبات Supabase و Google فوراً (بدون انتظار load)
// ========================================================
(function() {
    // تحميل Supabase
    var supabaseScript = document.createElement('script');
    supabaseScript.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    supabaseScript.onload = function() {
        if (window.supabaseAuth && window.supabaseAuth.init) {
            window.supabaseAuth.init();
        }
    };
    document.head.appendChild(supabaseScript);

    // تحميل Google فوراً - بدون async/defer لإظهار One Tap أسرع
    var googleScript = document.createElement('script');
    googleScript.src = 'https://accounts.google.com/gsi/client';
    document.head.appendChild(googleScript);
})();

// ========================================================
// 2. سكربت الاستعادة الفوري (لمنع وميض الهيدر)
// ========================================================
(function() {
    try {
        var photoURL = localStorage.getItem("userPhotoURL");
        var lastUid = localStorage.getItem("last_uid");
        
        var userAvatarIcon = document.getElementById("user-avatar-icon");
        var profileIcon = document.getElementById("profile-icon");
        var userMenu = document.getElementById("user-menu");
        var guestMenu = document.getElementById("guest-menu");
        var accountAvatar = document.getElementById("account-avatar");
        var accountName = document.getElementById("account-name");
        var accountEmail = document.getElementById("account-email");
        var accountJoined = document.getElementById("account-joined-date");
        var sessionsList = document.getElementById("sessions-list");

        if (lastUid && photoURL && photoURL !== "null") {
            if (userAvatarIcon) {
                userAvatarIcon.src = photoURL;
                userAvatarIcon.classList.remove("hidden");
                userAvatarIcon.style.setProperty('display', 'block', 'important');
            }
            if (profileIcon) {
                profileIcon.classList.add("hidden");
                profileIcon.style.setProperty('display', 'none', 'important');
            }
            if (userMenu) userMenu.style.setProperty('display', 'block', 'important');
            if (guestMenu) guestMenu.style.setProperty('display', 'none', 'important');
            if (accountAvatar) accountAvatar.src = photoURL;
        } else {
            if (userAvatarIcon) {
                userAvatarIcon.style.setProperty('display', 'none', 'important');
                userAvatarIcon.classList.add("hidden");
            }
            if (profileIcon) {
                profileIcon.style.setProperty('display', 'block', 'important');
                profileIcon.classList.remove("hidden");
            }
            if (userMenu) userMenu.style.setProperty('display', 'none', 'important');
            if (guestMenu) guestMenu.style.setProperty('display', 'block', 'important');
        }

        var cachedName = localStorage.getItem("userDisplayName");
        var cachedEmail = localStorage.getItem("userEmail");
        var cachedJoined = localStorage.getItem("userJoinedDate");
        var cachedSessions = localStorage.getItem("userSessionsHTMLCache");

        if (cachedName && accountName) accountName.textContent = cachedName;
        if (cachedEmail && accountEmail) accountEmail.textContent = cachedEmail;
        if (cachedJoined && accountJoined) accountJoined.textContent = cachedJoined;
        if (cachedSessions && sessionsList && sessionsList.children.length === 0) {
            sessionsList.innerHTML = cachedSessions;
        }
    } catch (e) {
        console.log("Instant Restore Error:", e);
    }
})();

// ========================================================
// 3. الكود الرئيسي (Supabase Manager) - الإصدار المحسن
// ========================================================
(function() {
    class SupabaseAuthManager {
        constructor() {
            window.supabaseAuth = this;
            this.supabase = null;
            this.isInitialized = false;
            this.channel = null;
            this.globalChannel = null;
            this.initializationAttempts = 0;
            this.maxRetries = 10;
            this._deletingSession = false;
            this.currentNonce = null;
            this.currentHashedNonce = null;
            this._isSigningIn = false;

            this.config = {
                url: "https://rxevykpywwbqfozjgxti.supabase.co",
                key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4ZXZ5a3B5d3dicWZvempneHRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NzAxNjQsImV4cCI6MjA4MjI0NjE2NH0.93uW6maT-L23GQ77HxJoihjIG-DTmciDQlPE3s0b64U",
                googleClientId: "617149480177-aimcujc67q4307sk43li5m6pr54vj1jv.apps.googleusercontent.com",
                paths: { 
                    home: "https://www.alikernel.com",
                    account: "/account",
                    login: "/login"
                }
            };

            this.icons = {
                clock: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v6l4 2"></path><circle cx="12" cy="12" r="10"></circle></svg>',
                device: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8"></path><path d="M10 19v-3.96 3.15"></path><path d="M7 19h5"></path><rect width="6" height="10" x="16" y="12" rx="2"></rect></svg>',
                location: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path><circle cx="12" cy="10" r="3"></circle></svg>',
                globe: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"></path><path d="M7.99998 3H8.99998C7.04998 8.84 7.04998 15.16 8.99998 21H7.99998"></path><path d="M15 3C16.95 8.84 16.95 15.16 15 21"></path><path d="M3 16V15C8.84 16.95 15.16 16.95 21 15V16"></path><path d="M3 9.0001C8.84 7.0501 15.16 7.0501 21 9.0001"></path></svg>',
                check: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4L9 15"></path><path d="M21 19L3 19"></path><path d="M9 15L4 10"></path></svg>'
            };

            this.setupGoogleOneTapEarly();
            this.setupCrossTabSync();
            this.setupBeforeUnload();
            this.bindUserActions();
        }

        setupGoogleOneTapEarly() {
            var self = this;
            if (localStorage.getItem("last_uid")) return;
            
            var checkAndInit = function() {
                if (!window.google || !window.google.accounts) {
                    setTimeout(checkAndInit, 100);
                    return;
                }
                if (!self.supabase) {
                    if (!self.isInitialized) {
                        setTimeout(checkAndInit, 100);
                        return;
                    }
                }
                self.initGoogleOneTap();
            };
            checkAndInit();
        }

        initGoogleOneTap() {
            var self = this;
            if (localStorage.getItem("last_uid")) return;
            
            self.generateNonce().then(function(nonceData) {
                var nonce = nonceData[0];
                var hashedNonce = nonceData[1];
                
                if (!nonce || !hashedNonce) return;
                
                try {
                    window.handleGoogleSignIn = function(response) {
                        if (self._isSigningIn) return;
                        self._isSigningIn = true;
                        
                        if (!response || !response.credential) {
                            self._isSigningIn = false;
                            return;
                        }
                        
                        var trySignIn = function() {
                            if (!self.supabase) {
                                setTimeout(trySignIn, 100);
                                return;
                            }
                            
                            self.supabase.auth.signInWithIdToken({
                                provider: 'google',
                                token: response.credential,
                                nonce: self.currentNonce
                            }).then(function(result) {
                                if (result.error) {
                                    alert('فشل تسجيل الدخول: ' + result.error.message);
                                    self._isSigningIn = false;
                                    return;
                                }
                                if (result.data && result.data.user) {
                                    self.cacheUserData(result.data.user);
                                    self.updateHeaderUI(result.data.user);
                                    self.handleSessionSync(result.data.user);
                                    
                                    localStorage.setItem('auth_event', JSON.stringify({ 
                                        type: 'login', 
                                        uid: result.data.user.id,
                                        timestamp: Date.now() 
                                    }));
                                    setTimeout(function() { localStorage.removeItem('auth_event'); }, 100);
                                    
                                    try { window.google.accounts.id.cancel(); } catch (e) {}
                                    self._isSigningIn = false;
                                }
                            });
                        };
                        trySignIn();
                    };
                    
                    window.google.accounts.id.initialize({
                        client_id: self.config.googleClientId,
                        callback: window.handleGoogleSignIn,
                        nonce: hashedNonce,
                        auto_select: false,
                        cancel_on_tap_outside: true,
                        context: 'signin'
                    });
                    
                    window.google.accounts.id.prompt();
                    
                } catch (error) {
                    console.error('Error init One Tap:', error);
                }
            });
        }

        generateNonce() {
            var self = this;
            return new Promise(function(resolve) {
                try {
                    var nonce = btoa(String.fromCharCode.apply(null, crypto.getRandomValues(new Uint8Array(32))));
                    var encoder = new TextEncoder();
                    var encodedNonce = encoder.encode(nonce);
                    
                    crypto.subtle.digest('SHA-256', encodedNonce).then(function(hashBuffer) {
                        var hashArray = Array.from(new Uint8Array(hashBuffer));
                        var hashedNonce = hashArray.map(function(b) {
                            return b.toString(16).padStart(2, '0');
                        }).join('');
                        self.currentNonce = nonce;
                        self.currentHashedNonce = hashedNonce;
                        resolve([nonce, hashedNonce]);
                    });
                } catch (error) {
                    console.error('Error generating nonce:', error);
                    resolve([null, null]);
                }
            });
        }

        init() {
            var self = this;
            if (this.isInitialized) return Promise.resolve();
            
            return new Promise(function(resolve, reject) {
                try {
                    if (!window.supabase || !window.supabase.createClient) {
                        if (self.initializationAttempts < self.maxRetries) {
                            self.initializationAttempts++;
                            setTimeout(function() { self.init().then(resolve).catch(reject); }, 200);
                            return;
                        }
                        reject(new Error('Supabase library not loaded'));
                        return;
                    }

                    self.supabase = window.supabase.createClient(self.config.url, self.config.key, {
                        realtime: { params: { eventsPerSecond: 10 } }
                    });
                    
                    self.supabase.auth.onAuthStateChange(function(event, session) {
                        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session && session.user) {
                            self.cacheUserData(session.user);
                            self.updateHeaderUI(session.user);
                            self.handleSessionSync(session.user);
                        } else if (event === 'SIGNED_OUT') {
                            self.clearCache(); 
                            self.showGuestUI();
                        }
                    });

                    self.supabase.auth.getUser().then(function(result) {
                        var user = result.data.user;
                        var path = window.location.pathname;

                        if (user && (path.includes('login'))) {
                            self.cacheUserData(user);
                            window.location.href = self.config.paths.home;
                            return;
                        }

                        if (!user && (path.includes('account'))) {
                            window.location.href = self.config.paths.login;
                            return;
                        }

                        if (user) {
                            self.cacheUserData(user);
                            self.updateHeaderUI(user);
                            self.setupAccountPage(user);
                            self.handleSessionSync(user);
                            self.startGlobalSessionMonitoring(user);
                        } else {
                            self.showGuestUI();
                        }

                        self.isInitialized = true;
                        resolve();
                    }).catch(function(err) {
                        console.error('خطأ:', err);
                        reject(err);
                    });

                } catch (error) {
                    console.error('خطأ:', error);
                    reject(error);
                }
            });
        }

        cacheUserData(user) {
            var photo = user.user_metadata ? (user.user_metadata.avatar_url || user.user_metadata.picture) : null;
            var name = user.user_metadata ? (user.user_metadata.full_name || user.user_metadata.name) : null;
            if (!name) name = user.email ? user.email.split('@')[0] : 'مستخدم';
            
            if (photo) localStorage.setItem("userPhotoURL", photo);
            localStorage.setItem("userDisplayName", name);
            localStorage.setItem("userEmail", user.email || '');
            localStorage.setItem("last_uid", user.id);
            
            var date = new Date(user.created_at);
            var formatted = date.toLocaleString('ar-u-nu-latn', {
                year: 'numeric', month: 'numeric', day: 'numeric',
                hour: 'numeric', minute: 'numeric', hour12: true
            }).replace('ص', 'صباحاً').replace('م', 'مساءً');
            localStorage.setItem("userJoinedDate", "انضم في: " + formatted);
        }

        clearCache() {
            localStorage.removeItem("userPhotoURL");
            localStorage.removeItem("userDisplayName");
            localStorage.removeItem("userEmail");
            localStorage.removeItem("userJoinedDate");
            localStorage.removeItem("userSessionsHTMLCache");
            localStorage.removeItem("last_uid");
            localStorage.removeItem("supabaseSessionId");
            
            localStorage.setItem('auth_event', JSON.stringify({ 
                type: 'logout', 
                timestamp: Date.now() 
            }));
            setTimeout(function() { localStorage.removeItem('auth_event'); }, 100);
        }

        showGuestUI() {
            var ic = document.getElementById("profile-icon");
            var av = document.getElementById("user-avatar-icon");
            var um = document.getElementById("user-menu");
            var gm = document.getElementById("guest-menu");
            
            if (ic) { ic.style.setProperty('display', 'block', 'important'); ic.classList.remove("hidden"); }
            if (av) { av.style.setProperty('display', 'none', 'important'); av.classList.add("hidden"); av.src = ""; }
            if (um) um.style.setProperty('display', 'none', 'important');
            if (gm) gm.style.setProperty('display', 'block', 'important');
            
            var self = this;
            setTimeout(function() {
                if (!localStorage.getItem("last_uid")) {
                    self.initGoogleOneTap();
                }
            }, 500);
        }

        updateHeaderUI(user) {
            var av = document.getElementById("user-avatar-icon");
            var ic = document.getElementById("profile-icon");
            var um = document.getElementById("user-menu");
            var gm = document.getElementById("guest-menu");
            var photo = user.user_metadata ? (user.user_metadata.avatar_url || user.user_metadata.picture) : null;

            if (photo && av) {
                av.src = photo;
                av.style.setProperty('display', 'block', 'important');
                av.classList.remove("hidden");
                av.setAttribute("referrerpolicy", "no-referrer");
                if (ic) { 
                    ic.style.setProperty('display', 'none', 'important'); 
                    ic.classList.add("hidden"); 
                }
            }
            if (um) um.style.setProperty('display', 'block', 'important');
            if (gm) gm.style.setProperty('display', 'none', 'important');
        }

        setupAccountPage(user) {
            var av = document.getElementById("account-avatar");
            var photoUrl = user.user_metadata ? (user.user_metadata.avatar_url || user.user_metadata.picture) : null;

            if (av && photoUrl) {
                av.src = photoUrl;
            }

            this.updateUserInfo(user);
            
            var list = document.getElementById("sessions-list");
            if (list) {
                this.refreshSessionsUI(user);
                this.startLiveDeviceSync(user);
            }
            
            var content = document.getElementById('account-content');
            if (content) {
                content.classList.add('loaded');
                content.style.opacity = '1';
            }
        }

        updateUserInfo(user) {
            var nameEl = document.getElementById("account-name");
            if (nameEl) {
                var name = user.user_metadata ? (user.user_metadata.full_name || user.user_metadata.name) : null;
                if (!name) name = user.email ? user.email.split('@')[0] : 'مستخدم';
                nameEl.textContent = name;
            }

            var emailEl = document.getElementById("account-email");
            if (emailEl) {
                emailEl.textContent = user.email || '';
            }

            var joinedEl = document.getElementById("account-joined-date");
            if (joinedEl) {
                var date = new Date(user.created_at);
                var formatted = date.toLocaleString('ar-u-nu-latn', {
                    year: 'numeric', month: 'numeric', day: 'numeric',
                    hour: 'numeric', minute: 'numeric', hour12: true
                }).replace('ص', 'صباحاً').replace('م', 'مساءً');
                joinedEl.textContent = "انضم في: " + formatted;
            }
        }

        refreshSessionsUI(user, forceUpdate) {
            var self = this;
            var list = document.getElementById("sessions-list");
            if (!list) return;

            this.supabase
                .from('sessions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .then(function(result) {
                    var sessions = result.data;
                    if (sessions && sessions.length > 0) {
                        var sid = localStorage.getItem("supabaseSessionId");
                        var htmlContent = sessions.map(function(s) {
                            var isCurr = s.id === sid;
                            var time = new Date(s.created_at).toLocaleString('ar-u-nu-latn', {
                                hour: 'numeric', minute: 'numeric', hour12: true
                            }).replace('ص', 'AM').replace('م', 'PM');

                            var domainLine = s.domain ? 
                                '<div class="session-detail-line">' + self.icons.globe + ' <span>الموقع: ' + self.escapeHtml(s.domain) + '</span></div>' : '';

                            return '<div class="session-item" id="session-' + s.id + '">' +
                                '<div class="session-details">' +
                                    '<div class="session-detail-line">' + self.icons.clock + ' <span>الوقت: ' + time + '</span></div>' +
                                    '<div class="session-detail-line">' + self.icons.device + ' <span>نظام التشغيل: ' + self.escapeHtml(s.os) + '</span></div>' +
                                    '<div class="session-detail-line">' + self.icons.location + ' <span>العنوان: ' + self.escapeHtml(s.ip) + '</span></div>' +
                                    domainLine +
                                    (isCurr ? '<div class="session-detail-line current-session-indicator">' + self.icons.check + ' <span>جلستك الحالية</span></div>' : '') +
                                '</div>' +
                                '<button class="terminate-btn ' + (isCurr ? 'icon-current' : 'icon-terminate') + '" onclick="window.supabaseAuth.handleDeleteSession(\'' + s.id + '\')"></button>' +
                            '</div>';
                        }).join('');

                        localStorage.setItem("userSessionsHTMLCache", htmlContent);
                        list.innerHTML = htmlContent;
                    } else {
                        list.innerHTML = '<p style="text-align:center;color:#888;">لا توجد جلسات نشطة</p>';
                    }
                });
        }

        escapeHtml(text) {
            var div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        setupCrossTabSync() {
            var self = this;
            window.addEventListener('storage', function(event) {
                if (event.key === 'auth_event' && event.newValue) {
                    try {
                        var authEvent = JSON.parse(event.newValue);
                        if (authEvent.type === 'login') {
                            window.location.reload();
                        } else if (authEvent.type === 'logout') {
                            self.clearCache();
                            self.showGuestUI();
                            window.location.reload();
                        }
                    } catch (e) {
                        console.error('Error parsing auth event:', e);
                    }
                    return;
                }
                
                if (event.key === 'last_uid') {
                    if (!event.newValue && event.oldValue) {
                        self.clearCache();
                        self.showGuestUI();
                        window.location.reload();
                    } else if (event.newValue && event.newValue !== event.oldValue) {
                        window.location.reload();
                    }
                }
                
                if (event.key === 'session_deleted') {
                    var deletedId = event.newValue;
                    var mySessionId = localStorage.getItem("supabaseSessionId");
                    if (deletedId === mySessionId) {
                        self.forceLogout();
                    }
                }
            });
        }

        setupBeforeUnload() {
            var self = this;
            window.addEventListener('beforeunload', function() {
                if (self.channel) try { self.supabase.removeChannel(self.channel); } catch (e) {}
                if (self.globalChannel) try { self.supabase.removeChannel(self.globalChannel); } catch (e) {}
            });
        }

        bindUserActions() {
            var self = this;
            
            document.addEventListener('click', function(e) {
                var target = e.target.closest('button, a, [role="button"], .logout-btn, [data-logout]');
                if (!target) return;

                var isLogoutButton = 
                    target.id === "logout-btn" ||
                    target.id === "logout_button" ||
                    target.id === "header-logout-btn" ||
                    target.classList.contains('logout-btn') ||
                    target.classList.contains('logout_button') ||
                    target.classList.contains('btn-logout') ||
                    target.getAttribute('data-action') === 'logout' ||
                    target.getAttribute('data-logout') === 'true' ||
                    target.hasAttribute('data-logout') ||
                    (function() {
                        var text = target.textContent || target.innerText || '';
                        var btnText = text.trim();
                        return btnText === 'خروج' || 
                               btnText === 'تسجيل الخروج' ||
                               btnText === 'Logout' ||
                               btnText.includes('خروج') ||
                               btnText.includes('تسجيل خروج');
                    })();

                if (isLogoutButton) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    self.localLogout();
                    return false;
                }

                if (target.id === "google-signin-btn-popup") {
                    e.preventDefault();
                    self.loginWithGoogle();
                    return;
                }
                
                if (target.id === "github-signin-btn") {
                    e.preventDefault();
                    self.loginWithGitHub();
                    return;
                }
            }, true);
        }

        loginWithGoogle() {
            if (!this.supabase) return;
            this.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { 
                    redirectTo: window.location.origin,
                    queryParams: { prompt: 'select_account' },
                    skipBrowserRedirect: false
                }
            });
        }

        loginWithGitHub() {
            if (!this.supabase) return;
            this.supabase.auth.signInWithOAuth({
                provider: 'github',
                options: { redirectTo: window.location.origin }
            });
        }

        localLogout() {
            var self = this;
            var sid = localStorage.getItem("supabaseSessionId");
            if (sid && this.supabase) {
                this.supabase.from('sessions').delete().eq('id', sid).then(function() {
                    self.finishLogout();
                }).catch(function() {
                    self.finishLogout();
                });
            } else {
                this.finishLogout();
            }
        }

        forceLogout() {
            var self = this;
            this.clearCache();
            this.showGuestUI();
            if (this.supabase) {
                this.supabase.auth.signOut({ scope: 'local' }).then(function() {
                    self.doRedirect();
                });
            } else {
                this.doRedirect();
            }
        }

        finishLogout() {
            var self = this;
            this.clearCache();
            this.showGuestUI();
            if (this.supabase) {
                this.supabase.auth.signOut({ scope: 'local' }).then(function() {
                    self.doRedirect();
                });
            } else {
                this.doRedirect();
            }
        }

        doRedirect() {
            if (window.location.pathname.includes('account')) {
                window.location.href = this.config.paths.login;
            } else {
                window.location.href = this.config.paths.home;
            }
        }

        getDeviceFingerprint() {
            try {
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');
                ctx.textBaseline = 'top';
                ctx.font = '14px Arial';
                ctx.fillStyle = '#f60';
                ctx.fillRect(125, 1, 62, 20);
                ctx.fillStyle = '#069';
                ctx.fillText('FP', 2, 15);
                var canvasData = canvas.toDataURL();
                var fpData = [
                    navigator.userAgent, navigator.language,
                    screen.colorDepth, screen.width + 'x' + screen.height,
                    new Date().getTimezoneOffset(),
                    navigator.hardwareConcurrency || 0,
                    canvasData.substring(0, 100)
                ].join('|');
                var hash = 0;
                for (var i = 0; i < fpData.length; i++) {
                    var char = fpData.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                }
                return 'fp_' + Math.abs(hash).toString(36);
            } catch (error) {
                return 'fp_fallback_' + Date.now().toString(36);
            }
        }

        handleSessionSync(user) {
            var self = this;
            var fingerprint = this.getDeviceFingerprint();
            var os = this.getOS();
            
            this.supabase
                .from('sessions')
                .select('id, fingerprint')
                .eq('user_id', user.id)
                .eq('fingerprint', fingerprint)
                .limit(1)
                .then(function(result) {
                    var existingSessions = result.data;
                    if (existingSessions && existingSessions.length > 0) {
                        var sessionId = existingSessions[0].id;
                        self.fetchIP().then(function(ip) {
                            self.supabase.from('sessions').update({ 
                                last_active: new Date().toISOString(),
                                ip: ip, 
                                domain: window.location.hostname, 
                                os: os
                            }).eq('id', sessionId);
                        });
                        localStorage.setItem("supabaseSessionId", sessionId);
                        self.startGlobalSessionMonitoring(user);
                    } else {
                        self.fetchIP().then(function(ip) {
                            self.supabase.from('sessions').insert([{
                                user_id: user.id, 
                                os: os, 
                                ip: ip,
                                domain: window.location.hostname, 
                                fingerprint: fingerprint,
                                last_active: new Date().toISOString()
                            }]).select().then(function(result) {
                                if (result.data && result.data[0]) {
                                    localStorage.setItem("supabaseSessionId", result.data[0].id);
                                    self.startGlobalSessionMonitoring(user);
                                }
                            });
                        });
                    }
                });
        }

        startLiveDeviceSync(user) {
            var self = this;
            if (this.channel) {
                this.supabase.removeChannel(this.channel);
            }
            var channelName = 'sessions-sync-' + user.id + '-' + Date.now();
            this.channel = this.supabase.channel(channelName)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'sessions',
                    filter: 'user_id=eq.' + user.id
                }, function(payload) {
                    var sid = localStorage.getItem("supabaseSessionId");
                    if (payload.eventType === 'DELETE') {
                        if (payload.old && payload.old.id === sid) {
                            self.forceLogout();
                        } else {
                            self.refreshSessionsUI(user, true);
                        }
                    } else {
                        self.refreshSessionsUI(user, true);
                    }
                })
                .subscribe();
        }

        startGlobalSessionMonitoring(user) {
            var self = this;
            var sid = localStorage.getItem("supabaseSessionId");
            if (!sid) return;
            
            if (this.globalChannel) {
                this.supabase.removeChannel(this.globalChannel);
            }
            
            var channelName = 'my-session-' + sid + '-' + Date.now();
            this.globalChannel = this.supabase.channel(channelName)
                .on('postgres_changes', {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'sessions',
                    filter: 'id=eq.' + sid
                }, function(payload) {
                    self.forceLogout();
                })
                .subscribe();
        }

        handleDeleteSession(id) {
            var self = this;
            if (this._deletingSession) return;
            var sid = localStorage.getItem("supabaseSessionId");
            var isCurrent = id === sid;
            var msg = isCurrent ? "سيتم تسجيل خروجك من هذا الجهاز فوراً." : "هل تريد إزالة هذا الجهاز من قائمة الأجهزة المتصلة؟";

            this.showModalConfirm(msg, function() {
                if (self._deletingSession) return;
                self._deletingSession = true;
                
                if (isCurrent) {
                    self.localLogout();
                } else {
                    self.supabase.from('sessions').delete().eq('id', id).then(function() {
                        localStorage.setItem('session_deleted', id);
                        setTimeout(function() { localStorage.removeItem('session_deleted'); }, 100);
                        setTimeout(function() { self._deletingSession = false; }, 1000);
                    }).catch(function() {
                        self._deletingSession = false;
                    });
                }
            });
        }

        fetchIP() {
            return new Promise(function(resolve) {
                var controller = new AbortController();
                var timeoutId = setTimeout(function() { controller.abort(); }, 3000);
                fetch('https://api.ipify.org?format=json', { signal: controller.signal })
                    .then(function(res) {
                        clearTimeout(timeoutId);
                        return res.json();
                    })
                    .then(function(data) {
                        resolve(data.ip || "Unknown");
                    })
                    .catch(function() {
                        resolve("Unknown");
                    });
            });
        }

        showModalConfirm(msg, cb) {
            var modal = document.getElementById("custom-confirm-modal");
            var text = document.getElementById("custom-modal-text");
            var confirmBtn = document.getElementById("custom-modal-confirm-btn");
            var cancelBtn = document.getElementById("custom-modal-cancel-btn");
            if (!modal) {
                if (confirm(msg) && cb) cb();
                return;
            }
            text.textContent = msg;
            modal.classList.remove("hidden");
            var newConfirmBtn = confirmBtn.cloneNode(true);
            var newCancelBtn = cancelBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
            newConfirmBtn.onclick = function() {
                modal.classList.add("hidden");
                if (cb) cb();
            };
            newCancelBtn.onclick = function() {
                modal.classList.add("hidden");
            };
        }

        getOS() {
            var ua = navigator.userAgent;
            if (/Android/i.test(ua)) return "أندرويد";
            if (/iPhone/i.test(ua)) return "آيفون";
            if (/iPad/i.test(ua)) return "آيباد";
            if (/Windows/i.test(ua)) return "ويندوز";
            if (/Mac/i.test(ua)) return "ماك";
            if (/Linux/i.test(ua)) return "لينكس";
            return "جهاز غير معروف";
        }
    }
    new SupabaseAuthManager();
})();