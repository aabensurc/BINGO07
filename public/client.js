// 1. Inicia la conexión con el servidor
const socket = io();

// --- 1. ELEMENTOS DEL DOM ---
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
const checkAutomatico = document.getElementById('checkAutomatico');
const inputIntervalo = document.getElementById('inputIntervalo');

// --- ¡NUEVO! Elementos de Voz ---
const btnMute = document.getElementById('btnMute');
const iconoSonido = document.getElementById('icono-sonido');
const iconoMute = document.getElementById('icono-mute');

// --- 2. ESTADO DEL CLIENTE ---
let patronSeleccionado = 'linea';
let miCartilla = null;
let soyAnfitrion = false;
const PLAYER_ID_KEY = 'bingoPlayerId';
let misMarcas = [];
let temporizadorSorteo = null;

// --- ¡NUEVO! Estado de Voz ---
let estaMuteado = false;
let vozSeleccionada = null;
const synth = window.speechSynthesis;

// --- 3. FUNCIÓN UTILITARIA PRINCIPAL ---
function cambiarPantalla(idSiguientePantalla) {
    document.querySelectorAll('.pantalla').forEach(p => {
        p.classList.remove('activa');
    });
    document.getElementById(idSiguientePantalla).classList.add('activa');
}

// --- ¡NUEVO! FUNCIONES DE VOZ ---
/**
 * Busca y carga la mejor voz en español disponible en el navegador
 */
function cargarVoz() {
    // getVoices() puede tardar un momento en cargar
    const voces = synth.getVoices();
    
    // Damos prioridad a voces "nativas" de alta calidad
    vozSeleccionada = voces.find(v => v.lang === 'es-ES' && v.localService);
    if (!vozSeleccionada) vozSeleccionada = voces.find(v => v.lang === 'es-US' && v.localService);
    if (!vozSeleccionada) vozSeleccionada = voces.find(v => v.lang === 'es-MX' && v.localService);
    
    // Si no, buscamos cualquier voz en español
    if (!vozSeleccionada) vozSeleccionada = voces.find(v => v.lang.startsWith('es-'));

    // Si no encontramos nada, usamos la primera voz disponible (mejor que nada)
    if (!vozSeleccionada && voces.length > 0) {
        vozSeleccionada = voces[0];
    }
    
    if (vozSeleccionada) {
        console.log('Voz seleccionada:', vozSeleccionada.name, `(${vozSeleccionada.lang})`);
    } else {
        console.log('No se encontraron voces para SpeechSynthesis.');
    }
}

// Cargamos las voces al inicio
cargarVoz();
if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = cargarVoz;
}

/**
 * Lee un texto en voz alta usando la API del navegador
 * @param {string} texto - El texto a decir
 */
function hablar(texto) {
    // 1. Si está muteado, no hace nada
    if (estaMuteado || !vozSeleccionada || !synth) return;

    // 2. Detiene cualquier cosa que estuviera diciendo antes
    synth.cancel(); 

    // 3. Crea el "anuncio"
    const anuncio = new SpeechSynthesisUtterance(texto);
    anuncio.voice = vozSeleccionada;
    anuncio.lang = vozSeleccionada.lang;
    anuncio.rate = 0.95; // Velocidad (0.95 es un poco más pausado)
    anuncio.pitch = 1.0; // Tono
    
    // 4. ¡Lo dice en voz alta!
    synth.speak(anuncio);
}

// --- 4. LÓGICA DE EVENTOS (CLICS DEL USUARIO) ---

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
    if (checkAutomatico.checked) return; 
    btnSortearFicha.disabled = true;
    socket.emit('sortearFicha');
});

checkAutomatico.addEventListener('change', () => {
    if (checkAutomatico.checked) {
        let intervalo = parseInt(inputIntervalo.value, 10);
        if (isNaN(intervalo) || intervalo < 5) intervalo = 5;
        if (intervalo > 30) intervalo = 30;
        inputIntervalo.value = intervalo;
        inputIntervalo.disabled = true;
        btnSortearFicha.disabled = true;
        const milisegundos = intervalo * 1000;
        const funcionSorteo = () => {
            if (!btnSortearFicha.disabled) {
                btnSortearFicha.disabled = true;
                socket.emit('sortearFicha');
            }
        };
        temporizadorSorteo = setInterval(funcionSorteo, milisegundos);
        btnSortearFicha.disabled = true;
        socket.emit('sortearFicha');
    } else {
        if (temporizadorSorteo) {
            clearInterval(temporizadorSorteo);
            temporizadorSorteo = null;
        }
        btnSortearFicha.disabled = false;
        inputIntervalo.disabled = false;
    }
});

cartillaJugador.addEventListener('click', (e) => {
    const celda = e.target;
    if (celda.classList.contains('celda') && celda.dataset.numero) {
        if (celda.dataset.numero === 'GRATIS') return;
        celda.classList.toggle('marcada');
        const numero = parseInt(celda.dataset.numero);
        if (celda.classList.contains('marcada')) {
            if (!misMarcas.includes(numero)) misMarcas.push(numero);
        } else {
            misMarcas = misMarcas.filter(n => n !== numero);
        }
        const playerId = localStorage.getItem(PLAYER_ID_KEY);
        if (playerId) {
            localStorage.setItem(`bingoMarks-${playerId}`, JSON.stringify(misMarcas));
        }
    }
});
btnCantarBingo.addEventListener('click', () => {
    socket.emit('cantarBingo');
    btnCantarBingo.disabled = true;
    btnCantarBingo.textContent = 'VERIFICANDO...';
});

btnVolverAlLobby.addEventListener('click', () => {
    modalFinJuego.classList.remove('visible');
    cartillaJugador.innerHTML = '';
    tableroControlAnfitrion.innerHTML = '';
    fichaActual.textContent = '--';
    fichaAnterior.textContent = '--';
    jugadorFicha.textContent = '--';
    limpiarHistorialDeFichas();
    const playerId = localStorage.getItem(PLAYER_ID_KEY);
    if (playerId) {
        localStorage.removeItem(`bingoMarks-${playerId}`);
    }
    misMarcas = [];
    if (temporizadorSorteo) {
        clearInterval(temporizadorSorteo);
        temporizadorSorteo = null;
    }
    checkAutomatico.checked = false;
    inputIntervalo.disabled = false;
    btnCantarBingo.disabled = false;
    btnCantarBingo.textContent = '¡CANTAR BINGO!';
    btnSortearFicha.disabled = false;
    cambiarPantalla('pantalla-lobby');
});

// --- ¡NUEVO! Evento del Botón Mute ---
btnMute.addEventListener('click', () => {
    estaMuteado = !estaMuteado; // Invierte el estado
    
    // Cambia el ícono
    if (estaMuteado) {
        iconoSonido.style.display = 'none';
        iconoMute.style.display = 'block';
        synth.cancel(); // Si estaba hablando, lo calla
    } else {
        iconoSonido.style.display = 'block';
        iconoMute.style.display = 'none';
    }
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

socket.on('partidaIniciada', (datos) => {
    limpiarHistorialDeFichas();
    const playerId = localStorage.getItem(PLAYER_ID_KEY);
    if (playerId) {
        localStorage.removeItem(`bingoMarks-${playerId}`);
    }
    misMarcas = [];
    if (soyAnfitrion) {
        generarTableroAnfitrion();
        cambiarPantalla('pantalla-juego-anfitrion');
    } else {
        jugadorPatron.textContent = datos.patronTexto;
        miCartilla = datos.cartilla;
        generarCartillaVisual(datos.cartilla);
        cambiarPantalla('pantalla-juego-jugador');
        
        // --- ¡NUEVO! Habla al iniciar ---
        // Espera un segundo para que la UI cargue
        setTimeout(() => {
            hablar(`Iniciando juego. Jugando por ${datos.patronTexto}`);
        }, 1000);
    }
});

socket.on('fichaAnunciada', (datos) => {
    const { ficha } = datos;
    actualizarHistorialDeFichas(ficha);

    if (soyAnfitrion) {
        fichaAnterior.textContent = fichaActual.textContent;
        fichaActual.textContent = ficha.ficha;
        
        const celda = document.querySelector(`.celda-anfitrion[data-ficha="${ficha.ficha}"]`);
        if (celda) {
            celda.classList.add('marcada');
        }
        
        btnSortearFicha.disabled = false;

    } else {
        jugadorFicha.textContent = ficha.ficha;
        
        // --- ¡NUEVO! Habla la ficha ---
        // Leemos la letra con espacios (B -> "Be")
        const letraParaHablar = ficha.letra.split('').join(' '); 
        hablar(`${letraParaHablar} ${ficha.numero}`);
        // --- FIN DE NUEVO CÓDIGO ---

        const celda = cartillaJugador.querySelector(`.celda[data-numero="${String(ficha.numero)}"]`);
        if (celda) {
            celda.classList.add('llamada');
        }
    }
});

socket.on('bingoFalso', () => {
    console.log('El servidor dijo: Bingo Falso.');
    
    // --- ¡NUEVO! Habla el error ---
    hablar('Bingo Falso');

    btnCantarBingo.classList.add('bingo-falso');
    btnCantarBingo.textContent = '¡BINGO FALSO!';
    setTimeout(() => {
        btnCantarBingo.classList.remove('bingo-falso');
        btnCantarBingo.disabled = false;
        btnCantarBingo.textContent = '¡CANTAR BINGO!';
    }, 1000);
});

socket.on('juegoTerminado', (datos) => {
    // --- ¡NUEVO! Habla el ganador ---
    hablar(`¡BINGO! El ganador es ${datos.nombreGanador}`);
    
    modalGanadorTexto.textContent = `El ganador es: ${datos.nombreGanador}`;
    modalFinJuego.classList.add('visible');
    
    if (temporizadorSorteo) {
        clearInterval(temporizadorSorteo);
        temporizadorSorteo = null;
    }
    btnCantarBingo.disabled = true;
    btnSortearFicha.disabled = true;
});

socket.on('errorJuego', (mensaje) => {
    const playerId = localStorage.getItem(PLAYER_ID_KEY);
    if (playerId) {
        localStorage.removeItem(`bingoMarks-${playerId}`);
    }
    localStorage.removeItem(PLAYER_ID_KEY);
    alert(mensaje);
    location.reload();
});

socket.on('forzarLimpieza', () => {
    const playerId = localStorage.getItem(PLAYER_ID_KEY);
    if (playerId) {
        localStorage.removeItem(`bingoMarks-${playerId}`);
    }
    localStorage.removeItem(PLAYER_ID_KEY);
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
        checkAutomatico.checked = false;
        cambiarPantalla('pantalla-juego-anfitrion');
    } else {
        jugadorPatron.textContent = datos.patronTexto;
        miCartilla = datos.cartilla;
        generarCartillaVisual(datos.cartilla);
        const playerId = localStorage.getItem(PLAYER_ID_KEY);
        const savedMarks = JSON.parse(localStorage.getItem(`bingoMarks-${playerId}`) || '[]');
        misMarcas = savedMarks;
        savedMarks.forEach(numero => {
            const celda = cartillaJugador.querySelector(`.celda[data-numero="${String(numero)}"]`);
            if (celda) {
                celda.classList.add('marcada');
            }
        });
        if (datos.fichasHistorial.length > 0) {
            jugadorFicha.textContent = datos.fichasHistorial[datos.fichasHistorial.length - 1].ficha;
        }
        
        // --- ¡NUEVO! Habla al reconectar ---
        setTimeout(() => {
            hablar('Bienvenido de vuelta. ¡Ponte al día!');
        }, 1000);
        
        cambiarPantalla('pantalla-juego-jugador');
    }
});


// --- 6. FUNCIONES HELPERS (GENERACIÓN DE UI) ---
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