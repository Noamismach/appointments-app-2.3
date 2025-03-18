// קבועים
const API_URL = 'http://localhost:3000/api';
const TOKEN_KEY = 'torimToken';
const USER_KEY = 'torimUser';

// משתנים גלובליים
const appointmentsPerPage = 5;
let currentPage = 1;
let totalAppointments = 0;
let allAppointments = [];
let claimBusinessModal = null;

// טעינת פרטי המשתמש
async function loadUserProfile() {
    try {
        const userData = JSON.parse(localStorage.getItem(USER_KEY));
        
        if (userData) {
            // עדכון פרטי המשתמש בממשק
            document.getElementById('username-display').textContent = userData.fullName;
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        showMessage('שגיאה בטעינת פרטי המשתמש: ' + error.message, true);
    }
}

// טעינת התורים של המשתמש
async function loadAppointments() {
    try {
        const token = localStorage.getItem(TOKEN_KEY);
        
        const response = await fetch(`${API_URL}/appointments/my-appointments`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('שגיאה בטעינת התורים');
        }
        
        const data = await response.json();
        allAppointments = data.appointments;
        totalAppointments = allAppointments.length;
        
        // סינון תורים עתידיים
        const upcomingAppointments = allAppointments.filter(app => new Date(app.dateTime) > new Date());
        
        // עדכון התצוגה
        updateUpcomingAppointments(upcomingAppointments);
        updatePastAppointments();
        updatePagination();
        
    } catch (error) {
        console.error('Error loading appointments:', error);
        showMessage('שגיאה בטעינת התורים: ' + error.message, true);
    }
}

// עדכון רשימת התורים הקרובים
function updateUpcomingAppointments(appointments) {
    const container = document.getElementById('upcoming-appointments');
    const emptyState = document.getElementById('empty-upcoming');
    
    if (!appointments.length) {
        container.innerHTML = '';
        emptyState.classList.remove('d-none');
        return;
    }
    
    emptyState.classList.add('d-none');
    
    // מיון התורים לפי תאריך (הקרוב ביותר קודם)
    appointments.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
    
    container.innerHTML = appointments.map(appointment => createAppointmentItem(appointment)).join('');
    
    // הוספת מאזיני אירועים לכפתורים
    appointments.forEach(appointment => {
        const detailsBtn = document.getElementById(`details-btn-${appointment._id}`);
        const cancelBtn = document.getElementById(`cancel-btn-${appointment._id}`);
        
        if (detailsBtn) {
            detailsBtn.addEventListener('click', function(event) {
                event.preventDefault();
                showAppointmentDetails(appointment._id);
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function(event) {
                event.preventDefault();
                showCancelConfirmation(appointment._id);
            });
        }
    });
}

// יצירת פריט תור ברשימה
function createAppointmentItem(appointment) {
    const date = new Date(appointment.dateTime);
    const day = date.getDate();
    const month = date.toLocaleString('he-IL', { month: 'short' });
    const year = date.getFullYear();
    const time = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    
    const statusClass = getStatusClass(appointment.status);
    
    return `
    <div class="appointment-item p-3 border-bottom">
        <div class="row align-items-center">
            <div class="col-md-3">
                <div class="appointment-date mb-2 mb-md-0">
                    <div class="date-badge p-2 text-center rounded bg-light">
                        <div class="day fw-bold">${day}</div>
                        <div class="month small">${month}</div>
                        <div class="year small text-muted">${year}</div>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <h6 class="mb-1">${appointment.business.name}</h6>
                <p class="mb-1"><i class="bi bi-clock me-1 text-primary"></i> ${time}</p>
                <p class="mb-0 small"><i class="bi bi-tag me-1 text-primary"></i> ${appointment.service.name}</p>
                <span class="badge ${statusClass} mt-2">${getStatusText(appointment.status)}</span>
            </div>
            <div class="col-md-3 text-md-end mt-2 mt-md-0">
                <div class="btn-group-vertical btn-group-sm w-100">
                    <button class="btn btn-outline-primary mb-1" id="details-btn-${appointment._id}">פרטים</button>
                    ${appointment.status === 'pending' || appointment.status === 'confirmed' ? 
                        `<button class="btn btn-outline-danger" id="cancel-btn-${appointment._id}">בטל תור</button>` : ''}
                </div>
            </div>
        </div>
    </div>
    `;
}

// עדכון טבלת תורים היסטוריים
function updatePastAppointments() {
    const pastAppointments = allAppointments.filter(app => 
        new Date(app.dateTime) <= new Date() || 
        app.status === 'cancelled' || 
        app.status === 'completed'
    );
    
    const tableBody = document.getElementById('history-table');
    const emptyState = document.getElementById('empty-history');
    
    if (!pastAppointments.length) {
        tableBody.innerHTML = '';
        emptyState.classList.remove('d-none');
        return;
    }
    
    emptyState.classList.add('d-none');
    
    // חישוב תורים לדף הנוכחי
    const startIndex = (currentPage - 1) * appointmentsPerPage;
    const pagedAppointments = pastAppointments.slice(startIndex, startIndex + appointmentsPerPage);
    
    tableBody.innerHTML = pagedAppointments.map(appointment => {
        const date = new Date(appointment.dateTime);
        const formattedDate = date.toLocaleDateString('he-IL');
        const formattedTime = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        const statusClass = getStatusClass(appointment.status);
        
        return `
        <tr>
            <td>${formattedDate}</td>
            <td>${formattedTime}</td>
            <td>${appointment.business.name}</td>
            <td>${appointment.service.name}</td>
            <td><span class="badge ${statusClass}">${getStatusText(appointment.status)}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="showAppointmentDetails('${appointment._id}')">פרטים</button>
            </td>
        </tr>
        `;
    }).join('');
}

// עדכון כפתורי העימוד
function updatePagination() {
    const pastAppointments = allAppointments.filter(app => 
        new Date(app.dateTime) <= new Date() || 
        app.status === 'cancelled' || 
        app.status === 'completed'
    );
    
    const totalPages = Math.ceil(pastAppointments.length / appointmentsPerPage);
    const paginationContainer = document.getElementById('history-pagination');
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}">הקודם</a>
        </li>
    `;
    
    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `;
    }
    
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}">הבא</a>
        </li>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
    
    // הוספת מאזיני אירועים לכפתורי העימוד
    const pageLinks = paginationContainer.querySelectorAll('.page-link');
    pageLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const page = parseInt(event.target.dataset.page);
            if (page && page !== currentPage && page > 0 && page <= totalPages) {
                currentPage = page;
                updatePastAppointments();
                updatePagination();
            }
        });
    });
}

// המרת סטטוס לטקסט מתאים
function getStatusText(status) {
    switch (status) {
        case 'pending':
            return 'ממתין לאישור';
        case 'confirmed':
            return 'מאושר';
        case 'completed':
            return 'הסתיים';
        case 'cancelled':
            return 'בוטל';
        default:
            return status;
    }
}

// קבלת קלאס CSS לפי סטטוס
function getStatusClass(status) {
    switch (status) {
        case 'pending':
            return 'bg-warning text-dark';
        case 'confirmed':
            return 'bg-success';
        case 'completed':
            return 'bg-info';
        case 'cancelled':
            return 'bg-danger';
        default:
            return 'bg-secondary';
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
        
        // סגירת המודל
        if (claimBusinessModal) {
            claimBusinessModal.hide();
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

// חיפוש עסקים
async function searchBusinesses(query) {
    try {
        showLoading();
        
        const token = localStorage.getItem(TOKEN_KEY);
        const searchUrl = `${API_URL}/businesses/search?query=${encodeURIComponent(query)}`;
        
        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'שגיאה בחיפוש עסקים');
        }
        
        const data = await response.json();
        const businessList = document.getElementById('business-list');
        
        if (!data.businesses || data.businesses.length === 0) {
            businessList.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-search display-4 text-muted mb-3"></i>
                    <p>לא נמצאו עסקים התואמים את החיפוש</p>
                </div>
            `;
            return;
        }
        
        // הצגת רשימת העסקים
        businessList.innerHTML = data.businesses.map(business => `
            <div class="card mb-2 business-item" data-id="${business._id}">
                <div class="card-body py-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-0">${business.name}</h6>
                            <small class="text-muted">${business.type || 'לא הוגדר סוג'}</small>
                        </div>
                        <button class="btn btn-sm btn-primary select-business-btn" data-id="${business._id}">בחר</button>
                    </div>
                </div>
            </div>
        `).join('');
        
        // הוספת מאזיני אירועים לכפתורי בחירת עסק
        const selectButtons = document.querySelectorAll('.select-business-btn');
        selectButtons.forEach(button => {
            button.addEventListener('click', function() {
                const businessId = this.getAttribute('data-id');
                selectBusiness(businessId);
            });
        });
        
    } catch (error) {
        console.error('Error searching businesses:', error);
        showMessage('שגיאה בחיפוש עסקים: ' + error.message, true);
    } finally {
        hideLoading();
    }
}

// הגדרת מאזיני אירועים
function setupEventListeners() {
    // כפתור דרישת בעלות על עסק
    const claimBusinessBtn = document.getElementById('claim-business-btn');
    if (claimBusinessBtn) {
        claimBusinessBtn.addEventListener('click', () => {
            const businessCodeInput = document.getElementById('business-code-input');
            const businessCode = businessCodeInput.value.trim();
            
            // וידוא תקינות הקוד
            if (!businessCode || businessCode.length !== 6 || !/^\d+$/.test(businessCode)) {
                showMessage('נא להזין קוד עסק תקין בן 6 ספרות', true);
                return;
            }
            
            claimBusinessOwnership(businessCode);
        });
    }
    
    // אתחול המודל
    const claimBusinessModalElement = document.getElementById('claimBusinessModal');
    if (claimBusinessModalElement) {
        claimBusinessModal = new bootstrap.Modal(claimBusinessModalElement);
    }
    
    // כפתור ביטול תור
    const cancelBtn = document.getElementById('cancel-appointment');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            const appointmentId = cancelBtn.dataset.appointmentId;
            if (appointmentId) {
                showCancelConfirmation(appointmentId);
            }
        });
    }
    
    // כפתור אישור ביטול
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
    if (confirmCancelBtn) {
        confirmCancelBtn.addEventListener('click', () => {
            const appointmentId = confirmCancelBtn.dataset.appointmentId;
            if (appointmentId) {
                cancelAppointment(appointmentId);
            }
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
    
    // חיפוש עסקים
    const searchBusinessBtn = document.getElementById('search-business-btn');
    const searchBusinessInput = document.getElementById('search-business');
    
    if (searchBusinessBtn && searchBusinessInput) {
        searchBusinessBtn.addEventListener('click', () => {
            const query = searchBusinessInput.value.trim();
            if (query) {
                searchBusinesses(query);
            }
        });
        
        searchBusinessInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                const query = searchBusinessInput.value.trim();
                if (query) {
                    searchBusinesses(query);
                }
            }
        });
    }
    
    // כפתור אישור תור חדש
    const confirmBookingBtn = document.getElementById('confirm-booking-btn');
    if (confirmBookingBtn) {
        confirmBookingBtn.addEventListener('click', submitAppointment);
    }
    
    // כפתור בחירת תאריך
    const appointmentDateInput = document.getElementById('appointment-date');
    if (appointmentDateInput) {
        appointmentDateInput.addEventListener('change', function() {
            const selectedDate = this.value;
            if (selectedDate) {
                localStorage.setItem('selectedDate', selectedDate);
                
                // טעינת זמנים זמינים לתאריך שנבחר
                const selectedBusiness = JSON.parse(localStorage.getItem('selectedBusiness'));
                const selectedService = localStorage.getItem('selectedService');
                
                if (selectedBusiness && selectedBusiness._id) {
                    loadAvailableSlots(selectedBusiness._id, selectedService, new Date(selectedDate));
                }
            }
        });
        
        // הגדרת ערך ברירת מחדל לתאריך הנוכחי
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        appointmentDateInput.value = formattedDate;
        appointmentDateInput.min = formattedDate; // מניעת בחירת תאריכים בעבר
    }
}

// אתחול
document.addEventListener('DOMContentLoaded', function() {
    // טעינת נתונים
    loadUserProfile();
    loadAppointments();
    
    // הגדרת מאזיני אירועים
    setupEventListeners();
});

// הצגת פרטי תור
async function showAppointmentDetails(appointmentId) {
    try {
        const token = localStorage.getItem(TOKEN_KEY);
        
        const response = await fetch(`${API_URL}/appointments/${appointmentId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('שגיאה בטעינת פרטי התור');
        }
        
        const data = await response.json();
        const appointment = data.appointment;
        
        // עדכון פרטי התור במודל
        document.getElementById('details-business-name').textContent = appointment.business.name;
        document.getElementById('details-service').textContent = appointment.service.name;
        
        const date = new Date(appointment.dateTime);
        document.getElementById('details-date').textContent = date.toLocaleDateString('he-IL');
        document.getElementById('details-time').textContent = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        
        document.getElementById('details-duration').textContent = `${appointment.service.duration} דקות`;
        document.getElementById('details-address').textContent = appointment.business.address;
        document.getElementById('details-phone').textContent = appointment.business.phone;
        document.getElementById('details-notes').textContent = appointment.notes || 'אין הערות';
        
        const statusElement = document.getElementById('details-status');
        statusElement.textContent = getStatusText(appointment.status);
        statusElement.className = `badge ${getStatusClass(appointment.status)}`;
        
        // הסתר/הצג כפתור ביטול בהתאם לסטטוס
        const cancelBtn = document.getElementById('cancel-appointment');
        if (appointment.status === 'pending' || appointment.status === 'confirmed') {
            cancelBtn.style.display = 'block';
            cancelBtn.dataset.appointmentId = appointmentId;
        } else {
            cancelBtn.style.display = 'none';
        }
        
        // הצגת המודל
        const detailsModal = new bootstrap.Modal(document.getElementById('appointmentDetailsModal'));
        detailsModal.show();
        
    } catch (error) {
        console.error('Error showing appointment details:', error);
        showMessage('שגיאה בטעינת פרטי התור: ' + error.message, true);
    }
}

// הצגת אישור ביטול תור
function showCancelConfirmation(appointmentId) {
    // שמירת מזהה התור בכפתור האישור
    document.getElementById('confirm-cancel-btn').dataset.appointmentId = appointmentId;
    
    // הצגת המודל
    const cancelModal = new bootstrap.Modal(document.getElementById('confirmCancelModal'));
    cancelModal.show();
}

// ביטול תור
async function cancelAppointment(appointmentId) {
    try {
        showLoading();
        
        const token = localStorage.getItem(TOKEN_KEY);
        
        const response = await fetch(`${API_URL}/appointments/${appointmentId}/cancel`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'שגיאה בביטול התור');
        }
        
        // הסתרת המודל
        const cancelModal = bootstrap.Modal.getInstance(document.getElementById('confirmCancelModal'));
        if (cancelModal) {
            cancelModal.hide();
        }
        
        // טעינה מחדש של התורים
        await loadAppointments();
        
        // הצגת הודעת הצלחה
        showMessage('התור בוטל בהצלחה');
        
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        showMessage('שגיאה בביטול התור: ' + error.message, true);
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

// בחירת עסק
async function selectBusiness(businessId) {
    try {
        showLoading();
        
        const token = localStorage.getItem(TOKEN_KEY);
        
        const response = await fetch(`${API_URL}/businesses/${businessId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('שגיאה בטעינת פרטי העסק');
        }
        
        const businessData = await response.json();
        const business = businessData.business;
        
        // שמירת פרטי העסק שנבחר
        localStorage.setItem('selectedBusiness', JSON.stringify(business));
        
        // מעבר לשלב הבא - בחירת שירות
        const step1 = document.getElementById('step-1');
        const step2 = document.getElementById('step-2');
        
        step1.classList.add('d-none');
        step2.classList.remove('d-none');
        
        // עדכון פרטי העסק בממשק
        document.getElementById('selected-business-name').textContent = business.name;
        
        // טעינת רשימת השירותים של העסק
        loadBusinessServices(businessId);
        
    } catch (error) {
        console.error('Error selecting business:', error);
        showMessage('שגיאה בבחירת העסק: ' + error.message, true);
    } finally {
        hideLoading();
    }
}

// טעינת שירותים של עסק
async function loadBusinessServices(businessId) {
    try {
        const token = localStorage.getItem(TOKEN_KEY);
        
        const response = await fetch(`${API_URL}/services/business/${businessId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('שגיאה בטעינת רשימת השירותים');
        }
        
        const data = await response.json();
        const servicesList = document.getElementById('services-list');
        
        if (!data.services || data.services.length === 0) {
            servicesList.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle-fill me-2"></i>
                    העסק לא הגדיר שירותים עדיין. ניתן לבחור תור כללי.
                </div>
                <div class="card mb-2 service-item" data-id="general">
                    <div class="card-body py-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-0">תור כללי</h6>
                                <small class="text-muted">תור כללי ללא שירות ספציפי</small>
                            </div>
                            <button class="btn btn-sm btn-primary select-service-btn" data-id="general">בחר</button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            servicesList.innerHTML = data.services.map(service => `
                <div class="card mb-2 service-item" data-id="${service._id}">
                    <div class="card-body py-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-0">${service.name}</h6>
                                <small class="text-muted">${service.duration} דקות, ${service.price} ₪</small>
                            </div>
                            <button class="btn btn-sm btn-primary select-service-btn" data-id="${service._id}">בחר</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
        
        // הוספת מאזיני אירועים לכפתורי בחירת שירות
        const selectButtons = document.querySelectorAll('.select-service-btn');
        selectButtons.forEach(button => {
            button.addEventListener('click', function() {
                const serviceId = this.getAttribute('data-id');
                selectService(serviceId);
            });
        });
        
    } catch (error) {
        console.error('Error loading business services:', error);
        showMessage('שגיאה בטעינת שירותים: ' + error.message, true);
    }
}

// בחירת שירות
function selectService(serviceId) {
    try {
        // שמירת השירות שנבחר
        localStorage.setItem('selectedService', serviceId);
        
        // מעבר לשלב הבא - בחירת תאריך ושעה
        const step2 = document.getElementById('step-2');
        const step3 = document.getElementById('step-3');
        
        step2.classList.add('d-none');
        step3.classList.remove('d-none');
        
        // טעינת חלון הזמנים הזמינים
        const selectedBusiness = JSON.parse(localStorage.getItem('selectedBusiness'));
        loadAvailableSlots(selectedBusiness._id, serviceId);
        
    } catch (error) {
        console.error('Error selecting service:', error);
        showMessage('שגיאה בבחירת השירות: ' + error.message, true);
    }
}

// טעינת משבצות זמן זמינות
async function loadAvailableSlots(businessId, serviceId, selectedDate = null) {
    try {
        showLoading();
        
        const token = localStorage.getItem(TOKEN_KEY);
        // קביעת התאריך להיום אם לא נבחר תאריך אחר
        const date = selectedDate || new Date();
        const dateString = date.toISOString().split('T')[0];
        
        let url = `${API_URL}/appointments/available-slots?business=${businessId}&date=${dateString}`;
        
        if (serviceId && serviceId !== 'general') {
            url += `&service=${serviceId}`;
        }
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('שגיאה בטעינת המועדים הזמינים');
        }
        
        const data = await response.json();
        updateDateDisplay(date);
        renderTimeSlots(data.availableSlots);
        
    } catch (error) {
        console.error('Error loading available slots:', error);
        showMessage('שגיאה בטעינת זמנים זמינים: ' + error.message, true);
    } finally {
        hideLoading();
    }
}

// עדכון תצוגת התאריך
function updateDateDisplay(date) {
    const dateDisplay = document.getElementById('selected-date-display');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateDisplay.textContent = date.toLocaleDateString('he-IL', options);
    
    // שמירת התאריך הנבחר
    localStorage.setItem('selectedDate', date.toISOString().split('T')[0]);
}

// הצגת משבצות זמן זמינות
function renderTimeSlots(slots) {
    const slotsContainer = document.getElementById('time-slots');
    
    if (!slots || slots.length === 0) {
        slotsContainer.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle-fill me-2"></i>
                אין משבצות זמן זמינות בתאריך זה. נסה תאריך אחר.
            </div>
        `;
        return;
    }
    
    slotsContainer.innerHTML = `
        <div class="time-slot-grid">
            ${slots.map(slot => {
                const slotTime = new Date(slot.time);
                const timeString = slotTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                return `
                    <button class="btn btn-outline-primary time-slot-btn" data-time="${slot.time}">
                        ${timeString}
                    </button>
                `;
            }).join('')}
        </div>
    `;
    
    // הוספת מאזיני אירועים לכפתורי בחירת שעה
    const timeButtons = document.querySelectorAll('.time-slot-btn');
    timeButtons.forEach(button => {
        button.addEventListener('click', function() {
            // הסרת כפתור נבחר קודם אם יש
            document.querySelectorAll('.time-slot-btn.btn-primary').forEach(btn => {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-outline-primary');
            });
            
            // הדגשת הכפתור הנבחר
            this.classList.remove('btn-outline-primary');
            this.classList.add('btn-primary');
            
            // שמירת הזמן שנבחר
            const selectedTime = this.getAttribute('data-time');
            localStorage.setItem('selectedTime', selectedTime);
            
            // אפשור המשך לשלב הבא
            document.getElementById('confirm-booking-btn').removeAttribute('disabled');
        });
    });
}

// שליחת תור חדש
async function submitAppointment() {
    try {
        showLoading();
        
        const token = localStorage.getItem(TOKEN_KEY);
        const selectedBusiness = JSON.parse(localStorage.getItem('selectedBusiness'));
        const selectedService = localStorage.getItem('selectedService');
        const selectedDate = localStorage.getItem('selectedDate');
        const selectedTime = localStorage.getItem('selectedTime');
        const notes = document.getElementById('appointment-notes').value.trim();
        
        // וידוא שכל הנתונים הנדרשים קיימים
        if (!selectedBusiness || !selectedDate || !selectedTime) {
            throw new Error('חסרים פרטים לקביעת התור');
        }
        
        // יצירת תאריך ושעה מלאים
        const dateTime = new Date(selectedTime);
        
        // בניית אובייקט התור
        const appointmentData = {
            businessId: selectedBusiness._id,
            serviceId: selectedService !== 'general' ? selectedService : null,
            dateTime: dateTime.toISOString(),
            notes: notes
        };
        
        const response = await fetch(`${API_URL}/appointments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appointmentData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'שגיאה בקביעת התור');
        }
        
        const data = await response.json();
        
        // סגירת המודל
        const appointmentModal = bootstrap.Modal.getInstance(document.getElementById('newAppointmentModal'));
        if (appointmentModal) {
            appointmentModal.hide();
        }
        
        // ניקוי נתוני התור מהלוקל סטורג'
        localStorage.removeItem('selectedBusiness');
        localStorage.removeItem('selectedService');
        localStorage.removeItem('selectedDate');
        localStorage.removeItem('selectedTime');
        
        // הצגת הודעת הצלחה
        showMessage('התור נקבע בהצלחה!');
        
        // רענון רשימת התורים
        await loadAppointments();
        
    } catch (error) {
        console.error('Error submitting appointment:', error);
        showMessage('שגיאה בקביעת התור: ' + error.message, true);
    } finally {
        hideLoading();
    }
} 