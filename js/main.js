// קבועים
const API_URL = 'http://localhost:3000/api';
const TOKEN_KEY = 'torimToken';
const USER_KEY = 'torimUser';

// משתנים גלובליים
let selectedPlan = null;

// ניהול תצוגת טעינה
function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.remove('d-none');
    } else {
        // במקרה שהאלמנט לא קיים, ניצור אותו
        const newOverlay = document.createElement('div');
        newOverlay.className = 'loading-overlay';
        newOverlay.id = 'loading-overlay';

        const spinner = document.createElement('div');
        spinner.className = 'spinner-border text-primary loading-spinner';
        spinner.setAttribute('role', 'status');
        
        const span = document.createElement('span');
        span.className = 'visually-hidden';
        span.textContent = 'טוען...';
        
        spinner.appendChild(span);
        newOverlay.appendChild(spinner);
        document.body.appendChild(newOverlay);
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('d-none');
    }
}

// ניהול הודעות
function showMessage(message, isError = false) {
    const toast = document.getElementById('message-toast');
    const toastMessage = document.getElementById('toast-message');
    
    // עדכון סוג ההודעה
    if (isError) {
        toast.classList.remove('bg-primary');
        toast.classList.add('bg-danger');
    } else {
        toast.classList.remove('bg-danger');
        toast.classList.add('bg-primary');
    }
    
    // עדכון תוכן ההודעה
    toastMessage.textContent = message;
    
    // הצגת ההודעה
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

// עדכון ממשק משתמש בהתאם למצב ההתחברות
function updateAuthUI() {
    const token = localStorage.getItem(TOKEN_KEY);
    const userDataStr = localStorage.getItem(USER_KEY);
    
    const authButtons = document.getElementById('auth-buttons');
    const userInfo = document.getElementById('user-info');
    const usernameDisplay = document.getElementById('username-display');
    
    if (token && userDataStr) {
        // המשתמש מחובר
        const userData = JSON.parse(userDataStr);
        
        // הצגת שם המשתמש
        usernameDisplay.textContent = userData.fullName;
        
        // הסתרת כפתורי התחברות/הרשמה והצגת אזור המשתמש
        authButtons.classList.add('d-none');
        userInfo.classList.remove('d-none');
    } else {
        // המשתמש לא מחובר
        authButtons.classList.remove('d-none');
        userInfo.classList.add('d-none');
    }
}

// התחברות
async function login(email, password) {
    try {
        showLoading();
        
        const response = await fetch(`${API_URL}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'שגיאה בהתחברות');
        }
        
        // שמירת הטוקן ומידע על המשתמש
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        
        // עדכון הממשק
        updateAuthUI();
        
        // הצגת הודעת הצלחה
        showMessage('התחברת בהצלחה!');
        
        // סגירת מודל ההתחברות
        const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        if (loginModal) {
            loginModal.hide();
        }
        
        // הפניה לדשבורד המתאים לסוג המשתמש
        redirectToDashboard(data.user.userType);
        
    } catch (error) {
        console.error('Login error:', error);
        showMessage(error.message || 'שגיאה בהתחברות. נסה שנית.', true);
    } finally {
        hideLoading();
    }
}

// הרשמה
async function register(fullName, email, password, userType) {
    try {
        showLoading();
        
        const response = await fetch(`${API_URL}/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fullName, email, password, userType })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'שגיאה בהרשמה');
        }
        
        // שמירת הטוקן ומידע על המשתמש
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        
        // עדכון הממשק
        updateAuthUI();
        
        // סגירת מודל ההרשמה
        const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
        if (registerModal) {
            registerModal.hide();
        }
        
        // הצגת הודעת הצלחה מותאמת לסוג המשתמש
        if (userType === 'business' && data.user.business && data.user.business.businessCode) {
            showMessage(`נרשמת בהצלחה כבעל עסק! קוד העסק שלך הוא: ${data.user.business.businessCode}`);
            
            // הצגת חלון התרעה עם הקוד
            setTimeout(() => {
                alert(`שים לב! קוד העסק שלך הוא: ${data.user.business.businessCode}\nשמור אותו במקום בטוח - תצטרך אותו לדרישת בעלות על העסק.`);
            }, 1000);
        } else {
            showMessage('נרשמת בהצלחה!');
        }
        
        // הפניה לדשבורד המתאים לסוג המשתמש
        redirectToDashboard(data.user.userType);
        
    } catch (error) {
        console.error('Registration error:', error);
        showMessage(error.message || 'שגיאה בהרשמה. נסה שנית.', true);
    } finally {
        hideLoading();
    }
}

// התנתקות
function logout() {
    // מחיקת מידע מקומי
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    
    // עדכון הממשק
    updateAuthUI();
    
    // הצגת הודעת הצלחה
    showMessage('התנתקת בהצלחה!');
    
    // חזרה לדף הבית
    if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
        window.location.href = 'index.html';
    }
}

// הפניה לדשבורד המתאים
function redirectToDashboard(userType) {
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop();
    
    if (userType === 'business') {
        if (currentPage !== 'business-dashboard.html') {
            window.location.href = 'business-dashboard.html';
        }
    } else if (userType === 'customer') {
        if (currentPage !== 'customer-dashboard.html') {
            window.location.href = 'customer-dashboard.html';
        }
    }
}

// שליחת פנייה מטופס צור קשר
async function submitContactForm(fullName, email, message) {
    try {
        showLoading();
        
        const response = await fetch(`${API_URL}/users/contact`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fullName, email, message })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'שגיאה בשליחת הטופס');
        }
        
        // איפוס הטופס
        document.getElementById('contact-form').reset();
        
        // הצגת הודעת הצלחה
        showMessage('הודעתך נשלחה בהצלחה!');
        
    } catch (error) {
        showMessage(error.message, true);
    } finally {
        hideLoading();
    }
}

// בחירת תכנית
function selectPlan(planName) {
    selectedPlan = planName;
    
    if (planName === 'basic') {
        // פתיחת מודל הרשמה
        const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
        registerModal.show();
    } else if (planName === 'pro') {
        // פתיחת עמוד תשלום
        window.location.href = `payment.html?plan=${planName}`;
    } else if (planName === 'business') {
        // גלילה לטופס יצירת קשר ומילוי תוכן מוכן
        document.getElementById('message').value = 'אני מעוניין לשמוע פרטים נוספים על התכנית העסקית.';
        document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
    }
}

// הקמת האזנות לאירועים
function setupEventListeners() {
    // התחברות
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            // בדיקת תקינות
            if (!validateEmail(email)) {
                showMessage('כתובת אימייל לא תקינה', true);
                return;
            }
            
            if (password.length < 1) {
                showMessage('נא להזין סיסמה', true);
                return;
            }
            
            login(email, password);
        });
    }
    
    // הרשמה
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const fullName = document.getElementById('registerFullName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const userType = document.querySelector('input[name="userType"]:checked').value;
            
            // בדיקת תקינות
            if (fullName.trim().length < 2) {
                showMessage('שם מלא חייב להכיל לפחות 2 תווים', true);
                return;
            }
            
            if (!validateEmail(email)) {
                showMessage('כתובת אימייל לא תקינה', true);
                return;
            }
            
            if (password.length < 6) {
                showMessage('סיסמה חייבת להכיל לפחות 6 תווים', true);
                return;
            }
            
            register(fullName, email, password, userType);
        });
    }
    
    // יציאה
    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
    
    // טופס צור קשר
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const fullName = document.getElementById('fullName').value;
            const email = document.getElementById('email').value;
            const message = document.getElementById('message').value;
            submitContactForm(fullName, email, message);
        });
    }
    
    // כפתורי תכניות מחיר
    const basicPlanButton = document.querySelector('.basic-plan');
    if (basicPlanButton) {
        basicPlanButton.addEventListener('click', function() {
            selectPlan('basic');
        });
    }
    
    const proPlanButton = document.querySelector('.pro-plan');
    if (proPlanButton) {
        proPlanButton.addEventListener('click', function() {
            selectPlan('pro');
        });
    }
    
    const businessPlanButton = document.querySelector('.business-plan');
    if (businessPlanButton) {
        businessPlanButton.addEventListener('click', function() {
            selectPlan('business');
        });
    }
}

// פונקציית עזר לבדיקת תקינות אימייל
function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

// אתחול
document.addEventListener('DOMContentLoaded', function() {
    // עדכון ממשק המשתמש בהתאם למצב ההתחברות
    updateAuthUI();
    
    // בדיקה אם המשתמש מחובר והפניה לדשבורד המתאים
    const token = localStorage.getItem(TOKEN_KEY);
    const userDataStr = localStorage.getItem(USER_KEY);
    
    if (token && userDataStr) {
        try {
            const userData = JSON.parse(userDataStr);
            const currentPath = window.location.pathname;
            const currentPage = currentPath.split('/').pop();
            
            // אם המשתמש בדף הראשי, הפנה אותו לדשבורד המתאים
            if (currentPage === '' || currentPage === 'index.html') {
                redirectToDashboard(userData.userType);
            }
            
            // וידוא שהמשתמש נמצא בדף המתאים לסוג המשתמש שלו
            if (userData.userType === 'business' && currentPage === 'customer-dashboard.html') {
                window.location.href = 'business-dashboard.html';
            } else if (userData.userType === 'customer' && currentPage === 'business-dashboard.html') {
                window.location.href = 'customer-dashboard.html';
            }
        } catch (error) {
            console.error('Error parsing user data:', error);
            // במקרה של שגיאה, נקה את המידע המקומי
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            updateAuthUI();
        }
    }
    
    // הקמת האזנות לאירועים
    setupEventListeners();
}); 