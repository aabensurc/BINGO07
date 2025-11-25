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

// NUEVA VARIABLE DE ESTADO GLOBAL PARA EL NOMBRE AUTENTICADO
let usuarioLogueadoNombre = "";

// NUEVOS ELEMENTOS DE LOGIN
const tabInvitado = document.getElementById('tabInvitado');
const tabUsuario = document.getElementById('tabUsuario');
const formInvitado = document.getElementById('formInvitado');
const formUsuario = document.getElementById('formUsuario');
const btnLoginUsuario = document.getElementById('btnLoginUsuario');
const inputUsuario = document.getElementById('inputUsuario');
const inputContrasena = document.getElementById('inputContrasena');
const errorFlotanteUsuario = document.getElementById('errorFlotanteUsuario');
const errorFlotanteInvitado = document.getElementById('errorFlotanteInvitado');
const mensajeBienvenida = document.getElementById('mensajeBienvenida');
const bienvenidaNombre = document.getElementById('bienvenidaNombre');
const tabsContainer = document.getElementById('tabsContainer');

const btnLogout = document.getElementById('btnLogout');

// --- VOZ Y SONIDO (Variables Globales) ---
let vozMuteada = false;
let efectosMuteados = false;
let vozSeleccionada = null;
const synth = window.speechSynthesis;

// Elementos Checkbox Sonido
const checkVozJugador = document.getElementById('checkVozJugador');
const checkEfectosJugador = document.getElementById('checkEfectosJugador');
const checkVozAnfitrion = document.getElementById('checkVozAnfitrion');
const checkEfectosAnfitrion = document.getElementById('checkEfectosAnfitrion');

// --- ELEMENTOS DOM ---
const pantallaBienvenida = document.getElementById('pantalla-bienvenida');
const pantallaLobby = document.getElementById('pantalla-lobby');
const pantallaJuegoAnfitrion = document.getElementById('pantalla-juego-anfitrion');
const pantallaJuegoJugador = document.getElementById('pantalla-juego-jugador');

const inputNombre = document.getElementById('inputNombre');
const btnCrearPartida = document.getElementById('btnCrearPartida');
const inputClave = document.getElementById('inputClave');
const btnUnirsePartida = document.getElementById('btnUnirsePartida'); // <--- ¡ASEGÚRATE DE QUE ESTO EXISTA!
const mensajeError = document.getElementById('mensajeError');

const lobbyClave = document.getElementById('lobbyClave');
const lobbyListaJugadores = document.getElementById('lobbyListaJugadores');
const lobbyVistaAnfitrion = document.getElementById('lobby-vista-anfitrion');
const lobbyVistaJugador = document.getElementById('lobby-vista-jugador');
const btnEmpezarPartida = document.getElementById('btnEmpezarPartida');

// Elementos Anfitrión
const btnSalirPartidaHost = document.getElementById('btnSalirPartidaHost');
const btnSortearFicha = document.getElementById('btnSortearFicha');
const fichaActual = document.getElementById('fichaActual');
const fichaAnterior = document.getElementById('fichaAnterior');
const tableroControlAnfitrion = document.getElementById('grid75'); 
const nombreAnfitrionDisplay = document.getElementById('nombreAnfitrionDisplay');
const displayClaveAnfitrion = document.getElementById('displayClaveAnfitrion'); // ¡NUEVO!
const displayClaveJugador = document.getElementById('displayClaveJugador');
const checkAutomatico = document.getElementById('checkAutomatico');
const inputIntervalo = document.getElementById('inputIntervalo');
const btnNuevaRondaHost = document.getElementById('btnNuevaRondaHost');

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
const btnSalirLobby = document.getElementById('btnSalirLobby');
const btnSalirPartidaJugador = document.getElementById('btnSalirPartidaJugador');
const contenedorCartillaGanadora = document.getElementById('contenedorCartillaGanadora');
const contenedorListaGanadores = document.getElementById('contenedorListaGanadores');
const avisoCuentaRegresiva = document.getElementById('avisoCuentaRegresiva');
const segundosRestantes = document.getElementById('segundosRestantes');

// Elementos Chat
const chatLogLobby = document.getElementById('chatLogLobby');
const chatInputLobby = document.getElementById('chatInputLobby');
const btnEnviarLobby = document.getElementById('btnEnviarLobby');

const chatLogJugador = document.getElementById('chatLogJugador');
const chatInputJugador = document.getElementById('chatInputJugador');
const btnEnviarJugador = document.getElementById('btnEnviarJugador');

const chatLogHost = document.getElementById('chatLogHost');
const chatInputHost = document.getElementById('chatInputHost');
const btnEnviarHost = document.getElementById('btnEnviarHost');

const inputMontoApuesta = document.getElementById('inputMontoApuesta');
const displaySaldoJugador = document.getElementById('displaySaldoJugador');
const displaySaldoAnfitrion = document.getElementById('displaySaldoAnfitrion');



// --- FUNCIONES AUXILIARES ---

function mostrarMensajeChat(logElement, data) {
    if (!logElement) return;

    const div = document.createElement('div');
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    let html = `<span style="opacity:0.6;">[${time}] </span>`;

    if (data.type === 'usuario') {
        html += `<span class="msg-usuario">${data.nombre}:</span> <span class="msg-texto">${data.msg}</span>`;
    } else if (data.type === 'evento') {
        html += `<span class="msg-evento">${data.msg}</span>`;
    } else if (data.type === 'alerta') {
        html += `<span class="msg-sistema">${data.msg}</span>`;
    } else {
        html += `<span class="msg-sistema">${data.msg}</span>`;
    }

    div.innerHTML = html;
    logElement.appendChild(div);
    
    // Auto-scroll al final
    logElement.scrollTop = logElement.scrollHeight;
}

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

// --- LÓGICA DE SALIDA MANUAL ---

function salirDelJuegoTotalmente() {
    if (confirm("¿Seguro que quieres salir?")) {
        // 1. Avisar al servidor para que me borre de la lista
        socket.emit('abandonarPartida');
        
        // 2. Borrar mis credenciales locales
        localStorage.removeItem(PLAYER_ID_KEY);
        // Opcional: Borrar también marcas y favoritos si quieres limpieza total
        // localStorage.removeItem('bingoCartonFavorito'); 
        
        // 3. Recargar página para ir al inicio
        location.reload();
    }
}

// Botón X en el Lobby
if (btnSalirLobby) {
    btnSalirLobby.addEventListener('click', salirDelJuegoTotalmente);
}

// Opción Roja en el Menú de Juego
if (btnSalirPartidaJugador) {
    btnSalirPartidaJugador.addEventListener('click', () => {
        // Ocultar menú primero
        document.getElementById('menuAjustes').classList.remove('visible');
        salirDelJuegoTotalmente();
    });
}

if (btnSalirPartidaHost) {
    btnSalirPartidaHost.addEventListener('click', () => {
        // 1. Ocultar el menú visualmente
        const menu = document.getElementById('menuAjustesAnfitrion');
        if (menu) menu.classList.remove('visible');

        // 2. Confirmación de seguridad
        if (confirm("⚠️ ¿Estás seguro de cerrar la sala?\n\nEsto terminará la partida para TODOS los jugadores.")) {
            
            // 3. Avisar al servidor (El server borrará la sala y sacará a todos)
            socket.emit('abandonarPartida');
            
            // 4. Limpieza local
            localStorage.removeItem(PLAYER_ID_KEY);
            
            // 5. Recargar para volver al inicio
            location.reload();
        }
    });
}

function cambiarPantalla(idSiguientePantalla) {
    document.querySelectorAll('.pantalla').forEach(p => {
        p.classList.remove('activa');
    });
    document.getElementById(idSiguientePantalla).classList.add('activa');
}

function cargarVoz() {
    const voces = synth.getVoices();
    
    // 1. Buscamos Español Estados Unidos (Preferido en Android Latam)
    vozSeleccionada = voces.find(v => v.lang === 'es-US' || v.lang === 'es_US');
    
    // 2. Si no, Español España
    if (!vozSeleccionada) vozSeleccionada = voces.find(v => v.lang === 'es-ES' || v.lang === 'es_ES');
    
    // 3. Si no, cualquier español
    if (!vozSeleccionada) vozSeleccionada = voces.find(v => v.lang.startsWith('es'));

    // Si sigue siendo null, no pasa nada. 
    // La nueva función 'hablar' se encargará de usar el default del sistema.
}

cargarVoz();
if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = cargarVoz;

function hablar(texto) {
    // CAMBIO: Quitamos "!vozSeleccionada" del bloqueo.
    // Ahora permitimos que hable aunque no haya encontrado una voz específica.
    if (vozMuteada || !synth) return;
    
    synth.cancel(); 
    const anuncio = new SpeechSynthesisUtterance(texto);
    
    if (vozSeleccionada) {
        // ESCENARIO IDEAL: Encontramos la voz perfecta (US o ES)
        anuncio.voice = vozSeleccionada;
        anuncio.lang = vozSeleccionada.lang;
    } else {
        // ESCENARIO PLAN B: No encontramos la voz en la lista,
        // pero forzamos al navegador a hablar en Español Estándar.
        // Esto usará la configuración por defecto de tu Android (que ya pusiste en Español).
        anuncio.lang = 'es-ES'; 
    }

    anuncio.rate = 0.95;
    synth.speak(anuncio);
}

// Configuración de Ajustes (Color, Sonido)
if (typeof configurarBotonesAjustes === 'function') configurarBotonesAjustes();





function cargarPreferenciasSonido() {
    // 1. Leer de LocalStorage (Si no existe, asume 'false' o sea Activado)
    const savedVoz = localStorage.getItem('bingoVozMute');
    const savedFX = localStorage.getItem('bingoFXMute');

    vozMuteada = (savedVoz === 'true');
    efectosMuteados = (savedFX === 'true');

    // 2. Aplicar a la lógica
    if (typeof SoundFX !== 'undefined') {
        SoundFX.setMute(efectosMuteados);
    }

    // 3. Sincronizar UI visualmente (Checkboxes)
    // Nota: Los checkboxes dicen "Activado", así que si está Muteado, el check va en false.
    const vozActivada = !vozMuteada;
    const fxActivado = !efectosMuteados;

    if(checkVozJugador) checkVozJugador.checked = vozActivada;
    if(checkEfectosJugador) checkEfectosJugador.checked = fxActivado;
    
    if(checkVozAnfitrion) checkVozAnfitrion.checked = vozActivada;
    if(checkEfectosAnfitrion) checkEfectosAnfitrion.checked = fxActivado;
}

// Guardar cambios
function actualizarPreferencias(tipo, estadoActivado) {
    if (tipo === 'voz') {
        vozMuteada = !estadoActivado;
        localStorage.setItem('bingoVozMute', vozMuteada);
        // Sincronizar el otro checkbox gemelo
        if(checkVozJugador) checkVozJugador.checked = estadoActivado;
        if(checkVozAnfitrion) checkVozAnfitrion.checked = estadoActivado;
        // Cancelar voz actual si se silencia
        if(vozMuteada) synth.cancel();
    } 
    else if (tipo === 'fx') {
        efectosMuteados = !estadoActivado;
        localStorage.setItem('bingoFXMute', efectosMuteados);
        if (typeof SoundFX !== 'undefined') SoundFX.setMute(efectosMuteados);
        
        // Sincronizar el otro checkbox gemelo
        if(checkEfectosJugador) checkEfectosJugador.checked = estadoActivado;
        if(checkEfectosAnfitrion) checkEfectosAnfitrion.checked = estadoActivado;
    }
}

// LLAMAR AL INICIO
cargarPreferenciasSonido();


// --- EVENTOS DOM: INICIO Y LOBBY ---

// client.js (REEMPLAZO COMPLETO: Evento btnCrearPartida)

btnCrearPartida.addEventListener('click', () => {
    
    // 1. Obtener el nombre correcto: usa el nombre autenticado si existe, sino usa el input (que es lo que usaba antes del login)
    // El nombre a usar SIEMPRE debe estar en la variable global 'miNombre' o 'usuarioLogueadoNombre'
    const nombreAUsar = usuarioLogueadoNombre || inputNombre.value.trim();

    // 2. Validación de Nombre (necesaria incluso para crear partida)
    if (nombreAUsar.length < 2) { 
        // Si no está logueado, intentará mostrar el error en el flotante de invitado.
        // Si está logueado, el inputNombre está oculto, pero el chequeo es el mismo.
        mostrarErrorFlotante(errorFlotanteInvitado || mensajeError, 'Debes ingresar un nombre para crear la partida.');
        return; 
    }
    
    // 3. Establecer el nombre global y emitir
    miNombre = nombreAUsar; 
    
    // El mensajeError original es el que no encuentra el script, por eso debemos usar el flotante.
    // Aunque no está en el DOM, tu `client.js` original tenía la línea:
    // if (!nombre) { mensajeError.textContent = 'Nombre requerido'; return; }
    // Lo corregimos para usar el nuevo sistema de errores flotantes:
    if (errorFlotanteInvitado) mostrarErrorFlotante(errorFlotanteInvitado, '', true); // Limpiar error flotante

    socket.emit('crearPartida', { nombre: miNombre });
});

// --- Evento: UNIRSE A LA PARTIDA (MODIFICADO para soportar Login) ---
btnUnirsePartida.addEventListener('click', () => {
    
    // Habilitar temporalmente los campos por si estaban desactivados
    btnUnirsePartida.disabled = false;
    inputClave.disabled = false; 

    // 1. Lógica de selección de nombre 
    const nombreAUsar = usuarioLogueadoNombre || inputNombre.value.trim();
    const clave = inputClave.value.trim().toUpperCase();

    // Resetear el error
    if(errorFlotanteInvitado) mostrarErrorFlotante(errorFlotanteInvitado, '', true);

    // 2. Validación de Campos
    if (nombreAUsar.length < 2) {
        if(errorFlotanteInvitado) {
             mostrarErrorFlotante(errorFlotanteInvitado, 'Ingresa un nombre válido (mín. 2 letras).');
        } else {
             // Fallback si errorFlotanteInvitado no existe (para evitar que se bloquee)
             alert('Ingresa un nombre válido (mín. 2 letras).'); 
        }
        return;
    }
    if (clave.length !== 4) {
        if(errorFlotanteInvitado) {
            mostrarErrorFlotante(errorFlotanteInvitado, 'La clave de la sala debe ser de 4 letras.');
        } else {
            alert('La clave de la sala debe ser de 4 letras.');
        }
        return;
    }

    // 3. Establecer el nombre global y obtener o generar el PlayerId
    miNombre = nombreAUsar; 
    let playerId = localStorage.getItem(PLAYER_ID_KEY);
    
    // Generar un ID si es invitado nuevo
    if (!playerId) {
        playerId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
        localStorage.setItem(PLAYER_ID_KEY, playerId);
    }
    

    // 4. Emitir el evento de unión
    socket.emit('unirsePartida', { // <--- CORRECCIÓN IMPORTANTE: el server.js espera 'unirsePartida' o 'unirseSala'?
                                  // Según server.js, espera 'unirsePartida'
        nombre: miNombre,
        clave: clave,
        playerId: playerId
    });
    
    // 5. Bloquear UI mientras se conecta
    btnUnirsePartida.disabled = true;
    inputClave.disabled = true;
    
});

// --- EVENTOS DE SONIDO (NUEVO) ---
if(checkVozJugador) {
    checkVozJugador.addEventListener('change', (e) => actualizarPreferencias('voz', e.target.checked));
}
if(checkEfectosJugador) {
    checkEfectosJugador.addEventListener('change', (e) => actualizarPreferencias('fx', e.target.checked));
}
if(checkVozAnfitrion) {
    checkVozAnfitrion.addEventListener('change', (e) => actualizarPreferencias('voz', e.target.checked));
}
if(checkEfectosAnfitrion) {
    checkEfectosAnfitrion.addEventListener('change', (e) => actualizarPreferencias('fx', e.target.checked));
}

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
    const monto = inputMontoApuesta ? inputMontoApuesta.value : 0;
    socket.emit('empezarPartida', { 
        patron: patronSeleccionado,
        montoApuesta: monto 
    });
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

// Helper para enviar mensaje y limpiar input
function enviarMensaje(inputElement, logElement) {
    const mensaje = inputElement.value.trim();
    if (!mensaje || !lobbyClave.textContent) return;

    socket.emit('sendMessage', {
        mensaje: mensaje,
        clave: lobbyClave.textContent,
        nombre: miNombre
    });
    inputElement.value = '';
    
    // Inicializar AudioContext en el primer click (por política del navegador)
    if (typeof SoundFX !== 'undefined') SoundFX.init();
}

// Conectar botones
if (btnEnviarLobby) btnEnviarLobby.addEventListener('click', () => enviarMensaje(chatInputLobby, chatLogLobby));
if (chatInputLobby) chatInputLobby.addEventListener('keydown', (e) => { if (e.key === 'Enter') enviarMensaje(chatInputLobby, chatLogLobby); });

if (btnEnviarJugador) btnEnviarJugador.addEventListener('click', () => enviarMensaje(chatInputJugador, chatLogJugador));
if (chatInputJugador) chatInputJugador.addEventListener('keydown', (e) => { if (e.key === 'Enter') enviarMensaje(chatInputJugador, chatLogJugador); });

if (btnEnviarHost) btnEnviarHost.addEventListener('click', () => enviarMensaje(chatInputHost, chatLogHost));
if (chatInputHost) chatInputHost.addEventListener('keydown', (e) => { if (e.key === 'Enter') enviarMensaje(chatInputHost, chatLogHost); });

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
            SoundFX.playPop(); // <--- AQUÍ
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


/**
 * Muestra el error en el elemento HTML especificado.
 * @param {HTMLElement} elementoError - El div de error a mostrar.
 * @param {string} mensaje - El mensaje de error.
 * @param {boolean} limpiar - Si es true, solo limpia el error (para reset).
 */
function mostrarErrorFlotante(elementoError, mensaje, limpiar = false) {
    if (limpiar || mensaje === '') {
        elementoError.textContent = '';
        elementoError.classList.add('oculto');
        return;
    }
    
    elementoError.textContent = mensaje;
    elementoError.classList.remove('oculto');

    // Ocultar después de 5 segundos
    setTimeout(() => {
        mostrarErrorFlotante(elementoError, '', true);
    }, 5000);
}

/**
 * Maneja el cambio entre el formulario de Invitado y Usuario.
 * @param {string} modo - 'invitado' o 'usuario'.
 */
function cambiarModoLogin(modo) {
    const inputClaveEl = document.getElementById('inputClave');
    const btnUnirseEl = document.getElementById('btnUnirsePartida');
    
    if (modo === 'invitado') {
        formInvitado.classList.remove('oculto');
        formUsuario.classList.add('oculto');
        tabInvitado.classList.add('activo');
        tabUsuario.classList.remove('activo');
        if(errorFlotanteUsuario) mostrarErrorFlotante(errorFlotanteUsuario, '', true);
        
        // MOSTRAR CAMPOS DE JUEGO
        if(inputClaveEl) inputClaveEl.classList.remove('oculto');
        if(btnUnirseEl) btnUnirseEl.classList.remove('oculto');
        
    } else {
        formInvitado.classList.add('oculto');
        formUsuario.classList.remove('oculto');
        tabInvitado.classList.remove('activo');
        tabUsuario.classList.add('activo');
        if(errorFlotanteInvitado) mostrarErrorFlotante(errorFlotanteInvitado, '', true);

        // OCULTAR CAMPOS DE JUEGO (Mientras se loguea)
        if(inputClaveEl) inputClaveEl.classList.add('oculto');
        if(btnUnirseEl) btnUnirseEl.classList.add('oculto');
    }
    
    // Resetear UI
    if(mensajeBienvenida) mensajeBienvenida.classList.add('oculto');
    if(inputNombre) inputNombre.classList.remove('oculto'); 
    if(tabsContainer) tabsContainer.classList.remove('oculto');
}


/**
 * Transforma la interfaz de Bienvenida a la vista post-login (solo código de sala).
 * @param {string} nombre - Nombre del usuario logueado.
 */
function transformarAPostLogin(nombre) {
    // 1. OCULTAR ELEMENTOS DE AUTENTICACIÓN
    if(tabsContainer) tabsContainer.classList.add('oculto');
    if(formInvitado) formInvitado.classList.add('oculto');
    if(formUsuario) formUsuario.classList.add('oculto');

    // 2. MOSTRAR EL MENSAJE DE BIENVENIDA
    if(mensajeBienvenida) {
        mensajeBienvenida.classList.remove('oculto');
        bienvenidaNombre.textContent = `¡Bienvenido de vuelta, ${nombre}! 👋`;
    }
    
    // 3. MOSTRAR INPUT DE SALA Y BOTÓN DE UNIRSE
    const inputClaveEl = document.getElementById('inputClave');
    const btnUnirseEl = document.getElementById('btnUnirsePartida');
    
    if(inputClaveEl) { inputClaveEl.classList.remove('oculto'); inputClaveEl.disabled = false; }
    if(btnUnirseEl) { btnUnirseEl.classList.remove('oculto'); btnUnirseEl.disabled = false; }

    // 4. CONTROL DE BOTONES INFERIORES
    if(btnCrearPartida) btnCrearPartida.style.display = 'block'; 
    if(btnConexionFavorito) btnConexionFavorito.style.display = 'block';

    // 5. NUEVO: MOSTRAR BOTÓN DE LOGOUT
    if(btnLogout) btnLogout.classList.remove('oculto');
}


const btnConexionFavorito = document.getElementById('btnConexionFavorito');

if (btnConexionFavorito) {
    btnConexionFavorito.addEventListener('click', () => {
        const playerId = localStorage.getItem(PLAYER_ID_KEY);

        if (playerId) {
            console.log("Reconexión manual forzada.");
            // Usamos la misma lógica del on('connect')
            if(formInvitado) formInvitado.classList.add('oculto');
            if(tabsContainer) tabsContainer.classList.add('oculto');
            if(mensajeBienvenida) {
                mensajeBienvenida.classList.remove('oculto');
                bienvenidaNombre.textContent = "Intentando reconexión...";
            }
            socket.emit('quieroReconectar', { playerId: playerId });
        } else {
            alert("No hay datos de partida guardados en tu navegador.");
        }
    });
}

/**
 * Configura los Event Listeners para el Login (Tabs y Botones)
 */
function setupLoginListeners() {
    // 1. Manejo de Pestañas
    if (tabInvitado) tabInvitado.addEventListener('click', () => cambiarModoLogin('invitado'));
    if (tabUsuario) tabUsuario.addEventListener('click', () => cambiarModoLogin('usuario'));

    // 2. Botón de Iniciar Sesión (Usuario)
    if (btnLoginUsuario) {
        btnLoginUsuario.addEventListener('click', () => {
            const usuario = inputUsuario.value.trim();
            const contrasena = inputContrasena.value.trim();

            mostrarErrorFlotante(errorFlotanteUsuario, '', true); // Limpiar errores

            if (usuario === '' || contrasena === '') {
                mostrarErrorFlotante(errorFlotanteUsuario, 'Debes ingresar usuario y contraseña.');
                return;
            }

            // Emitir el evento al servidor
            socket.emit('loginUsuario', { usuario, contrasena });

            // Bloquear temporalmente el botón
            btnLoginUsuario.disabled = true;
            btnLoginUsuario.textContent = 'Iniciando...';
        });
    }
}

// Llamar a la función de configuración de listeners
setupLoginListeners();


// client.js - LÓGICA DE CERRAR SESIÓN
if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        // 1. Limpiar variables de sesión y memoria local
        usuarioLogueadoNombre = "";
        miNombre = "";
        localStorage.removeItem('bingoUsuarioNombre'); // <--- BORRAR LA SESIÓN
        // Opcional: localStorage.removeItem(PLAYER_ID_KEY); 

        // 2. Ocultar elementos de usuario logueado
        if(mensajeBienvenida) mensajeBienvenida.classList.add('oculto');
        btnLogout.classList.add('oculto');

        // 3. Restaurar la vista de pestañas
        if(tabsContainer) tabsContainer.classList.remove('oculto');
        
        // 4. Forzar vista de invitado
        cambiarModoLogin('invitado');
    });
}


// --- LIMPIEZA Y RESET ---
btnVolverAlLobby.addEventListener('click', () => {
    modalFinJuego.classList.remove('visible');
    datosGanadorTemp = null;
    limpiarJuegoLocal();
    cambiarPantalla('pantalla-lobby');
});

// 1. Evento Click del Anfitrión
if (btnNuevaRondaHost) {
    btnNuevaRondaHost.addEventListener('click', () => {
        // Deshabilitar para evitar doble clic
        btnNuevaRondaHost.disabled = true;
        btnNuevaRondaHost.textContent = "Reiniciando...";
        // Mandar orden al servidor
        socket.emit('forzarReinicioLobby');
    });
}

// 2. Respuesta Global (Todos obedecen esta orden)
socket.on('reiniciarLobby', () => {
    // Cerrar modal
    modalFinJuego.classList.remove('visible');
    
    // Restaurar botón del host para la próxima
    if(btnNuevaRondaHost) {
        btnNuevaRondaHost.disabled = false;
        btnNuevaRondaHost.textContent = "👑 Nueva Ronda (Todos)";
    }

    // Limpieza y cambio de pantalla
    datosGanadorTemp = null;
    limpiarJuegoLocal();
    
    // Si soy anfitrión, restauro mi vista
    if (soyAnfitrion) {
        lobbyVistaAnfitrion.style.display = 'flex';
        lobbyVistaJugador.style.display = 'none';
    } else {
        // Jugador
        lobbyVistaAnfitrion.style.display = 'none';
        lobbyVistaJugador.style.display = 'block';
    }
    
    cambiarPantalla('pantalla-lobby');
    hablar("Volviendo al lobby.");
});


// NUEVO: Manejo de Login Exitoso
socket.on('loginExitoso', (datos) => {
    // A. Restaurar botón
    btnLoginUsuario.disabled = false;
    btnLoginUsuario.textContent = 'Iniciar Sesión';

    // B. Almacenar el nombre y el playerId
    miNombre = datos.nombre; 
    usuarioLogueadoNombre = datos.nombre; // Guardamos el nombre autenticado

    // --- NUEVO: GUARDAR PERSISTENCIA DE SESIÓN ---
    localStorage.setItem('bingoUsuarioNombre', datos.nombre); 
    localStorage.setItem(PLAYER_ID_KEY, datos.playerId);

    // C. Transformar la UI
    transformarAPostLogin(datos.nombre);

    // D. Mostrar éxito temporal
    mostrarErrorFlotante(errorFlotanteUsuario, `¡Login exitoso! Bienvenido, ${datos.nombre}.`);

});

// NUEVO: Manejo de Error de Login
socket.on('loginError', (mensaje) => {
    // A. Restaurar botón
    btnLoginUsuario.disabled = false;
    btnLoginUsuario.textContent = 'Iniciar Sesión';

    // B. Mostrar error
    mostrarErrorFlotante(errorFlotanteUsuario, mensaje);
});

function limpiarJuegoLocal(borrarMemoria = true) {
    // Limpiar visuales
    if(cartillaJugador) cartillaJugador.innerHTML = '';
    if(cartillaHostContainer) cartillaHostContainer.innerHTML = '';
    if(tableroControlAnfitrion) tableroControlAnfitrion.innerHTML = '';
    if(historialContenedor) historialContenedor.innerHTML = '<span>Esperando...</span>';
    
    // --- NUEVO: LIMPIAR LOGS DE CHAT ---
    if(chatLogLobby) chatLogLobby.innerHTML = '';
    if(chatLogJugador) chatLogJugador.innerHTML = '';
    if(chatLogHost) chatLogHost.innerHTML = '';
    
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

// client.js - CONEXIÓN INICIAL Y RECONEXIÓN
socket.on('connect', () => {
    const playerId = localStorage.getItem(PLAYER_ID_KEY);
    const nombreGuardado = localStorage.getItem('bingoUsuarioNombre'); // <--- RECUPERAR NOMBRE

    // ESCENARIO A: El usuario ya estaba logueado (tiene nombre guardado)
    if (nombreGuardado) {
        console.log(`Sesión restaurada para: ${nombreGuardado}`);
        
        // 1. Restaurar variables globales
        miNombre = nombreGuardado;
        usuarioLogueadoNombre = nombreGuardado;

        // 2. Restaurar la interfaz de usuario logueado INMEDIATAMENTE
        transformarAPostLogin(nombreGuardado);
        
        // 3. Si además tiene playerId, intentamos reconectar SILENCIOSAMENTE a una partida
        // (por si estaba jugando y dio F5).
        if (playerId) {
            socket.emit('quieroReconectar', { playerId: playerId });
        }
    } 
    // ESCENARIO B: No estaba logueado, pero tiene un ID de invitado (Posible reconexión de invitado)
    else if (playerId) {
        console.log(`Invitado detectado con ID: ${playerId}. Intentando reconectar...`);
        
        // Aquí sí ocultamos todo porque no sabemos el nombre aún
        if(formInvitado) formInvitado.classList.add('oculto');
        if(formUsuario) formUsuario.classList.add('oculto');
        if(tabsContainer) tabsContainer.classList.add('oculto');
        
        socket.emit('quieroReconectar', { playerId: playerId });
        
        if(mensajeBienvenida) {
            mensajeBienvenida.classList.remove('oculto');
            bienvenidaNombre.textContent = "Reconectando...";
        }
    } 
    // ESCENARIO C: Usuario nuevo o limpio
    else {
        // Aseguramos que se vea el formulario de invitado
        if(formInvitado) formInvitado.classList.remove('oculto');
        if(tabsContainer) tabsContainer.classList.remove('oculto');
    }
});

// --- NUEVO: RECIBIR MENSAJES Y EVENTOS DEL SISTEMA ---
socket.on('systemLog', (data) => {
    // Si es un evento de conexión (solo suena)
    if (data.type === 'evento' && typeof SoundFX !== 'undefined') {
        SoundFX.playChime();
    }

    // Dibujar en el Lobby (si estamos ahí)
    if (pantallaLobby.classList.contains('activa')) {
        mostrarMensajeChat(chatLogLobby, data);
        return;
    }

    // Dibujar en el Juego
    if (pantallaJuegoAnfitrion.classList.contains('activa')) {
        mostrarMensajeChat(chatLogHost, data);
    } else if (pantallaJuegoJugador.classList.contains('activa')) {
        mostrarMensajeChat(chatLogJugador, data);
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
    SoundFX.playChime();
    lobbyListaJugadores.innerHTML = '';
    
    datos.jugadores.forEach((j, index) => {
        const div = document.createElement('div');
        div.className = 'fila-ranking';
        
        // Icono (Corona o nada) + Nombre
        const icono = j.esAnfitrion ? '👑' : '🧑'; 
        const claseNombre = j.esAnfitrion ? 'color:#f1c40f;' : '';

        // PROTECCIÓN: Usamos (j.saldo || 0) para evitar el crash si es undefined
        div.innerHTML = `
            <div class="rank-num">${index + 1}</div>
            <div class="rank-nombre" style="${claseNombre}">${icono} ${j.nombre}</div>
            <div class="rank-wins">${j.victorias || 0}</div>
            <div class="rank-saldo">S/. ${(j.saldo || 0).toFixed(2)}</div>
        `;
        lobbyListaJugadores.appendChild(div);
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
    
    // 2. Actualizar VISUALMENTE el Saldo (Badge)
    const saldoTexto = `S/. ${parseFloat(datos.saldoActual || 0).toFixed(2)}`;
    if(displaySaldoJugador) displaySaldoJugador.textContent = saldoTexto;
    if(displaySaldoAnfitrion) displaySaldoAnfitrion.textContent = saldoTexto;

    // 3. Configurar Pantalla según Rol
    if (soyAnfitrion) {
        // --- ANFITRION ---
        // Renderizar tablero de control vacío
        if (typeof HostUI !== 'undefined') HostUI.renderizarTableroVacio();
        
        // Texto del patrón en el acordeón
        if(hostPatronTexto) hostPatronTexto.textContent = "Jugando por: " + datos.patronTexto;
        
        // Renderizar cartilla de jugador del host (en el acordeón)
        if (miCartilla && typeof dibujarCartillaModerna === 'function') {
            dibujarCartillaModerna(miCartilla, cartillaHostContainer);
        }
        
        cambiarPantalla('pantalla-juego-anfitrion');

    } else {
        // --- JUGADOR NORMAL ---
        jugadorPatron.textContent = datos.patronTexto;
        if(nombreJugadorDisplay) nombreJugadorDisplay.textContent = miNombre || "Jugador";
        
        // Mostrar Código de Sala en la cabecera (donde antes iba el reloj)
        if(displayClaveJugador) displayClaveJugador.textContent = lobbyClave.textContent;

        if (typeof dibujarCartillaModerna === 'function') {
            dibujarCartillaModerna(miCartilla, cartillaJugador);
        }
        cambiarPantalla('pantalla-juego-jugador');
    }

    // 4. Narración de inicio (si no es unión tardía)
    if(!datos.esUnionTardia) {
        setTimeout(() => hablar(`Iniciando juego. ${datos.patronTexto}`), 1000);
    }
});


// --- SORTEO DE FICHA (HÍBRIDO) ---
socket.on('fichaAnunciada', (datos) => {
    SoundFX.playNewBall(); // <--- AQUÍ, al principio
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
    SoundFX.playError(); // <--- AQUÍ
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
    // 1. Restaurar datos básicos (Nombre y Rol)
    if (datos.nombre) {
        miNombre = datos.nombre; 
        if(nombreJugadorDisplay) nombreJugadorDisplay.textContent = datos.nombre; 
        if(nombreAnfitrionDisplay) nombreAnfitrionDisplay.textContent = datos.nombre;
    }
    soyAnfitrion = datos.esAnfitrion;
    
    // 2. Actualizar el Saldo recuperado
    const saldoTexto = `S/. ${parseFloat(datos.saldo || 0).toFixed(2)}`;
    if(displaySaldoJugador) displaySaldoJugador.textContent = saldoTexto;
    if(displaySaldoAnfitrion) displaySaldoAnfitrion.textContent = saldoTexto;

    // 3. Limpieza previa (sin borrar memoria de marcas)
    limpiarJuegoLocal(false);

    // 4. DECISIÓN CRÍTICA: ¿LOBBY O JUEGO?
    if (!datos.juegoIniciado) {
        // --- CASO A: Estamos en el Lobby (Aún no empieza) ---
        
        // Recuperar código de sala
        const codigoSala = datos.clave || "---";
        if(lobbyClave) lobbyClave.textContent = codigoSala;
        
        if (soyAnfitrion) {
            lobbyVistaAnfitrion.style.display = 'flex';
            lobbyVistaJugador.style.display = 'none';
        } else {
            lobbyVistaAnfitrion.style.display = 'none';
            lobbyVistaJugador.style.display = 'block';
            // Verificar si hay favorito para cargar
            sincronizarToggleFavorito(); 
        }
        cambiarPantalla('pantalla-lobby');
        return; // ¡IMPORTANTE! Detenemos aquí para no cargar la pantalla de juego
    }

    // --- CASO B: El juego YA EMPEZÓ (Restaurar estado de juego) ---

    // CORRECCIÓN CRÍTICA PARA EL CHAT: 
    // Restauramos la clave interna aunque estemos en la pantalla de juego.
    if (lobbyClave) lobbyClave.textContent = datos.clave;

    if (typeof iniciarCronometro === 'function') iniciarCronometro();

    // Restaurar Historial Visual
    datos.fichasHistorial.forEach(ficha => {
        if (typeof agregarBolillaHistorial === 'function') {
            agregarBolillaHistorial(ficha, historialContenedor);
        }
    });

    // Recuperar Marcas Manuales
    const playerId = localStorage.getItem(PLAYER_ID_KEY);
    const savedMarks = JSON.parse(localStorage.getItem(`bingoMarks-${playerId}`) || '[]');
    misMarcas = savedMarks;

    if (soyAnfitrion) {
        // --- RESTAURAR ANFITRION ---
        if (typeof HostUI !== 'undefined') {
            HostUI.renderizarTableroVacio();
            datos.fichasHistorial.forEach(ficha => HostUI.marcarFicha(ficha));
            
            if (datos.ultimaFicha) HostUI.actualizarBolaVisual(fichaActual, datos.ultimaFicha, false);
            if (datos.anteriorFicha) HostUI.actualizarBolaVisual(fichaAnterior, datos.anteriorFicha, false);
        }
        if(checkAutomatico) checkAutomatico.checked = false;
        
        // Restaurar Código en Cabecera Host
        if(displayClaveAnfitrion) displayClaveAnfitrion.textContent = datos.clave;

        // Restaurar Cartilla Híbrida (si existe)
        if (datos.cartilla) {
            miCartilla = datos.cartilla;
            if (typeof dibujarCartillaModerna === 'function') {
                dibujarCartillaModerna(miCartilla, cartillaHostContainer);
            }
            if (savedMarks.length > 0) {
                const celdas = cartillaHostContainer.querySelectorAll('.celda-3d');
                celdas.forEach(celda => {
                    if (savedMarks.includes(parseInt(celda.dataset.numero))) celda.classList.add('marcada');
                });
            }
        }
        cambiarPantalla('pantalla-juego-anfitrion');

    } else {
        // --- RESTAURAR JUGADOR ---
        jugadorPatron.textContent = datos.patronTexto;
        miCartilla = datos.cartilla;
        
        // Restaurar Código en Cabecera Jugador
        if(displayClaveJugador) displayClaveJugador.textContent = datos.clave;

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
    SoundFX.playWin(); // <--- AQUÍ
    // 1. Limpieza de timers y avisos
    if (intervaloCuenta) clearInterval(intervaloCuenta);
    avisoCuentaRegresiva.style.display = 'none';
    if (typeof detenerCronometro === 'function') detenerCronometro();

    // 2. Guardar datos recibidos
    listaGanadoresFinal = datos.listaGanadores;
    const numerosSorteados = datos.numerosSorteados;

    // 3. Limpiar y preparar la lista visual
    contenedorListaGanadores.innerHTML = ''; 
    
    // Título dinámico (Singular/Plural)
    const titulo = listaGanadoresFinal.length > 1 ? '¡GANADORES!' : '¡GANADOR!';
    const subtitulo = document.querySelector('.modal-subtitulo');
    if (subtitulo) subtitulo.textContent = titulo;

    // 4. Generar filas de ganadores
    listaGanadoresFinal.forEach((ganador, index) => {
        const fila = document.createElement('div');
        fila.className = 'fila-ganador';
        
        // Medalla estética
        const medalla = index === 0 ? '🥇' : (index === 1 ? '🥈' : '🏅');

        fila.innerHTML = `
            <div class="nombre-ganador-lista"><span class="medalla">${medalla}</span> ${ganador.nombre}</div>
            <button class="btn-ojo-mini" data-index="${index}">👁️</button>
        `;
        contenedorListaGanadores.appendChild(fila);
    });

    // 5. Lógica de botones "OJO" (Ver cartones)
    contenedorListaGanadores.querySelectorAll('.btn-ojo-mini').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const botonClickeado = e.currentTarget;
            const estabaActivo = botonClickeado.classList.contains('activo');

            // Primero cerramos todo
            document.querySelectorAll('.btn-ojo-mini').forEach(b => b.classList.remove('activo'));
            contenedorCartillaGanadora.classList.add('oculto');

            // Si no estaba activo, abrimos este
            if (!estabaActivo) {
                botonClickeado.classList.add('activo');
                const index = botonClickeado.dataset.index;
                const datosEsteGanador = listaGanadoresFinal[index];
                
                // Mostrar y dibujar
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

    // 6. Narración de voz
    if (listaGanadoresFinal.length > 1) {
        hablar(`Juego terminado. Hubo ${listaGanadoresFinal.length} ganadores.`);
    } else if(listaGanadoresFinal[0]) {
        hablar(`¡Bingo! Ganador ${listaGanadoresFinal[0].nombre}`);
    }

    // 7. LÓGICA DEL BOTÓN "NUEVA RONDA" (Solo para Anfitrión)
    if (btnNuevaRondaHost) {
        if (soyAnfitrion) {
            btnNuevaRondaHost.style.display = 'block'; // El Host lo ve
        } else {
            btnNuevaRondaHost.style.display = 'none';  // Los jugadores no
        }
    }

    // 8. Mostrar Modal y bloquear botones de juego
    modalFinJuego.classList.add('visible');
    
    if(btnCantarBingo) btnCantarBingo.disabled = true;
    if(btnCantarBingoHost) btnCantarBingoHost.disabled = true;
});