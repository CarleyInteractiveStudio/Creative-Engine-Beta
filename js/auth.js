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
  let _getUserPromise = null;
  window.auth = {
    _supabase: _supabase,
    getUser: async function() {
      if (_getUserPromise) return _getUserPromise;

      _getUserPromise = (async () => {
        try {
          // Check local session first
          const { data: { session } } = await _supabase.auth.getSession();
          if (session) return session.user;

          // If no local session, verify with server
          const result = await _supabase.auth.getUser();
          return result.data ? result.data.user : null;
        } finally {
          _getUserPromise = null;
        }
      })();

      return _getUserPromise;
    },
    openAuthModal: function() {
      const accountModal = document.getElementById('account-modal');
      if (accountModal) {
        const sidebarItems = accountModal.querySelectorAll('.split-sidebar li');
        const sections = accountModal.querySelectorAll('.section-view');

        sidebarItems.forEach(i => i.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));

        const accountSectionItem = accountModal.querySelector('[data-section="account-section"]');
        const accountSection = document.getElementById('account-section');

        if (accountSectionItem) accountSectionItem.classList.add('active');
        if (accountSection) accountSection.classList.add('active');

        const loggedOutView = document.getElementById('auth-logged-out');
        const signupView = document.getElementById('signup-view');
        const resetView = document.getElementById('reset-password-view');
        const loggedInView = document.getElementById('auth-logged-in');

        // Check if logged in
        _supabase.auth.getSession().then(({data: {session}}) => {
          if (session) {
            if (loggedInView) loggedInView.style.display = 'block';
            if (loggedOutView) loggedOutView.style.display = 'none';
          } else {
            if (loggedInView) loggedInView.style.display = 'none';
            if (loggedOutView) loggedOutView.style.display = 'block';
          }
          if (signupView) signupView.style.display = 'none';
          if (resetView) resetView.style.display = 'none';
        });

        accountModal.classList.add('is-open');
      }
    }
  };

  // --- DOM Elements ---
  const verifyingOverlay = document.getElementById('verifying-overlay');
  if (window.location.hash.includes('access_token')) {
    verifyingOverlay.style.display = 'flex';
  }

  const accountModal        = document.getElementById('account-modal');
  const closeAccountBtn     = document.getElementById('close-account');
  const loginView           = document.getElementById('auth-logged-out');
  const signupView          = document.getElementById('signup-view');
  const resetPasswordView   = document.getElementById('reset-password-view');
  const loggedInView        = document.getElementById('auth-logged-in');
  const loginForm           = document.getElementById('login-form');
  const signupForm          = document.getElementById('signup-form');
  const resetPasswordForm   = document.getElementById('reset-password-form');
  const gotoSignup          = document.getElementById('goto-signup');
  const gotoLogin           = document.getElementById('goto-login');
  const gotoReset           = document.getElementById('goto-reset');
  const backToLogin         = document.getElementById('back-to-login');
  const btnLogout           = document.getElementById('btn-logout');
  const btnAccountModal     = document.getElementById('btn-account-modal');

  // --- Sidebar Logic ---
  if (accountModal) {
      const sidebarItems = accountModal.querySelectorAll('.split-sidebar li');
      const sections = accountModal.querySelectorAll('.section-view');

      sidebarItems.forEach(item => {
          item.addEventListener('click', () => {
              const targetSection = item.getAttribute('data-section');

              sidebarItems.forEach(i => i.classList.remove('active'));
              sections.forEach(s => s.classList.remove('active'));

              item.classList.add('active');
              document.getElementById(targetSection).classList.add('active');
          });
      });
  }

  // --- View Switching Logic ---
  const showView = (viewToShow) => {
    if (loginView) loginView.style.display = 'none';
    if (signupView) signupView.style.display = 'none';
    if (resetPasswordView) resetPasswordView.style.display = 'none';
    if (loggedInView) loggedInView.style.display = 'none';
    if (viewToShow) viewToShow.style.display = 'block';
  };

  if (gotoSignup) gotoSignup.addEventListener('click', e => { e.preventDefault(); showView(signupView); });
  if (gotoLogin) gotoLogin.addEventListener('click',  e => { e.preventDefault(); showView(loginView); });
  if (gotoReset) gotoReset.addEventListener('click',  e => { e.preventDefault(); showView(resetPasswordView); });
  if (backToLogin) backToLogin.addEventListener('click', e => { e.preventDefault(); showView(loginView); });

  // --- Modal Closing Logic ---
  const closeAccountModal = () => { if (accountModal) accountModal.classList.remove('is-open'); };
  if (closeAccountBtn) closeAccountBtn.addEventListener('click', closeAccountModal);
  window.addEventListener('click', event => {
    if (event.target === accountModal) closeAccountModal();
  });

  if (btnAccountModal) {
      btnAccountModal.addEventListener('click', () => {
          window.auth.openAuthModal();
      });
  }

  // --- Authentication Logic ---
  if (signupForm) signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name     = signupForm['signup-name'].value;
    const email    = signupForm['signup-email'].value;
    const password = signupForm['signup-password'].value;
    const button   = signupForm.querySelector('button');

    const originalText = button.textContent;
    button.disabled   = true;
    button.textContent = window.Localization ? window.Localization.get('REGISTRANDO', 'Registrando...') : 'Registrando...';

    const { data, error } = await _supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://carleyinteractivestudio.github.io/Creative-Engine-Beta/#',
        data: { full_name: name }
      }
    });

    if (error) {
      window.Dialogs.showNotification(
        window.Localization ? window.Localization.get('ERROR_REGISTRO', 'Error de Registro') : 'Error de Registro',
        error.message
      );
    } else {
      window.Dialogs.showNotification(
        window.Localization ? window.Localization.get('REGISTRO_EXITOSO', '¡Registro Exitoso!') : '¡Registro Exitoso!',
        window.Localization ? window.Localization.get('REGISTRO_MSG', 'Revisa tu correo para verificar tu cuenta.') : 'Revisa tu correo para verificar tu cuenta.'
      );
      showView(loginView);
    }

    button.disabled   = false;
    button.textContent = originalText;
  });

  if (loginForm) loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = loginForm['login-email'].value;
    const password = loginForm['login-password'].value;
    const button   = loginForm.querySelector('button');

    const originalText = button.textContent;
    button.disabled   = true;
    button.textContent = window.Localization ? window.Localization.get('INICIANDO_SESION_PROGRESO', 'Iniciando Sesión...') : 'Iniciando Sesión...';

    const { error } = await _supabase.auth.signInWithPassword({ email, password });

    if (error) {
      window.Dialogs.showNotification(
        window.Localization ? window.Localization.get('ERROR_LOGIN', 'Error de Inicio de Sesión') : 'Error de Inicio de Sesión',
        error.message
      );
    } else {
      closeAccountModal(); // onAuthStateChange handles the rest
    }

    button.disabled   = false;
    button.textContent = originalText;
  });

  if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
          await _supabase.auth.signOut();
      });
  }

  if (resetPasswordForm) resetPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email  = resetPasswordForm['reset-email'].value;
    const button = resetPasswordForm.querySelector('button');

    const originalText = button.textContent;
    button.disabled   = true;
    button.textContent = window.Localization ? window.Localization.get('ENVIANDO', 'Enviando...') : 'Enviando...';

    await _supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://carleyinteractivestudio.github.io/Creative-Engine-Beta/#'
    });

    window.Dialogs.showNotification(
        window.Localization ? window.Localization.get('AUTH_RESET_PASS', 'Recuperar Contraseña') : 'Recuperación de Contraseña',
        window.Localization ? window.Localization.get('AUTH_RESET_SENT', 'Si existe una cuenta con este correo, se ha enviado un enlace de recuperación.') : 'Si existe una cuenta con este correo, se ha enviado un enlace de recuperación.'
    );
    showView(loginView);

    button.disabled   = false;
    button.textContent = originalText;
  });

  // --- Session Management & UI Updates ---
  const updateUiForSession = (session) => {
    const overlay = document.getElementById('verifying-overlay');
    if (overlay) overlay.style.display = 'none';

    const contactEmailInput   = document.getElementById('contact-email');
    const loc = window.Localization;

    const loggedOutView = document.getElementById('auth-logged-out');
    const loggedInView = document.getElementById('auth-logged-in');
    const userInfoText = document.getElementById('user-info-text');

    if (session) {
      const userName = session.user.user_metadata.full_name || session.user.email;
      if (userInfoText) {
          const holaText = loc ? loc.get('HOLA', 'Hola') : 'Hola';
          userInfoText.textContent = `${holaText}, ${userName} (${session.user.email})`;
      }
      if (loggedInView) loggedInView.style.display = 'block';
      if (loggedOutView) loggedOutView.style.display = 'none';

      if (contactEmailInput) {
        contactEmailInput.value    = session.user.email;
        contactEmailInput.readOnly = true;
      }
    } else {
      if (loggedInView) loggedInView.style.display = 'none';
      if (loggedOutView) loggedOutView.style.display = 'block';

      if (contactEmailInput) {
        contactEmailInput.value    = '';
        contactEmailInput.readOnly = false;
      }
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
