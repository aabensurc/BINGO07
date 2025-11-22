// 1. Inicia la conexión con el servidor
const socket = io();

// Variables de estado
let datosGanadorTemp = null;
let intervaloCuenta = null;
let listaGanadoresFinal = [];
let patronSeleccionado = 'linea';
let miCartilla = null;
let esperandoCargaFavorito = false;
let soyAnfitrion = false;
let misMarcas = [];
let temporizadorSorteo = null;
let miNombre = "";
const PLAYER_ID_KEY = 'bingoPlayerId';

// --- VOZ ---
let estaMuteado = false;
let vozSeleccionada = null;
const synth = window.speechSynthesis;

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
const btnEmpezarPartida = document.getElementById('btnEmpezarPartida');

// Elementos Anfitrión
const btnSortearFicha = document.getElementById('btnSortearFicha');
const fichaActual = document.getElementById('fichaActual');
const fichaAnterior = document.getElementById('fichaAnterior');
const tableroControlAnfitrion = document.getElementById('grid75'); 
const nombreAnfitrionDisplay = document.getElementById('nombreAnfitrionDisplay');
const displayClaveAnfitrion = document.getElementById('displayClaveAnfitrion'); // ¡NUEVO!
const checkAutomatico = document.getElementById('checkAutomatico');
const inputIntervalo = document.getElementById('inputIntervalo');

// Elementos Híbridos (Panel Desplegable Host)
const btnToggleCartillaHost = document.getElementById('btnToggleCartillaHost');
const panelCartillaHost = document.getElementById('panelCartillaHost');
const cartillaHostContainer = document.getElementById('cartillaHostContainer');
const btnCantarBingoHost = document.getElementById('btnCantarBingoHost');
const hostPatronTexto = document.getElementById('hostPatronTexto');

// Elementos Jugador
const nombreJugadorDisplay = document.getElementById('nombreJugadorDisplay');
const jugadorPatron = document.getElementById('jugadorPatron');
const cartillaJugador = document.getElementById('cartillaJugador');
const btnCantarBingo = document.getElementById('btnCantarBingo');
const historialContenedor = document.getElementById('historialContenedor');
const btnCambiarCarton = document.getElementById('btnCambiarCarton');
const btnCambiarCartonHost = document.getElementById('btnCambiarCartonHost');
const mensajeCambioCarton = document.getElementById('mensajeCambioCarton');
const checkGuardarFavorito = document.getElementById('checkGuardarFavorito');


// Modales
const modalFinJuego = document.getElementById('modalFinJuego');
const btnVolverAlLobby = document.getElementById('btnVolverAlLobby');
const contenedorCartillaGanadora = document.getElementById('contenedorCartillaGanadora');
const contenedorListaGanadores = document.getElementById('contenedorListaGanadores');
const avisoCuentaRegresiva = document.getElementById('avisoCuentaRegresiva');
const segundosRestantes = document.getElementById('segundosRestantes');

// --- FUNCIONES AUXILIARES ---

function sincronizarToggleFavorito() {
    // Verificamos si tenemos cartilla
    if (!miCartilla) return;
    
    const favoritoStr = localStorage.getItem('bingoCartonFavorito');
    let debeEstarPrendido = false;

    if (favoritoStr && JSON.stringify(miCartilla) === favoritoStr) {
        debeEstarPrendido = true;
    }

    // Actualizamos el botón del Jugador (si existe)
    if (checkGuardarFavorito) checkGuardarFavorito.checked = debeEstarPrendido;
    
    // Actualizamos el botón del Anfitrión (si existe)
    if (checkGuardarFavoritoHost) checkGuardarFavoritoHost.checked = debeEstarPrendido;
}

function cambiarPantalla(idSiguientePantalla) {
    document.querySelectorAll('.pantalla').forEach(p => {
        p.classList.remove('activa');
    });
    document.getElementById(idSiguientePantalla).classList.add('activa');
}

function cargarVoz() {
    const voces = synth.getVoices();
    vozSeleccionada = voces.find(v => v.lang === 'es-ES' && v.localService) || 
                      voces.find(v => v.lang.startsWith('es-')) || 
                      voces[0];
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

// Configuración de Ajustes (Color, Sonido)
if (typeof configurarBotonesAjustes === 'function') configurarBotonesAjustes();

const toggleSonido = document.getElementById('toggleSonidoMenu');
const toggleSonidoAnf = document.getElementById('toggleSonidoAnfitrion');

function toggleMute() {
    estaMuteado = !estaMuteado;
    const texto = estaMuteado ? "Sonido: Desactivado 🔇" : "Sonido: Activado 🔊";
    if(toggleSonido) toggleSonido.textContent = texto;
    if(toggleSonidoAnf) toggleSonidoAnf.textContent = texto;
    synth.cancel();
}
if(toggleSonido) toggleSonido.addEventListener('click', toggleMute);
if(toggleSonidoAnf) toggleSonidoAnf.addEventListener('click', toggleMute);


// --- EVENTOS DOM: INICIO Y LOBBY ---

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

// Lógica Selector Patrones (Dropdown)
const dropdown = document.getElementById('dropdownPatrones');
if (dropdown) {
    const trigger = dropdown.querySelector('.select-trigger');
    const textoTrigger = document.getElementById('textoPatronSeleccionado');
    const opciones = dropdown.querySelectorAll('.option');

    trigger.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('open'); });
    opciones.forEach(opcion => {
        opcion.addEventListener('click', () => {
            opciones.forEach(op => op.classList.remove('selected'));
            opcion.classList.add('selected');
            patronSeleccionado = opcion.dataset.value;
            if(textoTrigger) textoTrigger.textContent = opcion.textContent;
            dropdown.classList.remove('open');
        });
    });
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) dropdown.classList.remove('open');
    });
}

btnEmpezarPartida.addEventListener('click', () => {
    socket.emit('empezarPartida', { patron: patronSeleccionado });
});

// --- LÓGICA TOGGLE FAVORITO (VERSIÓN HOST) ---
if (checkGuardarFavoritoHost) {
    checkGuardarFavoritoHost.addEventListener('change', () => {
        if (checkGuardarFavoritoHost.checked) {
            // GUARDAR
            if (miCartilla) {
                localStorage.setItem('bingoCartonFavorito', JSON.stringify(miCartilla));
                hablar("Cartón guardado");
            }
        } else {
            // BORRAR
            localStorage.removeItem('bingoCartonFavorito');
            hablar("Favorito eliminado");
        }
        // Sincronizamos visualmente el otro botón por si acaso
        sincronizarToggleFavorito();
    });
}


// --- EVENTOS DOM: ANFITRIÓN / HÍBRIDO ---

// Panel Desplegable (Acordeón)
if (btnToggleCartillaHost && panelCartillaHost) {
    btnToggleCartillaHost.addEventListener('click', () => {
        panelCartillaHost.classList.toggle('abierto');
    });
}

// Botón Cantar Bingo del Host
if (btnCantarBingoHost) {
    btnCantarBingoHost.addEventListener('click', () => {
        socket.emit('cantarBingo');
        btnCantarBingoHost.disabled = true;
        btnCantarBingoHost.textContent = 'VERIFICANDO...';
    });
}

// Sorteo
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
        
        const cicloAutomatico = () => {
            if (!btnSortearFicha.disabled) {
                btnSortearFicha.disabled = true;
                socket.emit('sortearFicha');
            }
        };
        temporizadorSorteo = setInterval(cicloAutomatico, intervalo * 1000);
        cicloAutomatico();
    } else {
        if (temporizadorSorteo) { clearInterval(temporizadorSorteo); temporizadorSorteo = null; }
        inputIntervalo.disabled = false;
        btnSortearFicha.disabled = false;
    }
});


// --- EVENTOS DOM: JUGADOR (Comunes) ---

// Marcar Cartilla (Función genérica para usar en ambos contenedores)
function manejarClickCartilla(e) {
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
}

// Asignar listener a ambos contenedores si existen
if (cartillaJugador) cartillaJugador.addEventListener('click', manejarClickCartilla);
if (cartillaHostContainer) cartillaHostContainer.addEventListener('click', manejarClickCartilla);

if (btnCantarBingo) {
    btnCantarBingo.addEventListener('click', () => {
        socket.emit('cantarBingo');
        btnCantarBingo.disabled = true;
        btnCantarBingo.textContent = 'VERIFICANDO...';
    });
}

// Botón Cambiar Cartón (Lobby)
if(btnCambiarCarton) {
    btnCambiarCarton.addEventListener('click', () => {
        localStorage.removeItem('bingoCartonFavorito');
        if(checkGuardarFavorito) checkGuardarFavorito.checked = false;
        btnCambiarCarton.disabled = true;
        btnCambiarCarton.textContent = "🔄 Generando...";
        socket.emit('pedirNuevoCarton');
    });
}

// --- LÓGICA CAMBIAR CARTÓN (HOST) ---
if(btnCambiarCartonHost) {
    btnCambiarCartonHost.addEventListener('click', () => {
        // 1. Borrar favorito si existía
        localStorage.removeItem('bingoCartonFavorito');
        if(checkGuardarFavoritoHost) checkGuardarFavoritoHost.checked = false; // Apagar toggle host
        if(checkGuardarFavorito) checkGuardarFavorito.checked = false; // Apagar toggle jugador también

        // 2. Visual
        btnCambiarCartonHost.disabled = true;
        btnCambiarCartonHost.textContent = "🔄 Generando...";
        
        // 3. Pedir al server
        socket.emit('pedirNuevoCarton');
    });
}

// Toggle Guardar Favorito
if (checkGuardarFavorito) {
    checkGuardarFavorito.addEventListener('change', () => {
        if (checkGuardarFavorito.checked) {
            if (miCartilla) {
                localStorage.setItem('bingoCartonFavorito', JSON.stringify(miCartilla));
                hablar("Cartón guardado");
            }
        } else {
            localStorage.removeItem('bingoCartonFavorito');
            hablar("Favorito eliminado");
        }
    });
}


// --- LIMPIEZA Y RESET ---
btnVolverAlLobby.addEventListener('click', () => {
    modalFinJuego.classList.remove('visible');
    datosGanadorTemp = null;
    limpiarJuegoLocal();
    cambiarPantalla('pantalla-lobby');
});

function limpiarJuegoLocal(borrarMemoria = true) {
    // Limpiar visuales
    if(cartillaJugador) cartillaJugador.innerHTML = '';
    if(cartillaHostContainer) cartillaHostContainer.innerHTML = '';
    if(tableroControlAnfitrion) tableroControlAnfitrion.innerHTML = '';
    if(historialContenedor) historialContenedor.innerHTML = '<span>Esperando...</span>';
    
    if(fichaActual) fichaActual.textContent = '--';
    if(fichaAnterior) fichaAnterior.textContent = '--';
    
    // Memorias y Timers
    if (borrarMemoria) {
        const playerId = localStorage.getItem(PLAYER_ID_KEY);
        if (playerId) localStorage.removeItem(`bingoMarks-${playerId}`);
        misMarcas = [];
    }
    if (typeof detenerCronometro === 'function') detenerCronometro();
    if (temporizadorSorteo) { clearInterval(temporizadorSorteo); temporizadorSorteo = null; }
    if (checkAutomatico) checkAutomatico.checked = false;
    if (inputIntervalo) inputIntervalo.disabled = false;
    
    // Restaurar botones
    if(btnCantarBingo) { btnCantarBingo.disabled = false; btnCantarBingo.textContent = '¡CANTAR BINGO!'; }
    if(btnCantarBingoHost) { btnCantarBingoHost.disabled = false; btnCantarBingoHost.textContent = '¡CANTAR BINGO!'; }
    if(btnSortearFicha) btnSortearFicha.disabled = false;
    
    // Resetear Panel Host
    if (panelCartillaHost) panelCartillaHost.classList.remove('abierto');
    
    if (typeof HostUI !== 'undefined' && HostUI.resetearInterfaz) {
        HostUI.resetearInterfaz();
    }
}


// =========================================================
//                 SOCKET.IO EVENTS
// =========================================================

socket.on('connect', () => {
    const playerId = localStorage.getItem(PLAYER_ID_KEY);
    if (playerId) {
        pantallaBienvenida.querySelector('.form-unirse').style.display = 'none';
        socket.emit('quieroReconectar', { playerId: playerId });
    }
});

// --- CREACIÓN Y UNIÓN ---
socket.on('partidaCreada', (datos) => {
    soyAnfitrion = true;
    localStorage.setItem(PLAYER_ID_KEY, datos.playerId);
    lobbyClave.textContent = datos.clave;
    
    // Actualizar código en la nueva cabecera Host
    if(displayClaveAnfitrion) displayClaveAnfitrion.textContent = datos.clave;

    lobbyVistaAnfitrion.style.display = 'flex'; 
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

    // Auto-Cargar Favorito
    const favoritoGuardado = localStorage.getItem('bingoCartonFavorito');
    if (favoritoGuardado) {
        esperandoCargaFavorito = true;
        socket.emit('usarCartonFavorito', JSON.parse(favoritoGuardado));
    } else {
        if(checkGuardarFavorito) checkGuardarFavorito.checked = false;
    }
});

socket.on('errorUnion', (msg) => mensajeError.textContent = msg);

socket.on('actualizarLobby', (datos) => {
    lobbyListaJugadores.innerHTML = '';
    datos.jugadores.forEach(j => {
        const li = document.createElement('li');
        const iconClass = j.esAnfitrion ? 'icono-corona' : 'icono-usuario';
        li.innerHTML = `<div class="icono-jugador-lista ${iconClass}"></div><span>${j.nombre}</span>`;
        if (j.esAnfitrion) li.style.fontWeight = 'bold';
        lobbyListaJugadores.appendChild(li);
    });
});

// --- CAMBIO DE CARTÓN ---
socket.on('cartonCambiado', (nuevaCartilla) => {
    if (nuevaCartilla) miCartilla = nuevaCartilla;

    // Restaurar botón JUGADOR
    setTimeout(() => {
        if(btnCambiarCarton) { 
            btnCambiarCarton.disabled = false; 
            btnCambiarCarton.textContent = "🔄 Cambiar mi Cartón"; 
        }
        // RESTAURAR BOTÓN HOST (NUEVO)
        if(btnCambiarCartonHost) { 
            btnCambiarCartonHost.disabled = false; 
            btnCambiarCartonHost.textContent = "🔄 Cambiar mi Cartón"; 
        }
    }, 1000);

    if (esperandoCargaFavorito) {
        if(mensajeCambioCarton) {
            mensajeCambioCarton.textContent = "¡Favorito cargado!";
            mensajeCambioCarton.style.opacity = 1;
            mensajeCambioCarton.style.color = "#2ecc71";
        }
        hablar("Cartón cargado.");
        esperandoCargaFavorito = false;
    } else {
        if(mensajeCambioCarton) {
            mensajeCambioCarton.textContent = "¡Nuevo cartón listo!";
            mensajeCambioCarton.style.opacity = 1;
            mensajeCambioCarton.style.color = "#f1c40f";
        }
        hablar("Cartón cambiado.");
    }
    if(mensajeCambioCarton) setTimeout(() => mensajeCambioCarton.style.opacity = 0, 3000);
    sincronizarToggleFavorito();
});


// --- INICIO DE JUEGO (HÍBRIDO) ---
socket.on('partidaIniciada', (datos) => {
    limpiarJuegoLocal();
    
    // 1. Guardar datos comunes
    miCartilla = datos.cartilla; // Todos reciben cartilla ahora
    
    // 2. Configurar Pantalla
    if (soyAnfitrion) {
        // Renderizar cosas de host
        if (typeof HostUI !== 'undefined') HostUI.renderizarTableroVacio();
        if(hostPatronTexto) hostPatronTexto.textContent = "Jugando por: " + datos.patronTexto;
        
        // Renderizar cartilla de jugador del host (en el acordeón)
        if (miCartilla && typeof dibujarCartillaModerna === 'function') {
            dibujarCartillaModerna(miCartilla, cartillaHostContainer);
        }
        
        cambiarPantalla('pantalla-juego-anfitrion');
    } else {
        // Renderizar pantalla normal de jugador
        jugadorPatron.textContent = datos.patronTexto;
        if(nombreJugadorDisplay) nombreJugadorDisplay.textContent = miNombre || "Jugador";
        
        if (typeof dibujarCartillaModerna === 'function') {
            dibujarCartillaModerna(miCartilla, cartillaJugador);
        }
        cambiarPantalla('pantalla-juego-jugador');
    }

    if(!datos.esUnionTardia) {
        setTimeout(() => hablar(`Iniciando juego. ${datos.patronTexto}`), 1000);
    }
});


// --- SORTEO DE FICHA (HÍBRIDO) ---
socket.on('fichaAnunciada', (datos) => {
    const { ficha } = datos;
    
    // A. Común: Historial
    if (typeof agregarBolillaHistorial === 'function') {
        agregarBolillaHistorial(ficha, historialContenedor);
    }

    // B. Rol Anfitrión (Tablero control)
    if (soyAnfitrion) {
        const fichaActualTexto = fichaActual.textContent;
        let fichaPreviaObj = null;
        if(fichaActualTexto !== '--') {
            const numPrevio = parseInt(fichaActual.querySelector('.numero-grande')?.textContent || fichaActual.textContent);
            if (!isNaN(numPrevio)) {
                 fichaPreviaObj = { numero: numPrevio, letra: getLetraDeNumero(numPrevio) };
            }
        }
        if (typeof HostUI !== 'undefined') {
            HostUI.marcarFicha(ficha, fichaPreviaObj);
        }
        btnSortearFicha.disabled = false;
        
        // VOZ: El anfitrión habla
        const letra = ficha.letra.split('').join(' '); 
        hablar(`${letra} ${ficha.numero}`);

        // MARCA VISUAL EN CARTILLA HOST (Si la tiene abierta)
        const miCelda = cartillaHostContainer.querySelector(`.celda-3d[data-numero="${String(ficha.numero)}"]`);
        if (miCelda) {
            miCelda.classList.add('llamada');
            setTimeout(() => miCelda.classList.remove('llamada'), 3000);
        }

    } else {
        // C. Rol Jugador Normal
        const letra = ficha.letra.split('').join(' '); 
        hablar(`${letra} ${ficha.numero}`);
        
        const miCelda = cartillaJugador.querySelector(`.celda-3d[data-numero="${String(ficha.numero)}"]`);
        if (miCelda) {
            miCelda.classList.add('llamada'); 
            if (navigator.vibrate) navigator.vibrate(200);
            setTimeout(() => miCelda.classList.remove('llamada'), 3000);
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


// --- ALERTAS Y ERRORES ---
socket.on('bingoFalso', () => {
    hablar('Bingo Falso');
    
    // Feedback en ambos botones por si acaso
    const botones = [btnCantarBingo, btnCantarBingoHost];
    botones.forEach(btn => {
        if(btn) {
            btn.classList.add('bingo-falso');
            btn.textContent = '¡BINGO FALSO!';
            setTimeout(() => {
                btn.classList.remove('bingo-falso');
                btn.disabled = false;
                btn.textContent = '¡CANTAR BINGO!';
            }, 1000);
        }
    });
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


// --- RECONEXIÓN (HÍBRIDA) ---
socket.on('reconexionExitosa', (datos) => {
    // 1. Datos Base
    if (datos.nombre) {
        miNombre = datos.nombre; 
        if(nombreJugadorDisplay) nombreJugadorDisplay.textContent = datos.nombre; 
        if(nombreAnfitrionDisplay) nombreAnfitrionDisplay.textContent = datos.nombre;
    }
    soyAnfitrion = datos.esAnfitrion;
    
    // 2. Limpieza
    limpiarJuegoLocal(false);
    if (typeof iniciarCronometro === 'function') iniciarCronometro();

    // 3. Historial
    datos.fichasHistorial.forEach(ficha => {
        if (typeof agregarBolillaHistorial === 'function') {
            agregarBolillaHistorial(ficha, historialContenedor);
        }
    });

    // 4. Recuperar Marcas de Memoria
    const playerId = localStorage.getItem(PLAYER_ID_KEY);
    const savedMarks = JSON.parse(localStorage.getItem(`bingoMarks-${playerId}`) || '[]');
    misMarcas = savedMarks;

    // 5. Renderizado Híbrido
    if (soyAnfitrion) {
        // A. UI HOST
        if (typeof HostUI !== 'undefined') {
            HostUI.renderizarTableroVacio();
            datos.fichasHistorial.forEach(ficha => HostUI.marcarFicha(ficha));
            
            if (datos.ultimaFicha) HostUI.actualizarBolaVisual(fichaActual, datos.ultimaFicha, false);
            if (datos.anteriorFicha) HostUI.actualizarBolaVisual(fichaAnterior, datos.anteriorFicha, false);
        }
        if(checkAutomatico) checkAutomatico.checked = false;
        if(displayClaveAnfitrion) displayClaveAnfitrion.textContent = lobbyClave.textContent;

        // B. CARTILLA JUGADOR DEL HOST (Si la tiene)
        if (datos.cartilla) {
            miCartilla = datos.cartilla;
            if (typeof dibujarCartillaModerna === 'function') {
                dibujarCartillaModerna(miCartilla, cartillaHostContainer);
            }
            // Re-aplicar marcas en el contenedor del host
            if (savedMarks.length > 0) {
                const celdas = cartillaHostContainer.querySelectorAll('.celda-3d');
                celdas.forEach(celda => {
                    if (savedMarks.includes(parseInt(celda.dataset.numero))) celda.classList.add('marcada');
                });
            }
        }
        cambiarPantalla('pantalla-juego-anfitrion');

    } else {
        // C. JUGADOR NORMAL
        jugadorPatron.textContent = datos.patronTexto;
        miCartilla = datos.cartilla;

        if (typeof dibujarCartillaModerna === 'function') {
            dibujarCartillaModerna(miCartilla, cartillaJugador);
        }
        if (savedMarks.length > 0) {
            const celdas = cartillaJugador.querySelectorAll('.celda-3d');
            celdas.forEach(celda => {
                if (savedMarks.includes(parseInt(celda.dataset.numero))) celda.classList.add('marcada');
            });
        }
        cambiarPantalla('pantalla-juego-jugador');
        sincronizarToggleFavorito(); 
    }
    
    setTimeout(() => hablar(`Bienvenido de vuelta ${miNombre}`), 1000);
});


// --- FIN DE JUEGO Y GANADORES ---

// A) AVISO DE CIERRE
socket.on('avisoCierreBingo', (datos) => {
    const soyElGanador = (miNombre === datos.primerGanador);
    avisoCuentaRegresiva.style.display = 'block';
    
    if (soyElGanador) {
        hablar("Bingo registrado. Esperando a otros jugadores.");
        avisoCuentaRegresiva.style.backgroundColor = "#f1c40f"; 
        avisoCuentaRegresiva.style.color = "#2d3436"; 
        avisoCuentaRegresiva.innerHTML = `¡BINGO REGISTRADO! ESPERANDO... <span id="segundosRestantes">${datos.segundos}</span>s`;
    } else {
        hablar(`¡Atención! ${datos.primerGanador} cantó Bingo. Tienes 10 segundos.`);
        avisoCuentaRegresiva.style.backgroundColor = "#e74c3c"; 
        avisoCuentaRegresiva.style.color = "white";
        avisoCuentaRegresiva.innerHTML = `¡${datos.primerGanador} GANÓ! CIERRE EN: <span id="segundosRestantes">${datos.segundos}</span>s`;
    }

    const spanContador = document.getElementById('segundosRestantes');
    let quedan = datos.segundos;

    if (intervaloCuenta) clearInterval(intervaloCuenta);
    intervaloCuenta = setInterval(() => {
        quedan--;
        if(spanContador) spanContador.textContent = quedan; 
        if (quedan <= 0) {
            clearInterval(intervaloCuenta);
            avisoCuentaRegresiva.style.display = 'none';
        }
    }, 1000);

    if (temporizadorSorteo) clearInterval(temporizadorSorteo);
    btnSortearFicha.disabled = true;
});

// B) CONFIRMACIÓN INDIVIDUAL
socket.on('bingoRegistrado', () => {
    const botones = [btnCantarBingo, btnCantarBingoHost];
    botones.forEach(btn => {
        if(btn) {
            btn.textContent = "¡REGISTRADO!";
            btn.style.backgroundColor = "#f1c40f"; 
            btn.disabled = true;
        }
    });
});

// C) JUEGO TERMINADO
socket.on('juegoTerminado', (datos) => {
    if (intervaloCuenta) clearInterval(intervaloCuenta);
    avisoCuentaRegresiva.style.display = 'none';
    if (typeof detenerCronometro === 'function') detenerCronometro();

    listaGanadoresFinal = datos.listaGanadores;
    const numerosSorteados = datos.numerosSorteados;

    contenedorListaGanadores.innerHTML = ''; 
    
    const titulo = listaGanadoresFinal.length > 1 ? '¡GANADORES!' : '¡GANADOR!';
    const subtitulo = document.querySelector('.modal-subtitulo');
    if (subtitulo) subtitulo.textContent = titulo;

    listaGanadoresFinal.forEach((ganador, index) => {
        const fila = document.createElement('div');
        fila.className = 'fila-ganador';
        const medalla = index === 0 ? '🥇' : (index === 1 ? '🥈' : '🏅');
        fila.innerHTML = `
            <div class="nombre-ganador-lista"><span class="medalla">${medalla}</span> ${ganador.nombre}</div>
            <button class="btn-ojo-mini" data-index="${index}">👁️</button>
        `;
        contenedorListaGanadores.appendChild(fila);
    });

    contenedorListaGanadores.querySelectorAll('.btn-ojo-mini').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const botonClickeado = e.currentTarget;
            const estabaActivo = botonClickeado.classList.contains('activo');

            document.querySelectorAll('.btn-ojo-mini').forEach(b => b.classList.remove('activo'));
            contenedorCartillaGanadora.classList.add('oculto');

            if (!estabaActivo) {
                botonClickeado.classList.add('activo');
                const index = botonClickeado.dataset.index;
                const datosEsteGanador = listaGanadoresFinal[index];
                contenedorCartillaGanadora.classList.remove('oculto');
                dibujarCartillaGanadora(
                    datosEsteGanador.cartilla,
                    numerosSorteados,
                    datosEsteGanador.celdasGanadoras,
                    contenedorCartillaGanadora
                );
            }
        });
    });

    if (listaGanadoresFinal.length > 1) {
        hablar(`Juego terminado. Hubo ${listaGanadoresFinal.length} ganadores.`);
    } else if(listaGanadoresFinal[0]) {
        hablar(`¡Bingo! Ganador ${listaGanadoresFinal[0].nombre}`);
    }

    modalFinJuego.classList.add('visible');
    
    if(btnCantarBingo) btnCantarBingo.disabled = true;
    if(btnCantarBingoHost) btnCantarBingoHost.disabled = true;
});