// קבועים
const API_URL = 'http://localhost:3000/api';
const TOKEN_KEY = 'torimToken';
const USER_KEY = 'torimUser';

// טעינת פרטי המשתמש
async function loadUserProfile() {
    try {
        showLoading();
        
        const token = localStorage.getItem(TOKEN_KEY);
        
        const response = await fetch(`${API_URL}/users/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('שגיאה בטעינת פרטי המשתמש');
        }
        
        const data = await response.json();
        
        // עדכון שדות הטופס
        document.getElementById('user-fullname').value = data.user.fullName || '';
        document.getElementById('user-email').value = data.user.email || '';
        document.getElementById('user-phone').value = data.user.phone || '';
        
        if (data.user.birthDate) {
            const dateObj = new Date(data.user.birthDate);
            const formattedDate = dateObj.toISOString().split('T')[0];
            document.getElementById('user-birth-date').value = formattedDate;
        }
        
        // עדכון שם המשתמש בתפריט
        document.getElementById('username-display').textContent = data.user.fullName;
        
        // טעינת הגדרות התראות
        if (data.user.notifications) {
            document.getElementById('email-notifications').checked = data.user.notifications.email || true;
            document.getElementById('sms-notifications').checked = data.user.notifications.sms || true;
            document.getElementById('reminder-24h').checked = data.user.notifications.reminder24h || true;
            document.getElementById('reminder-1h').checked = data.user.notifications.reminder1h || true;
        }
        
    } catch (error) {
        console.error('Error loading user profile:', error);
        showMessage('שגיאה בטעינת פרטי המשתמש: ' + error.message, true);
    } finally {
        hideLoading();
    }
}

// עדכון פרטי המשתמש
async function updateUserProfile(formData) {
    try {
        showLoading();
        
        const token = localStorage.getItem(TOKEN_KEY);
        
        const response = await fetch(`${API_URL}/users/profile`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'שגיאה בעדכון פרטי המשתמש');
        }
        
        const data = await response.json();
        
        // עדכון פרטי המשתמש במקומי
        const userData = JSON.parse(localStorage.getItem(USER_KEY));
        userData.fullName = formData.fullName;
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        
        // עדכון שם המשתמש בתפריט
        document.getElementById('username-display').textContent = formData.fullName;
        
        showMessage('פרטי המשתמש עודכנו בהצלחה');
        
    } catch (error) {
        console.error('Error updating user profile:', error);
        showMessage('שגיאה בעדכון פרטי המשתמש: ' + error.message, true);
    } finally {
        hideLoading();
    }
}

// שינוי סיסמה
async function changePassword(currentPassword, newPassword) {
    try {
        showLoading();
        
        const token = localStorage.getItem(TOKEN_KEY);
        
        const response = await fetch(`${API_URL}/users/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'שגיאה בשינוי הסיסמה');
        }
        
        // איפוס שדות הטופס
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
        
        showMessage('הסיסמה עודכנה בהצלחה');
        
    } catch (error) {
        console.error('Error changing password:', error);
        showMessage('שגיאה בשינוי הסיסמה: ' + error.message, true);
    } finally {
        hideLoading();
    }
}

// עדכון הגדרות התראות
async function updateNotificationSettings(notificationsData) {
    try {
        showLoading();
        
        const token = localStorage.getItem(TOKEN_KEY);
        
        const response = await fetch(`${API_URL}/users/notifications`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(notificationsData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'שגיאה בעדכון הגדרות ההתראות');
        }
        
        showMessage('הגדרות ההתראות עודכנו בהצלחה');
        
    } catch (error) {
        console.error('Error updating notification settings:', error);
        showMessage('שגיאה בעדכון הגדרות ההתראות: ' + error.message, true);
    } finally {
        hideLoading();
    }
}

// דרישת בעלות על עסק
async function claimBusinessOwnership(businessCode) {
    try {
        showLoading();
        
        const token = localStorage.getItem(TOKEN_KEY);
        
        const response = await fetch(`${API_URL}/business/claim-ownership`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ businessCode })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'שגיאה בדרישת בעלות על העסק');
        }
        
        // עדכון פרטי המשתמש במקומי
        const userData = JSON.parse(localStorage.getItem(USER_KEY));
        userData.userType = 'business';
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        
        // הצגת הודעת הצלחה
        showMessage('הבעלות על העסק נקבעה בהצלחה! מעביר אותך לדשבורד העסקי...');
        
        // הפניה לדשבורד העסקי אחרי 2 שניות
        setTimeout(() => {
            window.location.href = 'business-dashboard.html';
        }, 2000);
        
    } catch (error) {
        console.error('Claim business error:', error);
        showMessage(error.message || 'שגיאה בדרישת בעלות על העסק. נסה שנית.', true);
    } finally {
        hideLoading();
    }
}

// מחיקת חשבון
async function deleteAccount(email) {
    try {
        showLoading();
        
        const token = localStorage.getItem(TOKEN_KEY);
        
        const response = await fetch(`${API_URL}/users/delete-account`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ email })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'שגיאה במחיקת החשבון');
        }
        
        // מחיקת נתוני המשתמש המקומיים
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        
        // הצגת הודעת הצלחה
        showMessage('החשבון נמחק בהצלחה. מעביר אותך לדף הראשי...');
        
        // הפניה לדף הראשי אחרי 2 שניות
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        
    } catch (error) {
        console.error('Delete account error:', error);
        showMessage('שגיאה במחיקת החשבון: ' + error.message, true);
    } finally {
        hideLoading();
    }
}

// הגדרת מאזיני אירועים
function setupEventListeners() {
    // טופס פרטי משתמש
    const userProfileForm = document.getElementById('user-profile-form');
    if (userProfileForm) {
        userProfileForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const formData = {
                fullName: document.getElementById('user-fullname').value,
                phone: document.getElementById('user-phone').value,
                birthDate: document.getElementById('user-birth-date').value
            };
            
            updateUserProfile(formData);
        });
    }
    
    // טופס שינוי סיסמה
    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            // וידוא תקינות הסיסמה
            if (!currentPassword || !newPassword || !confirmPassword) {
                showMessage('יש למלא את כל השדות', true);
                return;
            }
            
            if (newPassword !== confirmPassword) {
                showMessage('הסיסמאות החדשות אינן תואמות', true);
                return;
            }
            
            if (newPassword.length < 8) {
                showMessage('הסיסמה חייבת להכיל לפחות 8 תווים', true);
                return;
            }
            
            changePassword(currentPassword, newPassword);
        });
    }
    
    // טופס הגדרות התראות
    const notificationsForm = document.getElementById('notifications-form');
    if (notificationsForm) {
        notificationsForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const notificationsData = {
                email: document.getElementById('email-notifications').checked,
                sms: document.getElementById('sms-notifications').checked,
                reminder24h: document.getElementById('reminder-24h').checked,
                reminder1h: document.getElementById('reminder-1h').checked
            };
            
            updateNotificationSettings(notificationsData);
        });
    }
    
    // טופס דרישת בעלות על עסק
    const claimBusinessForm = document.getElementById('claim-business-form');
    if (claimBusinessForm) {
        claimBusinessForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const businessCode = document.getElementById('business-code').value.trim();
            
            // וידוא תקינות הקוד
            if (!businessCode || businessCode.length !== 6 || !/^\d+$/.test(businessCode)) {
                showMessage('נא להזין קוד עסק תקין בן 6 ספרות', true);
                return;
            }
            
            claimBusinessOwnership(businessCode);
        });
    }
    
    // כפתור מחיקת חשבון
    const confirmDeleteBtn = document.getElementById('confirm-delete-account');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function() {
            const confirmEmail = document.getElementById('confirm-email').value.trim();
            const userEmail = document.getElementById('user-email').value.trim();
            
            if (!confirmEmail) {
                showMessage('יש להזין את כתובת האימייל שלך לאישור', true);
                return;
            }
            
            if (confirmEmail !== userEmail) {
                showMessage('כתובת האימייל שהזנת אינה תואמת את האימייל שלך', true);
                return;
            }
            
            // הסתרת המודל
            const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteAccountModal'));
            if (deleteModal) {
                deleteModal.hide();
            }
            
            // מחיקת החשבון
            deleteAccount(confirmEmail);
        });
    }
    
    // כפתור התנתקות
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            console.log('התנתקות מתבצעת...');
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            window.location.href = 'index.html';
        });
    } else {
        console.error('לא נמצא כפתור התנתקות בדף');
    }
}

// אתחול
document.addEventListener('DOMContentLoaded', function() {
    // בדיקה שהמשתמש מחובר
    const token = localStorage.getItem(TOKEN_KEY);
    const userDataStr = localStorage.getItem(USER_KEY);
    
    if (!token || !userDataStr) {
        // אם המשתמש לא מחובר, הפניה לדף ההתחברות
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const userData = JSON.parse(userDataStr);
        
        // אם המשתמש בעל עסק, הפניה לדף המתאים
        if (userData.userType === 'business') {
            window.location.href = 'business-settings.html';
            return;
        }
        
        // טעינת פרטי המשתמש
        loadUserProfile();
        
        // הגדרת מאזיני אירועים
        setupEventListeners();
    } catch (error) {
        console.error('Error parsing user data:', error);
        // במקרה של שגיאה, נקה את המידע המקומי ונפנה לדף הראשי
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.location.href = 'index.html';
    }
});

// הצגת הודעה
function showMessage(message, isError = false) {
    const toast = document.getElementById('message-toast');
    const toastMessage = document.getElementById('toast-message');
    
    if (toast && toastMessage) {
        // עדכון תוכן ההודעה
        toastMessage.textContent = message;
        
        // עדכון סגנון ההודעה (הצלחה או שגיאה)
        toast.classList.remove('bg-primary', 'bg-danger');
        toast.classList.add(isError ? 'bg-danger' : 'bg-primary');
        
        // הצגת ההודעה
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    } else {
        // במקרה שאלמנט ה-Toast לא נמצא, נציג בקונסול
        console[isError ? 'error' : 'log'](message);
    }
}

// הצגת אנימציית טעינה
function showLoading() {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.id = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="spinner-border text-light" role="status">
            <span class="visually-hidden">טוען...</span>
        </div>
    `;
    document.body.appendChild(loadingOverlay);
}

// הסתרת אנימציית טעינה
function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.remove();
    }
} 
z 