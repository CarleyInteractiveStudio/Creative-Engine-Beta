// --- Supabase Client Initialization ---
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tladrluezsmmhjbhupgb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsYWRybHVlenNtbWhqYmh1cGdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MjY5NjQsImV4cCI6MjA3MTAwMjk2NH0.p7x3MPizmNdX57KzX5T4c15ytuH1oznjFqyp14HD-QU';

let _supabase: SupabaseClient;

// --- Type Augmentation for the Window object ---
declare global {
    interface Window {
        supabase: {
            createClient: typeof createClient;
        };
        auth: {
            _supabase: SupabaseClient;
            getUser: () => Promise<User | null>;
            openAuthModal: () => void;
        };
    }
}

if (window.supabase) {
  _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('Supabase client initialized.');
} else {
  console.error("Supabase client not loaded.");
}

// --- Global Auth Object ---
window.auth = {
  _supabase,
  getUser: async (): Promise<User | null> => {
    const { data: { user } } = await _supabase.auth.getUser();
    return user;
  },
  openAuthModal: (): void => {
    const authModal = document.getElementById('auth-modal') as HTMLElement;
    if (authModal) {
      (document.getElementById('login-view') as HTMLElement).style.display   = 'block';
      (document.getElementById('signup-view') as HTMLElement).style.display  = 'none';
      (document.getElementById('reset-password-view') as HTMLElement).style.display = 'none';
      authModal.style.display = 'block';
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (!_supabase) return;

  const verifyingOverlay = document.getElementById('verifying-overlay') as HTMLElement;
  if (window.location.hash.includes('access_token')) {
    verifyingOverlay.style.display = 'flex';
  }

  // --- DOM Elements ---
  const authModal           = document.getElementById('auth-modal') as HTMLElement;
  const closeAuthBtn        = document.getElementById('close-auth') as HTMLElement;
  const loginView           = document.getElementById('login-view') as HTMLElement;
  const signupView          = document.getElementById('signup-view') as HTMLElement;
  const resetPasswordView   = document.getElementById('reset-password-view') as HTMLElement;
  const loginForm           = document.getElementById('login-form') as HTMLFormElement;
  const signupForm          = document.getElementById('signup-form') as HTMLFormElement;
  const resetPasswordForm   = document.getElementById('reset-password-form') as HTMLFormElement;
  const gotoSignup          = document.getElementById('goto-signup') as HTMLElement;
  const gotoLogin           = document.getElementById('goto-login') as HTMLElement;
  const gotoReset           = document.getElementById('goto-reset') as HTMLElement;
  const backToLogin         = document.getElementById('back-to-login') as HTMLElement;

  // --- View Switching Logic ---
  const showView = (viewToShow: HTMLElement): void => {
    loginView.style.display         = 'none';
    signupView.style.display        = 'none';
    resetPasswordView.style.display = 'none';
    viewToShow.style.display        = 'block';
  };

  gotoSignup.addEventListener('click', (e: Event) => { e.preventDefault(); showView(signupView); });
  gotoLogin.addEventListener('click',  (e: Event) => { e.preventDefault(); showView(loginView); });
  gotoReset.addEventListener('click',  (e: Event) => { e.preventDefault(); showView(resetPasswordView); });
  backToLogin.addEventListener('click', (e: Event) => { e.preventDefault(); showView(loginView); });

  // --- Modal Closing Logic ---
  const closeAuthModal = (): void => { authModal.style.display = 'none'; };
  closeAuthBtn.addEventListener('click', closeAuthModal);
  window.addEventListener('click', (event: MouseEvent) => {
    if (event.target === authModal) closeAuthModal();
  });

  // --- Authentication Logic ---
  signupForm.addEventListener('submit', async (e: Event) => {
    e.preventDefault();
    const name     = (signupForm.elements.namedItem('signup-name') as HTMLInputElement).value;
    const email    = (signupForm.elements.namedItem('signup-email') as HTMLInputElement).value;
    const password = (signupForm.elements.namedItem('signup-password') as HTMLInputElement).value;
    const button   = signupForm.querySelector('button') as HTMLButtonElement;

    button.disabled   = true;
    button.textContent = 'Registrando...';

    const { error } = await _supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://carleyinteractivestudio.github.io/Creative-Engine-Beta/#',
        data: { full_name: name }
      }
    });

    if (error) {
      alert(`Error en el registro: ${error.message}`);
    } else {
      alert('¡Registro exitoso! Revisa tu correo para verificar tu cuenta.');
      showView(loginView);
    }

    button.disabled   = false;
    button.textContent = 'Registrarse';
  });

  loginForm.addEventListener('submit', async (e: Event) => {
    e.preventDefault();
    const email    = (loginForm.elements.namedItem('login-email') as HTMLInputElement).value;
    const password = (loginForm.elements.namedItem('login-password') as HTMLInputElement).value;
    const button   = loginForm.querySelector('button') as HTMLButtonElement;

    button.disabled   = true;
    button.textContent = 'Iniciando Sesión...';

    const { error } = await _supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert(`Error al iniciar sesión: ${error.message}`);
    } else {
      closeAuthModal(); // onAuthStateChange handles the rest
    }

    button.disabled   = false;
    button.textContent = 'Iniciar Sesión';
  });

  resetPasswordForm.addEventListener('submit', async (e: Event) => {
    e.preventDefault();
    const email  = (resetPasswordForm.elements.namedItem('reset-email') as HTMLInputElement).value;
    const button = resetPasswordForm.querySelector('button') as HTMLButtonElement;

    button.disabled   = true;
    button.textContent = 'Enviando...';

    await _supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://carleyinteractivestudio.github.io/Creative-Engine-Beta/#'
    });

    alert('Si existe una cuenta con este correo, se ha enviado un enlace de recuperación.');
    showView(loginView);

    button.disabled   = false;
    button.textContent = 'Enviar Enlace de Recuperación';
  });

  // --- Session Management & UI Updates ---
  const updateUiForSession = (session: Session | null): void => {
    const overlay = document.getElementById('verifying-overlay') as HTMLElement;
    if (overlay) overlay.style.display = 'none';

    const contactEmailInput   = document.getElementById('contact-email') as HTMLInputElement;
    const authStatusContainer = document.getElementById('auth-status-container') as HTMLElement;
    const authActionButton = document.getElementById('btn-auth-action') as HTMLButtonElement;

    if (session) {
      const userName = session.user.user_metadata.full_name || session.user.email;
      authStatusContainer.innerHTML = `
        <span class="user-greeting">Hola, ${userName}</span>
        <button id="btn-auth-action">Cerrar Sesión</button>
      `;
      if (contactEmailInput) {
        contactEmailInput.value    = session.user.email as string;
        contactEmailInput.readOnly = true;
      }
    } else {
      authStatusContainer.innerHTML = `
        <button id="btn-auth-action">Iniciar Sesión</button>
      `;
      if (contactEmailInput) {
        contactEmailInput.value    = '';
        contactEmailInput.readOnly = false;
      }
    }

    if (authActionButton) {
        authActionButton.addEventListener('click', handleAuthButtonClick);
    }
  };

  const handleAuthButtonClick = async (): Promise<void> => {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
      await _supabase.auth.signOut();
    } else {
      window.auth.openAuthModal();
    }
  };

  _supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
    updateUiForSession(session);
  });

  _supabase.auth.getSession().then(({ data: { session } }) => {
    updateUiForSession(session);
  });
});
