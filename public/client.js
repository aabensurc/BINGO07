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

// Apuntamos al nuevo ID del grid
const tableroControlAnfitrion = document.getElementById('grid75'); 

const jugadorPatron = document.getElementById('jugadorPatron');
const cartillaJugador = document.getElementById('cartillaJugador');
const btnCantarBingo = document.getElementById('btnCantarBingo');
const historialContenedor = document.getElementById('historialContenedor');
const modalFinJuego = document.getElementById('modalFinJuego');
const modalGanadorTexto = document.getElementById('modalGanadorTexto');
const btnVolverAlLobby = document.getElementById('btnVolverAlLobby');
const checkAutomatico = document.getElementById('checkAutomatico');
const inputIntervalo = document.getElementById('inputIntervalo');
const nombreJugadorDisplay = document.getElementById('nombreJugadorDisplay');
const nombreAnfitrionDisplay = document.getElementById('nombreAnfitrionDisplay');

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

if (typeof configurarBotonesAjustes === 'function') {
    configurarBotonesAjustes();
}

const toggleSonido = document.getElementById('toggleSonidoMenu');
if(toggleSonido) {
    toggleSonido.addEventListener('click', () => {
        estaMuteado = !estaMuteado;
        const texto = estaMuteado ? "Sonido: Desactivado 🔇" : "Sonido: Activado 🔊";
        toggleSonido.textContent = texto;
        synth.cancel();
    });
}
const toggleSonidoAnf = document.getElementById('toggleSonidoAnfitrion');
if(toggleSonidoAnf) {
    toggleSonidoAnf.addEventListener('click', () => {
        estaMuteado = !estaMuteado;
        const texto = estaMuteado ? "Sonido: Desactivado 🔇" : "Sonido: Activado 🔊";
        toggleSonidoAnf.textContent = texto;
        synth.cancel();
    });
}

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

// --- LOGICA SORTEO ---
btnSortearFicha.addEventListener('click', () => {
    if (checkAutomatico.checked) return; 
    btnSortearFicha.disabled = true;
    socket.emit('sortearFicha');
});

checkAutomatico.addEventListener('change', () => {
    if (checkAutomatico.checked) {
        let intervalo = parseInt(inputIntervalo.value, 10);
        if (isNaN(intervalo) || intervalo < 3) intervalo = 5; 
        inputIntervalo.value = intervalo;
        inputIntervalo.disabled = true;
        
        const milisegundos = intervalo * 1000;

        const cicloAutomatico = () => {
            if (!btnSortearFicha.disabled) {
                btnSortearFicha.disabled = true;
                socket.emit('sortearFicha');
            }
        };
        temporizadorSorteo = setInterval(cicloAutomatico, milisegundos);
        cicloAutomatico();
    } else {
        if (temporizadorSorteo) { 
            clearInterval(temporizadorSorteo); 
            temporizadorSorteo = null; 
        }
        inputIntervalo.disabled = false;
        btnSortearFicha.disabled = false;
    }
});

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

function limpiarJuegoLocal(borrarMemoria = true) {
    cartillaJugador.innerHTML = '';
    if (tableroControlAnfitrion) {
        tableroControlAnfitrion.innerHTML = '';
    }
    if (historialContenedor) historialContenedor.innerHTML = '<span>Esperando...</span>';
    
    if(fichaActual) fichaActual.textContent = '--';
    if(fichaAnterior) fichaAnterior.textContent = '--';
    
    if (borrarMemoria) {
        const playerId = localStorage.getItem(PLAYER_ID_KEY);
        if (playerId) localStorage.removeItem(`bingoMarks-${playerId}`);
        misMarcas = [];
    }
    
    if (typeof detenerCronometro === 'function') detenerCronometro();
    if (temporizadorSorteo) { clearInterval(temporizadorSorteo); temporizadorSorteo = null; }
    if (checkAutomatico) checkAutomatico.checked = false;
    if (inputIntervalo) inputIntervalo.disabled = false;
    
    btnCantarBingo.disabled = false;
    btnCantarBingo.textContent = '¡CANTAR BINGO!';
    btnSortearFicha.disabled = false;
    
    if (typeof HostUI !== 'undefined' && HostUI.resetearInterfaz) {
        HostUI.resetearInterfaz();
    }
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
    lobbyVistaAnfitrion.style.display = 'flex'; // Flex para centrar contenido
    lobbyVistaAnfitrion.style.flexDirection = 'column';
    lobbyVistaJugador.style.display = 'none';
    if(nombreAnfitrionDisplay) nombreAnfitrionDisplay.textContent = miNombre || "Anfitrión";
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

// --- ACTUALIZACIÓN DEL LOBBY CON ICONOS (NUEVO) ---
socket.on('actualizarLobby', (datos) => {
    lobbyListaJugadores.innerHTML = '';
    datos.jugadores.forEach(j => {
        const li = document.createElement('li');
        
        // Elegir icono según rol (se definen en lobby-theme.css)
        const iconClass = j.esAnfitrion ? 'icono-corona' : 'icono-usuario';
        
        // Construir HTML con icono y nombre
        li.innerHTML = `
            <div class="icono-jugador-lista ${iconClass}"></div>
            <span>${j.nombre}</span>
        `;
        
        if (j.esAnfitrion) li.style.fontWeight = 'bold';
        lobbyListaJugadores.appendChild(li);
    });
});

socket.on('partidaIniciada', (datos) => {
    limpiarJuegoLocal();
    if (typeof iniciarCronometro === 'function') iniciarCronometro();
    
    if (soyAnfitrion) {
        if (typeof HostUI !== 'undefined') {
            HostUI.renderizarTableroVacio();
        }
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

socket.on('fichaAnunciada', (datos) => {
    const { ficha } = datos;
    if (typeof agregarBolillaHistorial === 'function') {
        agregarBolillaHistorial(ficha, historialContenedor);
    }

    if (soyAnfitrion) {
        const fichaActualTexto = fichaActual.textContent;
        let fichaPreviaObj = null;
        
        if(fichaActualTexto !== '--') {
            // Intentar leer del DOM si es posible
            const numPrevio = parseInt(fichaActual.querySelector('.numero-grande')?.textContent || fichaActual.textContent);
            if (!isNaN(numPrevio)) {
                 fichaPreviaObj = { numero: numPrevio, letra: getLetraDeNumero(numPrevio) };
            }
        }

        if (typeof HostUI !== 'undefined') {
            HostUI.marcarFicha(ficha, fichaPreviaObj);
        }
        btnSortearFicha.disabled = false;
    } else {
        const letra = ficha.letra.split('').join(' '); 
        hablar(`${letra} ${ficha.numero}`);
        const miCelda = document.querySelector(`.celda-3d[data-numero="${String(ficha.numero)}"]`);
        if (miCelda) {
            miCelda.classList.add('llamada'); 
            if (navigator.vibrate) navigator.vibrate(200);
            setTimeout(() => {
                miCelda.classList.remove('llamada');
            }, 3000);
        }
    }
});

function getLetraDeNumero(num) {
    if(num <= 15) return 'B';
    if(num <= 30) return 'I';
    if(num <= 45) return 'N';
    if(num <= 60) return 'G';
    return 'O';
}

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
    if (datos.nombre) {
        miNombre = datos.nombre; 
        if(nombreJugadorDisplay) nombreJugadorDisplay.textContent = datos.nombre; 
        if(nombreAnfitrionDisplay) nombreAnfitrionDisplay.textContent = datos.nombre;
    }
    soyAnfitrion = datos.esAnfitrion;
    limpiarJuegoLocal(false); 
    if (typeof iniciarCronometro === 'function') iniciarCronometro();

    datos.fichasHistorial.forEach(ficha => {
        if (typeof agregarBolillaHistorial === 'function') {
            agregarBolillaHistorial(ficha, historialContenedor);
        }
    });

    if (soyAnfitrion) {
        if (typeof HostUI !== 'undefined') {
            HostUI.renderizarTableroVacio();
            datos.fichasHistorial.forEach(ficha => {
                HostUI.marcarFicha(ficha); 
            });
            if (datos.ultimaFicha) {
                 HostUI.actualizarBolaVisual(fichaActual, datos.ultimaFicha, false);
            }
            if (datos.anteriorFicha) {
                 HostUI.actualizarBolaVisual(fichaAnterior, datos.anteriorFicha, false);
            }
        }
        checkAutomatico.checked = false;
        cambiarPantalla('pantalla-juego-anfitrion');
    } else {
        jugadorPatron.textContent = datos.patronTexto;
        miCartilla = datos.cartilla;
        if (typeof dibujarCartillaModerna === 'function') {
            dibujarCartillaModerna(datos.cartilla, cartillaJugador);
        }
        const playerId = localStorage.getItem(PLAYER_ID_KEY);
        const savedMarks = JSON.parse(localStorage.getItem(`bingoMarks-${playerId}`) || '[]');
        misMarcas = savedMarks; 
        if (savedMarks.length > 0) {
            const celdas = cartillaJugador.querySelectorAll('.celda-3d');
            celdas.forEach(celda => {
                const numeroCelda = parseInt(celda.dataset.numero);
                if (savedMarks.includes(numeroCelda)) {
                    celda.classList.add('marcada');
                }
            });
        }
        cambiarPantalla('pantalla-juego-jugador');
        setTimeout(() => hablar(`Bienvenido de vuelta ${miNombre}`), 1000);
    }
});