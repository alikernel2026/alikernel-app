// ========================================================
// 1. تحميل مكتبة Better Auth Client و Google
// ========================================================
window.addEventListener('load', function() {
    var betterAuthScript = document.createElement('script');
    betterAuthScript.src = 'https://cdn.jsdelivr.net/npm/better-auth@1.4.18/dist/better-auth.client.min.js';
    betterAuthScript.onload = function() {
        if (window.betterAuth && window.betterAuth.init) {
            window.betterAuth.init();
        }
    };
    document.body.appendChild(betterAuthScript);

    var googleScript = document.createElement('script');
    googleScript.src = 'https://accounts.google.com/gsi/client';
    googleScript.async = true;
    googleScript.defer = true;
    document.body.appendChild(googleScript);
});

// ========================================================
// 2. سكربت الاستعادة الفوري (لمنع وميض الهيدر)
// ========================================================
(function() {
    try {
        var photoURL = localStorage.getItem("userPhotoURL");
        var lastUid = localStorage.getItem("last_uid");
        
        // عناصر الهيدر (لصفحة تسجيل الدخول والصفحات الأخرى)
        var userAvatarIcon = document.getElementById("user-avatar-icon");
        var profileIcon = document.getElementById("profile-icon");
        var userMenu = document.getElementById("user-menu");
        var guestMenu = document.getElementById("guest-menu");
        
        // عناصر صفحة الحساب
        var accountAvatar = document.getElementById("account-avatar");
        var accountName = document.getElementById("account-name");
        var accountEmail = document.getElementById("account-email");
        var accountJoined = document.getElementById("account-joined-date");
        var sessionsList = document.getElementById("sessions-list");

        // استعادة حالة تسجيل الدخول
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
            if (userMenu) {
                userMenu.style.setProperty('display', 'block', 'important');
            }
            if (guestMenu) {
                guestMenu.style.setProperty('display', 'none', 'important');
            }
            if (accountAvatar) {
                accountAvatar.src = photoURL;
            }
        } else {
            if (userAvatarIcon) {
                userAvatarIcon.style.setProperty('display', 'none', 'important');
                userAvatarIcon.classList.add("hidden");
            }
            if (profileIcon) {
                profileIcon.style.setProperty('display', 'block', 'important');
                profileIcon.classList.remove("hidden");
            }
            if (userMenu) {
                userMenu.style.setProperty('display', 'none', 'important');
            }
            if (guestMenu) {
                guestMenu.style.setProperty('display', 'block', 'important');
            }
        }

        // استعادة بيانات صفحة الحساب من الذاكرة المؤقتة (Cache)
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
// 3. الكود الرئيسي (Better Auth Manager)
// ========================================================
(function() {
    class BetterAuthManager {
        constructor() {
            window.betterAuth = this;
            this.authClient = null;
            this.isInitialized = false;
            this.initializationAttempts = 0;
            this.maxRetries = 3;
            this._deletingSession = false;
            this.currentNonce = null;
            this.currentHashedNonce = null;
            this._isSigningIn = false;
            this.sessionCheckInterval = null;

            this.config = {
                apiUrl: window.location.origin + "/api/auth",
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

            this.setupCrossTabSync();
            this.setupBeforeUnload();
            this.bindUserActions();
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
                    // فحص الجلسة الحالية
                    self.getCurrentSession().then(function(session) {
                        var path = window.location.pathname;

                        if (session && session.user) {
                            if (path.includes('login')) {
                                window.location.href = self.config.paths.home;
                                return;
                            }

                            self.cacheUserData(session.user);
                            self.updateHeaderUI(session.user);
                            self.setupAccountPage(session.user);
                            self.handleSessionSync(session.user);
                            self.startSessionPolling();
                        } else {
                            if (path.includes('account')) {
                                window.location.href = self.config.paths.login;
                                return;
                            }
                            
                            self.showGuestUI();
                            self.setupGoogleOneTap();
                        }

                        self.isInitialized = true;
                        resolve();
                    }).catch(function(err) {
                        console.error('خطأ:', err);
                        self.showGuestUI();
                        self.setupGoogleOneTap();
                        reject(err);
                    });

                } catch (error) {
                    console.error('خطأ:', error);
                    reject(error);
                }
            });
        }

        getCurrentSession() {
            var self = this;
            return fetch(self.config.apiUrl + '/get-session', {
                credentials: 'include'
            }).then(function(res) {
                if (!res.ok) return null;
                return res.json();
            }).then(function(data) {
                if (data && data.session && data.user) {
                    return { session: data.session, user: data.user };
                }
                return null;
            }).catch(function() {
                return null;
            });
        }

        cacheUserData(user) {
            var photo = user.image || null;
            var name = user.name || (user.email ? user.email.split('@')[0] : 'مستخدم');
            
            if (photo) localStorage.setItem("userPhotoURL", photo);
            localStorage.setItem("userDisplayName", name);
            localStorage.setItem("userEmail", user.email || '');
            localStorage.setItem("last_uid", user.id);
            
            if (user.createdAt) {
                var date = new Date(user.createdAt);
                var formatted = date.toLocaleString('ar-u-nu-latn', {
                    year: 'numeric', month: 'numeric', day: 'numeric',
                    hour: 'numeric', minute: 'numeric', hour12: true
                }).replace('ص', 'صباحاً').replace('م', 'مساءً');
                localStorage.setItem("userJoinedDate", "انضم في: " + formatted);
            }
        }

        clearCache() {
            localStorage.removeItem("userPhotoURL");
            localStorage.removeItem("userDisplayName");
            localStorage.removeItem("userEmail");
            localStorage.removeItem("userJoinedDate");
            localStorage.removeItem("userSessionsHTMLCache");
            localStorage.removeItem("last_uid");
            localStorage.removeItem("betterAuthSessionId");
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
        }

        updateHeaderUI(user) {
            var av = document.getElementById("user-avatar-icon");
            var ic = document.getElementById("profile-icon");
            var um = document.getElementById("user-menu");
            var gm = document.getElementById("guest-menu");
            var photo = user.image || null;

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
            var photoUrl = user.image || null;

            if (av && photoUrl) {
                av.src = photoUrl;
            }

            this.updateUserInfo(user);
            
            var list = document.getElementById("sessions-list");
            if (list) {
                this.refreshSessionsUI(user);
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
                var name = user.name || (user.email ? user.email.split('@')[0] : 'مستخدم');
                nameEl.textContent = name;
            }

            var emailEl = document.getElementById("account-email");
            if (emailEl) {
                emailEl.textContent = user.email || '';
            }

            var joinedEl = document.getElementById("account-joined-date");
            if (joinedEl && user.createdAt) {
                var date = new Date(user.createdAt);
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

            // جلب الجلسات من API
            fetch(self.config.apiUrl + '/list-sessions', {
                credentials: 'include'
            }).then(function(res) {
                return res.json();
            }).then(function(data) {
                var sessions = data.sessions || [];
                if (sessions && sessions.length > 0) {
                    var sid = localStorage.getItem("betterAuthSessionId");
                    var htmlContent = sessions.map(function(s) {
                        var isCurr = s.id === sid;
                        var time = new Date(s.createdAt).toLocaleString('ar-u-nu-latn', {
                            hour: 'numeric', minute: 'numeric', hour12: true
                        }).replace('ص', 'AM').replace('م', 'PM');

                        var domainLine = s.domain ? 
                            '<div class="session-detail-line">' + self.icons.globe + ' <span>الموقع: ' + self.escapeHtml(s.domain) + '</span></div>' : '';

                        return '<div class="session-item" id="session-' + s.id + '">' +
                            '<div class="session-details">' +
                                '<div class="session-detail-line">' + self.icons.clock + ' <span>الوقت: ' + time + '</span></div>' +
                                '<div class="session-detail-line">' + self.icons.device + ' <span>نظام التشغيل: ' + self.escapeHtml(s.os || 'Unknown') + '</span></div>' +
                                '<div class="session-detail-line">' + self.icons.location + ' <span>العنوان: ' + self.escapeHtml(s.ip || 'Unknown') + '</span></div>' +
                                domainLine +
                                (isCurr ? '<div class="session-detail-line current-session-indicator">' + self.icons.check + ' <span>جلستك الحالية</span></div>' : '') +
                            '</div>' +
                            '<button class="terminate-btn ' + (isCurr ? 'icon-current' : 'icon-terminate') + '" onclick="window.betterAuth.handleDeleteSession(\'' + s.id + '\')"></button>' +
                        '</div>';
                    }).join('');

                    localStorage.setItem("userSessionsHTMLCache", htmlContent);
                    list.innerHTML = htmlContent;
                } else {
                    list.innerHTML = '<p style="text-align:center;color:#888;">لا توجد جلسات نشطة</p>';
                }
            }).catch(function(err) {
                console.error('Error loading sessions:', err);
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
                if (event.key === 'last_uid') {
                    if (!event.newValue && event.oldValue) {
                        self.showGuestUI();
                    } else if (event.newValue !== event.oldValue) {
                        location.reload();
                    }
                }
                if (event.key === 'session_deleted') {
                    var deletedId = event.newValue;
                    var mySessionId = localStorage.getItem("betterAuthSessionId");
                    if (deletedId === mySessionId) {
                        self.forceLogout();
                    }
                }
            });
        }

        setupBeforeUnload() {
            var self = this;
            window.addEventListener('beforeunload', function() {
                if (self.sessionCheckInterval) {
                    clearInterval(self.sessionCheckInterval);
                }
            });
        }

        bindUserActions() {
            var self = this;
            
            // ✅ MutationObserver - يراقب ظهور الزر
            var observer = new MutationObserver(function() {
                var logoutBtn = document.getElementById('logout-btn');
                if (logoutBtn && !logoutBtn.hasAttribute('data-bound')) {
                    logoutBtn.setAttribute('data-bound', 'true');
                    logoutBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        self.localLogout();
                    }, true);
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            // Event delegation عام
            document.addEventListener('click', function(e) {
                var target = e.target.closest('button, a');
                if (!target) return;
                
                // ✅ فحص بكل الطرق
                if (target.id === "logout-btn" || 
                    target.textContent.includes("خروج") ||
                    target.textContent.includes("الخروج")) {
                    e.preventDefault();
                    e.stopPropagation();
                    self.localLogout();
                    return;
                }

                if (target.id === "google-signin-btn-popup") {
                    e.preventDefault();
                    self.loginWithGoogle();
                    return;
                }
            }, true);
        }

        loginWithGoogle() {
            window.location.href = this.config.apiUrl + '/sign-in/social/google';
        }

        localLogout() {
            var self = this;
            var sid = localStorage.getItem("betterAuthSessionId");
            
            fetch(self.config.apiUrl + '/sign-out', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then(function() {
                self.finishLogout();
            }).catch(function() {
                self.finishLogout();
            });
        }

        forceLogout() {
            var self = this;
            this.clearCache();
            this.showGuestUI();
            
            fetch(self.config.apiUrl + '/sign-out', {
                method: 'POST',
                credentials: 'include'
            }).then(function() {
                self.doRedirect();
            }).catch(function() {
                self.doRedirect();
            });
        }

        finishLogout() {
            var self = this;
            this.clearCache();
            this.showGuestUI();
            this.doRedirect();
        }

        doRedirect() {
            if (window.location.pathname.includes('account')) {
                window.location.href = this.config.paths.login;
            } else {
                location.reload();
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
            
            self.fetchIP().then(function(ip) {
                fetch(self.config.apiUrl + '/sync-session', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        fingerprint: fingerprint,
                        os: os,
                        ip: ip,
                        domain: window.location.hostname
                    })
                }).then(function(res) {
                    return res.json();
                }).then(function(data) {
                    if (data.sessionId) {
                        localStorage.setItem("betterAuthSessionId", data.sessionId);
                    }
                });
            });
        }

        startSessionPolling() {
            var self = this;
            // فحص الجلسة كل 30 ثانية
            this.sessionCheckInterval = setInterval(function() {
                self.getCurrentSession().then(function(session) {
                    if (!session) {
                        self.forceLogout();
                    }
                });
            }, 30000);
        }

        handleDeleteSession(id) {
            var self = this;
            if (this._deletingSession) return;
            var sid = localStorage.getItem("betterAuthSessionId");
            var isCurrent = id === sid;
            var msg = isCurrent ? "سيتم تسجيل خروجك من هذا الجهاز فوراً." : "هل تريد إزالة هذا الجهاز من قائمة الأجهزة المتصلة؟";

            this.showModalConfirm(msg, function() {
                if (self._deletingSession) return;
                self._deletingSession = true;
                
                if (isCurrent) {
                    self.localLogout();
                } else {
                    fetch(self.config.apiUrl + '/delete-session', {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ sessionId: id })
                    }).then(function() {
                        localStorage.setItem('session_deleted', id);
                        setTimeout(function() { localStorage.removeItem('session_deleted'); }, 100);
                        setTimeout(function() { self._deletingSession = false; }, 1000);
                        self.getCurrentSession().then(function(session) {
                            if (session && session.user) {
                                self.refreshSessionsUI(session.user, true);
                            }
                        });
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

        setupGoogleOneTap() {
            var self = this;
            if (localStorage.getItem("last_uid")) return;
            if (window.location.pathname.includes('/account')) return;

            var checkGoogle = function() {
                if (!window.google || !window.google.accounts) {
                    setTimeout(checkGoogle, 500);
                    return;
                }
                
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
                            
                            fetch(self.config.apiUrl + '/sign-in/social/google/callback', {
                                method: 'POST',
                                credentials: 'include',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    idToken: response.credential,
                                    nonce: nonce
                                })
                            }).then(function(res) {
                                return res.json();
                            }).then(function(result) {
                                if (result.error) {
                                    alert('فشل تسجيل الدخول: ' + result.error);
                                    self._isSigningIn = false;
                                    return;
                                }
                                if (result.user) {
                                    self.cacheUserData(result.user);
                                    self.updateHeaderUI(result.user);
                                    self.handleSessionSync(result.user);
                                    try { window.google.accounts.id.cancel(); } catch (e) {}
                                    setTimeout(function() {
                                        if (window.location.pathname.includes('login')) {
                                            window.location.href = '/';
                                        } else {
                                            window.location.reload();
                                        }
                                    }, 300);
                                }
                            }).catch(function(err) {
                                console.error('Sign in error:', err);
                                self._isSigningIn = false;
                            });
                        };
                        
                        window.google.accounts.id.initialize({
                            client_id: self.config.googleClientId,
                            callback: window.handleGoogleSignIn,
                            nonce: hashedNonce,
                            auto_select: false,
                            cancel_on_tap_outside: true,
                            use_fedcm_for_prompt: true,
                            context: 'signin'
                        });
                        
                        window.google.accounts.id.prompt();
                        
                    } catch (error) {
                        console.error('Error init One Tap:', error);
                    }
                });
            };
            checkGoogle();
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
    new BetterAuthManager();
})();