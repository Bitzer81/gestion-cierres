// ========================================
// Authentication Module
// Restricts access to authorized users only
// ========================================

// Authorized emails - only these can access the app
const AUTHORIZED_EMAILS = [
    'omarmartinezmiron@gmail.com'
];

// Check if user is already authenticated
function checkAuth() {
    const session = JSON.parse(localStorage.getItem('cpro_auth_session') || 'null');
    if (session && session.email && session.expiry > Date.now()) {
        // Valid session exists
        showApp();
        return true;
    }
    return false;
}

// Show the main app and hide login
function showApp() {
    const loginScreen = document.getElementById('loginScreen');
    const appContainer = document.getElementById('appContainer');
    if (loginScreen) loginScreen.style.display = 'none';
    if (appContainer) appContainer.style.display = 'flex';
}

// Show login screen
function showLogin() {
    const loginScreen = document.getElementById('loginScreen');
    const appContainer = document.getElementById('appContainer');
    if (loginScreen) loginScreen.style.display = 'flex';
    if (appContainer) appContainer.style.display = 'none';
}

// Handle login button click
window.handleLogin = async () => {
    const creds = JSON.parse(localStorage.getItem('cpro_google_creds') || '{}');

    if (!creds.clientId) {
        showLoginError('Primero configura las credenciales de Google en Configuración');
        return;
    }

    // Initialize Google Identity Services for login
    if (typeof google === 'undefined' || !google.accounts) {
        showLoginError('Google API no está disponible. Recarga la página.');
        return;
    }

    // Request user info scope
    const client = google.accounts.oauth2.initTokenClient({
        client_id: creds.clientId,
        scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.file',
        callback: async (response) => {
            if (response.error) {
                showLoginError('Error de autenticación: ' + response.error);
                return;
            }

            // Get user email
            try {
                const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                    headers: { 'Authorization': 'Bearer ' + response.access_token }
                });
                const data = await userInfo.json();

                if (AUTHORIZED_EMAILS.includes(data.email.toLowerCase())) {
                    // Create session (24 hours)
                    const session = {
                        email: data.email,
                        name: data.name || data.email,
                        expiry: Date.now() + (24 * 60 * 60 * 1000)
                    };
                    localStorage.setItem('cpro_auth_session', JSON.stringify(session));
                    showApp();

                    // Also update Google Drive status
                    if (typeof updateGoogleStatus === 'function') {
                        updateGoogleStatus(true);
                    }
                } else {
                    showLoginError('Acceso denegado. Tu email no está autorizado.');
                    // Revoke token
                    google.accounts.oauth2.revoke(response.access_token);
                }
            } catch (err) {
                showLoginError('Error al verificar usuario');
                console.error(err);
            }
        }
    });

    client.requestAccessToken();
};

// Show error message on login screen
function showLoginError(message) {
    const errorEl = document.getElementById('loginError');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
}

// Logout function
window.logout = () => {
    localStorage.removeItem('cpro_auth_session');
    showLogin();
};

// Initialize auth check on page load
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) {
        showLogin();
    }
});
