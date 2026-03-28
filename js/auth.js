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
          <h2>Error de Conexion</h2>
          <p>No se pudo cargar el cliente de Supabase. La autenticacion y el guardado en la nube no funcionaran.</p>
          <p>Por favor, revisa tu conexion a internet y recarga la pagina.</p>
        `;
    }
    return; // Stop execution of this script
  }
  // --- Initialize Supabase Client ---
  const { createClient } = window.supabase;
  const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('Supabase client initialized successfully.');

  // --- SSO Logic ---
  const processSSOToken = async () => {
    const hash = window.location.hash.substring(1);
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const token = params.get('sso_token');
    // const userId = params.get('user_id'); // Optional, Supabase handles it via token

    if (token) {
        console.log("¡Sesión SSO recibida!");
        const verifyingOverlay = document.getElementById('verifying-overlay');
        const verifyingText = document.getElementById('verifying-text');

        if (verifyingOverlay) {
            verifyingOverlay.style.display = 'flex';
            if (verifyingText) verifyingText.textContent = "Sincronizando sesión...";
        }

        try {
            // Initialize local session with SSO token
            const { data, error } = await _supabase.auth.setSession({
                access_token: token,
                refresh_token: '' // SSO token is used as access token
            });

            if (error) throw error;

            console.log("Sesión establecida correctamente vía SSO.");

            // Clean URL hash without reloading
            history.replaceState(null, null, window.location.pathname + window.location.search);
        } catch (err) {
            console.error("Error al procesar token SSO:", err);
            if (window.Dialogs) {
                window.Dialogs.showNotification("Error de SSO", "No se pudo sincronizar la sesión. Por favor, intenta iniciar sesión de nuevo.");
            }
        } finally {
            if (verifyingOverlay) verifyingOverlay.style.display = 'none';
        }
    }
  };

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
    loginSSO: function() {
        const domain = "carleyengine.com";
        const redirectTo = window.location.href;
        window.location.href = `https://carleystudio.com/sso.html?domain=${domain}&redirect_to=${encodeURIComponent(redirectTo)}`;
    },
    callBridge: function(payload, requestId = 'engine-req-' + Date.now()) {
        const bridgeIframe = document.getElementById('sso-bridge');
        if (!bridgeIframe || !bridgeIframe.contentWindow) {
            console.error("SSO Bridge no disponible.");
            return;
        }

        bridgeIframe.contentWindow.postMessage({
            type: 'SUPABASE_CALL',
            payload: payload,
            requestId: requestId
        }, 'https://carleystudio.com');
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
        });

        accountModal.classList.add('is-open');
      }
    }
  };

  // --- Bridge Request Helper ---
  const requestSessionFromBridge = () => {
    const bridgeIframe = document.getElementById('sso-bridge');
    if (!bridgeIframe || !bridgeIframe.contentWindow) return;

    console.log("Solicitando sesión al Puente SSO...");
    bridgeIframe.contentWindow.postMessage({
        type: 'GET_SSO_SESSION', // Standard intent for SSO bridges
        requestId: 'init-session-check'
    }, 'https://carleystudio.com');
  };

  // --- Process Token on Load ---
  processSSOToken().then(() => {
    // If no session after hash processing, try the bridge
    _supabase.auth.getSession().then(({data: {session}}) => {
        if (!session) {
            const bridgeIframe = document.getElementById('sso-bridge');
            if (bridgeIframe) {
                // If the iframe is already loaded, request immediately, otherwise wait for load event
                const isLoaded = () => {
                    try { return bridgeIframe.contentWindow.location.href !== 'about:blank'; }
                    catch(e) { return true; } // If cross-origin prevents access, it's likely loading/loaded
                };

                if (isLoaded()) {
                    requestSessionFromBridge();
                } else {
                    bridgeIframe.addEventListener('load', requestSessionFromBridge);
                }
            }
        }
    });
  });

  // --- Bridge Listener ---
  window.addEventListener('message', async (event) => {
    if (event.origin !== 'https://carleystudio.com') return;

    if (event.data.type === 'SUPABASE_RESPONSE') {
        console.log("Respuesta del Puente SSO recibida:", event.data.payload);
        window.dispatchEvent(new CustomEvent('CE_SSO_BRIDGE_RESPONSE', { detail: event.data }));
    }

    if (event.data.type === 'SSO_SESSION_DATA') {
        const token = event.data.payload?.access_token;
        if (token) {
            console.log("Sesión recuperada automáticamente via Puente SSO.");
            await _supabase.auth.setSession({
                access_token: token,
                refresh_token: event.data.payload?.refresh_token || ''
            });
        }
    }
  });

  // --- DOM Elements ---
  const verifyingOverlay = document.getElementById('verifying-overlay');
  // Hash check moved to processSSOToken

  const accountModal        = document.getElementById('account-modal');
  const closeAccountBtn     = document.getElementById('close-account');
  const loginView           = document.getElementById('auth-logged-out');
  const loggedInView        = document.getElementById('auth-logged-in');

  const btnLogout           = document.getElementById('btn-logout');
  const btnAccountModal     = document.getElementById('btn-account-modal');
  const btnSsoLogin         = document.getElementById('btn-sso-login');

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

  // Note: gotoSignup and gotoReset now point to external URLs in index.html,
  // so we don't preventDefault() or show internal views for them anymore.
  if (gotoLogin) gotoLogin.addEventListener('click',  e => { e.preventDefault(); showView(loginView); });
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
  if (btnSsoLogin) {
      btnSsoLogin.addEventListener('click', () => {
          window.auth.loginSSO();
      });
  }

  if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
          await _supabase.auth.signOut();
          // Optionally notify the bridge to sign out globally?
          // For now, local sign out is enough as per current doc.
      });
  }

  // --- Session Management & UI Updates ---
  const updateUiForSession = (session) => {
    const overlay = document.getElementById('verifying-overlay');
    if (overlay) overlay.style.display = 'none';

    const contactEmailInput   = document.getElementById('contact-email');
    const loc = window.Localization;

    const loggedOutView = document.getElementById('auth-logged-out');
    const loggedInView = document.getElementById('auth-logged-in');
    const userInfoText = document.getElementById('user-info-text');

    const authOnlyElements = document.querySelectorAll('.auth-only');
    authOnlyElements.forEach(el => {
      if (el.tagName === 'LI') {
        el.style.display = session ? 'list-item' : 'none';
      } else {
        el.style.display = session ? 'block' : 'none';
      }
    });

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

      // If we were in a protected section, go back to account
      const activeSection = document.querySelector('.section-view.active');
      if (activeSection && activeSection.classList.contains('auth-only')) {
          const accountSectionItem = document.querySelector('[data-section="account-section"]');
          if (accountSectionItem) accountSectionItem.click();
      }
    }
  };

  _supabase.auth.onAuthStateChange(function(event, session) {
    updateUiForSession(session);
    if (session) loadUserGames();
  });

  _supabase.auth.getSession().then(function(result) {
    const session = result.data ? result.data.session : null;
    updateUiForSession(session);
    if (session) loadUserGames();
  });

  async function loadUserGames() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) return;

    const gamesListContainer = document.getElementById('user-games-list');
    if (!gamesListContainer) return;

    gamesListContainer.innerHTML = '<p>Cargando tus juegos...</p>';

    try {
        // Placeholder for future database query
        // const { data, error } = await _supabase.from('games').select('*').eq('user_id', session.user.id);

        // For now, let's simulate some data
        const mockGames = []; // Start with empty to show "no games" state

        if (mockGames.length === 0) {
            gamesListContainer.innerHTML = '<p class="no-projects-message">No has publicado ningun juego todavia.</p>';
            return;
        }

        gamesListContainer.innerHTML = '';
        mockGames.forEach(game => {
            const gameItem = document.createElement('div');
            gameItem.className = 'project-item'; // Reuse project-item styling
            gameItem.style.marginBottom = '10px';
            gameItem.style.background = 'rgba(255,255,255,0.05)';

            gameItem.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div>
                        <h3>${game.name} <small>v${game.version}</small></h3>
                        <p style="font-size: 0.8em; color: #888;">${game.description}</p>
                        <div style="display: flex; gap: 15px; margin-top: 5px; font-size: 0.75em; color: #aaa;">
                            <span><img src="icons/play.svg" class="ce-icon small"> ${game.plays || 0} ${window.Localization?.get('JUGADAS') || 'Jugadas'}</span>
                            <span><img src="icons/heart.svg" class="ce-icon small"> ${game.likes || 0} ${window.Localization?.get('ME_GUSTAS') || 'Me Gusta'}</span>
                            <span><img src="icons/message-square.svg" class="ce-icon small"> ${game.comments || 0} ${window.Localization?.get('COMENTARIOS') || 'Comentarios'}</span>
                        </div>
                    </div>
                    <div class="project-actions">
                        <button class="project-action-btn delete" title="Borrar Juego">
                            <img src="icons/trash.svg" class="ce-icon" style="filter: invert(0.3) sepia(1) saturate(10) hue-rotate(-50deg);">
                        </button>
                    </div>
                </div>
            `;

            const deleteBtn = gameItem.querySelector('.delete');
            deleteBtn.onclick = () => {
                window.Dialogs.showConfirmation('Borrar Juego', `Estas seguro de que quieres borrar "${game.name}"?`, async () => {
                    console.log("Deleting game:", game.id);
                    window.Dialogs.showNotification('Exito', 'Juego borrado.');
                    loadUserGames();
                });
            };

            gamesListContainer.appendChild(gameItem);
        });
    } catch (e) {
        console.error(e);
        gamesListContainer.innerHTML = '<p>Error al cargar los juegos.</p>';
    }
  }

  // --- API Key Loading ---
  const aiKeyInput = document.getElementById('carl-ai-key');
  if (aiKeyInput) {
    const savedKey = localStorage.getItem('creativeEngine_gemini_apiKey');
    if (savedKey) {
        aiKeyInput.value = savedKey;
    }
  }

  // --- My Games Logic ---
  const btnShowPublishForm = document.getElementById('btn-show-publish-form');
  const publishFormContainer = document.getElementById('publish-game-form-container');
  const btnVerifyProject = document.getElementById('btn-verify-project');
  const projectVerifiedDetails = document.getElementById('project-verified-details');
  const verifiedGameName = document.getElementById('verified-game-name');
  const verifiedGameVersion = document.getElementById('verified-game-version');
  const btnPublishPhotoPicker = document.getElementById('btn-publish-photo-picker');
  const publishPhotoInput = document.getElementById('publish-photo-input');
  const publishPhotoPreview = document.getElementById('publish-photo-preview');
  const publishGameForm = document.getElementById('publish-game-form');

  if (btnShowPublishForm) {
    btnShowPublishForm.addEventListener('click', () => {
        publishFormContainer.style.display = publishFormContainer.style.display === 'none' ? 'block' : 'none';
    });
  }

  if (btnPublishPhotoPicker) {
    btnPublishPhotoPicker.addEventListener('click', () => publishPhotoInput.click());
  }

  if (publishPhotoInput) {
    publishPhotoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            publishPhotoPreview.src = URL.createObjectURL(file);
        }
    });
  }

  if (btnVerifyProject) {
    btnVerifyProject.addEventListener('click', async () => {
        const githubUrl = document.getElementById('publish-github').value.trim();
        if (!githubUrl) {
            window.Dialogs.showNotification('Error', 'Por favor, ingresa un enlace de GitHub.');
            return;
        }

        btnVerifyProject.disabled = true;
        btnVerifyProject.textContent = 'Verificando...';

        try {
            // Simplified logic: Check if we can find a project.ceconfig in the current directory structure
            // In a real scenario, this would involve fetching from GitHub or checking local projects.
            // Since we are in the landing page, we'll try to find a local project that matches.

            // For now, let's simulate the verification.
            // In the future, this should fetch project.ceconfig from the GitHub repo.

            const rawUrl = githubUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
            const configUrl = `${rawUrl}${rawUrl.endsWith('/') ? '' : '/'}main/project.ceconfig`;

            console.log("Fetching config from:", configUrl);

            const response = await fetch(configUrl);
            if (response.ok) {
                const config = await response.json();
                verifiedGameName.textContent = config.appName || 'Desconocido';
                verifiedGameVersion.textContent = config.appVersion || '1.0.0';
                projectVerifiedDetails.style.display = 'block';
                window.Dialogs.showNotification('Exito', 'Proyecto verificado correctamente.');
            } else {
                throw new Error("No se encontro 'project.ceconfig' en la rama principal de GitHub.");
            }
        } catch (error) {
            console.error(error);
            window.Dialogs.showNotification('Error de Verificacion', error.message);
        } finally {
            btnVerifyProject.disabled = false;
            btnVerifyProject.textContent = window.Localization ? window.Localization.get('VERIFICAR_PROYECTO', 'Verificar Proyecto') : 'Verificar Proyecto';
        }
    });
  }

  if (publishGameForm) {
    publishGameForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) {
            window.Dialogs.showNotification('Error', 'Debes iniciar sesion para publicar.');
            return;
        }

        const submitBtn = publishGameForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Subiendo...';

        try {
            // Here we would upload to Supabase 'games' table
            // and upload the image to Supabase storage.

            // Placeholder for SQL logic to be provided by user later
            console.log("Publishing game:", {
                name: verifiedGameName.textContent,
                version: verifiedGameVersion.textContent,
                github: document.getElementById('publish-github').value,
                description: document.getElementById('publish-description').value,
                user_id: session.user.id
            });

            window.Dialogs.showNotification('Exito!', 'Tu juego ha sido publicado en Creative Games.');
            publishGameForm.reset();
            projectVerifiedDetails.style.display = 'none';
            publishFormContainer.style.display = 'none';
            loadUserGames();
        } catch (error) {
            console.error(error);
            window.Dialogs.showNotification('Error', 'Ocurrio un error al publicar el juego.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = window.Localization ? window.Localization.get('SUBIR', 'Subir') : 'Subir';
        }
    });
  }
});
