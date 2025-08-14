document.addEventListener('DOMContentLoaded', () => {
    // --- Modal Elements ---
    const reportModal = document.getElementById('report-modal');
    const supportModal = document.getElementById('support-modal');

    // --- Buttons to open modals ---
    const reportButton = document.getElementById('btn-report');
    const supportButton = document.getElementById('btn-support');

    // --- Close buttons ---
    const closeReport = document.getElementById('close-report');
    const closeSupport = document.getElementById('close-support');

    // --- Modal form elements ---
    const opinionText = document.getElementById('opinion-text');
    const submitOpinionBtn = document.getElementById('submit-opinion');
    const reportText = document.getElementById('report-text');
    const submitReportBtn = document.getElementById('submit-report');

    // --- Other buttons ---
    const startButton = document.getElementById('btn-start');
    const licenseButton = document.getElementById('btn-license');

    // --- Functions to handle modals ---
    const openModal = (modal) => {
        if (modal) modal.style.display = 'block';
    };

    const closeModal = () => {
        if (reportModal) reportModal.style.display = 'none';
        if (supportModal) supportModal.style.display = 'none';
    };

    // --- Event Listeners ---

    // Open modals
    reportButton.addEventListener('click', () => openModal(reportModal));
    supportButton.addEventListener('click', () => openModal(supportModal));

    // Close modals with their respective buttons
    closeReport.addEventListener('click', closeModal);
    closeSupport.addEventListener('click', closeModal);

    // Close modals by clicking outside on the overlay
    window.addEventListener('click', (event) => {
        if (event.target == reportModal || event.target == supportModal) {
            closeModal();
        }
    });

    // Handle opinion submission via mailto
    submitOpinionBtn.addEventListener('click', () => {
        const subject = encodeURIComponent('Opinión sobre Creative Engine');
        const body = encodeURIComponent(opinionText.value);
        if (body) {
            window.location.href = `mailto:empresariacarley16@gmail.com?subject=${subject}&body=${body}`;
            opinionText.value = ''; // Clear textarea after submission
            closeModal();
        } else {
            alert('Por favor, escribe tu opinión antes de enviar.');
        }
    });

    // Handle report submission via mailto
    submitReportBtn.addEventListener('click', () => {
        const subject = encodeURIComponent('Reporte de Error en Creative Engine');
        const body = encodeURIComponent(reportText.value);
        if (body) {
            window.location.href = `mailto:empresariacarley16@gmail.com?subject=${subject}&body=${body}`;
            reportText.value = ''; // Clear textarea after submission
            closeModal();
        } else {
            alert('Por favor, describe el error antes de enviar.');
        }
    });

    // Keep alerts for other buttons
    startButton.addEventListener('click', () => {
        alert('¡Genial! Próximamente, esta opción te llevará al editor de Creative Engine.');
    });

    licenseButton.addEventListener('click', () => {
        alert('Creative Engine es un motor gratuito. La información detallada de la licencia se mostrará aquí.');
    });

    console.log('Creative Engine UI with Modals Initialized.');
});
