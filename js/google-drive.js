// Google Drive Integration Module
// Handles Auth and Drive API operations

let tokenClient;
let gapiInited = false;
let gisInited = false;

// Scopes required for the application
// drive.file: View and manage Google Drive files and folders that you have opened or created with this app
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

// Folder Name in Google Drive
const APP_FOLDER_NAME = 'CierresPro_Data';
const BACKUP_FILE_NAME = 'CierresPro_Backup.json';

// Retry configuration
const MAX_INIT_RETRIES = 10;
const RETRY_DELAY_MS = 500;
let initRetryCount = 0;

window.initGoogle = () => {
    // Safety check: wait for gapi to be available with retry
    if (typeof gapi === 'undefined') {
        initRetryCount++;
        if (initRetryCount <= MAX_INIT_RETRIES) {
            console.log(`Google API not loaded yet. Retry ${initRetryCount}/${MAX_INIT_RETRIES}...`);
            setTimeout(window.initGoogle, RETRY_DELAY_MS);
            return;
        }
        console.warn('Google API failed to load after max retries');
        return;
    }

    // Reset retry counter on success
    initRetryCount = 0;

    // Load config from local storage
    const creds = JSON.parse(localStorage.getItem('cpro_google_creds') || '{}');
    if (creds.apiKey) {
        gapi.load('client', () => initializeGapiClient(creds.apiKey));
    }

    if (creds.clientId && typeof google !== 'undefined' && google.accounts) {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: creds.clientId,
            scope: SCOPES,
            callback: (resp) => {
                if (resp.error) throw resp;
                showToast('Conectado a Google Drive', 'success');
                updateGoogleStatus(true);
            },
        });
        gisInited = true;
    }

    // Bind UI events
    bindGoogleEvents();
    // Only check auth if gapi client is ready
    if (gapiInited) checkAuthStatus();
};

async function initializeGapiClient(apiKey) {
    await gapi.client.init({
        apiKey: apiKey,
        discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    checkAuthStatus();
}

function bindGoogleEvents() {
    const saveBtn = document.getElementById('saveGoogleCreds');
    const loginBtn = document.getElementById('googleSignInBtn');
    const clientIdInput = document.getElementById('gClientId');
    const apiKeyInput = document.getElementById('gApiKey');

    // Set initial values (with null checks)
    const creds = JSON.parse(localStorage.getItem('cpro_google_creds') || '{}');
    if (creds.clientId && clientIdInput) clientIdInput.value = creds.clientId;
    if (creds.apiKey && apiKeyInput) apiKeyInput.value = creds.apiKey;

    if (saveBtn) saveBtn.onclick = () => {
        const id = clientIdInput ? clientIdInput.value.trim() : '';
        const key = apiKeyInput ? apiKeyInput.value.trim() : '';
        if (!id || !key) {
            showToast('Introduce Client ID y API Key', 'warning');
            return;
        }
        localStorage.setItem('cpro_google_creds', JSON.stringify({ clientId: id, apiKey: key }));
        showToast('Credenciales guardadas. Recarga la página.', 'success');
        setTimeout(() => location.reload(), 1500);
    };

    if (loginBtn) loginBtn.onclick = handleAuthClick;
}

function handleAuthClick() {
    if (!gisInited) {
        showToast('Configura primero las credenciales', 'error');
        return;
    }

    // Safety check for gapi client
    if (!gapi.client) {
        showToast('API de Google no cargada. Recarga la página.', 'error');
        return;
    }

    const token = gapi.client.getToken();
    if (token) {
        // Already logged in, ask to logout
        if (confirm('¿Quieres cerrar sesión de Google?')) {
            if (token.access_token) {
                google.accounts.oauth2.revoke(token.access_token);
            }
            gapi.client.setToken(null);
            updateGoogleStatus(false);
            showToast('Sesión cerrada', 'info');
        }
    } else {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    }
}

function updateGoogleStatus(connected) {
    const el = document.getElementById('googleStatus');
    const btn = document.getElementById('googleSignInBtn');
    if (el) {
        el.textContent = connected ? 'Conectado: ' + APP_FOLDER_NAME : 'No conectado';
        el.style.color = connected ? 'var(--accent-success)' : 'var(--text-muted)';
    }
    if (btn) {
        btn.innerHTML = connected ? 'Desconectar' : `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg> Conectar Drive`;
    }
}

function checkAuthStatus() {
    // Check if gapi client is fully loaded
    if (!gapi.client) return;

    // Simple check if token exists
    const token = gapi.client.getToken();
    updateGoogleStatus(!!token);
}

// Drive Operations

async function findAppFolder() {
    const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${APP_FOLDER_NAME}' and trashed = false`;
    try {
        const response = await gapi.client.drive.files.list({
            'pageSize': 1,
            'fields': "nextPageToken, files(id, name)",
            'q': q
        });
        const files = response.result.files;
        if (files && files.length > 0) return files[0].id;
        return null; // Not found
    } catch (err) {
        console.error('Error finding folder', err);
        return null;
    }
}

async function createAppFolder() {
    const fileMetadata = {
        'name': APP_FOLDER_NAME,
        'mimeType': 'application/vnd.google-apps.folder'
    };
    try {
        const file = await gapi.client.drive.files.create({
            resource: fileMetadata,
            fields: 'id'
        });
        return file.result.id;
    } catch (err) {
        console.error('Error creating folder', err);
        throw err;
    }
}

async function findBackupFile(folderId) {
    const q = `name = '${BACKUP_FILE_NAME}' and '${folderId}' in parents and trashed = false`;
    try {
        const response = await gapi.client.drive.files.list({
            'pageSize': 1,
            'fields': "files(id, name)",
            'q': q
        });
        const files = response.result.files;
        if (files && files.length > 0) return files[0].id;
        return null;
    } catch (err) {
        console.error('Error finding file', err);
        return null;
    }
}

window.syncToDrive = async () => {
    if (!gapi.client.getToken()) { showToast('Inicia sesión en Google primero', 'warning'); return; }

    showToast('Sincronizando con Google Drive...', 'info');

    try {
        // 1. Get or Create Folder
        let folderId = await findAppFolder();
        if (!folderId) {
            folderId = await createAppFolder();
        }

        // 2. Prepare content
        const content = JSON.stringify(AppState.historicalData);
        const file = new Blob([content], { type: 'application/json' });
        const metadata = {
            'name': BACKUP_FILE_NAME,
            'mimeType': 'application/json',
            'parents': [folderId]
        };

        // 3. Check if file exists to update or create
        const fileId = await findBackupFile(folderId);

        const accessToken = gapi.client.getToken().access_token;
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id';
        let method = 'POST';

        if (fileId) {
            url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart&fields=id`;
            method = 'PATCH';
            // For update, we might not need to send parents, but it's safe
        }

        const response = await fetch(url, {
            method: method,
            headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
            body: form
        });

        if (response.ok) {
            showToast('✅ Sincronizado con la nube', 'success');
        } else {
            throw new Error('Upload failed');
        }

    } catch (err) {
        console.error('Sync Error', err);
        showToast('Error al sincronizar: ' + err.message, 'error');
    }
};

window.loadFromDrive = async () => {
    if (!gapi.client.getToken()) { showToast('Inicia sesión en Google primero', 'warning'); return; }

    showToast('Buscando backup en Drive...', 'info');

    try {
        const folderId = await findAppFolder();
        if (!folderId) { showToast('No se encontró carpeta de datos', 'warning'); return; }

        const fileId = await findBackupFile(folderId);
        if (!fileId) { showToast('No hay backup en la nube', 'warning'); return; }

        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });

        if (response.body) {
            const data = JSON.parse(response.body);
            if (Array.isArray(data)) {
                AppState.historicalData = data;
                localStorage.setItem('cierresPro_history', JSON.stringify(data));
                renderHistory();
                updateMonthlyChart();
                showToast('✅ Datos restaurados desde la nube', 'success');
            }
        }

    } catch (err) {
        console.error('Load Error', err);
        showToast('Error al cargar: ' + err.message, 'error');
    }
};
