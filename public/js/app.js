// App State - Simplificado sin tokens
let state = {
    user: JSON.parse(localStorage.getItem('user')) || null,
    invoices: [],
    clients: [],
    currentView: 'dashboard',
    theme: localStorage.getItem('theme') || 'dark'
};

// Utilidad para manejar expiración de sesión
const sessionUtils = {
    isSessionValid: function() {
        if (!state.user || !state.user.loginTimestamp) return false;
        
        const loginTime = new Date(state.user.loginTimestamp);
        const now = new Date();
        const duration = state.user.sessionDuration || '7d';
        
        if (duration === 'never') return true;
        
        const durationMs = {
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000,
            '1d': 24 * 60 * 60 * 1000
        };
        
        const elapsed = now - loginTime;
        return elapsed < (durationMs[duration] || durationMs['7d']);
    },
    
    clearSession: function() {
        state.user = null;
        localStorage.removeItem('user');
    },
    
    saveSession: function(userData) {
        state.user = userData;
        localStorage.setItem('user', JSON.stringify(userData));
    }
};

// No se utiliza URL base ya que ahora todo viaja por IPC

// Selectors
const loader = document.getElementById('loader');

function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fas fa-info-circle" style="color:var(--primary)"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

const authSection = document.getElementById('auth-section');
const setupSection = document.getElementById('setup-section');
const recoverySection = document.getElementById('recovery-section');
const appSection = document.getElementById('app-section');
const setupForm = document.getElementById('setup-form');
const loginForm = document.getElementById('login-form');
const showRecoveryBtn = document.getElementById('show-recovery');
const backToLoginBtn = document.getElementById('btn-back-to-login');

// Recovery Elements
const recoveryStep1 = document.getElementById('recovery-step-1');
const recoveryStep2 = document.getElementById('recovery-step-2');
const recoveryStep3 = document.getElementById('recovery-step-3');
const recoveryForm1 = document.getElementById('recovery-form-1');
const recoveryForm2 = document.getElementById('recovery-form-2');
const recoveryForm3 = document.getElementById('recovery-form-3');
const recoveryTestUrl = document.getElementById('recovery-test-url');
const recoveryTestLink = document.getElementById('recovery-test-link');

let currentRecoveryUsername = '';
let currentRecoveryCode = '';
const logoutBtn = document.getElementById('logout-btn');
const navItems = document.querySelectorAll('.nav-item');
const contentViews = document.querySelectorAll('.content-view');
const invoiceModal = document.getElementById('invoice-modal');
const clientModal = document.getElementById('client-modal');
const clientForm = document.getElementById('client-form');
const clientSelect = document.getElementById('invoice-client');
const submitBtn = document.getElementById('invoice-submit-btn');
const rectifiedIdInput = document.getElementById('rectified-invoice-id');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme(); // Primero el tema para evitar parpadeos
    init();
});

let isNavigating = false;

async function init() {
    try {
        const isSetup = await window.electronAPI.invoke('check-setup');

        if (!isSetup.data) {
            // First boot
            sessionUtils.clearSession();
            showSetup();
        } else {
            // Ya configurado, verificamos si la sesión es válida o mostramos login
            if (sessionUtils.isSessionValid()) {
                showApp();
            } else {
                sessionUtils.clearSession();
                showAuth();
            }
        }
    } catch (e) {
        console.error('Error inicializando app:', e);
        showAuth();
    }
    
    setupEventListeners();
}

function initTheme() {
    const savedTheme = state.theme;
    if (savedTheme) {
        setTheme(savedTheme);
    } else {
        // Detectar preferencia del sistema
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
    }
}

// Utilidad de Validación NIF/CIF
const validationUtils = {
    isValidSpanishDoc: function(doc) {
        if (!doc) return false;
        doc = doc.toUpperCase().trim().replace(/[-. ]/g, '');
        if (doc.length !== 9) return false;
        if (/^[0-9]{8}[A-Z]$/.test(doc)) return this.validateDNI(doc);
        if (/^[XYZ][0-9]{7}[A-Z]$/.test(doc)) return this.validateNIE(doc);
        if (/^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/.test(doc)) return this.validateCIF(doc);
        return false;
    },
    validateDNI: function(dni) {
        const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
        const number = parseInt(dni.substring(0, 8), 10);
        return letters.charAt(number % 23) === dni.charAt(8);
    },
    validateNIE: function(nie) {
        let value = {X:0, Y:1, Z:2}[nie.charAt(0)];
        return this.validateDNI(value + nie.substring(1));
    },
    validateCIF: function(cif) {
        const type = cif.charAt(0);
        const numbers = cif.substring(1, 8);
        const control = cif.charAt(8);
        let sum = 0;
        for (let i = 0; i < numbers.length; i++) {
            let n = parseInt(numbers.charAt(i), 10);
            if (i % 2 === 0) { n *= 2; if (n > 9) n = (n % 10) + 1; }
            sum += n;
        }
        const lastDigit = (10 - (sum % 10)) % 10;
        const letters = "JABCDEFGHI";
        if ("PQSWNW".indexOf(type) !== -1) return control === letters.charAt(lastDigit);
        else if ("ABEH".indexOf(type) !== -1) return control === lastDigit.toString();
        else return control === lastDigit.toString() || control === letters.charAt(lastDigit);
    },
    escapeHTML: function(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
};

function setTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Actualizar UI del botón
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        const icon = themeBtn.querySelector('i');
        const text = themeBtn.querySelector('span');
        if (theme === 'dark') {
            icon.className = 'fas fa-moon';
            text.textContent = 'Modo Claro';
        } else {
            icon.className = 'fas fa-sun';
            text.textContent = 'Modo Oscuro';
        }
    }
}

function toggleTheme() {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    // También guardar en configuración de Electron si es posible
    window.electronAPI.invoke('save-settings', { theme: newTheme }).catch(() => {});
}

/**
 * Utilidad para agregar eventos de forma segura sin romper el script si el elemento no existe
 */
function safeAddListener(id, event, handler) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener(event, handler);
        return true;
    }
    return false;
}

function setupEventListeners() {
    // Setup & Login
    safeAddListener('setup-form', 'submit', handleSetup);
    safeAddListener('login-form', 'submit', handleLogin);

    // Recovery Navigation
    safeAddListener('show-recovery', 'click', (e) => {
        e.preventDefault();
        showRecovery();
    });
    safeAddListener('btn-back-to-login', 'click', (e) => {
        e.preventDefault();
        showAuth();
    });

    // Recovery Steps
    safeAddListener('recovery-form-1', 'submit', handleRecoveryRequest);
    safeAddListener('recovery-form-2', 'submit', handleRecoveryVerify);
    safeAddListener('recovery-form-3', 'submit', handleRecoveryReset);

    // Logout & Theme
    safeAddListener('logout-btn', 'click', handleLogout);
    safeAddListener('theme-toggle', 'click', toggleTheme);

    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const searchInput = document.getElementById('global-search');
            if (searchInput) searchInput.value = ''; // Limpiar al navegar
            handleNav(e);
        });
    });

    // Global Search
    safeAddListener('global-search', 'input', (e) => {
        handleGlobalSearch(e.target.value);
    });

    // Settings
    safeAddListener('btn-change-path', 'click', async () => {
        const newPath = await window.electronAPI.invoke('select-directory');
        if (newPath) {
            await window.electronAPI.invoke('save-settings', { storagePath: newPath });
            const display = document.getElementById('storage-path-display');
            if (display) display.textContent = newPath;
            showToast('Ruta de almacenamiento actualizada.');
        }
    });

    safeAddListener('btn-open-path', 'click', async () => {
        await window.electronAPI.invoke('open-directory');
    });

    safeAddListener('btn-export-db', 'click', async () => {
        setLoading(true);
        const res = await window.electronAPI.invoke('export-database');
        setLoading(false);
        if (res.success) {
            showToast(res.message);
        } else if (res.message !== 'Exportación cancelada') {
            alert('Error en exportación: ' + res.message);
        }
    });

    safeAddListener('btn-import-db', 'click', async () => {
        if (confirm('¿Estás SEGURO de que quieres importar una base de datos? Esto SOBRESCRIBIRÁ todos tus datos actuales.')) {
            setLoading(true);
            const res = await window.electronAPI.invoke('import-database');
            setLoading(false);
            if (res.success) {
                showToast(res.message);
                await refreshData();
                await renderDashboard();
                updateUserInfo();
            } else if (res.message !== 'Importación cancelada') {
                alert('Error en importación: ' + res.message);
            }
        }
    });

    // Client & Invoice Modals
    safeAddListener('btn-open-create-client', 'click', () => openClientModal());
    safeAddListener('client-form', 'submit', handleClientFormSubmit);
    
    safeAddListener('btn-new-invoice-dash', 'click', () => openInvoiceModal());
    safeAddListener('btn-open-create-invoice', 'click', () => openInvoiceModal());
    safeAddListener('add-line-btn', 'click', addInvoiceLine);
    safeAddListener('create-invoice-form', 'submit', handleCreateInvoice);

    // Global Delegated Clicks (Table Actions)
    document.addEventListener('click', (e) => {
        const pdfBtn = e.target.closest('.pdf-menu-btn');
        const paidBtn = e.target.closest('.mark-paid-btn');
        const signBtn = e.target.closest('.sign-xades-btn');
        const verifyBtn = e.target.closest('.verify-signature-btn');
        const anularBtn = e.target.closest('.anular-btn');
        const rectificarBtn = e.target.closest('.rectificar-btn');
        
        if (pdfBtn) openPDFDropdown(pdfBtn);
        if (paidBtn) handleMarkAsPaid(paidBtn);
        if (signBtn) openXadesModal(signBtn);
        if (verifyBtn) handleVerifySignature(verifyBtn);
        if (anularBtn) handleAnularFactura(anularBtn.dataset.id);
        if (rectificarBtn) handleOpenRectificar(rectificarBtn.dataset.id);
    });

    // Invoices / Reports / Audit
    safeAddListener('btn-apply-filters', 'click', applyInvoicesFilters);
    safeAddListener('btn-clear-filters', 'click', clearInvoicesFilters);
    safeAddListener('btn-refresh-reports', 'click', () => renderReports());
    safeAddListener('btn-export-csv-report', 'click', exportReportToCSV);
    
    const reportYearSelect = document.getElementById('report-year');
    if (reportYearSelect) {
        const currentYear = new Date().getFullYear();
        for (let i = 0; i < 5; i++) {
            const year = currentYear - i;
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            reportYearSelect.appendChild(option);
        }
        reportYearSelect.addEventListener('change', () => renderReports());
    }

    safeAddListener('btn-verify-audit', 'click', handleVerifyAudit);
    safeAddListener('btn-refresh-audit', 'click', loadAuditLogs);
    safeAddListener('btn-preview-invoice', 'click', handlePreviewInvoice);

    // Modal Close logic
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-modal');
            if (modalId) {
                const modal = document.getElementById(modalId);
                if (modal) modal.classList.add('hidden');
            } else {
                closeModals();
            }
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal-container')) {
            closeModals();
        }
    });

    // Validations & XAdES
    safeAddListener('client-nif', 'input', (e) => {
        const val = e.target.value.trim();
        e.target.classList.toggle('input-valid', validationUtils.isValidSpanishDoc(val));
        e.target.classList.toggle('input-invalid', val && !validationUtils.isValidSpanishDoc(val));
    });

    safeAddListener('btn-select-cert', 'click', handleSelectCertificate);
    safeAddListener('btn-select-output', 'click', handleSelectOutputDir);
    safeAddListener('toggle-password', 'click', togglePasswordVisibility);
    safeAddListener('btn-sign-xades', 'click', handleXadesSignature);

    // PDF options
    safeAddListener('btn-preview-pdf', 'click', handlePreviewPDF);
    safeAddListener('btn-save-pdf', 'click', handleSavePDF);
    safeAddListener('btn-save-pdf-watermark', 'click', handleSavePDFWatermark);
    safeAddListener('btn-print-pdf', 'click', handlePrintPDF);

    // Emisor
    safeAddListener('btn-create-emisor', 'click', openEmisorModal);
    safeAddListener('btn-refresh-emisores', 'click', renderEmisor);
    safeAddListener('emisor-form', 'submit', handleEmisorSubmit);

    // Table Actions Delegation
    const clientsTable = document.getElementById('all-clients-table');
    if (clientsTable) {
        clientsTable.addEventListener('click', async (e) => {
            const editBtn = e.target.closest('.edit-client-btn');
            const delBtn  = e.target.closest('.del-client-btn');
            if (editBtn) openClientModal(state.clients.find(c => c.id === parseInt(editBtn.dataset.id)));
            if (delBtn && confirm('¿Eliminar este cliente?')) {
                const res = await window.electronAPI.invoke('delete-cliente', parseInt(delBtn.dataset.id));
                if (res.status === 204) { await fetchClients(); renderClients(); showToast('Cliente eliminado.'); }
            }
        });
    }

    // Soporte y Diagnóstico
    safeAddListener('btn-export-logs', 'click', async () => {
        setLoading(true);
        try {
            const res = await window.electronAPI.invoke('export-logs');
            if (res.success) {
                showToast(res.message);
            } else if (res.message !== 'Exportación cancelada.') {
                showToast(res.message);
            }
        } catch (err) {
            console.error('Error exportando logs:', err);
            showToast('Error técnico al exportar reporte.');
        } finally {
            setLoading(false);
        }
    });
}

// --- Auth Functions ---
async function handleSetup(e) {
    e.preventDefault();
    setLoading(true);

    const username = document.getElementById('setup-username').value;
    const password = document.getElementById('setup-password').value;
    const recoveryEmail = document.getElementById('setup-email').value;

    try {
        const response = await window.electronAPI.invoke('setup-auth', { username, password, recoveryEmail });
        
        if (response.status === 200 && response.data) {
            showToast('¡Configuración completada con éxito! Entrando...');
            // Auto login tras setup
            const loginRes = await window.electronAPI.invoke('login', { username, password });
            if (loginRes.status === 200) {
                sessionUtils.saveSession(loginRes.data);
                showApp();
            }
        } else {
            showToast('Error en la configuración: ' + (response.data.error || 'Desconocido'));
        }
    } catch (err) {
        console.error(err);
        showToast('Error de conexión con la base de datos local.');
    } finally {
        setLoading(false);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await window.electronAPI.invoke('login', { username, password });
        if (response.status === 200) {
            sessionUtils.saveSession(response.data);
            
            // Cargar datos extra del perfil
            const profileRes = await window.electronAPI.invoke('get-profile');
            if(profileRes.status === 200) {
                 state.user = { ...state.user, ...profileRes.data };
                 sessionUtils.saveSession(state.user);
            }

            showApp();
        } else {
            showToast(response.data.error || 'Credenciales incorrectas');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Fallo técnico al intentar iniciar sesión.');
    } finally {
        setLoading(false);
    }
}

// --- Recovery Functions ---
async function handleRecoveryRequest(e) {
    e.preventDefault();
    setLoading(true);
    
    currentRecoveryUsername = document.getElementById('recovery-username').value;
    
    try {
        const response = await window.electronAPI.invoke('request-password-recovery', currentRecoveryUsername);
        if (response.status === 200) {
            document.getElementById('recovery-email-hint').textContent = `Introduce el código de 6 dígitos enviado a ${response.data.emailHint}.`;
            recoveryStep1.classList.add('hidden');
            recoveryStep2.classList.remove('hidden');
            
            // Si hay preview URL de Ethereal, mostrarla temporalmente
            if (response.data.previewUrl) {
                recoveryTestUrl.classList.remove('hidden');
                recoveryTestLink.href = response.data.previewUrl;
                recoveryTestLink.textContent = response.data.previewUrl;
            }
        } else {
            showToast(response.data.error || 'Error solicitando recuperación.');
        }
    } catch (err) {
        showToast('Error de conexión');
    } finally {
        setLoading(false);
    }
}

async function handleRecoveryVerify(e) {
    e.preventDefault();
    setLoading(true);
    
    currentRecoveryCode = document.getElementById('recovery-code').value;
    
    try {
        const response = await window.electronAPI.invoke('verify-recovery-code', { username: currentRecoveryUsername, code: currentRecoveryCode });
        if (response.status === 200) {
            recoveryTestUrl.classList.add('hidden');
            recoveryStep2.classList.add('hidden');
            recoveryStep3.classList.remove('hidden');
        } else {
            showToast(response.data.error || 'Código inválido o caducado.');
        }
    } catch (err) {
        showToast('Error verificando código.');
    } finally {
        setLoading(false);
    }
}

async function handleRecoveryReset(e) {
    e.preventDefault();
    setLoading(true);
    
    const newPassword = document.getElementById('recovery-new-password').value;
    
    try {
        const response = await window.electronAPI.invoke('reset-password', {
            username: currentRecoveryUsername,
            code: currentRecoveryCode,
            newPassword
        });
        
        if (response.status === 200) {
            showToast('Contraseña restablecida correctamente. Inicia sesión de nuevo.');
            showAuth();
        } else {
            showToast(response.data.error || 'Error restableciendo contraseña.');
        }
    } catch (err) {
        showToast('Error finalizando recuperación.');
    } finally {
        setLoading(false);
    }
}

function handleLogout() {
    sessionUtils.clearSession();
    window.location.reload();
}

// --- Navigation Logic ---
function showSetup() {
    setupSection.classList.remove('hidden');
    recoverySection.classList.add('hidden');
    authSection.classList.add('hidden');
    appSection.classList.add('hidden');
    setLoading(false);
}

function showAuth() {
    setupSection.classList.add('hidden');
    recoverySection.classList.add('hidden');
    authSection.classList.remove('hidden');
    appSection.classList.add('hidden');
    
    // Reset recovery forms
    recoveryStep1.classList.remove('hidden');
    recoveryStep2.classList.add('hidden');
    recoveryStep3.classList.add('hidden');
    recoveryTestUrl.classList.add('hidden');
    document.getElementById('recovery-form-1').reset();
    document.getElementById('recovery-form-2').reset();
    document.getElementById('recovery-form-3').reset();

    setLoading(false);
}

function showRecovery() {
    setupSection.classList.add('hidden');
    authSection.classList.add('hidden');
    appSection.classList.add('hidden');
    recoverySection.classList.remove('hidden');
    setLoading(false);
}

async function showApp() {
    setupSection.classList.add('hidden');
    recoverySection.classList.add('hidden');
    authSection.classList.add('hidden');
    appSection.classList.remove('hidden');
    
    updateUserInfo();
    await refreshData();
    switchView('dashboard');
    setLoading(false);
}

async function handleNav(e) {
    if (isNavigating) return;
    e.preventDefault();
    const viewId = e.currentTarget.getAttribute('data-view');
    isNavigating = true;
    setLoading(true);
    try {
        await switchView(viewId);
    } finally {
        isNavigating = false;
        setLoading(false);
    }
}

async function switchView(viewName) {
    state.currentView = viewName;
    
    // Update Nav UI
    navItems.forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-view') === viewName);
    });

    // Update Content Visibility
    contentViews.forEach(view => {
        view.classList.toggle('hidden', view.id !== `view-${viewName}`);
    });

    // Load and Render Data
    if (viewName === 'dashboard') await renderDashboard();
    if (viewName === 'invoices') await fetchInvoices();
    if (viewName === 'clients') await fetchClients();
    if (viewName === 'emisor') await renderEmisor();
    if (viewName === 'reports') await renderReports();
    if (viewName === 'audit') await loadAuditLogs();
    if (viewName === 'settings') { await renderSettings(); await loadSeriesSettings(); }
}

// --- Emisor View ---
async function renderEmisor() {
    const container = document.getElementById('emisor-list-container');
    container.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        const response = await window.electronAPI.invoke('get-all-emisores');
        
        if (response.status === 200) {
            // El controlador devuelve { success: true, data: [...] }
            const emisores = response.data.data || response.data;
            
            if (!Array.isArray(emisores) || emisores.length === 0) {
                container.innerHTML = `
                    <div class="emisor-empty">
                        <i class="fas fa-building"></i>
                        <h3>No hay perfiles de emisor configurados</h3>
                        <p>Crea tu primer perfil para empezar a facturar</p>
                        <button class="btn btn-primary" onclick="openEmisorModal()">
                            <i class="fas fa-plus"></i> Crear Primer Perfil
                        </button>
                    </div>
                `;
            } else {
                container.innerHTML = emisores.map(emisor => `
                    <div class="emisor-card ${emisor.activo ? 'active' : ''}">
                        <div class="emisor-info">
                            <h3>
                                ${emisor.nombre}
                                <span class="emisor-nif">${emisor.nif}</span>
                                ${emisor.activo ? '<i class="fas fa-check-circle" title="Perfil Activo"></i>' : ''}
                            </h3>
                            <div class="emisor-details">
                                <div class="emisor-detail">
                                    <strong>Dirección:</strong> ${emisor.direccion}, ${emisor.cp} ${emisor.ciudad}
                                </div>
                                <div class="emisor-detail">
                                    <strong>Teléfono:</strong> ${emisor.telefono || 'No especificado'}
                                </div>
                                <div class="emisor-detail">
                                    <strong>Email:</strong> ${emisor.email || 'No especificado'}
                                </div>
                                <div class="emisor-detail">
                                    <strong>Próxima Factura:</strong> ${emisor.prefijoFactura || 'F'}${String(emisor.proximoNumeroFactura || 1).padStart(5, '0')}
                                </div>
                            </div>
                            ${(() => {
                                const missing = validateEmisorData(emisor);
                                if (missing.length === 0) return '';
                                return `
                                    <div class="emisor-warning-banner">
                                        <i class="fas fa-exclamation-triangle"></i>
                                        <div class="emisor-warning-content">
                                            <h4>Perfil Incompleto para Veri*Factu</h4>
                                            <p>Faltan los siguientes campos obligatorios:</p>
                                            <ul class="emisor-warning-list">
                                                ${missing.map(m => `<li>${m}</li>`).join('')}
                                            </ul>
                                        </div>
                                    </div>
                                `;
                            })()}
                        </div>
                        <div class="emisor-actions">
                            ${!emisor.activo ? `<button class="btn btn-success btn-sm" onclick="activateEmisor(${emisor.id})" title="Activar perfil">
                                <i class="fas fa-check"></i>
                            </button>` : ''}
                            <button class="btn btn-primary btn-sm" onclick="editEmisor(${emisor.id})" title="Editar perfil">
                                <i class="fas fa-edit"></i>
                            </button>
                            ${!emisor.activo ? `<button class="btn btn-danger btn-sm" onclick="deleteEmisor(${emisor.id})" title="Eliminar perfil">
                                <i class="fas fa-trash"></i>
                            </button>` : ''}
                        </div>
                    </div>
                `).join('');
            }
        } else {
            container.innerHTML = `
                <div class="emisor-empty">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error cargando perfiles</h3>
                    <p>${response.data?.error || 'Error desconocido'}</p>
                </div>
            `;
        }
    } catch (err) {
        console.error('Error rendering emisor:', err);
        container.innerHTML = `
            <div class="emisor-empty">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error de conexión</h3>
                <p>No se pudieron cargar los perfiles de emisor</p>
            </div>
        `;
    }
}

// --- Settings View ---
async function renderSettings() {
    const settings = await window.electronAPI.invoke('get-settings');
    const display = document.getElementById('storage-path-display');
    if (display) display.textContent = settings.storagePath;
}

// --- Data Fetching ---
async function refreshData() {
    await Promise.all([
        fetchInvoices(),
        fetchClients()
    ]);
}

async function fetchInvoices(filters = null) {
    try {
        const response = await window.electronAPI.invoke('get-facturas', filters);
        if (response.status === 200) {
            state.invoices = response.data;
            if (state.currentView === 'invoices') renderInvoices();
            if (state.currentView === 'dashboard') renderDashboard();
        }
    } catch (err) {
        console.error('Error fetching invoices:', err);
    }
}

function populateInvoicesFilterClients() {
    const select = document.getElementById('filter-client');
    if (!select) return;
    
    const currentValue = select.value;
    select.innerHTML = '<option value="">Todos los clientes</option>';
    
    state.clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = client.nombre;
        select.appendChild(option);
    });
    
    select.value = currentValue;
}

async function applyInvoicesFilters() {
    const filters = {
        startDate: document.getElementById('filter-start-date').value,
        endDate: document.getElementById('filter-end-date').value,
        clienteId: document.getElementById('filter-client').value,
        pagada: document.getElementById('filter-status').value
    };
    
    setLoading(true);
    await fetchInvoices(filters);
    setLoading(false);
}

async function clearInvoicesFilters() {
    document.getElementById('filter-start-date').value = '';
    document.getElementById('filter-end-date').value = '';
    document.getElementById('filter-client').value = '';
    document.getElementById('filter-status').value = '';
    
    setLoading(true);
    await fetchInvoices();
    setLoading(false);
}

async function fetchClients() {
    try {
        const response = await window.electronAPI.invoke('get-clientes');
        if (response.status === 200) {
            state.clients = response.data;
            populateClientSelect();
            populateInvoicesFilterClients();
            if (state.currentView === 'clients') renderClients();
        }
    } catch (err) {
        console.error('Error fetching clients:', err);
    }
}

// --- Reports Logic ---
async function renderReports() {
    const year = document.getElementById('report-year').value || new Date().getFullYear();
    const container = document.getElementById('iva-cards-container');
    const annualContainer = document.getElementById('annual-summary-container');
    
    container.innerHTML = '<div class="loading-spinner"></div>';
    annualContainer.innerHTML = '';

    try {
        const response = await window.electronAPI.invoke('get-iva-summary', year);
        if (response.status === 200) {
            const data = response.data;
            container.innerHTML = '';
            
            // Render Quarterly Cards
            for (const [qKey, qData] of Object.entries(data.quarters)) {
                const card = createIVACard(qKey, qData);
                container.appendChild(card);
            }
            
            // Render Annual Summary
            annualContainer.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; text-align: center;">
                    <div>
                        <h4 style="color:var(--text-muted); font-weight:400; font-size:1rem;">Base Imponible Total</h4>
                        <p style="font-size:1.8rem; font-weight:700;">${formatCurrency(data.annual.base)}</p>
                    </div>
                    <div>
                        <h4 style="color:var(--text-muted); font-weight:400; font-size:1rem;">IVA Repercutido Total</h4>
                        <p style="font-size:1.8rem; font-weight:700; color:var(--primary-light);">${formatCurrency(data.annual.iva)}</p>
                    </div>
                    <div>
                        <h4 style="color:var(--text-muted); font-weight:400; font-size:1rem;">Total Operaciones</h4>
                        <p style="font-size:1.8rem; font-weight:700;">${formatCurrency(data.annual.total)}</p>
                    </div>
                </div>
                <div style="margin-top: 30px; border-top: 1px solid var(--glass-border); padding-top: 20px;">
                    <h5 style="margin-bottom: 15px;">Desglose por tipos de IVA:</h5>
                    <div style="display: flex; gap: 40px; flex-wrap: wrap;">
                        ${Object.entries(data.annual.byRate).map(([rate, vals]) => `
                            <div>
                                <strong style="color:var(--success)">${rate}% IVA:</strong> 
                                <span>Base: ${formatCurrency(vals.base)}</span> | 
                                <span>IVA: ${formatCurrency(vals.iva)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            
            state.currentReportData = data; // Guardar para exportar
        }
    } catch (err) {
        console.error('Error rendering reports:', err);
        container.innerHTML = '<p style="color:var(--danger)">Error al cargar los informes fiscales.</p>';
    }
}

function createIVACard(title, data) {
    const div = document.createElement('div');
    div.className = 'glass-card';
    div.style.padding = '25px';
    
    const quartersNames = { T1: '1er Trimestre (Ene-Mar)', T2: '2º Trimestre (Abr-Jun)', T3: '3er Trimestre (Jul-Sep)', T4: '4º Trimestre (Oct-Dic)' };
    
    div.innerHTML = `
        <h3 style="margin-bottom:15px; border-bottom:1px solid var(--glass-border); padding-bottom:10px;">${quartersNames[title]}</h3>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color:var(--text-muted)">Base Imponible:</span>
            <span style="font-weight:600;">${formatCurrency(data.base)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color:var(--text-muted)">IVA Repercutido:</span>
            <span style="font-weight:600; color:var(--primary-light);">${formatCurrency(data.iva)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 15px; padding-top: 10px; border-top: 1px dashed var(--glass-border);">
            <strong style="color:var(--text)">Total:</strong>
            <strong style="font-size:1.1rem;">${formatCurrency(data.total)}</strong>
        </div>
        <div style="margin-top: 20px;">
            ${Object.entries(data.byRate).length > 0 ? `
                <table style="width:100%; font-size:0.8rem; margin-top:10px; border:none;">
                    <thead>
                        <tr style="border:none;"><th style="border:none; padding:5px;">Tipo</th><th style="border:none; padding:5px;">Base</th><th style="border:none; padding:5px;">Cuota</th></tr>
                    </thead>
                    <tbody>
                        ${Object.entries(data.byRate).map(([rate, vals]) => `
                            <tr style="border:none;">
                                <td style="border:none; padding:5px;">${rate}%</td>
                                <td style="border:none; padding:5px;">${formatCurrency(vals.base)}</td>
                                <td style="border:none; padding:5px;">${formatCurrency(vals.iva)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p style="font-size:0.8rem; color:var(--text-muted); text-align:center;">Sin operaciones registradas</p>'}
        </div>
    `;
    return div;
}

function exportReportToCSV() {
    if (!state.currentReportData) {
        showToast('No hay datos para exportar.');
        return;
    }
    
    const data = state.currentReportData;
    let csv = "Periodo,Base Imponible,IVA Repercutido,Total\\n";
    
    // Quarters
    Object.entries(data.quarters).forEach(([q, vals]) => {
        csv += `${q},${vals.base.toFixed(2)},${vals.iva.toFixed(2)},${vals.total.toFixed(2)}\\n`;
    });
    
    // Annual
    csv += `ANUAL,${data.annual.base.toFixed(2)},${data.annual.iva.toFixed(2)},${data.annual.total.toFixed(2)}\\n\\n`;
    
    // Breakdown
    csv += "Tipo IVA,Base Imponible (Anual),Cuota IVA (Anual)\\n";
    Object.entries(data.annual.byRate).forEach(([rate, vals]) => {
        csv += `${rate}%,${vals.base.toFixed(2)},${vals.iva.toFixed(2)}\\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `informe_iva_${data.year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Informe exportado a CSV.');
}

// --- UI Rendering ---
function updateUserInfo() {
    if (!state.user) return;
    document.getElementById('user-display-name').textContent = state.user.nombre || state.user.username;
    document.getElementById('welcome-name').textContent = state.user.nombre || state.user.username;
    document.getElementById('user-avatar-initials').textContent = (state.user.nombre ? state.user.nombre[0] : 'U') + (state.user.apellido ? state.user.apellido[0] : '');
    
    // Actualizar estado de sesión
    updateSessionStatus();
}

function updateSessionStatus() {
    const sessionStatus = document.getElementById('session-status');
    if (!sessionStatus) return;
    
    if (!state.user || !state.user.loginTimestamp) {
        sessionStatus.textContent = 'Sesión no activa';
        return;
    }
    
    const loginTime = new Date(state.user.loginTimestamp);
    const now = new Date();
    const duration = state.user.sessionDuration || '7d';
    
    if (duration === 'never') {
        sessionStatus.textContent = 'Sesión permanente';
    } else {
        const durationMs = {
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000,
            '1d': 24 * 60 * 60 * 1000
        };
        
        const elapsed = now - loginTime;
        const remaining = durationMs[duration] - elapsed;
        const daysLeft = Math.floor(remaining / (24 * 60 * 60 * 1000));
        
        if (daysLeft > 0) {
            sessionStatus.textContent = `Sesión activa (${daysLeft} día${daysLeft !== 1 ? 's' : ''} restantes)`;
        } else {
            const hoursLeft = Math.floor(remaining / (60 * 60 * 1000));
            if (hoursLeft > 0) {
                sessionStatus.textContent = `Sesión activa (${hoursLeft} hora${hoursLeft !== 1 ? 's' : ''} restantes)`;
            } else {
                sessionStatus.textContent = 'Sesión por expirar';
            }
        }
    }
}

function renderDashboard() {
    const total = state.invoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
    const pending = state.invoices.filter(inv => !inv.pagada).reduce((sum, inv) => sum + parseFloat(inv.total), 0);
    
    document.getElementById('stat-total-billed').textContent = formatCurrency(total);
    document.getElementById('stat-pending').textContent = formatCurrency(pending);
    document.getElementById('stat-count').textContent = state.invoices.length;

    renderInvoicesTable('recent-invoices-table', state.invoices.slice(0, 5));
}

function renderInvoices() {
    renderInvoicesTable('all-invoices-table', state.invoices);
}

function renderInvoicesTable(tableId, data, filterText = '') {
    const tbody = document.querySelector(`#${tableId} tbody`);
    tbody.innerHTML = '';

    let filteredData = data;
    if (filterText) {
        const q = filterText.toLowerCase();
        filteredData = data.filter(inv => 
            inv.numero.toLowerCase().includes(q) || 
            (inv.cliente && inv.cliente.nombre.toLowerCase().includes(q))
        );
    }

    if (filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 40px; color: var(--text-muted);">No hay facturas registradas</td></tr>';
        return;
    }

    filteredData.forEach(inv => {
        const row = document.createElement('tr');
        const esAnulada = inv.estado === "ANULADA";
        const esRectificativa = ["R1", "R2", "R3", "R4", "R5"].includes(inv.tipoFactura);
        const esInmutable = inv.aeatEstado === "ACEPTADO" || inv.xmlFirmado;

        row.innerHTML = `
            <td style="font-weight: 600;">
                ${validationUtils.escapeHTML(inv.numero)}
                ${esRectificativa ? '<br><span class="badge badge-info" style="font-size:0.6rem">RECTIFICATIVA</span>' : ''}
            </td>
            <td>${validationUtils.escapeHTML(inv.cliente.nombre)}</td>
            <td>${new Date(inv.fechaEmision).toLocaleDateString()}</td>
            <td style="font-weight: 700;">${formatCurrency(inv.total)}</td>
            <td>
                <span class="badge ${inv.pagada ? 'badge-success' : 'badge-warning'}">${inv.pagada ? 'PAGADA' : 'PENDIENTE'}</span>
                ${esAnulada ? '<span class="badge badge-danger" style="margin-left:5px">ANULADA</span>' : ''}
            </td>
            <td>
                <div class="pdf-actions">
                    <button class="btn-icon pdf-menu-btn" title="Opciones PDF" data-id="${inv.id}" data-numero="${inv.numero}" data-cliente="${inv.cliente.nombre}" data-total="${inv.total}">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                </div>
                ${!inv.pagada && !esAnulada && !esInmutable ? `<button class="btn-icon mark-paid-btn" title="Marcar como pagada" data-id="${inv.id}" data-total="${inv.total}"><i class="fas fa-check-circle"></i></button>` : ''}
                ${!inv.xmlFirmado && !esAnulada ? `<button class="btn-icon sign-xades-btn" title="Firmar Digitalmente" data-id="${inv.id}" data-numero="${inv.numero}" data-cliente="${inv.cliente.nombre}" data-total="${inv.total}"><i class="fas fa-certificate"></i></button>` : `<button class="btn-icon verify-signature-btn" title="Verificar Firma" data-id="${inv.id}"><i class="fas fa-shield-alt"></i></button>`}
                ${!esAnulada ? `
                    <button class="btn-icon rectificar-btn" title="Emitir Rectificativa" data-id="${inv.id}"><i class="fas fa-file-export"></i></button>
                    ${esInmutable ? `<button class="btn-icon anular-btn" title="Anular Factura (Irreversible)" data-id="${inv.id}" style="color:var(--danger)"><i class="fas fa-ban"></i></button>` : ''}
                ` : ''}
                ${esInmutable ? '<i class="fas fa-lock" title="Registro Inmutable (Veri*Factu)" style="margin-left:8px; color:var(--text-muted); opacity:0.5; font-size:0.8rem"></i>' : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function populateClientSelect() {
    const select = document.getElementById('invoice-client');
    select.innerHTML = '<option value="" disabled selected>Selecciona un cliente</option>';
    state.clients.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = `${c.nombre}${c.nif ? ' (' + c.nif + ')' : ''}`;
        select.appendChild(option);
    });
}

function renderClients(filterText = '') {
    const tbody = document.querySelector('#all-clients-table tbody');
    tbody.innerHTML = '';
    
    let filteredData = state.clients;
    if (filterText) {
        const q = filterText.toLowerCase();
        filteredData = state.clients.filter(c => 
            c.nombre.toLowerCase().includes(q) || 
            (c.nif && c.nif.toLowerCase().includes(q)) ||
            (c.ciudad && c.ciudad.toLowerCase().includes(q))
        );
    }

    if (filteredData.length === 0) {
        tbody.innerHTML = filterText 
            ? '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">No hay clientes que coincidan con la búsqueda.</td></tr>'
            : '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">No hay clientes todavía. ¡Añade el primero!</td></tr>';
        return;
    }
    filteredData.forEach(c => {
        const row = document.createElement('tr');
        const safeNombre = validationUtils.escapeHTML(c.nombre);
        const safeRazon = c.razonSocial ? `<br><small style="color:var(--text-muted);font-weight:400">${validationUtils.escapeHTML(c.razonSocial)}</small>` : '';
        
        row.innerHTML = `
            <td style="font-weight:600">${safeNombre}${safeRazon}</td>
            <td>${validationUtils.escapeHTML(c.nif) || '<span style="color:var(--text-muted)">—</span>'}</td>
            <td><span class="badge" style="background:rgba(131,48,255,.15);color:var(--primary-light)">${validationUtils.escapeHTML(c.tipoCliente)}</span></td>
            <td>${[validationUtils.escapeHTML(c.ciudad), validationUtils.escapeHTML(c.provincia)].filter(Boolean).join(', ') || '—'}</td>
            <td>${validationUtils.escapeHTML(c.email) || '—'}</td>
            <td>${validationUtils.escapeHTML(c.telefono) || '—'}</td>
            <td>
                <button class="btn-icon edit-client-btn" title="Editar" data-id="${c.id}"><i class="fas fa-edit"></i></button>
                <button class="btn-icon del-client-btn" title="Eliminar" data-id="${c.id}" style="color:var(--danger)"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function handleGlobalSearch(query) {
    if (state.currentView === 'invoices') {
        renderInvoicesTable('all-invoices-table', state.invoices, query);
    } else if (state.currentView === 'clients') {
        renderClients(query);
    } else if (state.currentView === 'dashboard') {
        renderInvoicesTable('recent-invoices-table', state.invoices.slice(0, 5), query);
    }
}

// --- Invoice Creation ---
function addInvoiceLine(data = null) {
    const list = document.getElementById('lines-list');
    const div = document.createElement('div');
    div.className = 'invoice-line';
    
    const desc = data ? data.descripcion : '';
    const qty = data ? data.cantidad : 1;
    const price = data ? data.precioUnitario : '';
    const iva = data ? data.tipoIva : 21;

    div.innerHTML = `
        <input type="text" placeholder="Concepto" class="line-desc" list="services-list" value="${desc}" required>
        <input type="number" value="${qty}" min="1" class="line-qty" required>
        <input type="number" step="0.01" placeholder="0.00" value="${price}" class="line-price" required>
        <select class="line-iva">
            <option value="21" ${iva == 21 ? 'selected' : ''}>21%</option>
            <option value="10" ${iva == 10 ? 'selected' : ''}>10%</option>
            <option value="4" ${iva == 4 ? 'selected' : ''}>4%</option>
            <option value="0" ${iva == 0 ? 'selected' : ''}>0%</option>
        </select>
        <button type="button" class="remove-line"><i class="fas fa-trash"></i></button>
    `;
    list.appendChild(div);
}

async function handleCreateInvoice(e) {
    e.preventDefault();
    
    // Validación de total 0€ preventiva para feedback instantáneo
    const totalDisplay = document.getElementById('invoice-total');
    if (totalDisplay && parseFloat(totalDisplay.textContent.replace(/[^\d.-]/g, '')) <= 0) {
        showToast('Error: El total de la factura no puede ser 0€ (Requisito Veri*Factu)');
        return;
    }

    setLoading(true);

    const clienteId = document.getElementById('invoice-client').value;
    const lineElements = document.querySelectorAll('.invoice-line');
    const lineas = Array.from(lineElements).map(el => ({
        descripcion: el.querySelector('.line-desc').value,
        cantidad: parseInt(el.querySelector('.line-qty').value),
        precioUnitario: parseFloat(el.querySelector('.line-price').value),
        tipoIva: parseInt(el.querySelector('.line-iva').value)
    }));

    const body = {
        clienteId: parseInt(clienteId),
        lineas,
        notas: document.getElementById('invoice-notes').value,
        descuento: parseFloat(document.getElementById('invoice-discount').value || 0),
        metodoPago: document.getElementById('invoice-payment-method').value,
        pagada: document.getElementById('invoice-paid-check').checked,
        importePagado: parseFloat(document.getElementById('invoice-amount-paid').value || 0),
        tipoFactura: document.getElementById('invoice-type').value,
        facturaRectificadaId: document.getElementById('rectified-invoice-id').value || null
    };

    try {
        const response = await window.electronAPI.invoke('create-factura', body);

        if (response.status === 201) {
            await refreshData();
            closeInvoiceModal();
            renderDashboard();
            showToast(body.facturaRectificadaId ? '¡Factura rectificativa generada!' : '¡Factura generada con éxito!');
        } else {
            showToast('⚠️ Error al crear factura: ' + (response.data?.error || 'Respuesta inválida'));
        }
    } catch (error) {
        console.error('Error creating invoice:', error);
        showToast('❌ Error crítico: No se pudo conectar con el servicio de facturación.');
    } finally {
        setLoading(false);
    }
}

// --- Utils ---
function setLoading(isLoading) {
    if (isLoading) {
        loader.classList.remove('hidden');
    } else {
        loader.classList.add('hidden');
    }
}

function openInvoiceModal(rectifiedInv = null) {
    const form = document.getElementById('create-invoice-form');
    const title = document.getElementById('invoice-modal-title');
    form.reset();
    document.getElementById('lines-list').innerHTML = ''; // Limpiar líneas
    
    // Resetear banners y selects
    const banner = document.getElementById('rectification-banner');
    if (banner) banner.classList.add('hidden');
    
    // Resetear serie y tipo
    const typeSelect = document.getElementById('invoice-type');
    if (typeSelect) typeSelect.value = 'F1';
    
    if (rectifiedInv) {
        // MODO RECTIFICATIVA
        title.textContent = 'Nueva Factura Rectificativa';
        banner.classList.remove('hidden');
        document.getElementById('rectified-invoice-num').textContent = rectifiedInv.numero;
        rectifiedIdInput.value = rectifiedInv.id;
        submitBtn.textContent = 'Generar Rectificativa';
        
        // Bloquear cliente
        clientSelect.value = rectifiedInv.clienteId;
        clientSelect.disabled = true;
        
        // Sugerir tipo R1
        typeSelect.value = 'R1';
        
        // Clonar líneas (con importes sugeridos)
        rectifiedInv.facturalinea.forEach(l => addInvoiceLine(l));
        
        showToast('Complete los motivos y ajuste importes para la rectificación.');
    } else {
        // MODO NORMAL
        title.textContent = 'Crear Nueva Factura';
        banner.classList.add('hidden');
        rectifiedIdInput.value = '';
        submitBtn.textContent = 'Generar Factura';
        
        clientSelect.disabled = false;
        typeSelect.value = 'F1';
        
        addInvoiceLine(); // Línea vacía por defecto
    }

    // Cargar series por defecto (ORDINARIA)
    updateInvoiceSeriesDropdown('ORDINARIA');

    invoiceModal.classList.remove('hidden');
}

function closeInvoiceModal() {
    invoiceModal.classList.add('hidden');
    document.getElementById('create-invoice-form').reset();
    document.getElementById('invoice-client').disabled = false;
    // Resetear banner
    document.getElementById('rectification-banner').classList.add('hidden');
}

function closeModals() {
    document.querySelectorAll('.modal-container').forEach(m => m.classList.add('hidden'));
    
    // Si hay modales específicos que requieren limpieza, llamarlos aquí
    if (typeof closeInvoiceModal === 'function') {
        // En lugar de llamar directamente a closeInvoiceModal que limpia cosas específicas
        // solo reseteamos cosas comunes si es necesario
        const form = document.getElementById('create-invoice-form');
        if (form) form.reset();
        const client = document.getElementById('invoice-client');
        if (client) client.disabled = false;
        const banner = document.getElementById('rectification-banner');
        if (banner) banner.classList.add('hidden');
    }
}

// --- Nuevas funciones de Anulación y Rectificación ---

async function handleAnularFactura(id) {
    const confirmMsg = `¿Está SEGURO de que desea ANULAR la factura #${id}? 
    Esta acción enviará un mensaje de anulación a la AEAT que es IRREVERSIBLE y anulará legalmente el documento.`;
    
    if (!confirm(confirmMsg)) return;

    setLoading(true);
    try {
        const response = await window.electronAPI.invoke('anular-factura', parseInt(id));
        if (response.status === 200) {
            await refreshData();
            renderDashboard();
            showToast('✅ Factura anulada y notificada a la AEAT con éxito.');
        } else {
            showToast('❌ Error al anular: ' + (response.data?.error || 'Rechazado por AEAT'));
        }
    } catch (err) {
        showToast('Error técnico al procesar la anulación.');
    } finally {
        setLoading(false);
    }
}

async function handleOpenRectificar(id) {
    try {
        const response = await window.electronAPI.invoke('get-factura-by-id', id);
        if (response.status === 200) {
            openInvoiceModal(response.data);
        } else {
            showToast('No se pudo cargar la factura original.');
        }
    } catch (err) {
        showToast('Error de conexión.');
    }
}

// --- Client Modal ---
function openClientModal(clienteData = null) {
    clientForm.reset();
    document.getElementById('client-id').value = '';
    document.getElementById('client-pais').value = 'España';

    if (clienteData) {
        document.getElementById('client-modal-title').textContent = 'Editar Cliente';
        document.getElementById('client-submit-btn').textContent = 'Guardar Cambios';
        document.getElementById('client-id').value = clienteData.id;
        document.getElementById('client-nombre').value = clienteData.nombre || '';
        document.getElementById('client-razon-social').value = clienteData.razonSocial || '';
        document.getElementById('client-nif').value = clienteData.nif || '';
        document.getElementById('client-email').value = clienteData.email || '';
        document.getElementById('client-telefono').value = clienteData.telefono || '';
        document.getElementById('client-direccion').value = clienteData.direccion || '';
        document.getElementById('client-cp').value = clienteData.codigoPostal || '';
        document.getElementById('client-ciudad').value = clienteData.ciudad || '';
        document.getElementById('client-provincia').value = clienteData.provincia || '';
        document.getElementById('client-pais').value = clienteData.pais || 'España';
        document.getElementById('client-dir-entrega').value = clienteData.direccionEntrega || '';
        document.getElementById('client-observaciones').value = clienteData.observaciones || '';
        // Set tipo radio
        const tipo = clienteData.tipoCliente || 'EMPRESA';
        document.querySelector(`input[name="tipoCliente"][value="${tipo}"]`).checked = true;
    } else {
        document.getElementById('client-modal-title').textContent = 'Nuevo Cliente';
        document.getElementById('client-submit-btn').textContent = 'Crear Cliente';
        document.querySelector('input[name="tipoCliente"][value="EMPRESA"]').checked = true;
    }

    clientModal.classList.remove('hidden');
}

async function handleClientFormSubmit(e) {
    e.preventDefault();
    setLoading(true);

    const id = document.getElementById('client-id').value;
    const nif = document.getElementById('client-nif').value || '';
    
    // Validación de NIF/CIF
    if (nif && !validationUtils.isValidSpanishDoc(nif)) {
        setLoading(false);
        showToast('⚠️ El NIF/CIF introducido no es válido. Por favor, revísalo.');
        document.getElementById('client-nif').focus();
        return;
    }

    const data = {
        tipoCliente: document.querySelector('input[name="tipoCliente"]:checked').value,
        nombre: document.getElementById('client-nombre').value,
        razonSocial: document.getElementById('client-razon-social').value || null,
        nif: nif,
        email: document.getElementById('client-email').value || null,
        telefono: document.getElementById('client-telefono').value || null,
        direccion: document.getElementById('client-direccion').value,
        codigoPostal: document.getElementById('client-cp').value || null,
        ciudad: document.getElementById('client-ciudad').value || null,
        provincia: document.getElementById('client-provincia').value || null,
        pais: document.getElementById('client-pais').value || 'España',
        direccionEntrega: document.getElementById('client-dir-entrega').value || null,
        observaciones: document.getElementById('client-observaciones').value || null
    };

    try {
        let response;
        if (id) {
            response = await window.electronAPI.invoke('update-cliente', { id: parseInt(id), data });
        } else {
            response = await window.electronAPI.invoke('create-cliente', data);
        }

        if (response.status === 200 || response.status === 201) {
            clientModal.classList.add('hidden');
            await fetchClients();
            renderClients();
            showToast(id ? 'Cliente actualizado.' : '¡Cliente creado con éxito!');
        } else {
            showToast('⚠️ Fail: ' + (response.data?.error || 'No se pudo guardar el cliente.'));
        }
    } catch (err) {
        console.error(err);
        showToast('❌ Error de red o sistema al gestionar el cliente.');
    } finally {
        setLoading(false);
    }
}

function formatCurrency(value) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
}

async function handleMarkAsPaid(button) {
    const id = button.getAttribute('data-id');
    const total = parseFloat(button.getAttribute('data-total'));
    
    if (!confirm(`¿Marcar esta factura como pagada por ${formatCurrency(total)}?`)) {
        return;
    }
    
    setLoading(true);
    try {
        const response = await window.electronAPI.invoke('update-factura-estado', {
            id: parseInt(id),
            data: {
                pagada: true,
                importePagado: total
            }
        });
        
        if (response.status === 200) {
            await refreshData();
            showToast('¡Factura marcada como pagada!');
        } else {
            showToast(response.data?.error || 'Error al actualizar el estado.');
        }
    } catch (err) {
        console.error(err);
        showToast('Error de conexión.');
    } finally {
        setLoading(false);
    }
}

// --- XAdES Digital Signature Functions ---
function openXadesModal(button) {
    const facturaId = button.getAttribute('data-id');
    const facturaNumero = button.getAttribute('data-numero');
    const facturaCliente = button.getAttribute('data-cliente');
    const facturaTotal = button.getAttribute('data-total');
    
    // Load invoice info into modal
    document.getElementById('xades-factura-numero').textContent = facturaNumero;
    document.getElementById('xades-factura-cliente').textContent = facturaCliente;
    document.getElementById('xades-factura-total').textContent = formatCurrency(parseFloat(facturaTotal));
    
    // Store factura ID for signing
    document.getElementById('xades-modal').dataset.facturaId = facturaId;
    
    // Clear previous form data
    document.getElementById('cert-file').value = '';
    document.getElementById('cert-file-display').value = '';
    document.getElementById('cert-password').value = '';
    document.getElementById('output-dir').value = '';
    document.getElementById('output-dir-display').value = '';
    
    // Show modal
    document.getElementById('xades-modal').classList.remove('hidden');
}

async function handleSelectCertificate() {
    try {
        const certPath = await window.electronAPI.invoke('select-certificate-file');
        if (certPath) {
            document.getElementById('cert-file').value = certPath;
            document.getElementById('cert-file-display').value = certPath.split('\\').pop().split('/').pop();
        }
    } catch (err) {
        showToast('Error seleccionando certificado');
    }
}

async function handleSelectOutputDir() {
    try {
        const outputDir = await window.electronAPI.invoke('select-directory');
        if (outputDir) {
            document.getElementById('output-dir').value = outputDir;
            document.getElementById('output-dir-display').value = outputDir;
        }
    } catch (err) {
        showToast('Error seleccionando directorio');
    }
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('cert-password');
    const toggleIcon = document.querySelector('#toggle-password i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

async function handleXadesSignature() {
    const facturaId = document.getElementById('xades-modal').dataset.facturaId;
    const certPath = document.getElementById('cert-file').value;
    const certPassword = document.getElementById('cert-password').value;
    const outputDir = document.getElementById('output-dir').value;
    
    // Validation
    if (!certPath) {
        showToast('Por favor, selecciona un certificado digital');
        return;
    }
    
    if (!certPassword) {
        showToast('Por favor, introduce la contraseña del certificado');
        return;
    }
    
    if (!outputDir) {
        showToast('Por favor, selecciona un directorio de salida');
        return;
    }
    
    setLoading(true);
    try {
        const response = await window.electronAPI.invoke('sign-invoice-xades', {
            facturaId: parseInt(facturaId),
            certPath,
            certPassword,
            outputDir
        });
        
        if (response.status === 200) {
            document.getElementById('xades-modal').classList.add('hidden');
            await refreshData();
            showToast('¡Factura firmada digitalmente con éxito!');
            
            // Offer to open the signed file
            if (confirm('¿Deseas abrir el archivo XML firmado?')) {
                const { shell } = require('electron');
                shell.openPath(response.data.firmaPath);
            }
        } else {
            showToast(response.data?.error || 'Error en la firma digital');
        }
    } catch (err) {
        console.error('XAdES signing error:', err);
        showToast('Error en el proceso de firma digital');
    } finally {
        setLoading(false);
    }
}

async function handleVerifySignature(button) {
    const facturaId = button.getAttribute('data-id');
    
    setLoading(true);
    try {
        const response = await window.electronAPI.invoke('verify-invoice-integrity', {
            facturaId: parseInt(facturaId)
        });
        
        if (response.status === 200) {
            const data = response.data;
            if (data.integrityValid) {
                showToast('✅ La firma digital es válida y el archivo no ha sido modificado');
            } else {
                showToast('⚠️ Advertencia: La integridad del archivo ha sido comprometida');
            }
        } else {
            showToast(response.data?.error || 'Error verificando la firma');
        }
    } catch (err) {
        console.error('Signature verification error:', err);
        showToast('Error verificando la firma digital');
    } finally {
        setLoading(false);
    }
}

// --- Enhanced PDF Functions ---
let currentFacturaId = null;

function openPDFDropdown(button) {
    const facturaId = button.getAttribute('data-id');
    const facturaNumero = button.getAttribute('data-numero');
    const facturaCliente = button.getAttribute('data-cliente');
    
    currentFacturaId = facturaId;
    
    // Load invoice info
    document.getElementById('dropdown-factura-numero').textContent = facturaNumero;
    document.getElementById('dropdown-factura-cliente').textContent = facturaCliente;
    
    // Load available logos
    loadAvailableLogos();
    
    // Show dropdown with overlay
    const overlay = document.createElement('div');
    overlay.className = 'dropdown-overlay';
    overlay.id = 'pdf-dropdown-overlay';
    document.body.appendChild(overlay);
    
    document.getElementById('pdf-dropdown').classList.remove('hidden');
    
    // Close on overlay click
    overlay.addEventListener('click', closePDFDropdown);
}

function closePDFDropdown() {
    document.getElementById('pdf-dropdown').classList.add('hidden');
    const overlay = document.getElementById('pdf-dropdown-overlay');
    if (overlay) {
        overlay.remove();
    }
}

async function loadAvailableLogos() {
    try {
        const response = await window.electronAPI.invoke('get-available-logos');
        if (response.status === 200) {
            const logoSelect = document.getElementById('pdf-logo');
            logoSelect.innerHTML = '<option value="">Sin logo</option>';
            
            response.data.logos.forEach(logo => {
                const option = document.createElement('option');
                option.value = logo.name;
                option.textContent = `${logo.name} (${logo.sizeFormatted})`;
                logoSelect.appendChild(option);
            });
        }
    } catch (err) {
        console.error('Error loading logos:', err);
    }
}

function getPDFOptions() {
    return {
        quality: document.getElementById('pdf-quality').value,
        logoName: document.getElementById('pdf-logo').value,
        includeSignature: document.getElementById('pdf-signature').checked
    };
}

async function handlePreviewPDF() {
    if (!currentFacturaId) return;
    
    setLoading(true);
    try {
        const options = getPDFOptions();
        const response = await window.electronAPI.invoke('preview-pdf', {
            facturaId: parseInt(currentFacturaId),
            options
        });
        
        if (response.status === 200) {
            closePDFDropdown();
            showToast('✅ Previsualización abierta en visor PDF');
        } else {
            showToast(response.data?.error || 'Error en previsualización');
        }
    } catch (err) {
        console.error('Preview PDF error:', err);
        showToast('Error generando previsualización');
    } finally {
        setLoading(false);
    }
}

async function handleSavePDF() {
    if (!currentFacturaId) return;
    
    setLoading(true);
    try {
        const options = getPDFOptions();
        const response = await window.electronAPI.invoke('save-pdf', {
            facturaId: parseInt(currentFacturaId),
            options
        });
        
        if (response.status === 200) {
            closePDFDropdown();
            showToast('✅ PDF guardado correctamente');
        } else if (response.data?.message === 'Operación cancelada por el usuario') {
            // Usuario canceló, no mostrar error
            return;
        } else {
            showToast(response.data?.error || 'Error guardando PDF');
        }
    } catch (err) {
        console.error('Save PDF error:', err);
        showToast('Error guardando PDF');
    } finally {
        setLoading(false);
    }
}

async function handleSavePDFWatermark() {
    if (!currentFacturaId) return;
    
    setLoading(true);
    try {
        const response = await window.electronAPI.invoke('generate-watermarked-pdf', {
            facturaId: parseInt(currentFacturaId)
        });
        
        if (response.status === 200) {
            // Guardar con diálogo
            const { dialog } = require('electron').remote || require('@electron/remote');
            const saveDialog = await dialog.showSaveDialog({
                title: 'Guardar Copia PDF',
                defaultPath: `copia_factura_${currentFacturaId}.pdf`,
                filters: [
                    { name: 'PDF Documents', extensions: ['pdf'] }
                ]
            });
            
            if (!saveDialog.canceled) {
                const fs = require('fs');
                fs.writeFileSync(saveDialog.filePath, response.data.buffer);
                showToast('✅ Copia con marca de agua guardada');
            }
        } else {
            showToast(response.data?.error || 'Error generando copia');
        }
    } catch (err) {
        console.error('Watermark PDF error:', err);
        showToast('Error generando copia con marca');
    } finally {
        setLoading(false);
    }
}

async function handlePrintPDF() {
    if (!currentFacturaId) return;
    
    setLoading(true);
    try {
        const options = { ...getPDFOptions(), quality: 'print' };
        const response = await window.electronAPI.invoke('print-pdf', {
            facturaId: parseInt(currentFacturaId),
            options
        });
        
        if (response.status === 200) {
            closePDFDropdown();
            showToast('🖨️ Diálogo de impresión abierto');
        } else {
            showToast(response.data?.error || 'Error preparando impresión');
        }
    } catch (err) {
        console.error('Print PDF error:', err);
        showToast('Error preparando impresión');
    } finally {
        setLoading(false);
    }
}

window.downloadPDF = async function(id) {
    if (window.electronAPI && window.electronAPI.invoke) {
        setLoading(true);
        try {
            const response = await window.electronAPI.invoke('generate-factura-pdf', id);
            // El proceso principal abrirá el PDF si tiene éxito
            if (response.status !== 200) {
                alert('Error al generar PDF: ' + (response.data?.error || 'Error desconocido'));
            }
        } catch (err) {
            console.error(err);
            alert('Error de conexión.');
        } finally {
            setLoading(false);
        }
    }
};

// --- Emisor Functions ---
let currentEmisorId = null;

async function openEmisorModal(emisorId = null) {
    currentEmisorId = emisorId;
    
    // Load form options
    await loadEmisorFormOptions();
    
    // Reset form
    document.getElementById('emisor-form').reset();
    
    if (emisorId) {
        // Edit mode
        document.getElementById('emisor-modal-title').textContent = 'Editar Perfil de Emisor';
        
        try {
            const response = await window.electronAPI.invoke('get-emisor-by-id', { id: emisorId });
            
            if (response.status === 200) {
                const emisor = response.data;
                
                // Fill form with emisor data
                Object.keys(emisor).forEach(key => {
                    const input = document.getElementById(`emisor-${key}`);
                    if (input) {
                        if (input.type === 'checkbox') {
                            input.checked = emisor[key];
                        } else {
                            input.value = emisor[key] || '';
                        }
                    }
                });
                
                // Fill SMTP fields separately (not named with emisor- prefix)
                _fillSmtpFields(emisor);
            }
        } catch (err) {
            console.error('Error loading emisor:', err);
            showToast('Error cargando datos del emisor');
        }
    } else {
        // Create mode
        document.getElementById('emisor-modal-title').textContent = 'Nuevo Perfil de Emisor';
        
        // Auto-fill from Win o Win data
        const prefillData = {
            'emisor-nombre': 'Hermanos Gómez Win S.L.',
            'emisor-nif': 'B75700476',
            'emisor-telefono': '+34 698 764 889 /+34 637 572 723',
            'emisor-direccion': 'C/ Islas Galápagos, 36 Bajo',
            'emisor-cp': '28300',
            'emisor-ciudad': 'Aranjuez',
            'emisor-email': 'winowinconsulting@gmail.com'
        };
        
        Object.keys(prefillData).forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.value = prefillData[id];
            }
        });

        // Clear SMTP fields
        ['smtp-from-name','smtp-user','smtp-host','smtp-pass'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const portEl = document.getElementById('smtp-port');
        if (portEl) portEl.value = 587;
        const secureEl = document.getElementById('smtp-secure');
        if (secureEl) secureEl.checked = false;
        const resultEl = document.getElementById('smtp-test-result');
        if (resultEl) resultEl.textContent = '';
    }
    
    // Show modal
    document.getElementById('emisor-modal').classList.remove('hidden');
}

async function loadEmisorFormOptions() {
    try {
        const response = await window.electronAPI.invoke('get-opciones-formulario-emisor');
        
        if (response.status === 200) {
            const result = response.data;
            if (result.success && result.data) {
                const opciones = result.data;
                
                // Load regimenes fiscales
                const regimenSelect = document.getElementById('emisor-regimen-fiscal');
                regimenSelect.innerHTML = '<option value="">Selecciona un régimen</option>';
                opciones.regimenesFiscales.forEach(regimen => {
                    const option = document.createElement('option');
                    option.value = regimen.value;
                    option.textContent = regimen.label;
                    regimenSelect.appendChild(option);
                });
            }
        }
    } catch (err) {
        console.error('Error loading form options:', err);
    }
}

function validateEmisorData(data) {
    const missingFields = [];
    
    // Mapeo de campos técnicos a nombres amigables
    const fieldLabels = {
        'nombre': 'Nombre/Razón Social (Empresa)',
        'nif': 'NIF (Empresa)',
        'regimenFiscal': 'Régimen Fiscal',
        'direccion': 'Dirección (Empresa)',
        'ciudad': 'Ciudad (Empresa)',
        'provincia': 'Provincia (Empresa)',
        'cp': 'Código Postal (Empresa)',
        'productorNombre': 'Nombre (SIF/Productor)',
        'productorEmail': 'Email (SIF/Productor)',
        'productorDireccion': 'Dirección (SIF/Productor)',
        'productorCp': 'Código Postal (SIF/Productor)',
        'productorLocalidad': 'Localidad (SIF/Productor)',
        'productorProvincia': 'Provincia (SIF/Productor)'
    };

    Object.keys(fieldLabels).forEach(field => {
        if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
            missingFields.push(fieldLabels[field]);
        }
    });

    return missingFields;
}

async function handleEmisorSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const emisorData = {};
    
    // Convert FormData to object
    for (let [key, value] of formData.entries()) {
        if (key === 'ivaPorDefecto' || key === 'proximoNumeroFactura') {
            emisorData[key] = parseFloat(value) || 0;
        } else if (key === 'emailEnvioPorDefecto') {
            emisorData[key] = value === 'on'; // Convert checkbox to boolean
        } else {
            emisorData[key] = value;
        }
    }
    
    // Validación de NIF/CIF del Emisor
    if (emisorData.nif && !validationUtils.isValidSpanishDoc(emisorData.nif)) {
        setLoading(false);
        showToast('⚠️ El NIF/CIF del Emisor no es válido. Es obligatorio para Veri*Factu.');
        document.getElementById('emisor-nif').focus();
        return;
    }
    
    // --- VALIDACIÓN DE DATOS COMPLETOS ---
    // (Se muestra de forma inline en la lista, no bloqueamos el guardado con popups)
    const missing = validateEmisorData(emisorData);
    
    setLoading(true);
    
    try {
        let response;
        
        if (currentEmisorId) {
            // Update existing emisor
            response = await window.electronAPI.invoke('update-emisor', {
                id: currentEmisorId,
                ...emisorData
            });
        } else {
            // Create new emisor
            response = await window.electronAPI.invoke('create-emisor', emisorData);
        }
        
        if (response.status === 200) {
            document.getElementById('emisor-modal').classList.add('hidden');
            await renderEmisor();
            showToast(currentEmisorId ? '✅ Perfil actualizado correctamente' : '✅ Perfil creado correctamente');
        } else {
            showToast(response.data?.error || 'Error guardando perfil');
        }
    } catch (err) {
        console.error('Error saving emisor:', err);
        showToast('Error guardando perfil de emisor');
    } finally {
        setLoading(false);
    }
}

async function editEmisor(emisorId) {
    await openEmisorModal(emisorId);
}

async function activateEmisor(emisorId) {
    if (!confirm('¿Estás seguro de que quieres activar este perfil? Se desactivará el perfil actual.')) {
        return;
    }
    
    setLoading(true);
    
    try {
        const response = await window.electronAPI.invoke('activate-emisor', { id: emisorId });
        
        if (response.status === 200) {
            await renderEmisor();
            showToast('✅ Perfil activado correctamente');
        } else {
            showToast(response.data?.error || 'Error activando perfil');
        }
    } catch (err) {
        console.error('Error activating emisor:', err);
        showToast('Error activando perfil');
    } finally {
        setLoading(false);
    }
}

async function deleteEmisor(emisorId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este perfil? Esta acción no se puede deshacer.')) {
        return;
    }
    
    setLoading(true);
    
    try {
        const response = await window.electronAPI.invoke('delete-emisor', { id: emisorId });
        
        if (response.status === 200) {
            await renderEmisor();
            showToast('✅ Perfil eliminado correctamente');
        } else {
            showToast(response.data?.error || 'Error eliminando perfil');
        }
    } catch (err) {
        console.error('Error deleting emisor:', err);
        showToast('Error eliminando perfil');
    } finally {
        setLoading(false);
    }
}

// --- SMTP Configuration ---

function _fillSmtpFields(emisor) {
    document.getElementById('smtp-from-name').value = emisor.smtpFromName || emisor.nombre || '';
    document.getElementById('smtp-user').value      = emisor.smtpUser || '';
    document.getElementById('smtp-host').value      = emisor.smtpHost || '';
    document.getElementById('smtp-port').value      = emisor.smtpPort || 587;
    document.getElementById('smtp-secure').checked  = !!emisor.smtpSecure;
    document.getElementById('smtp-pass').value      = ''; // never pre-fill password
    document.getElementById('smtp-test-result').textContent = '';
}

async function handleTestSmtp() {
    const resultEl = document.getElementById('smtp-test-result');
    resultEl.textContent = '⏳ Probando...';
    resultEl.style.color = 'inherit';
    try {
        const response = await window.electronAPI.invoke('test-smtp-connection', {
            host:   document.getElementById('smtp-host').value,
            port:   parseInt(document.getElementById('smtp-port').value) || 587,
            user:   document.getElementById('smtp-user').value,
            pass:   document.getElementById('smtp-pass').value,
            secure: document.getElementById('smtp-secure').checked
        });
        if (response.status === 200 && response.data?.ok) {
            resultEl.textContent = '✅ Configuración válida';
            resultEl.style.color = '#4caf50';
        } else {
            resultEl.textContent = '❌ ' + (response.data?.error || 'Error');
            resultEl.style.color = '#e53935';
        }
    } catch (e) {
        resultEl.textContent = '❌ Error: ' + e.message;
        resultEl.style.color = '#e53935';
    }
}

async function handleSaveSmtp() {
    setLoading(true);
    try {
        const response = await window.electronAPI.invoke('save-smtp-config', {
            smtpFromName: document.getElementById('smtp-from-name').value,
            smtpUser:     document.getElementById('smtp-user').value,
            smtpHost:     document.getElementById('smtp-host').value,
            smtpPort:     parseInt(document.getElementById('smtp-port').value) || 587,
            smtpSecure:   document.getElementById('smtp-secure').checked,
            smtpPass:     document.getElementById('smtp-pass').value
        });
        if (response.status === 200) {
            showToast('✅ Configuración SMTP guardada correctamente');
            document.getElementById('smtp-pass').value = '';
            document.getElementById('smtp-test-result').textContent = '';
        } else {
            showToast(response.data?.error || 'Error guardando SMTP');
        }
    } catch (e) {
        showToast('Error: ' + e.message);
    } finally {
        setLoading(false);
    }
}

// Wire up SMTP buttons (after DOM is ready)
document.addEventListener('DOMContentLoaded', () => {
    const btnTestSmtp   = document.getElementById('btn-test-smtp');
    const btnSaveSmtp   = document.getElementById('btn-save-smtp');
    const btnTogglePass = document.getElementById('smtp-toggle-pass');

    if (btnTestSmtp)   btnTestSmtp.addEventListener('click', handleTestSmtp);
    if (btnSaveSmtp)   btnSaveSmtp.addEventListener('click', handleSaveSmtp);
    if (btnTogglePass) btnTogglePass.addEventListener('click', () => {
        const input = document.getElementById('smtp-pass');
        const icon  = document.querySelector('#smtp-toggle-pass i');
        if (input.type === 'password') {
            input.type = 'text'; icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password'; icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    });
});

// --- GESTIÓN DE SERIES (CONFIGURACIÓN) ---

/**
 * Carga y renderiza el listado de series en la vista de configuración
 */
async function loadSeriesSettings() {
    try {
        const emisorRes = await window.electronAPI.invoke('get-emisor-activo');
        if (!emisorRes || emisorRes.status !== 200 || !emisorRes.data || !emisorRes.data.success || !emisorRes.data.data) return;

        const res = await window.electronAPI.invoke('get-series', emisorRes.data.data.id);
        if (res.status === 200) {
            renderSeriesTable(res.data);
        }
    } catch (error) {
        console.error('Error cargando series para settings:', error);
    }
}

/**
 * Renderiza la tabla de series en configuración
 */
function renderSeriesTable(series) {
    const tbody = document.querySelector('#series-table-mini tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    series.forEach(serie => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${serie.nombre}</td>
            <td><strong>${serie.prefijo}</strong></td>
            <td>${serie.proximoNumero}</td>
            <td><span class="badge badge-${serie.tipo.toLowerCase()}">${serie.tipo}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Maneja la creación de una nueva serie
 */
async function handleCreateSerie(e) {
    e.preventDefault();
    
    const emisorRes = await window.electronAPI.invoke('get-emisor-activo');
    if (!emisorRes || emisorRes.status !== 200 || !emisorRes.data || !emisorRes.data.success || !emisorRes.data.data) {
        showToast('Debe tener un emisor activo para crear series');
        return;
    }

    const serieData = {
        nombre: document.getElementById('serie-name').value,
        prefijo: document.getElementById('serie-prefix').value,
        proximoNumero: parseInt(document.getElementById('serie-next').value) || 1,
        tipo: document.getElementById('serie-type').value,
        emisorId: emisorRes.data.data.id
    };

    try {
        setLoading(true);
        const res = await window.electronAPI.invoke('create-serie', serieData);
        if (res.status === 201) {
            showToast('✅ Serie creada correctamente');
            document.getElementById('serie-modal').classList.add('hidden');
            document.getElementById('serie-form').reset();
            await loadSeriesSettings();
        } else {
            showToast('Error creando serie: ' + res.data.error);
        }
    } catch (error) {
        showToast('Error técnico al crear serie');
    } finally {
        setLoading(false);
    }
}

// Listeners adicionales para Punto 9
document.addEventListener('DOMContentLoaded', () => {
    const btnAddSerie = document.getElementById('btn-add-serie');
    if (btnAddSerie) {
        btnAddSerie.addEventListener('click', () => {
            showModal(document.getElementById('serie-modal'));
        });
    }

    const serieForm = document.getElementById('serie-form');
    if (serieForm) {
        serieForm.addEventListener('submit', handleCreateSerie);
    }
});

// --- FUNCIONALIDADES PUNTO 9: UX Y UTILIDADES ---

/**
 * Carga las series disponibles para el emisor y actualiza el dropdown del modal
 */
async function updateInvoiceSeriesDropdown(tipo = 'ORDINARIA') {
    try {
        const emisorRes = await window.electronAPI.invoke('get-emisor-activo');
        if (!emisorRes || emisorRes.status !== 200 || !emisorRes.data || !emisorRes.data.success || !emisorRes.data.data) return;

        const seriesRes = await window.electronAPI.invoke('get-series', emisorRes.data.data.id);
        console.log('--- DEBUG SERIES RES ---', seriesRes);
        const serieSelect = document.getElementById('invoice-serie');
        if (!serieSelect) return;

        serieSelect.innerHTML = '';
        
        if (!seriesRes || seriesRes.status !== 200 || !Array.isArray(seriesRes.data)) return;

        // Filtrar series por tipo (ORDINARIA / RECTIFICATIVA)
        const seriesFiltradas = seriesRes.data.filter(s => s.tipo === tipo && s.activo !== false);
        
        if (seriesFiltradas.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No hay series disponibles';
            serieSelect.appendChild(option);
        } else {
            seriesFiltradas.forEach(serie => {
                const option = document.createElement('option');
                option.value = serie.id;
                option.textContent = `${serie.nombre} (${serie.prefijo})`;
                serieSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error cargando series:', error);
    }
}

/**
 * Maneja la previsualización del PDF de la factura
 */
async function handlePreviewInvoice() {
    const form = document.getElementById('create-invoice-form');
    // Forzamos validación de campos requeridos (Cliente, Serie)
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    try {
        setLoading(true);
        const lineas = [];
        document.querySelectorAll('.invoice-line').forEach(line => {
            const desc = line.querySelector('.line-desc').value;
            if (desc) {
                lineas.push({
                    descripcion: desc,
                    cantidad: parseFloat(line.querySelector('.line-qty').value) || 0,
                    precioUnitario: parseFloat(line.querySelector('.line-price').value) || 0,
                    tipoIva: parseFloat(line.querySelector('.line-iva').value) || 0
                });
            }
        });

        if (lineas.length === 0) {
            showToast('Debe añadir al menos una línea con descripción');
            setLoading(false);
            return;
        }

        const previewData = {
            clienteId: document.getElementById('invoice-client').value,
            lineas: lineas,
            metadata: {
                descuento: parseFloat(document.getElementById('invoice-discount').value) || 0,
                metodoPago: document.getElementById('invoice-payment-method').value,
                notas: document.getElementById('invoice-notes').value
            }
        };

        const res = await window.electronAPI.invoke('preview-invoice-pdf', previewData);
        
        if (res.status === 200) {
            // El buffer llega como Uint8Array en Electron IPC
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            const frame = document.getElementById('pdf-preview-frame');
            frame.src = url;
            
            showModal(document.getElementById('preview-modal'));
        } else {
            showToast('Error al generar previsualización: ' + (res.data?.error || 'Error desconocido'));
        }
    } catch (error) {
        console.error('Error en preview:', error);
        showToast('Error crítico al generar previsualización');
    } finally {
        setLoading(false);
    }
}

/**
 * Carga y renderiza el log de auditoría
 */
async function loadAuditLogs() {
    try {
        setLoading(true);
        const res = await window.electronAPI.invoke('get-audit-logs');
        if (res.status === 200) {
            renderAuditLogs(res.data);
        } else {
            showToast('Error cargando logs: ' + (res.data?.error || ''));
        }
    } catch (error) {
        console.error('Error cargando logs:', error);
    } finally {
        setLoading(false);
    }
}

/**
 * Renderiza la tabla de auditoría
 */
function renderAuditLogs(logs) {
    const tbody = document.querySelector('#audit-log-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">No hay eventos registrados en el log de auditoría</td></tr>';
        return;
    }

    logs.forEach(log => {
        const tr = document.createElement('tr');
        const fecha = new Date(log.fechaHora).toLocaleString();
        const shortHash = log.hashActual ? log.hashActual.substring(0, 16) + '...' : 'N/A';
        
        tr.innerHTML = `
            <td>${fecha}</td>
            <td><span class="badge badge-${log.tipo.toLowerCase()}">${log.tipo}</span></td>
            <td>${log.descripcion}</td>
            <td style="font-family: monospace; font-size: 11px;" title="${log.hashActual || ''}">${shortHash}</td>
            <td>
                <button class="btn btn-icon" onclick='alert("Detalles del Evento:\\n\\nTimestamp: ${fecha}\\nTipo: ${log.tipo}\\nDescripción: ${log.descripcion}\\nHash Anterior: ${log.hashAnterior || "N/A"}\\nHash Actual: ${log.hashActual || "N/A"}\\n\\nDatos adicionales:\\n${log.datos || "Ninguno"}")'>
                    <i class="fas fa-search-plus"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Verifica la integridad de la cadena de bloques del log de auditoría
 */
async function handleVerifyAudit() {
    const statusDiv = document.getElementById('audit-integrity-status');
    if (!statusDiv) return;

    statusDiv.style.display = 'block';
    statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ejecutando algoritmos de verificación de integridad (CADENA DE BLOQUES)...';
    statusDiv.className = 'audit-status glass-card';

    try {
        const res = await window.electronAPI.invoke('verify-audit-integrity');
        if (res.status === 200) {
            const results = res.data;
            if (results.valido) {
                statusDiv.innerHTML = `
                    <div style="color: var(--success); display: flex; align-items: center; gap: 15px;">
                        <i class="fas fa-shield-check" style="font-size: 24px;"></i>
                        <div>
                            <strong style="display:block; margin-bottom: 2px;">LOG DE AUDITORÍA ÍNTEGRO</strong>
                            <small>Se han verificado ${results.totalVerificados} registros. La cadena de hashes SHA-256 coincide plenamente y no se han detectado manipulaciones externas.</small>
                        </div>
                    </div>
                `;
            } else {
                statusDiv.innerHTML = `
                    <div style="color: var(--danger); display: flex; align-items: center; gap: 15px;">
                        <i class="fas fa-shield-exclamation" style="font-size: 24px;"></i>
                        <div>
                            <strong style="display:block; margin-bottom: 2px;">¡ALERTA DE INTEGRIDAD DETECTADA!</strong>
                            <small>La cadena de bloques se ha roto. Posible manipulación de datos en el registro #${results.errorIndex || '?'}. Detalle: ${results.error}</small>
                        </div>
                    </div>
                `;
            }
        } else {
            statusDiv.innerHTML = 'Error en el servicio de verificación: ' + (res.data?.error || 'Desconocido');
        }
    } catch (error) {
        console.error('Error verificando integridad:', error);
        statusDiv.innerHTML = 'Excepción técnica durante la verificación.';
    }
}

// Escuchar cambios en el tipo de factura para actualizar las series en el modal
document.addEventListener('change', (e) => {
    if (e.target.id === 'invoice-type') {
        const isRectificativa = e.target.value.startsWith('R');
        updateInvoiceSeriesDropdown(isRectificativa ? 'RECTIFICATIVA' : 'ORDINARIA');
    }
});
