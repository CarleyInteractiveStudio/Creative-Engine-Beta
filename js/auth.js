// --- Supabase Client Initialization ---
const SUPABASE_URL = 'https://tladrluezsmmhjbhupgb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsYWRybHVlenNtbWhqYmh1cGdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MjY5NjQsImV4cCI6MjA3MTAwMjk2NH0.p7x3MPizmNdX57KzX5T4c15ytuH1oznjFqyp14HD-QU';

// Wrap all logic in DOMContentLoaded to prevent race conditions with the Supabase CDN script.
document.addEventListener('DOMContentLoaded', () => {

  // First, check if the Supabase client library has loaded.
  if (!window.supabase) {
    console.error("Supabase client not loaded. Auth functionality will be disabled.");
    // Optionally, display a visible warning to the user on the page.
    const warningDiv = document.getElementById('supabase-config-warning');
    if (warningDiv) {
        warningDiv.style.display = 'block';
        warningDiv.innerHTML = `
          <h2>Error de Conexión</h2>
          <p>No se pudo cargar el cliente de Supabase. La autenticación y el guardado en la nube no funcionarán.</p>
          <p>Por favor, revisa tu conexión a internet y recarga la página.</p>
        `;
    }
    return; // Stop execution of this script
  }
  // --- Initialize Supabase Client ---
  const { createClient } = window.supabase;
  const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('Supabase client initialized successfully.');

  // --- Create Global Auth Object ---
  // This is now safely created after _supabase is guaranteed to be initialized.
  window.auth = {
    _supabase: _supabase,
    getUser: async function() {
      const result = await _supabase.auth.getUser();
      return result.data ? result.data.user : null;
    },
    openAuthModal: function() {
      const authModal = document.getElementById('auth-modal');
      if (authModal) {
        const loginView = document.getElementById('login-view');
        const signupView = document.getElementById('signup-view');
        const resetView = document.getElementById('reset-password-view');
        if (loginView) loginView.style.display = 'block';
        if (signupView) signupView.style.display = 'none';
        if (resetView) resetView.style.display = 'none';
        authModal.style.display = 'block';
      }
    }
  };

  // --- DOM Elements ---
  const verifyingOverlay = document.getElementById('verifying-overlay');
  if (window.location.hash.includes('access_token')) {
    verifyingOverlay.style.display = 'flex';
  }

  const authModal           = document.getElementById('auth-modal');
  const closeAuthBtn        = document.getElementById('close-auth');
  const loginView           = document.getElementById('login-view');
  const signupView          = document.getElementById('signup-view');
  const resetPasswordView   = document.getElementById('reset-password-view');
  const loginForm           = document.getElementById('login-form');
  const signupForm          = document.getElementById('signup-form');
  const resetPasswordForm   = document.getElementById('reset-password-form');
  const gotoSignup          = document.getElementById('goto-signup');
  const gotoLogin           = document.getElementById('goto-login');
  const gotoReset           = document.getElementById('goto-reset');
  const backToLogin         = document.getElementById('back-to-login');

  // --- View Switching Logic ---
  const showView = (viewToShow) => {
    if (loginView) loginView.style.display = 'none';
    if (signupView) signupView.style.display = 'none';
    if (resetPasswordView) resetPasswordView.style.display = 'none';
    if (viewToShow) viewToShow.style.display = 'block';
  };

  if (gotoSignup) gotoSignup.addEventListener('click', e => { e.preventDefault(); showView(signupView); });
  if (gotoLogin) gotoLogin.addEventListener('click',  e => { e.preventDefault(); showView(loginView); });
  if (gotoReset) gotoReset.addEventListener('click',  e => { e.preventDefault(); showView(resetPasswordView); });
  if (backToLogin) backToLogin.addEventListener('click', e => { e.preventDefault(); showView(loginView); });

  // --- Modal Closing Logic ---
  const closeAuthModal = () => { if (authModal) authModal.style.display = 'none'; };
  if (closeAuthBtn) closeAuthBtn.addEventListener('click', closeAuthModal);
  window.addEventListener('click', event => {
    if (event.target === authModal) closeAuthModal();
  });

  // --- Authentication Logic ---
  if (signupForm) signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name     = signupForm['signup-name'].value;
    const email    = signupForm['signup-email'].value;
    const password = signupForm['signup-password'].value;
    const button   = signupForm.querySelector('button');

    button.disabled   = true;
    button.textContent = 'Registrando...';

    const { data, error } = await _supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://carleyinteractivestudio.github.io/Creative-Engine-Beta/#',
        data: { full_name: name }
      }
    });

    if (error) {
      window.Dialogs.showNotification('Error de Registro', error.message);
    } else {
      window.Dialogs.showNotification('¡Registro Exitoso!', 'Revisa tu correo para verificar tu cuenta.');
      showView(loginView);
    }

    button.disabled   = false;
    button.textContent = 'Registrarse';
  });

  if (loginForm) loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = loginForm['login-email'].value;
    const password = loginForm['login-password'].value;
    const button   = loginForm.querySelector('button');

    button.disabled   = true;
    button.textContent = 'Iniciando Sesión...';

    const { error } = await _supabase.auth.signInWithPassword({ email, password });

    if (error) {
      window.Dialogs.showNotification('Error de Inicio de Sesión', error.message);
    } else {
      closeAuthModal(); // onAuthStateChange handles the rest
    }

    button.disabled   = false;
    button.textContent = 'Iniciar Sesión';
  });

  if (resetPasswordForm) resetPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email  = resetPasswordForm['reset-email'].value;
    const button = resetPasswordForm.querySelector('button');

    button.disabled   = true;
    button.textContent = 'Enviando...';

    await _supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://carleyinteractivestudio.github.io/Creative-Engine-Beta/#'
    });

    window.Dialogs.showNotification('Recuperación de Contraseña', 'Si existe una cuenta con este correo, se ha enviado un enlace de recuperación.');
    showView(loginView);

    button.disabled   = false;
    button.textContent = 'Enviar Enlace de Recuperación';
  });

  // --- Session Management & UI Updates ---
  const updateUiForSession = (session) => {
    const overlay = document.getElementById('verifying-overlay');
    if (overlay) overlay.style.display = 'none';

    const contactEmailInput   = document.getElementById('contact-email');
    const authStatusContainer = document.getElementById('auth-status-container');

    if (session) {
      const userName = session.user.user_metadata.full_name || session.user.email;
      if (authStatusContainer) {
        authStatusContainer.innerHTML = `
          <span class="user-greeting">Hola, ${userName}</span>
          <button id="btn-auth-action">Cerrar Sesión</button>
        `;
      }
      if (contactEmailInput) {
        contactEmailInput.value    = session.user.email;
        contactEmailInput.readOnly = true;
      }
    } else {
      if (authStatusContainer) {
        authStatusContainer.innerHTML = `
          <button id="btn-auth-action">Iniciar Sesión</button>
        `;
      }
      if (contactEmailInput) {
        contactEmailInput.value    = '';
        contactEmailInput.readOnly = false;
      }
    }

    const btnAuthAction = document.getElementById('btn-auth-action');
    if (btnAuthAction) btnAuthAction.addEventListener('click', handleAuthButtonClick);
  };

  const handleAuthButtonClick = async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
      await _supabase.auth.signOut();
    } else {
      window.auth.openAuthModal();
    }
  };

  _supabase.auth.onAuthStateChange(function(event, session) {
    updateUiForSession(session);
  });

  _supabase.auth.getSession().then(function(result) {
    const session = result.data ? result.data.session : null;
    updateUiForSession(session);
  });
});
