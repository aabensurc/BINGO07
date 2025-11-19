// 1. Inicia la conexión con el servidor
const socket = io();

// --- ELEMENTOS DOM ---
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
const cartillaJugador = document.getElementById('cartillaJugador');
const btnCantarBingo = document.getElementById('btnCantarBingo');
const historialContenedor = document.getElementById('historialContenedor');
const modalFinJuego = document.getElementById('modalFinJuego');
const modalGanadorTexto = document.getElementById('modalGanadorTexto');
const btnVolverAlLobby = document.getElementById('btnVolverAlLobby');
const checkAutomatico = document.getElementById('checkAutomatico');
const inputIntervalo = document.getElementById('inputIntervalo');
// Elemento para mostrar el nombre en la cabecera
const nombreJugadorDisplay = document.getElementById('nombreJugadorDisplay');

// --- ESTADO ---
let patronSeleccionado = 'linea';
let miCartilla = null;
let soyAnfitrion = false;
const PLAYER_ID_KEY = 'bingoPlayerId';
let misMarcas = [];
let temporizadorSorteo = null;
let miNombre = ""; 

// --- VOZ ---
let estaMuteado = false;
let vozSeleccionada = null;
const synth = window.speechSynthesis;

function cambiarPantalla(idSiguientePantalla) {
    document.querySelectorAll('.pantalla').forEach(p => {
        p.classList.remove('activa');
    });
    document.getElementById(idSiguientePantalla).classList.add('activa');
}

// --- CONFIGURACIÓN INICIAL ---
if (typeof configurarBotonesAjustes === 'function') {
    configurarBotonesAjustes();
}

// Evento para el botón de Sonido en el menú de ajustes
const toggleSonido = document.getElementById('toggleSonidoMenu');
if(toggleSonido) {
    toggleSonido.addEventListener('click', () => {
        estaMuteado = !estaMuteado;
        const texto = estaMuteado ? "Sonido: Desactivado 🔇" : "Sonido: Activado 🔊";
        toggleSonido.textContent = texto;
        synth.cancel();
    });
}

// --- FUNCIONES DE VOZ ---
function cargarVoz() {
    const voces = synth.getVoices();
    vozSeleccionada = voces.find(v => v.lang === 'es-ES' && v.localService);
    if (!vozSeleccionada) vozSeleccionada = voces.find(v => v.lang === 'es-US' && v.localService);
    if (!vozSeleccionada) vozSeleccionada = voces.find(v => v.lang.startsWith('es-'));
    if (!vozSeleccionada && voces.length > 0) vozSeleccionada = voces[0];
}
cargarVoz();
if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = cargarVoz;

function hablar(texto) {
    if (estaMuteado || !vozSeleccionada || !synth) return;
    synth.cancel(); 
    const anuncio = new SpeechSynthesisUtterance(texto);
    anuncio.voice = vozSeleccionada;
    anuncio.lang = vozSeleccionada.lang;
    anuncio.rate = 0.95;
    synth.speak(anuncio);
}

// --- EVENTOS DE BOTONES ---
btnCrearPartida.addEventListener('click', () => {
    const nombre = inputNombre.value.trim();
    if (!nombre) { mensajeError.textContent = 'Nombre requerido'; return; }
    miNombre = nombre;
    socket.emit('crearPartida', { nombre: nombre });
});

btnUnirsePartida.addEventListener('click', () => {
    const nombre = inputNombre.value.trim();
    const clave = inputClave.value.trim().toUpperCase();
    if (!nombre || !clave) { mensajeError.textContent = 'Datos requeridos'; return; }
    miNombre = nombre;
    socket.emit('unirsePartida', { nombre: nombre, clave: clave });
});

lobbyPatrones.addEventListener('click', (e) => {
    if (!e.target.classList.contains('patron')) return;
    lobbyPatrones.querySelectorAll('.patron').forEach(btn => btn.classList.remove('seleccionado'));
    e.target.classList.add('seleccionado');
    patronSeleccionado = e.target.dataset.patron;
});

btnEmpezarPartida.addEventListener('click', () => {
    socket.emit('empezarPartida', { patron: patronSeleccionado });
});

// --- LOGICA SORTEO MANUAL Y AUTOMATICO ---

// Sorteo Manual
btnSortearFicha.addEventListener('click', () => {
    if (checkAutomatico.checked) return; 
    btnSortearFicha.disabled = true;
    socket.emit('sortearFicha');
});

// Sorteo Automático (CORREGIDO)
checkAutomatico.addEventListener('change', () => {
    if (checkAutomatico.checked) {
        // 1. Leemos el intervalo
        let intervalo = parseInt(inputIntervalo.value, 10);
        if (isNaN(intervalo) || intervalo < 3) intervalo = 5; // Mínimo 3 segundos por seguridad
        inputIntervalo.value = intervalo;
        inputIntervalo.disabled = true;
        
        const milisegundos = intervalo * 1000;

        // 2. Definimos la función de loop
        const cicloAutomatico = () => {
            // Solo enviamos petición si el botón está habilitado (significa que el servidor ya respondió la anterior)
            if (!btnSortearFicha.disabled) {
                btnSortearFicha.disabled = true;
                socket.emit('sortearFicha');
            }
        };

        // 3. Iniciamos el intervalo
        temporizadorSorteo = setInterval(cicloAutomatico, milisegundos);
        
        // 4. Intentamos tirar la primera inmediatamente
        cicloAutomatico();

    } else {
        // Apagar Automático
        if (temporizadorSorteo) { 
            clearInterval(temporizadorSorteo); 
            temporizadorSorteo = null; 
        }
        inputIntervalo.disabled = false;
        // Importante: Reactivar el botón por si se quedó pasmado
        btnSortearFicha.disabled = false;
    }
});

// Clic en Cartilla
cartillaJugador.addEventListener('click', (e) => {
    const celda = e.target.closest('.celda-3d');
    if (celda && celda.dataset.numero) {
        if (celda.dataset.numero === 'GRATIS') return;
        celda.classList.toggle('marcada');
        
        const numero = parseInt(celda.dataset.numero);
        if (celda.classList.contains('marcada')) {
            if (!misMarcas.includes(numero)) misMarcas.push(numero);
        } else {
            misMarcas = misMarcas.filter(n => n !== numero);
        }
        
        const playerId = localStorage.getItem(PLAYER_ID_KEY);
        if (playerId) localStorage.setItem(`bingoMarks-${playerId}`, JSON.stringify(misMarcas));
    }
});

btnCantarBingo.addEventListener('click', () => {
    socket.emit('cantarBingo');
    btnCantarBingo.disabled = true;
    btnCantarBingo.textContent = 'VERIFICANDO...';
});

btnVolverAlLobby.addEventListener('click', () => {
    modalFinJuego.classList.remove('visible');
    limpiarJuegoLocal();
    cambiarPantalla('pantalla-lobby');
});

// Modificación: Añadimos el parámetro 'borrarMemoria' (por defecto es true)
function limpiarJuegoLocal(borrarMemoria = true) {
    cartillaJugador.innerHTML = '';
    tableroControlAnfitrion.innerHTML = '';
    
    if (historialContenedor) historialContenedor.innerHTML = '<span>Esperando...</span>';
    
    if(fichaActual) fichaActual.textContent = '--';
    if(fichaAnterior) fichaAnterior.textContent = '--';
    
    // SOLO borramos la memoria si el parámetro es true
    if (borrarMemoria) {
        const playerId = localStorage.getItem(PLAYER_ID_KEY);
        if (playerId) localStorage.removeItem(`bingoMarks-${playerId}`);
        misMarcas = [];
    }
    
    if (typeof detenerCronometro === 'function') detenerCronometro();

    if (temporizadorSorteo) { clearInterval(temporizadorSorteo); temporizadorSorteo = null; }
    checkAutomatico.checked = false;
    inputIntervalo.disabled = false;
    
    btnCantarBingo.disabled = false;
    btnCantarBingo.textContent = '¡CANTAR BINGO!';
    btnSortearFicha.disabled = false;
}


// --- SOCKETS ---

socket.on('connect', () => {
    const playerId = localStorage.getItem(PLAYER_ID_KEY);
    if (playerId) {
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

socket.on('errorUnion', (msg) => mensajeError.textContent = msg);

socket.on('actualizarLobby', (datos) => {
    lobbyListaJugadores.innerHTML = '';
    datos.jugadores.forEach(j => {
        const li = document.createElement('li');
        li.textContent = j.nombre;
        if (j.esAnfitrion) li.style.fontWeight = 'bold';
        lobbyListaJugadores.appendChild(li);
    });
});

socket.on('partidaIniciada', (datos) => {
    limpiarJuegoLocal();
    if (typeof iniciarCronometro === 'function') iniciarCronometro();
    
    if (soyAnfitrion) {
        generarTableroAnfitrion();
        cambiarPantalla('pantalla-juego-anfitrion');
    } else {
        jugadorPatron.textContent = datos.patronTexto;
        miCartilla = datos.cartilla;
        if(nombreJugadorDisplay) nombreJugadorDisplay.textContent = miNombre || "Jugador";
        
        if (typeof dibujarCartillaModerna === 'function') {
            dibujarCartillaModerna(datos.cartilla, cartillaJugador);
        }
        
        cambiarPantalla('pantalla-juego-jugador');
        setTimeout(() => hablar(`Iniciando juego. ${datos.patronTexto}`), 1000);
    }
});

// --- EVENTO FICHA ANUNCIADA (AQUÍ ESTÁ LA CLAVE) ---
socket.on('fichaAnunciada', (datos) => {
    const { ficha } = datos;
    
    // 1. Historial (Común para todos)
    if (typeof agregarBolillaHistorial === 'function') {
        agregarBolillaHistorial(ficha, historialContenedor);
    } else {
        // Fallback por si acaso
        const span = document.createElement('span');
        span.textContent = `${ficha.letra}${ficha.numero} `;
        historialContenedor.appendChild(span);
    }

    if (soyAnfitrion) {
        // --- LÓGICA ANFITRIÓN ---
        if(fichaAnterior) fichaAnterior.textContent = fichaActual.textContent;
        if(fichaActual) fichaActual.textContent = ficha.ficha;
        
        // Marcar en tablero de control
        const celda = document.querySelector(`.celda-anfitrion[data-ficha="${ficha.ficha}"]`);
        if (celda) celda.classList.add('marcada');
        
        // ¡IMPORTANTE! Habilitar botón para la siguiente (manual o automática)
        btnSortearFicha.disabled = false;

    } else {
        // --- LÓGICA JUGADOR ---
        const letra = ficha.letra.split('').join(' '); 
        hablar(`${letra} ${ficha.numero}`);

        // AVISO VISUAL (ANIMACIÓN)
        const miCelda = document.querySelector(`.celda-3d[data-numero="${String(ficha.numero)}"]`);
        if (miCelda) {
            miCelda.classList.add('llamada'); // Activa CSS animation
            if (navigator.vibrate) navigator.vibrate(200);
            setTimeout(() => {
                miCelda.classList.remove('llamada');
            }, 3000);
        }
    }
});

socket.on('bingoFalso', () => {
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
    hablar(`¡BINGO! Ganador ${datos.nombreGanador}`);
    modalGanadorTexto.textContent = `El ganador es: ${datos.nombreGanador}`;
    modalFinJuego.classList.add('visible');
    
    if (typeof detenerCronometro === 'function') detenerCronometro();
    if (temporizadorSorteo) clearInterval(temporizadorSorteo);
    
    btnCantarBingo.disabled = true;
    btnSortearFicha.disabled = true;
});

socket.on('errorJuego', (msg) => {
    localStorage.removeItem(PLAYER_ID_KEY);
    alert(msg);
    location.reload();
});

socket.on('forzarLimpieza', () => {
    localStorage.removeItem(PLAYER_ID_KEY);
    pantallaBienvenida.querySelector('.form-unirse').style.display = 'block';
});

socket.on('reconexionExitosa', (datos) => {
    // 1. Recuperar nombre
    if (datos.nombre) {
        miNombre = datos.nombre; 
        if(nombreJugadorDisplay) nombreJugadorDisplay.textContent = datos.nombre; 
    }

    soyAnfitrion = datos.esAnfitrion;
    
    // CORRECCIÓN CLAVE: Pasamos 'false' para que NO borre las marcas de la memoria
    limpiarJuegoLocal(false); 
    
    if (typeof iniciarCronometro === 'function') iniciarCronometro();

    // 2. Restaurar Historial de Bolillas
    datos.fichasHistorial.forEach(ficha => {
        if (typeof agregarBolillaHistorial === 'function') {
            agregarBolillaHistorial(ficha, historialContenedor);
        }
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
        
        // 3. DIBUJAR CARTILLA
        if (typeof dibujarCartillaModerna === 'function') {
            dibujarCartillaModerna(datos.cartilla, cartillaJugador);
        }

        // 4. RESTAURAR MARCAS
        const playerId = localStorage.getItem(PLAYER_ID_KEY);
        // Intentamos leer. Si no hay nada, devuelve array vacío.
        const savedMarks = JSON.parse(localStorage.getItem(`bingoMarks-${playerId}`) || '[]');
        misMarcas = savedMarks; // Sincronizamos la variable local

        // Aplicamos las marcas visualmente
        if (savedMarks.length > 0) {
            const celdas = cartillaJugador.querySelectorAll('.celda-3d');
            celdas.forEach(celda => {
                const numeroCelda = parseInt(celda.dataset.numero);
                // Verificamos si el número está en la lista guardada
                if (savedMarks.includes(numeroCelda)) {
                    celda.classList.add('marcada');
                }
            });
        }
        
        cambiarPantalla('pantalla-juego-jugador');
        setTimeout(() => hablar(`Bienvenido de vuelta ${miNombre}`), 1000);
    }
});

// --- Generación Tablero Anfitrión (Solo visual) ---
function generarTableroAnfitrion() {
    tableroControlAnfitrion.innerHTML = '';
    const letras = ['B', 'I', 'N', 'G', 'O'];
    const rangos = [{ min: 1, max: 15 }, { min: 16, max: 30 }, { min: 31, max: 45 }, { min: 46, max: 60 }, { min: 61, max: 75 }];
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