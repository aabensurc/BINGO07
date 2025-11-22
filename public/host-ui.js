/**
 * LÓGICA DE INTERFAZ DEL ANFITRION (RENOVADA - CON LETRAS)
 */

const HostUI = {
    elements: {
        tablero: document.getElementById('grid75'),
        fichaActual: document.getElementById('fichaActual'),
        fichaAnterior: document.getElementById('fichaAnterior'),
        btnSortear: document.getElementById('btnSortearFicha'),
        inputIntervalo: document.getElementById('inputIntervalo'),
        checkAuto: document.getElementById('checkAutomatico'),
        menuAjustes: document.getElementById('menuAjustesAnfitrion'),
        btnAjustes: document.getElementById('btnAjustesAnfitrion'),
        inputColor: document.getElementById('inputColorTemaAnfitrion')
    },

    init: function() {
        this.setupSettingsMenu();
        this.renderizarTableroVacio();
    },

    /**
     * Configura el menú de ajustes (Color, Sonido)
     */
    setupSettingsMenu: function() {
        const { btnAjustes, menuAjustes, inputColor } = this.elements;

        if (btnAjustes && menuAjustes) {
            btnAjustes.addEventListener('click', (e) => {
                e.stopPropagation();
                menuAjustes.classList.toggle('visible');
            });

            document.addEventListener('click', () => {
                menuAjustes.classList.remove('visible');
            });
            menuAjustes.addEventListener('click', (e) => e.stopPropagation());
        }

        if (inputColor) {
            inputColor.addEventListener('input', (e) => {
                const color = e.target.value;
                // Actualiza variables CSS globales
                document.documentElement.style.setProperty('--tema-principal', color);
                document.documentElement.style.setProperty('--tema-oscuro', color);
            });
        }
    },

    /**
     * Renderiza el tablero vacío al iniciar
     */
    renderizarTableroVacio: function() {
        const contenedor = this.elements.tablero;
        if (!contenedor) return;

        contenedor.innerHTML = '';
        
        // Definimos los rangos por columna
        const rangos = [
            { l: 'B', min: 1 }, 
            { l: 'I', min: 16 }, 
            { l: 'N', min: 31 }, 
            { l: 'G', min: 46 }, 
            { l: 'O', min: 61 }
        ];

        // Generamos por filas para mantener el orden visual vertical
        for (let fila = 0; fila < 15; fila++) {
            for (let col = 0; col < 5; col++) {
                const info = rangos[col];
                const numero = info.min + fila;
                const fichaStr = `${info.l}${numero}`;

                const div = document.createElement('div');
                div.className = 'celda-control';
                div.textContent = numero;
                
                // Data attributes para lógica y estilo
                div.dataset.ficha = fichaStr;
                div.dataset.letra = info.l.toLowerCase(); 
                
                contenedor.appendChild(div);
            }
        }
    },

/**
     * Marca una ficha en el tablero y actualiza las bolas grandes
     */
    marcarFicha: function(ficha, fichaPrevia = null) {
        // 1. Actualizar Tablero Pequeño (Grid)
        const celda = document.querySelector(`.celda-control[data-ficha="${ficha.ficha}"]`);
        
        if (celda) {
            celda.classList.add('marcada');
            celda.classList.add(`bg-${ficha.letra.toLowerCase()}`);
            
            // --- MODIFICACIÓN: Scroll Condicional ---
            // Verificamos si el panel del anfitrión-jugador está abierto
            const panelCartillaHost = document.getElementById('panelCartillaHost');
            const estaJugando = panelCartillaHost && panelCartillaHost.classList.contains('abierto');

            // Solo hacemos el auto-scroll si el anfitrión NO está jugando (panel cerrado)
            // Así no le movemos la pantalla cuando quiere marcar su cartón.
            if (!estaJugando) {
                if (this.elements.tablero.scrollHeight > this.elements.tablero.clientHeight) {
                     celda.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        }

        // 2. Actualizar Bolas Grandes (Visual)
        this.actualizarBolaVisual(this.elements.fichaActual, ficha, true);
        
        if (fichaPrevia) {
            this.actualizarBolaVisual(this.elements.fichaAnterior, fichaPrevia, false);
        }
    },

    /**
     * Actualiza el contenido visual de una bola (Actual o Anterior)
     * Inyecta HTML para mostrar Letra pequeña y Número grande.
     */
    actualizarBolaVisual: function(el, data, esGigante) {
        if (!el || !data) return;
        
        // Construimos el HTML interno: Letra arriba, Número abajo
        el.innerHTML = `
            <span class="letra-mini">${data.letra}</span>
            <span class="numero-grande">${data.numero}</span>
        `;
        
        // Asignamos clase base
        el.className = esGigante ? 'bolilla-gigante' : 'bolilla-mediana';
        
        // Añadimos clase de color para el borde (b-color, i-color...)
        el.classList.add(`${data.letra.toLowerCase()}-color`);

        // Animación solo para la gigante
        if (esGigante) {
            el.classList.remove('pop-in');
            void el.offsetWidth; // Trigger reflow (reinicio de animación)
            el.classList.add('pop-in');
        }
    },

    /**
     * Resetea toda la interfaz para una nueva partida
     */
    resetearInterfaz: function() {
        this.renderizarTableroVacio();
        
        const fA = this.elements.fichaActual;
        const fP = this.elements.fichaAnterior;
        
        // Reseteamos a guiones grandes (manteniendo estructura)
        fA.innerHTML = '<span class="numero-grande">--</span>'; 
        fA.className = 'bolilla-gigante';
        
        fP.innerHTML = '<span class="numero-grande">--</span>'; 
        fP.className = 'bolilla-mediana';
        
        this.elements.btnSortear.disabled = false;
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    HostUI.init();
});