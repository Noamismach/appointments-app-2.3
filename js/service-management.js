// קבועים
const API_URL = 'http://localhost:3000/api';
const TOKEN_KEY = 'torimToken';
const USER_KEY = 'torimUser';

// משתנים גלובליים
let services = [];
let addServiceModal = null;
let editServiceModal = null;
let deleteServiceModal = null;

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

// טעינת שירותי העסק
async function loadServices() {
    try {
        // הצג מסך טעינה
        document.getElementById('loading-services').classList.remove('d-none');
        document.getElementById('empty-services').classList.add('d-none');
        
        const token = localStorage.getItem(TOKEN_KEY);
        
        const response = await fetch(`${API_URL}/business/services`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('שגיאה בטעינת השירותים');
        }
        
        const data = await response.json();
        services = data.services || [];
        
        renderServicesTable();
        
    } catch (error) {
        console.error('Error loading services:', error);
        showMessage('שגיאה בטעינת השירותים: ' + error.message, true);
    } finally {
        // הסתר מסך טעינה
        document.getElementById('loading-services').classList.add('d-none');
    }
}

// הצגת רשימת השירותים בטבלה
function renderServicesTable() {
    const tableBody = document.getElementById('services-table');
    const emptyState = document.getElementById('empty-services');
    
    if (!services.length) {
        tableBody.innerHTML = `
            <tr class="align-middle">
                <td class="text-center py-5" colspan="5">
                    <div id="empty-services">
                        <i class="bi bi-clipboard-x display-4 text-muted"></i>
                        <p class="mt-2 mb-0">לא נמצאו שירותים.</p>
                        <p class="text-muted">לחץ על "הוספת שירות חדש" כדי להתחיל</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = services.map(service => {
        const statusClass = service.isActive ? 'bg-success' : 'bg-secondary';
        const statusText = service.isActive ? 'פעיל' : 'לא פעיל';
        const priceFormatted = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(service.price);
        
        return `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="ms-3">
                            <h6 class="mb-0">${service.name}</h6>
                            <small class="text-muted">${service.description || '(ללא תיאור)'}</small>
                        </div>
                    </div>
                </td>
                <td>${service.duration} דקות</td>
                <td>${priceFormatted}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm">
                        <button type="button" class="btn btn-outline-primary edit-service-btn" data-service-id="${service._id}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button type="button" class="btn btn-outline-danger delete-service-btn" data-service-id="${service._id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // הוספת מאזיני אירועים לכפתורים
    document.querySelectorAll('.edit-service-btn').forEach(btn => {
        btn.addEventListener('click', () => showEditServiceModal(btn.dataset.serviceId));
    });
    
    document.querySelectorAll('.delete-service-btn').forEach(btn => {
        btn.addEventListener('click', () => showDeleteServiceModal(btn.dataset.serviceId));
    });
}

// הוספת שירות חדש
async function addService() {
    try {
        showLoading();
        
        const token = localStorage.getItem(TOKEN_KEY);
        
        const formData = {
            name: document.getElementById('service-name').value,
            description: document.getElementById('service-description').value,
            duration: parseInt(document.getElementById('service-duration').value, 10),
            price: parseFloat(document.getElementById('service-price').value),
            isActive: document.getElementById('service-active').checked
        };
        
        const response = await fetch(`${API_URL}/business/services`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'שגיאה בהוספת השירות');
        }
        
        // סגירת המודל
        if (addServiceModal) {
            addServiceModal.hide();
        }
        
        // איפוס הטופס
        document.getElementById('add-service-form').reset();
        
        // רענון השירותים
        await loadServices();
        
        showMessage('השירות נוסף בהצלחה');
        
    } catch (error) {
        console.error('Error adding service:', error);
        showMessage('שגיאה בהוספת השירות: ' + error.message, true);
    } finally {
        hideLoading();
    }
}

// הצגת מודל עריכת שירות
function showEditServiceModal(serviceId) {
    const service = services.find(s => s._id === serviceId);
    if (!service) return;
    
    document.getElementById('edit-service-id').value = service._id;
    document.getElementById('edit-service-name').value = service.name;
    document.getElementById('edit-service-description').value = service.description || '';
    document.getElementById('edit-service-duration').value = service.duration;
    document.getElementById('edit-service-price').value = service.price;
    document.getElementById('edit-service-active').checked = service.isActive;
    
    if (editServiceModal) {
        editServiceModal.show();
    }
}

// עדכון שירות קיים
async function updateService() {
    try {
        showLoading();
        
        const token = localStorage.getItem(TOKEN_KEY);
        const serviceId = document.getElementById('edit-service-id').value;
        
        const formData = {
            name: document.getElementById('edit-service-name').value,
            description: document.getElementById('edit-service-description').value,
            duration: parseInt(document.getElementById('edit-service-duration').value, 10),
            price: parseFloat(document.getElementById('edit-service-price').value),
            isActive: document.getElementById('edit-service-active').checked
        };
        
        const response = await fetch(`${API_URL}/business/services/${serviceId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'שגיאה בעדכון השירות');
        }
        
        // סגירת המודל
        if (editServiceModal) {
            editServiceModal.hide();
        }
        
        // רענון השירותים
        await loadServices();
        
        showMessage('השירות עודכן בהצלחה');
        
    } catch (error) {
        console.error('Error updating service:', error);
        showMessage('שגיאה בעדכון השירות: ' + error.message, true);
    } finally {
        hideLoading();
    }
}

// הצגת מודל אישור מחיקה
function showDeleteServiceModal(serviceId) {
    const service = services.find(s => s._id === serviceId);
    if (!service) return;
    
    document.getElementById('delete-service-id').value = service._id;
    document.getElementById('delete-service-name').textContent = service.name;
    
    if (deleteServiceModal) {
        deleteServiceModal.show();
    }
}

// מחיקת שירות
async function deleteService() {
    try {
        showLoading();
        
        const token = localStorage.getItem(TOKEN_KEY);
        const serviceId = document.getElementById('delete-service-id').value;
        
        const response = await fetch(`${API_URL}/business/services/${serviceId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'שגיאה במחיקת השירות');
        }
        
        // סגירת המודל
        if (deleteServiceModal) {
            deleteServiceModal.hide();
        }
        
        // רענון השירותים
        await loadServices();
        
        showMessage('השירות נמחק בהצלחה');
        
    } catch (error) {
        console.error('Error deleting service:', error);
        showMessage('שגיאה במחיקת השירות: ' + error.message, true);
    } finally {
        hideLoading();
    }
}

// חיפוש שירותים
function searchServices(query) {
    if (!query.trim()) {
        renderServicesTable();
        return;
    }
    
    const filteredServices = services.filter(service => 
        service.name.includes(query) || 
        (service.description && service.description.includes(query))
    );
    
    const tableBody = document.getElementById('services-table');
    
    if (!filteredServices.length) {
        tableBody.innerHTML = `
            <tr class="align-middle">
                <td class="text-center py-5" colspan="5">
                    <div>
                        <i class="bi bi-search display-4 text-muted"></i>
                        <p class="mt-2 mb-0">לא נמצאו שירותים התואמים את החיפוש.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // שימוש בפונקציה הקיימת עם תוצאות החיפוש
    const originalServices = [...services];
    services = filteredServices;
    renderServicesTable();
    services = originalServices;
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
    // אתחול מודלים
    addServiceModal = new bootstrap.Modal(document.getElementById('addServiceModal'));
    editServiceModal = new bootstrap.Modal(document.getElementById('editServiceModal'));
    deleteServiceModal = new bootstrap.Modal(document.getElementById('deleteServiceModal'));
    
    // כפתור שמירת שירות חדש
    const saveServiceBtn = document.getElementById('save-service-btn');
    if (saveServiceBtn) {
        saveServiceBtn.addEventListener('click', addService);
    }
    
    // כפתור עדכון שירות
    const updateServiceBtn = document.getElementById('update-service-btn');
    if (updateServiceBtn) {
        updateServiceBtn.addEventListener('click', updateService);
    }
    
    // כפתור אישור מחיקה
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', deleteService);
    }
    
    // שדה חיפוש
    const searchInput = document.getElementById('search-services');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchServices(this.value);
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

// אתחול
document.addEventListener('DOMContentLoaded', function() {
    // טעינת פרטי המשתמש
    loadUserData();
    
    // טעינת השירותים
    loadServices();
    
    // הגדרת מאזיני אירועים
    setupEventListeners();
}); 