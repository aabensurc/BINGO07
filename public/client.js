// 1. Inicia la conexión con el servidor
const socket = io();

// Variables nuevas para almacenar datos del ganador temporalmente
let datosGanadorTemp = null;

let intervaloCuenta = null;
let listaGanadoresFinal = []; // Aquí guardaremos el array que llega del server

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
// const lobbyPatrones = document.getElementById('lobbyPatrones');  <-- BORRAR ESTO
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

const btnVolverAlLobby = document.getElementById('btnVolverAlLobby');
const checkAutomatico = document.getElementById('checkAutomatico');
const inputIntervalo = document.getElementById('inputIntervalo');
const nombreJugadorDisplay = document.getElementById('nombreJugadorDisplay');
const nombreAnfitrionDisplay = document.getElementById('nombreAnfitrionDisplay');

// Elementos del DOM nuevos
const modalGanadorTexto = document.getElementById('modalGanadorTexto');
const contenedorCartillaGanadora = document.getElementById('contenedorCartillaGanadora');

const avisoCuentaRegresiva = document.getElementById('avisoCuentaRegresiva');
const segundosRestantes = document.getElementById('segundosRestantes');
const contenedorListaGanadores = document.getElementById('contenedorListaGanadores');

const btnCambiarCarton = document.getElementById('btnCambiarCarton');
const mensajeCambioCarton = document.getElementById('mensajeCambioCarton');

const checkGuardarFavorito = document.getElementById('checkGuardarFavorito');

// --- ESTADO ---
let patronSeleccionado = 'linea';
let miCartilla = null;
let esperandoCargaFavorito = false; // Variable nueva para controlar el mensaje
let soyAnfitrion = false;
const PLAYER_ID_KEY = 'bingoPlayerId';
let misMarcas = [];
let temporizadorSorteo = null;
let miNombre = ""; 

// --- VOZ ---
let estaMuteado = false;
let vozSeleccionada = null;
const synth = window.speechSynthesis;

// --- FUNCIÓN NUEVA: Sincronizar el Toggle Visualmente ---
// Compara la cartilla actual con la guardada en localStorage
function sincronizarToggleFavorito() {
    if (!checkGuardarFavorito || !miCartilla) return;
    
    const favoritoStr = localStorage.getItem('bingoCartonFavorito');
    if (favoritoStr) {
        // Comparamos si la cartilla actual es idéntica a la guardada
        if (JSON.stringify(miCartilla) === favoritoStr) {
            checkGuardarFavorito.checked = true;
        } else {
            checkGuardarFavorito.checked = false;
        }
    } else {
        checkGuardarFavorito.checked = false;
    }
}

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


// =========================================================
// AQUÍ PEGAS EL CÓDIGO NUEVO DEL DROPDOWN (Paso C)
// =========================================================

// 1. Referencias a los elementos del nuevo menú
const dropdown = document.getElementById('dropdownPatrones');
const trigger = dropdown.querySelector('.select-trigger');
const textoTrigger = document.getElementById('textoPatronSeleccionado');
const opciones = dropdown.querySelectorAll('.option');

// 2. Abrir / Cerrar al hacer clic
if (trigger) { // Verificamos que exista por si acaso
    trigger.addEventListener('click', (e) => {
        e.stopPropagation(); 
        dropdown.classList.toggle('open');
    });
}

// 3. Seleccionar una opción de la lista
opciones.forEach(opcion => {
    opcion.addEventListener('click', () => {
        // Quitar clase 'selected' a las otras
        opciones.forEach(op => op.classList.remove('selected'));
        // Marcar la actual
        opcion.classList.add('selected');
        
        // Actualizar la variable global 'patronSeleccionado'
        patronSeleccionado = opcion.dataset.value;
        
        // Actualizar el texto del botón principal
        if(textoTrigger) textoTrigger.textContent = opcion.textContent;
        
        // Cerrar el menú
        dropdown.classList.remove('open');
    });
});

// 4. Cerrar el menú si haces click fuera
document.addEventListener('click', (e) => {
    if (dropdown && !dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
    }
});

// =========================================================
// FIN DEL CÓDIGO NUEVO
// =========================================================



btnEmpezarPartida.addEventListener('click', () => {
    socket.emit('empezarPartida', { patron: patronSeleccionado });
});


// --- LÓGICA TOGGLE FAVORITO ---
if (checkGuardarFavorito) {
    checkGuardarFavorito.addEventListener('change', () => {
        if (checkGuardarFavorito.checked) {
            // USUARIO LO PRENDIÓ -> GUARDAR
            if (miCartilla) {
                localStorage.setItem('bingoCartonFavorito', JSON.stringify(miCartilla));
                // Pequeño feedback visual (opcional)
                hablar("Cartón guardado");
            } else {
                // Si aún no hay cartilla (raro), lo apagamos
                checkGuardarFavorito.checked = false;
            }
        } else {
            // USUARIO LO APAGÓ -> BORRAR
            localStorage.removeItem('bingoCartonFavorito');
            hablar("Favorito eliminado");
        }
    });
}


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

// Al volver al lobby, limpiamos la variable temporal
btnVolverAlLobby.addEventListener('click', () => {
    modalFinJuego.classList.remove('visible');
    datosGanadorTemp = null; // Limpieza
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


// --- LÓGICA CAMBIAR CARTÓN (REROLL) ---
if(btnCambiarCarton) {
    btnCambiarCarton.addEventListener('click', () => {
        // 1. SI PIDE CAMBIO, BORRAMOS EL FAVORITO Y APAGAMOS TOGGLE
        localStorage.removeItem('bingoCartonFavorito');
        if(checkGuardarFavorito) checkGuardarFavorito.checked = false;

        // 2. Efecto visual de carga
        btnCambiarCarton.disabled = true;
        btnCambiarCarton.textContent = "🔄 Generando...";
        
        // 3. Pedir al servidor
        socket.emit('pedirNuevoCarton');
    });
}

// Confirmación del servidor cuando se cambia el cartón
socket.on('cartonCambiado', (nuevaCartilla) => {
    // 1. Actualizar memoria local con el nuevo cartón
    if (nuevaCartilla) {
        miCartilla = nuevaCartilla;
    }

    // 2. Restaurar botón visualmente
    setTimeout(() => {
        if(btnCambiarCarton) {
            btnCambiarCarton.disabled = false;
            btnCambiarCarton.textContent = "🔄 Cambiar mi Cartón";
        }
    }, 1000);

    // 3. LOGICA DE MENSAJE Y TOGGLE DIFERENCIADA
    if (esperandoCargaFavorito) {
        // CASO A: Se cargó un favorito
        if(mensajeCambioCarton) {
            mensajeCambioCarton.textContent = "¡Favorito cargado!";
            mensajeCambioCarton.style.opacity = 1;
            mensajeCambioCarton.style.color = "#2ecc71"; // Verde éxito
        }
        hablar("Cartón cargado.");
        esperandoCargaFavorito = false; // Apagamos bandera

    } else {
        // CASO B: Se generó uno nuevo (Reroll)
        if(mensajeCambioCarton) {
            mensajeCambioCarton.textContent = "¡Nuevo cartón listo!";
            mensajeCambioCarton.style.opacity = 1;
            mensajeCambioCarton.style.color = "#f1c40f"; // Amarillo
        }
        hablar("Cartón cambiado.");
    }
    
    // Desvanecer mensaje
    if(mensajeCambioCarton) setTimeout(() => mensajeCambioCarton.style.opacity = 0, 3000);

    // 4. IMPORTANTE: Verificar si debemos encender el toggle
    sincronizarToggleFavorito();
});

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

    // --- NUEVO: AUTO-CARGAR FAVORITO ---
    const favoritoGuardado = localStorage.getItem('bingoCartonFavorito');
    if (favoritoGuardado) {
        console.log("Cartón favorito detectado. Cargando...");
        const cartilla = JSON.parse(favoritoGuardado);
        
        esperandoCargaFavorito = true; // <--- ¡IMPORTANTE! Activamos la bandera aquí
        socket.emit('usarCartonFavorito', cartilla);
    } else {
        // Aseguramos que esté apagado si no hay favorito
        if(checkGuardarFavorito) checkGuardarFavorito.checked = false;
    }
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
    // 1. Restaurar datos básicos (Nombre y Rol)
    if (datos.nombre) {
        miNombre = datos.nombre; 
        if(nombreJugadorDisplay) nombreJugadorDisplay.textContent = datos.nombre; 
        if(nombreAnfitrionDisplay) nombreAnfitrionDisplay.textContent = datos.nombre;
    }
    soyAnfitrion = datos.esAnfitrion;
    
    // 2. Limpieza y Cronómetro
    limpiarJuegoLocal(false); // false = no borrar memoria de marcas todavía
    if (typeof iniciarCronometro === 'function') iniciarCronometro();

    // 3. Restaurar Historial Visual (Bolillas arriba)
    datos.fichasHistorial.forEach(ficha => {
        if (typeof agregarBolillaHistorial === 'function') {
            agregarBolillaHistorial(ficha, historialContenedor);
        }
    });

    // 4. Lógica Específica
    if (soyAnfitrion) {
        // --- LOGICA DE ANFITRIÓN ---
        if (typeof HostUI !== 'undefined') {
            HostUI.renderizarTableroVacio();
            // Marcar todas las fichas en el tablero de control
            datos.fichasHistorial.forEach(ficha => {
                HostUI.marcarFicha(ficha); 
            });
            // Restaurar bolas grandes
            if (datos.ultimaFicha) {
                 HostUI.actualizarBolaVisual(fichaActual, datos.ultimaFicha, false);
            }
            if (datos.anteriorFicha) {
                 HostUI.actualizarBolaVisual(fichaAnterior, datos.anteriorFicha, false);
            }
        }
        if(checkAutomatico) checkAutomatico.checked = false;
        cambiarPantalla('pantalla-juego-anfitrion');

    } else {
        // --- LOGICA DE JUGADOR ---
        jugadorPatron.textContent = datos.patronTexto;
        miCartilla = datos.cartilla; // IMPORTANTE: Actualizamos la variable global

        // Dibujar cartilla
        if (typeof dibujarCartillaModerna === 'function') {
            dibujarCartillaModerna(datos.cartilla, cartillaJugador);
        }

        // Restaurar marcas manuales desde LocalStorage
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

        // ¡NUEVO! Aquí es donde arreglamos el botón de la tuerca al refrescar
        if (typeof sincronizarToggleFavorito === 'function') {
            sincronizarToggleFavorito(); 
        }
    }
});



// A) AVISO DE CIERRE (Empiezan los 10 segundos)
socket.on('avisoCierreBingo', (datos) => {
    // Lógica de mensajes personalizada
    const soyElGanador = (miNombre === datos.primerGanador);
    
    avisoCuentaRegresiva.style.display = 'block';
    
    if (soyElGanador) {
        // MENSAJE PARA EL GANADOR
        hablar("Bingo registrado. Esperando a otros jugadores.");
        avisoCuentaRegresiva.style.backgroundColor = "#f1c40f"; // Dorado/Amarillo
        avisoCuentaRegresiva.style.color = "#2d3436"; // Texto oscuro
        // Reconstruimos el HTML manteniendo el span del contador
        avisoCuentaRegresiva.innerHTML = `¡BINGO REGISTRADO! ESPERANDO... <span id="segundosRestantes">${datos.segundos}</span>s`;
    } else {
        // MENSAJE PARA LOS DEMÁS
        hablar(`¡Atención! ${datos.primerGanador} cantó Bingo. Tienes 10 segundos.`);
        avisoCuentaRegresiva.style.backgroundColor = "#e74c3c"; // Rojo Urgente
        avisoCuentaRegresiva.style.color = "white";
        avisoCuentaRegresiva.innerHTML = `¡${datos.primerGanador} GANÓ! CIERRE EN: <span id="segundosRestantes">${datos.segundos}</span>s`;
    }

    // IMPORTANTE: Como usamos innerHTML arriba, perdimos la referencia antigua al span.
    // Tenemos que volver a buscarlo para que el contador funcione.
    const spanContador = document.getElementById('segundosRestantes');

    let quedan = datos.segundos;

    // Cuenta regresiva visual local
    if (intervaloCuenta) clearInterval(intervaloCuenta);
    
    intervaloCuenta = setInterval(() => {
        quedan--;
        if(spanContador) spanContador.textContent = quedan; // Actualizamos el nuevo span
        
        if (quedan <= 0) {
            clearInterval(intervaloCuenta);
            avisoCuentaRegresiva.style.display = 'none';
        }
    }, 1000);

    if (temporizadorSorteo) clearInterval(temporizadorSorteo);
    btnSortearFicha.disabled = true;
});

// B) CONFIRMACIÓN INDIVIDUAL (Para saber que mi click funcionó)
socket.on('bingoRegistrado', () => {
    btnCantarBingo.textContent = "¡REGISTRADO!";
    btnCantarBingo.style.backgroundColor = "#f1c40f"; // Amarillo espera
    btnCantarBingo.disabled = true; 
});

// C) JUEGO TERMINADO (Recibe LISTA de ganadores)
socket.on('juegoTerminado', (datos) => {
    // 1. Limpieza de timers
    if (intervaloCuenta) clearInterval(intervaloCuenta);
    avisoCuentaRegresiva.style.display = 'none';
    if (typeof detenerCronometro === 'function') detenerCronometro();

    // 2. Guardamos datos
    listaGanadoresFinal = datos.listaGanadores;
    const numerosSorteados = datos.numerosSorteados;

    // 3. Generar HTML de la lista
    contenedorListaGanadores.innerHTML = ''; // Limpiar
    
    // Cambiar título modal
    const titulo = listaGanadoresFinal.length > 1 ? '¡GANADORES!' : '¡GANADOR!';
    const subtitulo = document.querySelector('.modal-subtitulo');
    if (subtitulo) subtitulo.textContent = titulo;

    // --- CORRECCIÓN: BORRAMOS LA LÍNEA QUE DABA ERROR ---
    // Ya no intentamos ocultar 'modalGanadorTexto' porque ya no existe.

    // Crear filas por cada ganador
    listaGanadoresFinal.forEach((ganador, index) => {
        const fila = document.createElement('div');
        fila.className = 'fila-ganador';
        
        // Medalla (Solo estético)
        const medalla = index === 0 ? '🥇' : (index === 1 ? '🥈' : '🏅');

        fila.innerHTML = `
            <div class="nombre-ganador-lista">
                <span class="medalla">${medalla}</span> ${ganador.nombre}
            </div>
            <button class="btn-ojo-mini" data-index="${index}">👁️</button>
        `;
        contenedorListaGanadores.appendChild(fila);
    });

    // 4. Lógica de botones "OJO" (MEJORADA: ABRE Y CIERRA)
    contenedorListaGanadores.querySelectorAll('.btn-ojo-mini').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const botonClickeado = e.currentTarget; // Usamos currentTarget para asegurar que es el botón
            const estabaActivo = botonClickeado.classList.contains('activo');

            // 1. PRIMERO: Cerramos y desactivamos TODO
            document.querySelectorAll('.btn-ojo-mini').forEach(b => b.classList.remove('activo'));
            contenedorCartillaGanadora.classList.add('oculto');

            // 2. SEGUNDO: Si el que clickeé NO estaba activo, lo abro.
            // (Si YA estaba activo, al no hacer nada aquí, se queda cerrado por el paso 1)
            if (!estabaActivo) {
                botonClickeado.classList.add('activo');
                const index = botonClickeado.dataset.index;
                const datosEsteGanador = listaGanadoresFinal[index];

                // Mostrar contenedor y dibujar
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

    // 5. Voz
    if (listaGanadoresFinal.length > 1) {
        hablar(`Juego terminado. Hubo ${listaGanadoresFinal.length} ganadores.`);
    } else {
        // Accedemos al primer elemento del array de forma segura
        if(listaGanadoresFinal[0]) {
            hablar(`¡Bingo! Ganador ${listaGanadoresFinal[0].nombre}`);
        }
    }

    // 6. Mostrar Modal
    modalFinJuego.classList.add('visible');
    btnCantarBingo.disabled = true;
});