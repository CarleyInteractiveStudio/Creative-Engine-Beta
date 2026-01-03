document.addEventListener('DOMContentLoaded', () => {

    // --- Función Principal de Arranque ---
    async function initialize() {
        try {
            const response = await fetch('project.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const config = await response.json();
            startApp(config);
        } catch (error) {
            console.error("Error al cargar o parsear project.json:", error);
            document.body.innerHTML = '<p style="color: red; text-align: center; margin-top: 50px;">Error Crítico: No se pudo cargar la configuración del proyecto.</p>';
        }
    }

    // --- Lógica de la Aplicación ---
    function startApp(config) {
        const introContainer = document.querySelector('.intro');
        const mainContent = document.querySelector('.main-content');
        const motivationalTextElement = document.getElementById('motivational-text');
        const contactForm = document.getElementById('contact-form');
        const formFeedback = document.getElementById('form-feedback');
        const eulaModal = document.getElementById('eula-modal');
        const eulaLink = document.getElementById('eula-link');
        const closeButton = document.querySelector('.close-button');

        const quotes = [
            "Tu juego empieza aquí. Lo que imagines, lo construyes. 🚀🧠", "No necesitas experiencia, solo visión. Creative Engine hace el resto. 👁️✨", "Cada escena que creas es una ventana a tu mundo. Ábrela. 🖼️🌍", "No estás usando un motor. Estás liberando tu potencial creativo. 🔓🎨", "¿Tienes una idea? Aquí se convierte en juego. 💡➡️🎮", "Diseña sin límites. Crea sin miedo. Publica con orgullo. 🛠️🔥📢", "Tu historia merece ser jugada. Creative Engine te da el control. 📖🎮🎛️", "No esperes a que alguien más lo haga. Hazlo tú, hoy. ⏳💪", "Cada píxel que colocas es una decisión. Cada decisión, una obra. 🧩🖌️", "La creatividad no se enseña. Se desbloquea. 🧠🔑", "Tus mundos, tus reglas. Creative Engine solo obedece a tu imaginación. 🌌🕹️", "No necesitas millones. Solo necesitas comenzar. 💸❌✅", "Aquí no hay límites técnicos. Solo los que tú pongas. 🧱🚫", "¿Quieres que tu juego se vea como tú lo imaginas? Este es el lugar. 👓🎨", "El motor está listo. ¿Y tú? ⚙️👊", "No es solo código. Es arte en movimiento. 💻🎭", "Tus ideas no son pequeñas. Solo necesitan el entorno correcto para crecer. 🌱🧠", "Cada módulo que usas es una herramienta para tu libertad creativa. 🧰🕊️", "No estás jugando con herramientas. Estás construyendo experiencias. 🛠️🎬", "Creative Engine no te guía. Te sigue. 🧭🤝"
        ];

        // 1. Aplicar configuraciones generales
        document.title = config.general.gameName;

        // 2. Secuencia de Introducción Dinámica
        function runIntro(config, Engine) {
            const logos = config.startupLogos || [];
            let totalDuration = 0;
            introContainer.innerHTML = '';

            logos.forEach((logoData) => {
                const delay = totalDuration * 1000;
                setTimeout(() => {
                    const img = document.createElement('img');
                    img.src = logoData.file;
                    img.classList.add('logo');
                    introContainer.appendChild(img);
                    setTimeout(() => img.classList.add('visible'), 100);
                    setTimeout(() => img.classList.remove('visible'), logoData.duration * 1000 - 500);
                }, delay);
                totalDuration += logoData.duration;
            });

            setTimeout(() => {
                introContainer.classList.add('hidden');
                mainContent.classList.remove('hidden');
                startQuoteCarousel();
                Engine.run(config); // Iniciar el motor después de la intro
            }, totalDuration * 1000);
        }

        // 3. Carrusel de Frases Motivadoras
        function startQuoteCarousel() {
            let currentIndex = Math.floor(Math.random() * quotes.length);
            motivationalTextElement.textContent = quotes[currentIndex];
            setInterval(() => {
                motivationalTextElement.style.opacity = 0;
                setTimeout(() => {
                    currentIndex = (currentIndex + 1) % quotes.length;
                    motivationalTextElement.textContent = quotes[currentIndex];
                    motivationalTextElement.style.opacity = 1;
                }, 500);
            }, 20000);
        }

        // 4. Lógica de Formularios y Modales
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            formFeedback.textContent = "Enviando...";
            formFeedback.classList.remove('hidden');
            setTimeout(() => {
                formFeedback.textContent = "¡Gracias por tu opinión! Mensaje recibido.";
                contactForm.reset();
            }, 1500);
        });
        eulaLink.addEventListener('click', (e) => {
            e.preventDefault();
            eulaModal.classList.remove('hidden');
        });
        closeButton.addEventListener('click', () => eulaModal.classList.add('hidden'));
        window.addEventListener('click', (e) => {
            if (e.target === eulaModal) eulaModal.classList.add('hidden');
        });

        // --- Iniciar la lógica de la aplicación ---
        import('./modules/engine.js').then(Engine => {
             console.log(`Iniciando ${config.general.gameName} v${config.general.version}`);
             runIntro(config, Engine);
        });
    }

    // --- Iniciar el proceso ---
    initialize();
});
