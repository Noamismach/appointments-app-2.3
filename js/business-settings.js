// קבועים
const API_URL = 'http://localhost:3000/api';
const TOKEN_KEY = 'torimToken';
const USER_KEY = 'torimUser';

// משתנים גלובליים
let businessData = null;
const daysOfWeek = [
    'יום ראשון',
    'יום שני',
    'יום שלישי',
    'יום רביעי',
    'יום חמישי',
    'יום שישי',
    'שבת'
];

// טעינת פרטי העסק
async function loadBusinessProfile() {
    try {
        showLoading();
        
        const token = localStorage.getItem(TOKEN_KEY);
        
        const response = await fetch(`${API_URL}/business/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('שגיאה בטעינת פרטי העסק');
        }
        
        const data = await response.json();
        businessData = data.business;
        
        console.log('נתוני העסק שהתקבלו:', businessData);
        
        // עדכון שדות הטופס
        document.getElementById('business-name').value = businessData.name || '';
        document.getElementById('business-type').value = businessData.type || '';
        document.getElementById('business-description').value = businessData.description || '';
        document.getElementById('business-address').value = businessData.address || '';
        document.getElementById('business-phone').value = businessData.phone || '';
        document.getElementById('business-email').value = businessData.email || '';
        
        // הצגת קוד העסק הייחודי
        const businessCodeInput = document.getElementById('business-code-display');
        if (businessCodeInput && businessData.businessCode) {
            businessCodeInput.value = businessData.businessCode;
            console.log('קוד העסק שהוצג:', businessData.businessCode);
        } else {
            console.error('חסר קוד עסק או אלמנט להצגה:', businessData);
        }
        
        document.getElementById('cancellation-policy').value = businessData.cancellationPolicy || '';
        
        // עדכון שעות פעילות
        updateWorkingHoursForm(businessData.workingHours);
        
    } catch (error) {
        console.error('Error loading business profile:', error);
        showMessage('שגיאה בטעינת פרטי העסק: ' + error.message, true);
    } finally {
        hideLoading();
    }
}

// עדכון טופס שעות פעילות
function updateWorkingHoursForm(workingHours) {
    const container = document.getElementById('working-hours-container');
    container.innerHTML = '';
    
    for (let day = 0; day < 7; day++) {
        const dayHours = workingHours.find(h => h.day === day) || {
            day,
            isOpen: day < 6, // פתוח בימי חול, סגור בשבת
            openTime: '09:00',
            closeTime: '18:00'
        };
        
        const dayRow = document.createElement('div');
        dayRow.className = 'day-row mb-3';
        dayRow.dataset.day = day;
        
        dayRow.innerHTML = `
            <div class="d-flex align-items-center mb-1">
                <h6 class="mb-0 me-auto">${daysOfWeek[day]}</h6>
                <div class="form-check form-switch ms-2">
                    <input class="form-check-input day-status" type="checkbox" role="switch" 
                        id="day-status-${day}" ${dayHours.isOpen ? 'checked' : ''}>
                    <label class="form-check-label day-status-label" for="day-status-${day}">
                        ${dayHours.isOpen ? 'פתוח' : 'סגור'}
                    </label>
                </div>
            </div>
            <div class="row day-hours" ${!dayHours.isOpen ? 'style="opacity: 0.5;"' : ''}>
                <div class="col-6">
                    <label for="open-time-${day}" class="form-label small">שעת פתיחה</label>
                    <input type="time" class="form-control" id="open-time-${day}" 
                        value="${dayHours.openTime}" ${!dayHours.isOpen ? 'disabled' : ''}>
                </div>
                <div class="col-6">
                    <label for="close-time-${day}" class="form-label small">שעת סגירה</label>
                    <input type="time" class="form-control" id="close-time-${day}" 
                        value="${dayHours.closeTime}" ${!dayHours.isOpen ? 'disabled' : ''}>
                </div>
            </div>
        `;
        
        container.appendChild(dayRow);
    }
    
    // הוספת מאזיני אירועים למתגי המצב
    document.querySelectorAll('.day-status').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const day = this.id.split('-')[2];
            const hoursContainer = this.closest('.day-row').querySelector('.day-hours');
            const inputs = hoursContainer.querySelectorAll('input[type="time"]');
            const label = this.closest('.day-row').querySelector('.day-status-label');
            
            if (this.checked) {
                hoursContainer.style.opacity = '1';
                label.textContent = 'פתוח';
                inputs.forEach(input => input.disabled = false);
            } else {
                hoursContainer.style.opacity = '0.5';
                label.textContent = 'סגור';
                inputs.forEach(input => input.disabled = true);
            }
        });
    });
}

// שמירת פרטי העסק
async function saveBusinessProfile() {
    try {
        showLoading();
        
        const token = localStorage.getItem(TOKEN_KEY);
        
        const formData = {
            name: document.getElementById('business-name').value,
            type: document.getElementById('business-type').value,
            description: document.getElementById('business-description').value,
            address: document.getElementById('business-address').value,
            phone: document.getElementById('business-phone').value,
            email: document.getElementById('business-email').value,
            cancellationPolicy: document.getElementById('cancellation-policy').value
        };

        console.log('נשלח לעדכון:', formData);
        
        const response = await fetch(`${API_URL}/business/profile`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
            throw new Error(responseData.message || 'שגיאה בעדכון פרטי העסק');
        }
        
        console.log('תשובה מהשרת:', responseData);
        
        // עדכון התצוגה עם הנתונים החדשים
        businessData = responseData.business;
        
        showMessage('פרטי העסק עודכנו בהצלחה');
        
    } catch (error) {
        console.error('Error saving business profile:', error);
        showMessage('שגיאה בעדכון פרטי העסק: ' + error.message, true);
    } finally {
        hideLoading();
    }
}

// שמירת שעות פעילות
async function saveWorkingHours() {
    try {
        showLoading();
        
        const token = localStorage.getItem(TOKEN_KEY);
        
        // איסוף נתוני שעות הפעילות מהטופס
        const workingHours = [];
        
        for (let day = 0; day < 7; day++) {
            const isOpen = document.getElementById(`day-status-${day}`).checked;
            const openTime = document.getElementById(`open-time-${day}`).value;
            const closeTime = document.getElementById(`close-time-${day}`).value;
            
            workingHours.push({
                day,
                isOpen,
                openTime,
                closeTime
            });
        }
        
        console.log('שעות העבודה שנשלחות:', workingHours);
        
        const response = await fetch(`${API_URL}/business/profile`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ workingHours })
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
            throw new Error(responseData.message || 'שגיאה בעדכון שעות הפעילות');
        }
        
        console.log('תשובה מהשרת:', responseData);
        
        // עדכון הנתונים המקומיים
        businessData = responseData.business;
        
        showMessage('שעות הפעילות עודכנו בהצלחה');
        
    } catch (error) {
        console.error('Error saving working hours:', error);
        showMessage('שגיאה בעדכון שעות הפעילות: ' + error.message, true);
    } finally {
        hideLoading();
    }
}

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
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'loading-overlay';
    overlay.innerHTML = `
        <div class="spinner-border text-light" role="status">
            <span class="visually-hidden">טוען...</span>
        </div>
    `;
    
    document.body.appendChild(overlay);
}

// הסתרת אנימציית טעינה
function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// הגדרת מאזיני אירועים
function setupEventListeners() {
    // טופס פרטי עסק
    const businessProfileForm = document.getElementById('business-profile-form');
    if (businessProfileForm) {
        businessProfileForm.addEventListener('submit', function(event) {
            event.preventDefault();
            saveBusinessProfile();
        });
    }
    
    // טופס שעות פעילות
    const workingHoursForm = document.getElementById('working-hours-form');
    if (workingHoursForm) {
        workingHoursForm.addEventListener('submit', function(event) {
            event.preventDefault();
            saveWorkingHours();
        });
    }
    
    // כפתור העתקת קוד העסק
    const copyCodeBtn = document.getElementById('copy-code-btn');
    if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', function() {
            const codeInput = document.getElementById('business-code-display');
            codeInput.select();
            document.execCommand('copy');
            showMessage('הקוד הועתק ללוח');
        });
    }
    
    // כפתור התנתקות
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            window.location.href = 'index.html';
        });
    }
}

// טעינת פרטי המשתמש
function loadUserData() {
    try {
        const userData = JSON.parse(localStorage.getItem(USER_KEY));
        if (userData) {
            document.getElementById('username-display').textContent = userData.fullName;
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// אתחול
document.addEventListener('DOMContentLoaded', function() {
    // בדיקה שהמשתמש מחובר וכי הוא בעל עסק
    const token = localStorage.getItem(TOKEN_KEY);
    const userDataStr = localStorage.getItem(USER_KEY);
    
    if (!token || !userDataStr) {
        // אם המשתמש לא מחובר, הפניה לדף ההתחברות
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const userData = JSON.parse(userDataStr);
        if (userData.userType !== 'business') {
            // אם המשתמש אינו בעל עסק, הפניה לדף המתאים
            window.location.href = 'customer-dashboard.html';
            return;
        }
        
        // טעינת פרטי המשתמש
        loadUserData();
        
        // טעינת נתוני העסק
        loadBusinessProfile();
        
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