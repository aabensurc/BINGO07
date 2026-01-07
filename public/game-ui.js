/* --- LÓGICA VISUAL (UI) Y AJUSTES --- */

// Estado del Cronómetro
let tiempoInicio = 0;
let intervaloTiempo = null;

// --- 1. FUNCIONES DE GENERACIÓN DE UI (NUEVAS) ---

/**
 * Genera la cartilla con estilo 3D, colores y estrella.
 */
function dibujarCartillaModerna(cartilla, contenedor) {
    contenedor.innerHTML = '';
    contenedor.className = 'contenedor-cartilla-3d'; // Clase nueva

    // 1. Crear Headers (B I N G O) con colores
    const letras = ['B', 'I', 'N', 'G', 'O'];
    const colores = ['bg-b', 'bg-i', 'bg-n', 'bg-g', 'bg-o'];

    const grid = document.createElement('div');
    grid.className = 'cartilla-grid';

    // Headers
    letras.forEach((letra, index) => {
        const div = document.createElement('div');
        div.className = `header-letra ${colores[index]}`;
        div.textContent = letra;
        grid.appendChild(div);
    });

    // 2. Celdas de Números
    for (let fila = 0; fila < 5; fila++) {
        for (let col = 0; col < 5; col++) {
            const numero = cartilla[fila][col];
            const div = document.createElement('div');
            div.className = 'celda-3d'; // Clase base

            // Guardar datos para la lógica del juego
            div.dataset.numero = String(numero);
            div.dataset.col = col; // 0=B, 1=I...

            if (numero === 'GRATIS') {
                // Poner estrella SVG
                div.innerHTML = `<svg class="icono-estrella" viewBox="0 0 576 512"><path d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z"/></svg>`;
                div.classList.add('marcada'); // La central siempre marcada
                div.dataset.numero = 'GRATIS';
            } else {
                div.textContent = numero;
            }

            grid.appendChild(div);
        }
    }
    contenedor.appendChild(grid);
}

/**
 * Genera las bolillas del historial con estilo visual.
 */
function agregarBolillaHistorial(ficha, contenedor) {
    // Limpiar texto "esperando..."
    const placeholder = contenedor.querySelector('span');
    if (placeholder && !placeholder.classList.contains('letra-historial')) {
        placeholder.remove();
    }

    // Crear bolilla
    const div = document.createElement('div');
    div.className = 'bolilla ultima'; // Empieza grande (animación visual)

    // Asignar color según la letra
    const letraLower = ficha.letra.toLowerCase();
    div.classList.add(`${letraLower}-color`); // ej: b-color, g-color

    // --- CAMBIO AQUÍ: HTML para Letra y Número apilados ---
    div.innerHTML = `
        <span class="letra-historial">${ficha.letra}</span>
        <span class="numero-historial">${ficha.numero}</span>
    `;

    // Quitar clase 'ultima' a las anteriores
    const anteriores = contenedor.querySelectorAll('.bolilla.ultima');
    anteriores.forEach(b => b.classList.remove('ultima'));

    // Añadir al principio (izquierda) para que se vea lo nuevo primero
    contenedor.prepend(div);

    // Forzamos el scroll del contenedor a 0 (izquierda)
    contenedor.scrollLeft = 0;
}


// --- 2. LÓGICA DEL CRONÓMETRO ---

function iniciarCronometro() {
    if (intervaloTiempo) clearInterval(intervaloTiempo);
    tiempoInicio = Date.now();
    const display = document.getElementById('tiempoJuego');

    intervaloTiempo = setInterval(() => {
        const delta = Date.now() - tiempoInicio;
        const segundos = Math.floor((delta / 1000) % 60);
        const minutos = Math.floor((delta / (1000 * 60)) % 60);

        const segTexto = segundos < 10 ? `0${segundos}` : segundos;
        const minTexto = minutos < 10 ? `0${minutos}` : minutos;

        if (display) display.textContent = `${minTexto}:${segTexto}`;
    }, 1000);
}

function detenerCronometro() {
    if (intervaloTiempo) clearInterval(intervaloTiempo);
}


// --- 3. AJUSTES (COLOR Y SONIDO) ---

function configurarBotonesAjustes() {
    const btnAjustes = document.getElementById('btnAjustes');
    const menu = document.getElementById('menuAjustes');
    const inputColor = document.getElementById('inputColorTema');

    // Toggle Menú
    if (btnAjustes) {
        btnAjustes.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('visible');
        });
    }

    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', () => {
        if (menu) menu.classList.remove('visible');
    });
    if (menu) {
        menu.addEventListener('click', (e) => e.stopPropagation());
    }

    // Cambiar Color del Tema
    if (inputColor) {
        inputColor.addEventListener('input', (e) => {
            const color = e.target.value;

            // Cambiamos la variable CSS global.
            document.documentElement.style.setProperty('--tema-principal', color);

            // También actualizamos el color oscuro para bordes y sombras de la cartilla
            document.documentElement.style.setProperty('--tema-oscuro', color);
        });
    }
}




/**
 * Dibuja la cartilla del ganador en el modal y resalta los aciertos.
 * @param {Array} cartilla - Matriz 5x5
 * @param {Array} numerosSorteados - Array de números [1, 5, 34...]
 * @param {HTMLElement} contenedor - Donde se dibuja
 */
// ¡AQUÍ FALTABA celdasGanadoras!
function dibujarCartillaGanadora(cartilla, numerosSorteados, celdasGanadoras, contenedor) {
    contenedor.innerHTML = '';

    // Reutilizamos estructura de grid
    const grid = document.createElement('div');
    grid.className = 'cartilla-grid'; // Usa el mismo grid CSS

    // Headers (B I N G O) - Más pequeños por CSS
    const letras = ['B', 'I', 'N', 'G', 'O'];
    const colores = ['bg-b', 'bg-i', 'bg-n', 'bg-g', 'bg-o'];

    letras.forEach((letra, index) => {
        const div = document.createElement('div');
        div.className = `header-letra ${colores[index]}`;
        div.textContent = letra;
        grid.appendChild(div);
    });

    // Dibujar Celdas
    for (let fila = 0; fila < 5; fila++) {
        for (let col = 0; col < 5; col++) {
            const numero = cartilla[fila][col];
            const div = document.createElement('div');
            div.className = 'celda-3d';

            // Texto o Estrella
            if (numero === 'GRATIS') {
                div.innerHTML = '★';
                // La gratis siempre suele ser parte de la victoria si pasa por el centro
            } else {
                div.textContent = numero;
            }

            // 1. VERIFICAR SI SALIÓ
            // Fix: Asegurar comparación robusta (String vs String) por si vienen tipos distintos
            const salio = (numero === 'GRATIS' || numerosSorteados.some(n => String(n) === String(numero)));

            // 2. VERIFICAR SI ES PARTE DEL TRAZO GANADOR (Rojo)
            // FIX: Validar si celdasGanadoras existe (para no ganadores es null)
            const esParteDelTrazo = celdasGanadoras && celdasGanadoras.some(coord => coord.r === fila && coord.c === col);

            // LÓGICA DE COLOR:
            // CASO A: Es el ganador -> Solo rojo si es parte del trazo, el resto amarillo.
            // CASO B: Es perdedor (celdasGanadoras es null) -> Si salió, lo pintamos rojo para ver "qué acertó".

            if (esParteDelTrazo) {
                // Ganador: Parte de la línea -> ROJO
                div.classList.add('celda-trazo-win');
            } else if (salio) {
                if (!celdasGanadoras) {
                    // Perdedor: Todo lo que salió -> ROJO (Petición usuario)
                    div.classList.add('celda-trazo-win');
                } else {
                    // Ganador: Lo que salió pero no es línea -> AMARILLO (Normal)
                    div.classList.add('celda-ganadora');
                }
            }

            grid.appendChild(div);
        }
    }
    contenedor.appendChild(grid);
}