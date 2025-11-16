// 1. Inicia la conexión con el servidor
const socket = io();

// --- 1. ELEMENTOS DEL DOM ---
// (Sin cambios aquí)
const pantallaBienvenida = document.getElementById('pantalla-bienvenida');
const pantallaLobby = document.getElementById('pantalla-lobby');
const pantallaJuegoAnfitrion = document.getElementById('pantalla-juego-anfitrion');
const pantallaJuegoJugador = document.getElementById('pantalla-juego-jugador');
const inputNombre = document.getElementById('inputNombre');
const btnCrearPartida = document.getElementById('btnCrearPartida');
const inputClave = document.getElementById('inputClave');
const btnUnirsePartida = document.getElementById('btnUnirsePartida');
const mensajeError = document.getElementById('mensajeError');
const lobbyClave = document.getElementById('lobbyClave');
const lobbyListaJugadores = document.getElementById('lobbyListaJugadores');
const lobbyVistaAnfitrion = document.getElementById('lobby-vista-anfitrion');
const lobbyVistaJugador = document.getElementById('lobby-vista-jugador');
const lobbyPatrones = document.getElementById('lobbyPatrones');
const btnEmpezarPartida = document.getElementById('btnEmpezarPartida');
const btnSortearFicha = document.getElementById('btnSortearFicha');
const fichaActual = document.getElementById('fichaActual');
const fichaAnterior = document.getElementById('fichaAnterior');
const tableroControlAnfitrion = document.getElementById('tableroControlAnfitrion');
const jugadorPatron = document.getElementById('jugadorPatron');
const jugadorFicha = document.getElementById('jugadorFicha');
const cartillaJugador = document.getElementById('cartillaJugador');
const btnCantarBingo = document.getElementById('btnCantarBingo');
const historialContenedor = document.getElementById('historialContenedor');
const modalFinJuego = document.getElementById('modalFinJuego');
const modalGanadorTexto = document.getElementById('modalGanadorTexto');
const btnVolverAlLobby = document.getElementById('btnVolverAlLobby');

// --- 2. ESTADO DEL CLIENTE ---
let patronSeleccionado = 'linea';
let miCartilla = null;
let soyAnfitrion = false;
const PLAYER_ID_KEY = 'bingoPlayerId';
let misMarcas = []; // <-- ¡NUEVO! Un array para guardar las marcas (ej: [10, 25, 70])

// --- 3. FUNCIÓN UTILITARIA PRINCIPAL ---
function cambiarPantalla(idSiguientePantalla) {
    document.querySelectorAll('.pantalla').forEach(p => {
        p.classList.remove('activa');
    });
    document.getElementById(idSiguientePantalla).classList.add('activa');
}

// --- 4. LÓGICA DE EVENTOS (CLICS DEL USUARIO) ---

// (Eventos de Bienvenida, Lobby, Anfitrión - Sin cambios)
btnCrearPartida.addEventListener('click', () => {
    const nombre = inputNombre.value.trim();
    if (!nombre) {
        mensajeError.textContent = 'Por favor, ingresa tu nombre.';
        return;
    }
    socket.emit('crearPartida', { nombre: nombre });
});
btnUnirsePartida.addEventListener('click', () => {
    const nombre = inputNombre.value.trim();
    const clave = inputClave.value.trim().toUpperCase();
    if (!nombre || !clave) {
        mensajeError.textContent = 'Debes ingresar nombre y clave.';
        return;
    }
    socket.emit('unirsePartida', { nombre: nombre, clave: clave });
});
lobbyPatrones.addEventListener('click', (e) => {
    if (!e.target.classList.contains('patron')) return;
    lobbyPatrones.querySelectorAll('.patron').forEach(btn => {
        btn.classList.remove('seleccionado');
    });
    e.target.classList.add('seleccionado');
    patronSeleccionado = e.target.dataset.patron;
});
btnEmpezarPartida.addEventListener('click', () => {
    socket.emit('empezarPartida', { patron: patronSeleccionado });
});
btnSortearFicha.addEventListener('click', () => {
    btnSortearFicha.disabled = true;
    socket.emit('sortearFicha');
});

// -- PANTALLA 4: JUEGO (JUGADOR) --
cartillaJugador.addEventListener('click', (e) => {
    const celda = e.target;
    if (celda.classList.contains('celda') && celda.dataset.numero) {
        if (celda.dataset.numero === 'GRATIS') return;
        
        celda.classList.toggle('marcada');
        
        // --- ¡NUEVO! GUARDAR MARCAS ---
        const numero = parseInt(celda.dataset.numero);
        if (celda.classList.contains('marcada')) {
            // Si no está en el array, añadirlo
            if (!misMarcas.includes(numero)) misMarcas.push(numero);
        } else {
            // Si está, quitarlo
            misMarcas = misMarcas.filter(n => n !== numero);
        }
        // Guardar en localStorage
        const playerId = localStorage.getItem(PLAYER_ID_KEY);
        if (playerId) {
            localStorage.setItem(`bingoMarks-${playerId}`, JSON.stringify(misMarcas));
        }
        // --- FIN DE NUEVO CÓDIGO ---
    }
});

btnCantarBingo.addEventListener('click', () => {
    socket.emit('cantarBingo');
    btnCantarBingo.disabled = true;
    btnCantarBingo.textContent = 'VERIFICANDO...';
});

// -- MODAL: Botón Volver al Lobby --
btnVolverAlLobby.addEventListener('click', () => {
    modalFinJuego.classList.remove('visible');
    
    // Limpiamos pantallas de juego
    cartillaJugador.innerHTML = '';
    tableroControlAnfitrion.innerHTML = '';
    fichaActual.textContent = '--';
    fichaAnterior.textContent = '--';
    jugadorFicha.textContent = '--';
    limpiarHistorialDeFichas();
    
    // --- ¡NUEVO! LIMPIEZA DE RONDA ---
    // Borramos las marcas de la ronda anterior
    const playerId = localStorage.getItem(PLAYER_ID_KEY);
    if (playerId) {
        localStorage.removeItem(`bingoMarks-${playerId}`);
    }
    misMarcas = []; // Reseteamos el array local
    // --- FIN DE NUEVO CÓDIGO ---

    // Reactivamos botones
    btnCantarBingo.disabled = false;
    btnCantarBingo.textContent = '¡CANTAR BINGO!';
    btnSortearFicha.disabled = false;

    // Regresamos al lobby
    cambiarPantalla('pantalla-lobby');
});


// --- 5. LÓGICA DE SOCKETS (ESCUCHAR AL SERVIDOR) ---

socket.on('connect', () => {
    console.log(`Conectado al servidor con ID: ${socket.id}`);
    const playerId = localStorage.getItem(PLAYER_ID_KEY);
    if (playerId) {
        console.log('Tengo un PlayerID, intentando reconectar...', playerId);
        pantallaBienvenida.querySelector('.form-unirse').style.display = 'none';
        socket.emit('quieroReconectar', { playerId: playerId });
    }
});

// -- EVENTOS DEL LOBBY --
socket.on('partidaCreada', (datos) => {
    soyAnfitrion = true;
    localStorage.setItem(PLAYER_ID_KEY, datos.playerId);
    lobbyClave.textContent = datos.clave;
    lobbyVistaAnfitrion.style.display = 'block';
    lobbyVistaJugador.style.display = 'none';
    cambiarPantalla('pantalla-lobby');
});

socket.on('unionExitosa', (datos) => {
    soyAnfitrion = false;
    localStorage.setItem(PLAYER_ID_KEY, datos.playerId);
    lobbyClave.textContent = datos.clave;
    lobbyVistaAnfitrion.style.display = 'none';
    lobbyVistaJugador.style.display = 'block';
    cambiarPantalla('pantalla-lobby');
});

// (errorUnion y actualizarLobby - Sin cambios)
socket.on('errorUnion', (mensaje) => {
    mensajeError.textContent = mensaje;
});
socket.on('actualizarLobby', (datos) => {
    lobbyListaJugadores.innerHTML = '';
    datos.jugadores.forEach(jugador => {
        const li = document.createElement('li');
        li.textContent = jugador.nombre;
        if (jugador.esAnfitrion) {
            li.textContent += ' (Anfitrión)';
            li.style.fontWeight = 'bold';
        }
        lobbyListaJugadores.appendChild(li);
    });
});

// -- EVENTOS DE INICIO DE JUEGO --
socket.on('partidaIniciada', (datos) => {
    limpiarHistorialDeFichas();
    
    // --- ¡NUEVO! LIMPIEZA DE RONDA ---
    // Limpiamos marcas viejas al empezar una nueva partida
    const playerId = localStorage.getItem(PLAYER_ID_KEY);
    if (playerId) {
        localStorage.removeItem(`bingoMarks-${playerId}`);
    }
    misMarcas = [];
    // --- FIN DE NUEVO CÓDIGO ---

    if (soyAnfitrion) {
        generarTableroAnfitrion();
        cambiarPantalla('pantalla-juego-anfitrion');
    } else {
        jugadorPatron.textContent = datos.patronTexto;
        miCartilla = datos.cartilla;
        generarCartillaVisual(datos.cartilla); // Dibuja la cartilla LIMPIA
        cambiarPantalla('pantalla-juego-jugador');
    }
});

// (fichaAnunciada, bingoFalso, juegoTerminado - Sin cambios)
socket.on('fichaAnunciada', (datos) => {
    const { ficha } = datos;
    actualizarHistorialDeFichas(ficha);
    if (soyAnfitrion) {
        fichaAnterior.textContent = fichaActual.textContent;
        fichaActual.textContent = ficha.ficha;
        const celda = document.querySelector(`.celda-anfitrion[data-ficha="${ficha.ficha}"]`);
        if (celda) celda.classList.add('marcada');
        btnSortearFicha.disabled = false;
    } else {
        jugadorFicha.textContent = ficha.ficha;
        const celda = cartillaJugador.querySelector(`.celda[data-numero="${String(ficha.numero)}"]`);
        if (celda) celda.classList.add('llamada');
    }
});
socket.on('bingoFalso', () => {
    console.log('El servidor dijo: Bingo Falso.');
    btnCantarBingo.classList.add('bingo-falso');
    btnCantarBingo.textContent = '¡BINGO FALSO!';
    setTimeout(() => {
        btnCantarBingo.classList.remove('bingo-falso');
        btnCantarBingo.disabled = false;
        btnCantarBingo.textContent = '¡CANTAR BINGO!';
    }, 1000);
});
socket.on('juegoTerminado', (datos) => {
    modalGanadorTexto.textContent = `El ganador es: ${datos.nombreGanador}`;
    modalFinJuego.classList.add('visible');
    btnCantarBingo.disabled = true;
    btnSortearFicha.disabled = true;
});

// -- EVENTOS DE ERROR Y RECONEXIÓN --
socket.on('errorJuego', (mensaje) => {
    // ¡El anfitrión se fue! Es el fin.
    
    // --- ¡NUEVO! LIMPIEZA TOTAL DE SESIÓN ---
    const playerId = localStorage.getItem(PLAYER_ID_KEY);
    if (playerId) {
        localStorage.removeItem(`bingoMarks-${playerId}`); // Borra las marcas
    }
    localStorage.removeItem(PLAYER_ID_KEY); // Borra el Pase VIP
    // --- FIN DE NUEVO CÓDIGO ---

    alert(mensaje);
    location.reload();
});

socket.on('forzarLimpieza', () => {
    // El servidor no encontró nuestro Pase VIP
    const playerId = localStorage.getItem(PLAYER_ID_KEY);
    if (playerId) {
        localStorage.removeItem(`bingoMarks-${playerId}`); // Borra marcas huérfanas
    }
    localStorage.removeItem(PLAYER_ID_KEY); // Borra el Pase VIP inválido
    pantallaBienvenida.querySelector('.form-unirse').style.display = 'block';
});

socket.on('reconexionExitosa', (datos) => {
    console.log('¡Reconexión exitosa!', datos);
    
    soyAnfitrion = datos.esAnfitrion;
    limpiarHistorialDeFichas();
    
    datos.fichasHistorial.forEach(ficha => {
        actualizarHistorialDeFichas(ficha);
    });

    if (soyAnfitrion) {
        generarTableroAnfitrion();
        datos.fichasHistorial.forEach(ficha => {
            const celda = document.querySelector(`.celda-anfitrion[data-ficha="${ficha.ficha}"]`);
            if (celda) celda.classList.add('marcada');
        });
        if (datos.ultimaFicha) fichaActual.textContent = datos.ultimaFicha.ficha;
        if (datos.anteriorFicha) fichaAnterior.textContent = datos.anteriorFicha.ficha;
        
        cambiarPantalla('pantalla-juego-anfitrion');
    } else {
        jugadorPatron.textContent = datos.patronTexto;
        miCartilla = datos.cartilla;
        generarCartillaVisual(datos.cartilla); // Dibuja la cartilla
        
        // --- ¡NUEVO! RESTAURAR MARCAS ---
        const playerId = localStorage.getItem(PLAYER_ID_KEY);
        const savedMarks = JSON.parse(localStorage.getItem(`bingoMarks-${playerId}`) || '[]');
        misMarcas = savedMarks; // Sincroniza nuestro array local
        
        savedMarks.forEach(numero => {
            const celda = cartillaJugador.querySelector(`.celda[data-numero="${String(numero)}"]`);
            if (celda) {
                celda.classList.add('marcada'); // Aplica la marca guardada
            }
        });
        // --- FIN DE NUEVO CÓDIGO ---

        if (datos.fichasHistorial.length > 0) {
            jugadorFicha.textContent = datos.fichasHistorial[datos.fichasHistorial.length - 1].ficha;
        }
        
        cambiarPantalla('pantalla-juego-jugador');
    }
});


// --- 6. FUNCIONES HELPERS (GENERACIÓN DE UI) ---
// (Sin cambios en las funciones de generación)
function generarCartillaVisual(cartilla) {
    cartillaJugador.innerHTML = '';
    const letras = ['B', 'I', 'N', 'G', 'O'];
    letras.forEach(letra => {
        const celdaHeader = document.createElement('div');
        celdaHeader.classList.add('celda', 'celda-header');
        celdaHeader.textContent = letra;
        cartillaJugador.appendChild(celdaHeader);
    });
    for (let fila = 0; fila < 5; fila++) {
        for (let col = 0; col < 5; col++) {
            const numero = cartilla[fila][col];
            const celda = document.createElement('div');
            celda.classList.add('celda');
            celda.textContent = numero;
            celda.dataset.letra = letras[col];
            celda.dataset.numero = String(numero);
            if (numero === 'GRATIS') {
                celda.classList.add('marcada');
            }
            cartillaJugador.appendChild(celda);
        }
    }
}
function generarTableroAnfitrion() {
    tableroControlAnfitrion.innerHTML = '';
    const letras = ['B', 'I', 'N', 'G', 'O'];
    const rangos = [
        { min: 1, max: 15 }, { min: 16, max: 30 }, { min: 31, max: 45 },
        { min: 46, max: 60 }, { min: 61, max: 75 }
    ];
    letras.forEach((letra, index) => {
        const { min, max } = rangos[index];
        const columna = document.createElement('div');
        columna.classList.add('columna-anfitrion');
        const header = document.createElement('div');
        header.classList.add('celda-anfitrion', 'celda-header');
        header.textContent = letra;
        columna.appendChild(header);
        for (let i = min; i <= max; i++) {
            const celda = document.createElement('div');
            celda.classList.add('celda-anfitrion');
            celda.textContent = i;
            celda.dataset.ficha = `${letra}${i}`;
            columna.appendChild(celda);
        }
        tableroControlAnfitrion.appendChild(columna);
    });
}
function limpiarHistorialDeFichas() {
    if (historialContenedor) {
        historialContenedor.innerHTML = '<span>Esperando fichas...</span>';
    }
}
function actualizarHistorialDeFichas(ficha) {
    if (!historialContenedor) return;
    const placeholder = historialContenedor.querySelector('span');
    if (placeholder) {
        placeholder.remove();
    }
    const fichaEl = document.createElement('div');
    fichaEl.classList.add('ficha-hist');
    fichaEl.textContent = ficha.ficha;
    historialContenedor.appendChild(fichaEl);
    historialContenedor.scrollTop = historialContenedor.scrollHeight;
}