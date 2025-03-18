// קבועים וגלובלים
const API_URL = 'http://localhost:3000/api';
let calendar;
let currentAppointments = [];
let selectedAppointmentId = null;
let currentPage = 1;
let itemsPerPage = 10;
let totalPages = 1;
let currentFilter = 'all';
let searchQuery = '';

// בדיקת התחברות והפניה
document.addEventListener('DOMContentLoaded', function() {
    // בדיקה שהמשתמש מחובר וכי הוא בעל עסק
    const token = localStorage.getItem('torimToken');
    const userDataStr = localStorage.getItem('torimUser');
    
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
        
        // אתחול לוח השנה
        initCalendar();
        
        // טעינת פרטי העסק
        loadBusinessProfile();
        
        // טעינת סטטיסטיקות
        loadStatistics();
        
        // טעינת רשימת התורים
        loadAppointments();
        
        // הקמת האזנות לאירועים
        setupEventListeners();
    } catch (error) {
        console.error('Error parsing user data:', error);
        // במקרה של שגיאה, נקה את המידע המקומי ונפנה לדף הראשי
        localStorage.removeItem('torimToken');
        localStorage.removeItem('torimUser');
        window.location.href = 'index.html';
    }
});

// אתחול לוח השנה
function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'he',
        direction: 'rtl',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        buttonText: {
            today: 'היום',
            month: 'חודש',
            week: 'שבוע',
            day: 'יום'
        },
        selectable: true,
        selectMirror: true,
        dayMaxEvents: true,
        eventClick: function(info) {
            showAppointmentDetails(info.event.id);
        },
        events: function(info, successCallback, failureCallback) {
            // בקשת תורים בטווח התאריכים הנוכחי
            const start = info.startStr;
            const end = info.endStr;
            
            fetchAppointmentsForCalendar(start, end, successCallback, failureCallback);
        }
    });
    
    calendar.render();
}

// בקשת תורים ללוח השנה
async function fetchAppointmentsForCalendar(start, end, successCallback, failureCallback) {
    try {
        const token = localStorage.getItem('torimToken');
        
        const response = await fetch(`${API_URL}/appointments?start=${start}&end=${end}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('שגיאה בטעינת התורים');
        }
        
        const data = await response.json();
        
        // המרת הנתונים לפורמט של FullCalendar
        const events = data.appointments.map(appointment => {
            // קביעת הצבע בהתאם לסטטוס
            let color;
            switch (appointment.status) {
                case 'pending':
                    color = '#ffc107'; // צהוב
                    break;
                case 'confirmed':
                    color = '#198754'; // ירוק
                    break;
                case 'completed':
                    color = '#0dcaf0'; // כחול-תכלת
                    break;
                case 'cancelled':
                    color = '#dc3545'; // אדום
                    break;
                default:
                    color = '#0d6efd'; // כחול רגיל
            }
            
            const startDateTime = new Date(appointment.dateTime);
            const endDateTime = new Date(startDateTime);
            // הוספת משך השירות (בדקות) לזמן הסיום
            endDateTime.setMinutes(endDateTime.getMinutes() + (appointment.service?.duration || 60));
            
            return {
                id: appointment._id,
                title: `${appointment.customerName} - ${appointment.service?.name || 'שירות כללי'}`,
                start: startDateTime,
                end: endDateTime,
                backgroundColor: color,
                borderColor: color
            };
        });
        
        successCallback(events);
    } catch (error) {
        console.error('Error fetching appointments for calendar:', error);
        failureCallback(error);
        showMessage('שגיאה בטעינת התורים: ' + error.message, true);
    }
}

// טעינת פרטי העסק
async function loadBusinessProfile() {
    try {
        const token = localStorage.getItem('torimToken');
        
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
        
        // עדכון פרטי העסק בממשק
        document.getElementById('business-name').textContent = data.business.name || 'שם העסק לא הוגדר';
        document.getElementById('business-type').textContent = data.business.type || 'סוג העסק לא הוגדר';
        document.getElementById('business-address').textContent = data.business.address || 'כתובת לא הוגדרה';
        document.getElementById('business-phone').textContent = data.business.phone || 'טלפון לא הוגדר';
        
        // הצגת קוד העסק הייחודי
        if (data.business.businessCode) {
            const businessCodeEl = document.getElementById('business-code');
            if (businessCodeEl) {
                businessCodeEl.textContent = `קוד עסק: ${data.business.businessCode}`;
                businessCodeEl.style.display = 'block';
            }
        }
        
    } catch (error) {
        console.error('Error loading business profile:', error);
        showMessage('שגיאה בטעינת פרטי העסק: ' + error.message, true);
    }
}

// טעינת סטטיסטיקות
async function loadStatistics() {
    try {
        const token = localStorage.getItem('torimToken');
        
        const response = await fetch(`${API_URL}/business/statistics`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('שגיאה בטעינת הסטטיסטיקות');
        }
        
        const data = await response.json();
        
        // עדכון הסטטיסטיקות בממשק
        document.getElementById('stats-today').textContent = data.todayAppointments || 0;
        document.getElementById('stats-pending').textContent = data.pendingAppointments || 0;
        document.getElementById('stats-week').textContent = data.weeklyAppointments || 0;
        document.getElementById('stats-month').textContent = data.monthlyAppointments || 0;
        
    } catch (error) {
        console.error('Error loading statistics:', error);
        showMessage('שגיאה בטעינת הסטטיסטיקות: ' + error.message, true);
    }
}

// טעינת רשימת התורים
async function loadAppointments() {
    try {
        showLoading();
        
        const token = localStorage.getItem('torimToken');
        
        // בניית URL עם פרמטרים
        let url = `${API_URL}/appointments?page=${currentPage}&limit=${itemsPerPage}`;
        
        // סינון על פי סטטוס
        if (currentFilter && currentFilter !== 'all') {
            url += `&status=${encodeURIComponent(currentFilter)}`;
        }
        
        // חיפוש טקסטואלי
        if (searchQuery && searchQuery.trim() !== '') {
            url += `&search=${encodeURIComponent(searchQuery.trim())}`;
        }
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'שגיאה בטעינת התורים');
        }
        
        const data = await response.json();
        
        currentAppointments = data.appointments;
        totalPages = data.pages || Math.ceil(data.total / itemsPerPage);
        
        // עדכון הטבלה
        updateAppointmentsTable();
        
        // עדכון הפאגינציה
        updatePagination();
        
    } catch (error) {
        console.error('Error loading appointments:', error);
        showMessage('שגיאה בטעינת התורים: ' + error.message, true);
    } finally {
        hideLoading();
    }
}

// עדכון טבלת התורים
function updateAppointmentsTable() {
    const tableBody = document.getElementById('appointments-table');
    tableBody.innerHTML = '';
    
    if (currentAppointments.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td colspan="7" class="text-center py-4">
                <i class="bi bi-calendar-x display-4 d-block mb-3 text-muted"></i>
                <p class="mb-0">לא נמצאו תורים התואמים את החיפוש</p>
            </td>
        `;
        tableBody.appendChild(tr);
        return;
    }
    
    currentAppointments.forEach(appointment => {
        // פורמט תאריך ושעה
        const dateTime = new Date(appointment.dateTime);
        const date = dateTime.toLocaleDateString('he-IL');
        const time = dateTime.toLocaleTimeString('he-IL', {hour: '2-digit', minute: '2-digit'});
        
        // קביעת צבע הסטטוס
        let statusClass, statusText;
        switch(appointment.status) {
            case 'pending':
                statusClass = 'bg-warning text-dark';
                statusText = 'ממתין לאישור';
                break;
            case 'confirmed':
                statusClass = 'bg-success';
                statusText = 'מאושר';
                break;
            case 'completed':
                statusClass = 'bg-info';
                statusText = 'הושלם';
                break;
            case 'cancelled':
                statusClass = 'bg-danger';
                statusText = 'בוטל';
                break;
            default:
                statusClass = 'bg-secondary';
                statusText = 'לא ידוע';
        }
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${date}</td>
            <td>${time}</td>
            <td>${appointment.customerName}</td>
            <td>${appointment.customerPhone || '-'}</td>
            <td>${appointment.service?.name || 'שירות כללי'}</td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
            <td>
                <button class="btn btn-sm btn-primary btn-action view-appointment" data-id="${appointment._id}" title="צפייה בפרטים">
                    <i class="bi bi-eye-fill"></i>
                </button>
                ${appointment.status === 'pending' ? `
                <button class="btn btn-sm btn-success btn-action confirm-appointment" data-id="${appointment._id}" title="אישור תור">
                    <i class="bi bi-check-lg"></i>
                </button>` : ''}
                ${appointment.status !== 'cancelled' && appointment.status !== 'completed' ? `
                <button class="btn btn-sm btn-danger btn-action cancel-appointment" data-id="${appointment._id}" title="ביטול תור">
                    <i class="bi bi-x-lg"></i>
                </button>` : ''}
            </td>
        `;
        
        tableBody.appendChild(tr);
    });
    
    // הקמת האזנות לכפתורים בטבלה
    setupTableEventListeners();
}

// עדכון הפאגינציה
function updatePagination() {
    const paginationElement = document.getElementById('appointments-pagination');
    paginationElement.innerHTML = '';
    
    if (totalPages <= 1) {
        return;
    }
    
    // כפתור קודם
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `
        <button class="page-link" aria-label="הקודם" ${currentPage === 1 ? 'disabled' : ''}>
            <span aria-hidden="true">&laquo;</span>
        </button>
    `;
    if (currentPage > 1) {
        prevLi.querySelector('button').addEventListener('click', () => {
            currentPage--;
            loadAppointments();
        });
    }
    paginationElement.appendChild(prevLi);
    
    // כפתורי עמודים
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
        pageLi.innerHTML = `<button class="page-link">${i}</button>`;
        
        if (i !== currentPage) {
            pageLi.querySelector('button').addEventListener('click', () => {
                currentPage = i;
                loadAppointments();
            });
        }
        
        paginationElement.appendChild(pageLi);
    }
    
    // כפתור הבא
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `
        <button class="page-link" aria-label="הבא" ${currentPage === totalPages ? 'disabled' : ''}>
            <span aria-hidden="true">&raquo;</span>
        </button>
    `;
    if (currentPage < totalPages) {
        nextLi.querySelector('button').addEventListener('click', () => {
            currentPage++;
            loadAppointments();
        });
    }
    paginationElement.appendChild(nextLi);
}

// הצגת פרטי תור
async function showAppointmentDetails(appointmentId) {
    try {
        showLoading();
        
        const token = localStorage.getItem('torimToken');
        
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
        
        // שמירת מזהה התור הנוכחי
        selectedAppointmentId = appointmentId;
        
        // פורמט תאריך ושעה
        const dateTime = new Date(appointment.dateTime);
        const date = dateTime.toLocaleDateString('he-IL');
        const time = dateTime.toLocaleTimeString('he-IL', {hour: '2-digit', minute: '2-digit'});
        
        // עדכון פרטי התור במודל
        document.getElementById('modal-customer-name').textContent = appointment.customerName;
        document.getElementById('modal-customer-phone').textContent = appointment.customerPhone || '-';
        document.getElementById('modal-customer-email').textContent = appointment.customerEmail || '-';
        document.getElementById('modal-service').textContent = appointment.service?.name || 'שירות כללי';
        document.getElementById('modal-date').textContent = date;
        document.getElementById('modal-time').textContent = time;
        document.getElementById('modal-notes').textContent = appointment.notes || 'אין הערות';
        
        // קביעת סטטוס
        const statusElement = document.getElementById('modal-status');
        let statusClass, statusText;
        switch(appointment.status) {
            case 'pending':
                statusClass = 'bg-warning text-dark';
                statusText = 'ממתין לאישור';
                break;
            case 'confirmed':
                statusClass = 'bg-success';
                statusText = 'מאושר';
                break;
            case 'completed':
                statusClass = 'bg-info';
                statusText = 'הושלם';
                break;
            case 'cancelled':
                statusClass = 'bg-danger';
                statusText = 'בוטל';
                break;
            default:
                statusClass = 'bg-secondary';
                statusText = 'לא ידוע';
        }
        statusElement.className = `badge ${statusClass}`;
        statusElement.textContent = statusText;
        
        // הצגת/הסתרת כפתורי פעולה בהתאם לסטטוס
        const confirmButton = document.getElementById('confirm-appointment');
        const cancelButton = document.getElementById('cancel-appointment');
        
        if (appointment.status === 'pending') {
            confirmButton.style.display = 'block';
        } else {
            confirmButton.style.display = 'none';
        }
        
        if (appointment.status !== 'cancelled' && appointment.status !== 'completed') {
            cancelButton.style.display = 'block';
        } else {
            cancelButton.style.display = 'none';
        }
        
        // פתיחת המודל
        const appointmentModal = new bootstrap.Modal(document.getElementById('appointmentModal'));
        appointmentModal.show();
        
    } catch (error) {
        console.error('Error showing appointment details:', error);
        showMessage('שגיאה בטעינת פרטי התור: ' + error.message, true);
    } finally {
        hideLoading();
    }
}

// אישור תור
async function confirmAppointment(appointmentId) {
    try {
        showLoading();
        
        const token = localStorage.getItem('torimToken');
        
        const response = await fetch(`${API_URL}/appointments/${appointmentId}/confirm`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('שגיאה באישור התור');
        }
        
        // הצגת הודעת הצלחה
        showMessage('התור אושר בהצלחה!');
        
        // סגירת המודל
        const appointmentModal = bootstrap.Modal.getInstance(document.getElementById('appointmentModal'));
        appointmentModal.hide();
        
        // רענון הנתונים
        loadAppointments();
        loadStatistics();
        calendar.refetchEvents();
        
    } catch (error) {
        console.error('Error confirming appointment:', error);
        showMessage('שגיאה באישור התור: ' + error.message, true);
    } finally {
        hideLoading();
    }
}

// ביטול תור
async function cancelAppointment(appointmentId) {
    try {
        showLoading();
        
        const token = localStorage.getItem('torimToken');
        
        const response = await fetch(`${API_URL}/appointments/${appointmentId}/cancel`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('שגיאה בביטול התור');
        }
        
        // הצגת הודעת הצלחה
        showMessage('התור בוטל בהצלחה!');
        
        // סגירת המודל
        const appointmentModal = bootstrap.Modal.getInstance(document.getElementById('appointmentModal'));
        appointmentModal.hide();
        
        // רענון הנתונים
        loadAppointments();
        loadStatistics();
        calendar.refetchEvents();
        
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        showMessage('שגיאה בביטול התור: ' + error.message, true);
    } finally {
        hideLoading();
    }
}

// הקמת האזנות לאירועים בטבלה
function setupTableEventListeners() {
    // כפתורי צפייה בפרטים
    const viewButtons = document.querySelectorAll('.view-appointment');
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const appointmentId = this.getAttribute('data-id');
            showAppointmentDetails(appointmentId);
        });
    });
    
    // כפתורי אישור תור
    const confirmButtons = document.querySelectorAll('.confirm-appointment');
    confirmButtons.forEach(button => {
        button.addEventListener('click', function() {
            const appointmentId = this.getAttribute('data-id');
            confirmAppointment(appointmentId);
        });
    });
    
    // כפתורי ביטול תור
    const cancelButtons = document.querySelectorAll('.cancel-appointment');
    cancelButtons.forEach(button => {
        button.addEventListener('click', function() {
            const appointmentId = this.getAttribute('data-id');
            cancelAppointment(appointmentId);
        });
    });
}

// הקמת האזנות לאירועים
function setupEventListeners() {
    // כפתורי סינון
    const filterInputs = document.querySelectorAll('input[name="appointment-filter"]');
    filterInputs.forEach(input => {
        input.addEventListener('change', function() {
            currentFilter = this.value;
            currentPage = 1; // איפוס העמוד הנוכחי
            loadAppointments();
        });
    });
    
    // חיפוש
    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('search-appointments');
    
    searchButton.addEventListener('click', function() {
        searchQuery = searchInput.value.trim();
        currentPage = 1; // איפוס העמוד הנוכחי
        loadAppointments();
    });
    
    searchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            searchQuery = searchInput.value.trim();
            currentPage = 1; // איפוס העמוד הנוכחי
            loadAppointments();
        }
    });
    
    // כפתורי מודל פרטי תור
    const confirmAppointmentButton = document.getElementById('confirm-appointment');
    if (confirmAppointmentButton) {
        confirmAppointmentButton.addEventListener('click', function() {
            confirmAppointment(selectedAppointmentId);
        });
    }
    
    const cancelAppointmentButton = document.getElementById('cancel-appointment');
    if (cancelAppointmentButton) {
        cancelAppointmentButton.addEventListener('click', function() {
            cancelAppointment(selectedAppointmentId);
        });
    }
    
    // כפתור התנתקות
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            console.log('התנתקות מתבצעת...');
            localStorage.removeItem('torimToken');
            localStorage.removeItem('torimUser');
            window.location.href = 'index.html';
        });
    } else {
        console.error('לא נמצא כפתור התנתקות בדף');
    }
}