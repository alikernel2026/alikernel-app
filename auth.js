// ========================================================
// 1. تحميل مكتبات Supabase و Google
// ========================================================
window.addEventListener('load', function() {
    var supabaseScript = document.createElement('script');
    supabaseScript.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    supabaseScript.onload = function() {
        if (window.supabaseAuth && window.supabaseAuth.init) {
            window.supabaseAuth.init();
        }
    };
    document.body.appendChild(supabaseScript);

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
        
        var userAvatarIcon = document.getElementById("user-avatar-icon");
        var profileIcon = document.getElementById("profile-icon");
        var userMenu = document.getElementById("user-menu");
        var guestMenu = document.getElementById("guest-menu");

        if (lastUid && photoURL && photoURL !== "null") {
            if (userAvatarIcon) {
                userAvatarIcon.src = photoURL;
                userAvatarIcon.style.display = 'block';
            }
            if (profileIcon) profileIcon.style.display = 'none';
            if (userMenu) userMenu.style.display = 'block';
            if (guestMenu) guestMenu.style.display = 'none';
        }
    } catch (e) { console.log("Instant Restore Error:", e); }
})();

// ========================================================
// 3. الكود الرئيسي (Supabase Manager)
// ========================================================
(function() {
    class SupabaseAuthManager {
        constructor() {
            window.supabaseAuth = this;
            this.supabase = null;
            this.isInitialized = false;
            this.config = {
                url: "https://rxevykpywwbqfozjgxti.supabase.co",
                key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4ZXZ5a3B5d3dicWZvempneHRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NzAxNjQsImV4cCI6MjA4MjI0NjE2NH0.93uW6maT-L23GQ77HxJoihjIG-DTmciDQlPE3s0b64U",
                googleClientId: "617149480177-aimcujc67q4307sk43li5m6pr54vj1jv.apps.googleusercontent.com",
                paths: { home: "https://www.alikernel.com", account: "/account", login: "/login" }
            };
            this.bindUserActions();
        }

        init() {
            var self = this;
            if (!window.supabase) return;
            this.supabase = window.supabase.createClient(this.config.url, this.config.key);
            
            this.supabase.auth.onAuthStateChange(function(event, session) {
                if (session && session.user) {
                    self.cacheUserData(session.user);
                    self.updateHeaderUI(session.user);
                } else if (event === 'SIGNED_OUT') {
                    self.clearCache();
                }
            });

            this.supabase.auth.getUser().then(function(result) {
                if (result.data.user) {
                    self.cacheUserData(result.data.user);
                    self.updateHeaderUI(result.data.user);
                }
            });
        }

        cacheUserData(user) {
            var photo = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
            var name = user.user_metadata?.full_name || user.user_metadata?.name || 'مستخدم';
            
            // تخزين محلي (للسرعة)
            localStorage.setItem("userPhotoURL", photo);
            localStorage.setItem("userDisplayName", name);
            localStorage.setItem("last_uid", user.id);

            // --- التعديل السحري للـ Middleware ---
            // نرسل البيانات في "كوكيز" لكي يراها السيرفر ويحقنها في بلوجر فوراً
            document.cookie = `sb-access-token=${user.id}; path=/; max-age=3600; SameSite=Lax`;
            document.cookie = `user-avatar=${photo}; path=/; max-age=3600; SameSite=Lax`;
            document.cookie = `user-name=${encodeURIComponent(name)}; path=/; max-age=3600; SameSite=Lax`;
        }

        clearCache() {
            localStorage.clear();
            document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
            document.cookie = "user-avatar=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
            document.cookie = "user-name=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
            location.reload();
        }

        updateHeaderUI(user) {
            var av = document.getElementById("user-avatar-icon");
            var ic = document.getElementById("profile-icon");
            var photo = user.user_metadata?.avatar_url || user.user_metadata?.picture;
            if (photo && av) {
                av.src = photo;
                av.style.display = 'block';
                if (ic) ic.style.display = 'none';
            }
        }

        bindUserActions() {
            var self = this;
            document.addEventListener('click', function(e) {
                if (e.target.id === "logout-btn") self.clearCache();
                if (e.target.id === "google-signin-btn-popup") {
                    self.supabase.auth.signInWithOAuth({ provider: 'google' });
                }
            });
        }
    }
    new SupabaseAuthManager();
})();