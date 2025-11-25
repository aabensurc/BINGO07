const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const crypto = require('crypto');
const fs = require('fs'); // <--- AÑADIDO: Módulo para leer archivos

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));


// --- NUEVO: CARGA DE USUARIOS DESDE JSON (Simulando Google Drive) ---
let USUARIOS_AUTORIZADOS = [];
const RUTA_USUARIOS = './users.json'; // Ruta al archivo que acabas de crear

function cargarUsuarios() {
    try {
        const data = fs.readFileSync(RUTA_USUARIOS, 'utf8');
        USUARIOS_AUTORIZADOS = JSON.parse(data);
        console.log(`[AUTH] Usuarios cargados exitosamente desde ${RUTA_USUARIOS}. Total: ${USUARIOS_AUTORIZADOS.length}`);
    } catch (error) {
        // Esto es CRÍTICO para que el servidor no se caiga si no encuentra el archivo
        console.error(`[ERROR] No se pudo cargar el archivo de usuarios: ${RUTA_USUARIOS}`);
        console.error(`[ERROR] Detalle: ${error.message}`);
        USUARIOS_AUTORIZADOS = [];
        console.log('[AUTH] Inicializando lista de usuarios vacía. No habrá logins de usuario.');
    }
}
cargarUsuarios(); // Ejecutar la carga al iniciar el servidor

// --- LÓGICA DEL JUEGO ---

const partidas = {};

const NOMBRES_PATRONES = {
    linea: "Línea Simple",
    carton_lleno: "Cartón Lleno",
    cuadrado: "Cuadrado (Marco)",
    letra_l: "Letra L",
    l_invertida: "L Invertida",
    
    letra_x: "Letra X (Aspa)",       // NUEVO
    cruz_mas: "Cruz (+)",            // NUEVO
    
    diagonal_backslash: "Diagonal (\\)",
    diagonal_slash: "Diagonal (/)",
    columna_b: "Columna B",
    columna_i: "Columna I",
    columna_n: "Columna N",
    columna_g: "Columna G",
    columna_o: "Columna O"
};

// --- Funciones de Partida ---

function generarClave() {
    let clave = '';
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
    do {
        clave = '';
        for (let i = 0; i < 4; i++) {
            clave += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    } while (partidas[clave]);
    return clave;
}

// ¡NUEVO! Genera un "Pase VIP" (playerId)
function generarPlayerId() {
    return crypto.randomUUID();
}

function actualizarLobby(clave) {
    if (partidas[clave]) {
        // Ordenamos por victorias (Descendente: el que más gana arriba)
        const jugadoresOrdenados = [...partidas[clave].jugadores].sort((a, b) => b.victorias - a.victorias);

        // Mapeamos incluyendo los nuevos campos
        const listaData = jugadoresOrdenados.map(j => ({
            nombre: j.nombre,
            esAnfitrion: j.esAnfitrion,
            victorias: j.victorias || 0, // Evita undefined
            saldo: j.saldo || 0.00       // Evita undefined
        }));
        
        io.to(clave).emit('actualizarLobby', { jugadores: listaData });
    }
}

function enviarMensajeSistema(clave, mensaje, tipo = 'sistema', nombreUsuario = null) {
    if (partidas[clave]) {
        io.to(clave).emit('systemLog', {
            msg: mensaje,
            type: tipo,
            nombre: nombreUsuario // Usado para mensajes de chat de usuario
        });
    }
}

function generarNumeroColumna(columna, numerosUsados) {
    const rangos = [
        { min: 1, max: 15 },  // B
        { min: 16, max: 30 }, // I
        { min: 31, max: 45 }, // N
        { min: 46, max: 60 }, // G
        { min: 61, max: 75 }  // O
    ];
    const { min, max } = rangos[columna];
    let numero;
    do {
        numero = Math.floor(Math.random() * (max - min + 1)) + min;
    } while (numerosUsados.has(numero));
    numerosUsados.add(numero);
    return numero;
}

function generarCartilla() {
    let cartilla = Array(5).fill(null).map(() => Array(5).fill(0));
    let numerosUsados = new Set(); 

    for (let col = 0; col < 5; col++) {
        for (let fila = 0; fila < 5; fila++) {
            if (col === 2 && fila === 2) {
                cartilla[fila][col] = 'GRATIS';
                continue;
            }
            cartilla[fila][col] = generarNumeroColumna(col, numerosUsados);
        }
    }
    return cartilla;
}

function generarBombo() {
    let bombo = [];
    const letras = ['B', 'I', 'N', 'G', 'O'];
    const rangos = [
        { min: 1, max: 15 },
        { min: 16, max: 30 },
        { min: 31, max: 45 },
        { min: 46, max: 60 },
        { min: 61, max: 75 }
    ];

    letras.forEach((letra, index) => {
        const { min, max } = rangos[index];
        for (let i = min; i <= max; i++) {
            bombo.push({ letra: letra, numero: i, ficha: `${letra}${i}` });
        }
    });
    
    for (let i = bombo.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bombo[i], bombo[j]] = [bombo[j], bombo[i]];
    }
    return bombo;
}

// ... (Funciones de verificación de Bingo - sin cambios) ...
function checkCelda(numeroDeCartilla, fichasSet) {
    if (numeroDeCartilla === 'GRATIS') return true;
    return fichasSet.has(numeroDeCartilla);
}

// --- VERIFICACIÓN DE BINGO MEJORADA (TODOS LOS PATRONES) ---
function verificarBingo(cartilla, patron, fichasSet) {
    
    // Helpers
    const getFilaCoords = (f) => Array.from({length:5}, (_, c) => ({r:f, c:c}));
    const getColCoords = (c) => Array.from({length:5}, (_, r) => ({r:r, c:c}));
    const checkCoords = (coords) => {
        const completo = coords.every(pos => {
            const val = cartilla[pos.r][pos.c];
            return val === 'GRATIS' || fichasSet.has(val);
        });
        return completo ? coords : null;
    };

    switch (patron) {
        // --- A. CLÁSICOS ---
        case 'linea': 
            // Opción "Cualquier Línea": Gana con Horizontal, Vertical o Diagonal
            // 1. Chequear Filas (Horizontal)
            for (let f = 0; f < 5; f++) {
                const win = checkCoords(getFilaCoords(f));
                if (win) return win;
            }
            // 2. Chequear Columnas (Vertical)
            for (let c = 0; c < 5; c++) {
                const win = checkCoords(getColCoords(c));
                if (win) return win;
            }
            // 3. Chequear Diagonal 1 (\)
            const d1 = Array.from({length:5}, (_, i) => ({r:i, c:i}));
            const winD1 = checkCoords(d1);
            if (winD1) return winD1;
            // 4. Chequear Diagonal 2 (/)
            const d2 = Array.from({length:5}, (_, i) => ({r:i, c:4-i}));
            const winD2 = checkCoords(d2);
            if (winD2) return winD2;
            
            return null;

        case 'carton_lleno':
            const todas = [];
            for(let r=0; r<5; r++) for(let c=0; c<5; c++) todas.push({r, c});
            return checkCoords(todas);

        case 'cuadrado': // Borde exterior
            const coordsBordes = [];
            coordsBordes.push(...getFilaCoords(0)); // Fila arriba
            coordsBordes.push(...getFilaCoords(4)); // Fila abajo
            for(let i=1; i<4; i++) {
                coordsBordes.push({r:i, c:0}); // Lado izq
                coordsBordes.push({r:i, c:4}); // Lado der
            }
            return checkCoords(coordsBordes);

        // --- B. FORMAS Y LETRAS ---
        case 'letra_l': // Columna 0 + Fila 4 ( |_ )
            const l_col0 = getColCoords(0);
            const l_fila4 = getFilaCoords(4);
            // Unir y quitar duplicado esquina (4,0)
            const coordsL = [...l_col0, ...l_fila4.slice(1)];
            return checkCoords(coordsL);

        case 'l_invertida': // Columna 4 + Fila 4 ( _| )
            const li_col4 = getColCoords(4);
            const li_fila4 = getFilaCoords(4);
            // Unir y quitar duplicado esquina (4,4)
            const coordsLInv = [...li_col4, ...li_fila4.filter(p => p.c !== 4)]; 
            return checkCoords(coordsLInv);

        case 'letra_x': // Aspa ( X ) - Dos diagonales
            const d1_x = Array.from({length:5}, (_, i) => ({r:i, c:i}));
            const d2_x = Array.from({length:5}, (_, i) => ({r:i, c:4-i}));
            // Unir y quitar duplicado centro (2,2)
            const coordsX = [...d1_x, ...d2_x.filter(p => p.r !== 2)];
            return checkCoords(coordsX);

        case 'cruz_mas': // Cruz (+) - Columna N + Fila 3
            const col_central = getColCoords(2);
            const fila_central = getFilaCoords(2);
            // Unir y quitar duplicado centro (2,2)
            const coordsMas = [...col_central, ...fila_central.filter(p => p.c !== 2)];
            return checkCoords(coordsMas);

        // --- C. DIAGONALES ESPECÍFICAS ---
        case 'diagonal_backslash': // De Arriba-Izq a Abajo-Der (\)
            const dBack = Array.from({length:5}, (_, i) => ({r:i, c:i}));
            return checkCoords(dBack);

        case 'diagonal_slash': // De Abajo-Izq a Arriba-Der (/)
            const dSlash = Array.from({length:5}, (_, i) => ({r:i, c:4-i}));
            return checkCoords(dSlash);

        // --- D. VERTICALES ESPECÍFICAS ---
        case 'columna_b': return checkCoords(getColCoords(0));
        case 'columna_i': return checkCoords(getColCoords(1));
        case 'columna_n': return checkCoords(getColCoords(2));
        case 'columna_g': return checkCoords(getColCoords(3));
        case 'columna_o': return checkCoords(getColCoords(4));

        default:
            return null;
    }
}
// --- Fin de funciones de verificación ---


// server.js (Función MODIFICADA para descontar a perdedores)

function terminarJuego(clave) {
    const partida = partidas[clave];
    if (!partida || !partida.ganadoresTemp) return;

    // 1. DATOS FINANCIEROS
    const cantidadJugadoresTotal = partida.jugadores.length; // Todos los que están en la sala
    const cantidadGanadores = partida.ganadoresTemp.length;
    const apuestaPorPersona = partida.montoApuesta || 0;
    
    // Pozo Bruto Total (Todo el dinero en la mesa)
    const pozoTotal = apuestaPorPersona * cantidadJugadoresTotal;
    
    // Lo que recibe cada ganador en total (Bruto)
    // Ej: Si hay 6 soles y 2 ganadores, cada uno recibe 3 soles.
    const premioBrutoPorGanador = cantidadGanadores > 0 ? (pozoTotal / cantidadGanadores) : 0;

    // 2. CALCULAR NETO (GANANCIA REAL O PÉRDIDA)
    // Ganador: Recibe su premio bruto MENOS lo que puso de su bolsillo.
    const gananciaNetaGanador = premioBrutoPorGanador - apuestaPorPersona;
    
    // Perdedor: Pierde exactamente lo que apostó.
    const perdidaPerdedor = apuestaPorPersona;

    // 3. APLICAR SALDOS A TODOS LOS JUGADORES (Ganadores y Perdedores)
    partida.jugadores.forEach(jugador => {
        // Verificamos si este jugador está en la lista de ganadores temporales
        const esGanador = partida.ganadoresTemp.some(g => g.id === jugador.id);

        if (esGanador) {
            // --- ES GANADOR ---
            jugador.victorias += 1;
            jugador.saldo += gananciaNetaGanador; 
            // Nota: Si son muchos ganadores, la "gananciaNeta" podría ser negativa matemáticamente,
            // pero en Bingo lo normal es que ganen pocos.
        } else {
            // --- ES PERDEDOR ---
            // Aquí es donde hacemos que el saldo baje (y pueda ser negativo)
            jugador.saldo -= perdidaPerdedor;
        }
    });

    // 4. PREPARAR DATOS PARA EL CLIENTE
    const numerosSorteados = Array.from(partida.fichasSorteadasSet);

    // Enviamos resultados
    io.to(clave).emit('juegoTerminado', {
        listaGanadores: partida.ganadoresTemp,
        numerosSorteados: numerosSorteados,
        
        // Enviamos datos informativos para mostrar en el modal si quisieras
        premioGanado: gananciaNetaGanador, 
        montoPerdido: perdidaPerdedor
    });

    // 5. RESET DE ESTADO DE LA PARTIDA
    partida.juegoIniciado = false;
    partida.cierreEnCurso = false;
    partida.ganadoresTemp = null;
    partida.bombo = [];
    partida.fichasSorteadasSet.clear();
    partida.fichasHistorial = [];
    
    // Actualizamos el Lobby para que se vean los nuevos saldos y ranking
    actualizarLobby(clave);
}


// --- Lógica de Conexión ---
io.on('connection', (socket) => {
    console.log(`Nuevo cliente conectado: ${socket.id}`);

    // -- Evento: Login de Usuario --
    socket.on('loginUsuario', (datos) => {
        const { usuario, contrasena } = datos;

        // 1. Buscar el usuario en la lista cargada en memoria
        const usuarioEncontrado = USUARIOS_AUTORIZADOS.find(
            u => u.usuario === usuario && u.contrasena === contrasena
        );

        // 2. Respuesta al cliente
        if (usuarioEncontrado) {
            // Éxito: Enviar el nombre y playerId persistente
            socket.emit('loginExitoso', { 
                nombre: usuarioEncontrado.nombre, 
                playerId: usuarioEncontrado.playerId 
            });
            console.log(`[AUTH] Login exitoso para ${usuarioEncontrado.nombre}`);

        } else {
            // Falla: Enviar un mensaje de error
            socket.emit('loginError', 'Credenciales incorrectas. Inténtalo de nuevo.');
            console.log(`[AUTH] Intento de login fallido para usuario: ${usuario}`);
        }
    });

    // -- Evento: Crear Partida --
    socket.on('crearPartida', (datos) => {
        const nombreAnfitrion = datos.nombre;
        const clave = generarClave();
        const playerId = generarPlayerId();

        partidas[clave] = {
            clave: clave,
            anfitrionId: socket.id,
            jugadores: [],
            patronJuego: 'linea',
            juegoIniciado: false,
            bombo: [],
            fichasSorteadasSet: new Set(),
            fichasHistorial: [],
            montoApuesta: 0 // Inicializamos la apuesta de la sala
        };

        const anfitrion = {
            id: socket.id,
            playerId: playerId,
            nombre: nombreAnfitrion,
            esAnfitrion: true,
            cartilla: generarCartilla(),
            
            // ¡IMPORTANTE: INICIALIZAR ESTADÍSTICAS!
            victorias: 0,
            saldo: 0.00
        };
        partidas[clave].jugadores.push(anfitrion);

        socket.join(clave);
        socket.emit('partidaCreada', { clave: clave, playerId: playerId });
        actualizarLobby(clave);
        console.log(`Partida creada por ${nombreAnfitrion} (${socket.id}). Clave: ${clave}`);

        enviarMensajeSistema(clave, `${nombreAnfitrion} ha creado la partida. ¡Bienvenido!`, 'evento');
    });

// -- Evento: Unirse a Partida (MODIFICADO: Permite entrada tardía + Stats) --
    socket.on('unirsePartida', (datos) => {
        const { nombre, clave } = datos;
        
        if (!partidas[clave]) {
            socket.emit('errorUnion', 'Error: Esa clave de partida no existe.');
            return;
        }

        const playerId = generarPlayerId();
        const nuevoJugador = {
            id: socket.id,
            playerId: playerId,
            nombre: nombre,
            esAnfitrion: false,
            cartilla: generarCartilla(),
            
            // ¡IMPORTANTE: INICIALIZAR ESTADÍSTICAS!
            victorias: 0,
            saldo: 0.00
        };
        partidas[clave].jugadores.push(nuevoJugador);

        socket.join(clave);
        
        socket.emit('unionExitosa', { clave: clave, playerId: playerId });
        actualizarLobby(clave);
        console.log(`Jugador ${nombre} (${socket.id}) se unió a la partida ${clave}`);
        enviarMensajeSistema(clave, `${nombre} se unió a la sala.`, 'evento');

        if (partidas[clave].juegoIniciado) {
            console.log(`Jugador ${nombre} entró tarde. Sincronizando...`);
            
            socket.emit('partidaIniciada', {
                patronTexto: NOMBRES_PATRONES[partidas[clave].patronJuego],
                cartilla: nuevoJugador.cartilla,
                saldoActual: nuevoJugador.saldo, // Enviamos su saldo
                esUnionTardia: true 
            });

            partidas[clave].fichasHistorial.forEach(ficha => {
                socket.emit('fichaAnunciada', { ficha: ficha });
            });
        }
    });


// -- Evento: Jugador pide cambiar su cartilla (Reroll) --
    socket.on('pedirNuevoCarton', () => {
        let clavePartida = null;
        let jugador = null;

        for (const k in partidas) {
            const j = partidas[k].jugadores.find(p => p.id === socket.id);
            if (j) {
                clavePartida = k;
                jugador = j;
                break;
            }
        }

        if (!jugador || !partidas[clavePartida]) return;
        
        if (partidas[clavePartida].juegoIniciado) {
            socket.emit('errorJuego', 'No puedes cambiar cartón con la partida iniciada.');
            return;
        }

        jugador.cartilla = generarCartilla();
        console.log(`Jugador ${jugador.nombre} ha cambiado su cartón.`);

        // --- CAMBIO AQUÍ: ENVIAMOS LA NUEVA CARTILLA AL CLIENTE ---
        socket.emit('cartonCambiado', jugador.cartilla); 
    });

    // -- NUEVO EVENTO: Jugador carga su cartón favorito --
    socket.on('usarCartonFavorito', (cartillaCliente) => {
        // 1. Buscar jugador
        let clavePartida = null;
        let jugador = null;
        for (const k in partidas) {
            const j = partidas[k].jugadores.find(p => p.id === socket.id);
            if (j) { clavePartida = k; jugador = j; break; }
        }

        // 2. Validaciones
        if (!jugador || !partidas[clavePartida]) return;
        if (partidas[clavePartida].juegoIniciado) return; // No se puede cambiar si ya empezó

        // 3. Asignar la cartilla que nos mandó el cliente
        jugador.cartilla = cartillaCliente;
        
        console.log(`Jugador ${jugador.nombre} cargó su cartón favorito.`);
        
        // 4. Confirmamos y devolvemos la cartilla para sincronizar
        socket.emit('cartonCambiado', jugador.cartilla);
    });

// server.js (Evento quieroReconectar MODIFICADO para devolver el control al Host)

    socket.on('quieroReconectar', (datos) => {
        const { playerId } = datos;
        if (!playerId) return;

        console.log(`Socket ${socket.id} intenta reconectar con playerId ${playerId}`);

        // Buscar al jugador en CUALQUIER partida
        let partidaEncontrada = null;
        let jugadorEncontrado = null;
        let claveEncontrada = null;

        for (const clave in partidas) {
            const partida = partidas[clave];
            const jugador = partida.jugadores.find(j => j.playerId === playerId);
            if (jugador) {
                partidaEncontrada = partida;
                jugadorEncontrado = jugador;
                claveEncontrada = clave;
                break;
            }
        }

        if (jugadorEncontrado) {
            // ¡Lo encontramos!
            console.log(`Jugador ${jugadorEncontrado.nombre} reconectado.`);
            
            // 1. Actualizamos su ID de socket
            jugadorEncontrado.id = socket.id;

            // --- ¡NUEVO! IMPORTANTE PARA EL ANFITRIÓN ---
            // Si es el jefe, actualizamos la referencia principal de la partida
            // para que pueda volver a usar los botones de control.
            if (jugadorEncontrado.esAnfitrion) {
                partidaEncontrada.anfitrionId = socket.id;
                console.log(`Control de anfitrión restaurado para ${jugadorEncontrado.nombre} en sala ${claveEncontrada}`);
            }
            // --------------------------------------------
            
            // 2. Lo volvemos a meter en la sala de socket.io
            socket.join(claveEncontrada);

            // Avisar al chat que volvió
            enviarMensajeSistema(claveEncontrada, `${jugadorEncontrado.nombre} ha vuelto a la partida.`, 'evento');

            // 3. Le enviamos el "paquete de reconexión"
            const datosReconexion = {
                esAnfitrion: jugadorEncontrado.esAnfitrion,
                nombre: jugadorEncontrado.nombre,
                patronTexto: NOMBRES_PATRONES[partidaEncontrada.patronJuego],
                fichasHistorial: partidaEncontrada.fichasHistorial,
                juegoIniciado: partidaEncontrada.juegoIniciado,
                clave: claveEncontrada,
                saldo: jugadorEncontrado.saldo 
            };

            if (jugadorEncontrado.esAnfitrion) {
                // Datos extra para el Host (Bolas actuales)
                if (partidaEncontrada.fichasHistorial.length > 0) {
                    datosReconexion.ultimaFicha = partidaEncontrada.fichasHistorial[partidaEncontrada.fichasHistorial.length - 1];
                    if (partidaEncontrada.fichasHistorial.length > 1) {
                        datosReconexion.anteriorFicha = partidaEncontrada.fichasHistorial[partidaEncontrada.fichasHistorial.length - 2];
                    }
                }
            } else {
                // Datos extra para Jugador (Su cartilla)
                datosReconexion.cartilla = jugadorEncontrado.cartilla;
            }
            
            socket.emit('reconexionExitosa', datosReconexion);
            
            // Refrescamos el lobby por si cambió algo visualmente
            actualizarLobby(claveEncontrada);

        } else {
            console.log(`PlayerId ${playerId} no encontrado o sala expirada.`);
            // Si no lo encontramos (quizás reiniciaste el servidor y se borró la RAM),
            // le decimos que limpie su navegador.
            socket.emit('forzarLimpieza'); 
        }
    });

    // -- Evento: Empezar Partida (CON APUESTA) --
    socket.on('empezarPartida', (datos) => {
        const { patron, montoApuesta } = datos; // Recibimos el monto
        const clave = Array.from(socket.rooms)[1];
        
        if (!partidas[clave] || partidas[clave].anfitrionId !== socket.id) return;

        // Guardamos la apuesta en la partida
        const apuesta = parseFloat(montoApuesta) || 0;
        partidas[clave].montoApuesta = apuesta;

        console.log(`Partida ${clave} inicia. Patrón: ${patron}. Apuesta: S/. ${apuesta.toFixed(2)}`);
        enviarMensajeSistema(clave, `Juego iniciado. Patrón: ${NOMBRES_PATRONES[patron]}. Pozo por jugador: S/. ${apuesta.toFixed(2)}`, 'evento');
        
        const partida = partidas[clave];
        partida.juegoIniciado = true;
        partida.patronJuego = patron;
        partida.bombo = generarBombo();
        partida.fichasSorteadasSet.clear();
        partida.fichasHistorial = []; 

        partida.jugadores.forEach(jugador => {
            const socketJugador = io.sockets.sockets.get(jugador.id);
            if (!socketJugador) return;

            let datosPartida = {
                patronTexto: NOMBRES_PATRONES[patron] || "Línea Simple",
                cartilla: jugador.cartilla,
                saldoActual: jugador.saldo // Enviamos saldo actualizado
            };
            
            socketJugador.emit('partidaIniciada', datosPartida);
        });
    });

    // -- Evento: Sortear Ficha --
    socket.on('sortearFicha', () => {
        const clave = Array.from(socket.rooms)[1];
        const partida = partidas[clave];

        if (!partida || partida.anfitrionId !== socket.id || !partida.juegoIniciado) return;
        
        if (partida.bombo.length === 0) {
            socket.emit('errorJuego', '¡Se acabaron las fichas del bombo!');
            return;
        }
        
        const ficha = partida.bombo.pop();
        
        partida.fichasSorteadasSet.add(ficha.numero);
        partida.fichasHistorial.push(ficha); // ¡NUEVO! Guardamos la ficha completa

        console.log(`Partida ${clave}: Salió ${ficha.ficha}`);
        io.to(clave).emit('fichaAnunciada', { ficha: ficha });
    });

    // -- Evento: Cantar Bingo (Con corrección de seguridad) --
socket.on('cantarBingo', () => {
    // 1. Buscar partida y jugador (Igual que antes)
    let clave = null;
    for (const k in partidas) {
        if (partidas[k].jugadores.find(j => j.id === socket.id)) {
            clave = k;
            break;
        }
    }

    if (!clave) return socket.emit('bingoFalso');
    const partida = partidas[clave];
    const jugador = partida.jugadores.find(j => j.id === socket.id);

    // 2. Validaciones básicas
    if (!jugador || !partida.juegoIniciado) return socket.emit('bingoFalso');

    // Evitar que el mismo jugador cante dos veces
    if (partida.ganadoresTemp && partida.ganadoresTemp.find(g => g.id === jugador.id)) {
        return; // Ya estás en la lista, tranquilo.
    }

    console.log(`Jugador ${jugador.nombre} canta BINGO. Verificando...`);

    // 3. Verificar Cartón
    const celdasGanadoras = verificarBingo(jugador.cartilla, partida.patronJuego, partida.fichasSorteadasSet);

    if (celdasGanadoras) {
        enviarMensajeSistema(clave, `¡ALERTA! ${jugador.nombre} cantó BINGO. Verificando...`, 'alerta');
        console.log(`¡BINGO VÁLIDO para ${jugador.nombre}!`);

        // --- LÓGICA DE VENTANA DE 10 SEGUNDOS ---
        
        // Si es el PRIMER ganador detectado
        if (!partida.cierreEnCurso) {
            partida.cierreEnCurso = true; // Activamos modo "Cierre"
            partida.ganadoresTemp = [];   // Iniciamos lista vacía
            
            // Avisamos a todos que empezó la cuenta regresiva
            io.to(clave).emit('avisoCierreBingo', { 
                primerGanador: jugador.nombre,
                segundos: 10 
            });

            // Iniciamos el Temporizador del Servidor (10 seg)
            setTimeout(() => {
                terminarJuego(clave); // Función que definiremos abajo
            }, 10000);
        }

        // Agregamos a ESTE ganador a la lista temporal
        partida.ganadoresTemp.push({
            nombre: jugador.nombre,
            id: jugador.id, // Guardamos ID para evitar duplicados
            cartilla: jugador.cartilla,
            celdasGanadoras: celdasGanadoras // Sus coordenadas ganadoras
        });

        // Le avisamos solo a él que su Bingo fue registrado
        socket.emit('bingoRegistrado');

    } else {
        socket.emit('bingoFalso');
        enviarMensajeSistema(clave, `Bingo Falso de ${jugador.nombre}.`, 'alerta');
    }
});


    // -- NUEVO: Salir voluntariamente (Botón Salir) --
    socket.on('abandonarPartida', () => {
        // Buscamos dónde está el jugador
        for (const clave in partidas) {
            const partida = partidas[clave];
            const indice = partida.jugadores.findIndex(j => j.id === socket.id);

            if (indice !== -1) {
                const jugador = partida.jugadores[indice];
                
                // Si es anfitrión, cerramos la sala (igual que antes)
                if (jugador.esAnfitrion) {
                    enviarMensajeSistema(clave, `¡El anfitrión (${jugador.nombre}) ha cerrado la sala!`, 'alerta');
                    io.to(clave).emit('errorJuego', 'El anfitrión ha cerrado la sala.');
                    delete partidas[clave];
                } else {
                    enviarMensajeSistema(clave, `${jugador.nombre} abandonó la sala.`, 'evento');
                    // Si es jugador normal, LO BORRAMOS DE VERDAD
                    partida.jugadores.splice(indice, 1);
                    console.log(`Jugador ${jugador.nombre} abandonó voluntariamente la sala ${clave}`);
                    actualizarLobby(clave);
                }
                break;
            }
        }
    });

    // -- NUEVO: Anfitrión fuerza el regreso al Lobby (Reset Grupal) --
    socket.on('forzarReinicioLobby', () => {
        // 1. Identificar la sala del anfitrión
        let clave = null;
        for (const k in partidas) {
            if (partidas[k].anfitrionId === socket.id) {
                clave = k;
                break;
            }
        }

        if (clave) {
            console.log(`Anfitrión reinicia sala ${clave} al lobby.`);
            
            // 2. Asegurar que el estado de juego sea falso
            if (partidas[clave]) partidas[clave].juegoIniciado = false;

            // 3. Ordenar a TODOS (incluido host) volver al lobby
            io.to(clave).emit('reiniciarLobby');
        }
    });

// server.js (Evento disconnect MODIFICADO para persistencia del Host)

    socket.on('disconnect', () => {
        console.log(`Cliente desconectado (pérdida de señal/minimizado): ${socket.id}`);
        
        for (const clave in partidas) {
            const partida = partidas[clave];
            const jugador = partida.jugadores.find(j => j.id === socket.id);

            if (jugador) {
                // CASO A: Es Anfitrión
                if (jugador.esAnfitrion) {
                    console.log(`Anfitrión desconectado momentáneamente de sala ${clave}. Esperando reconexión...`);
                    
                    // AVISO SUAVE: No cerramos la sala, solo avisamos.
                    // No enviamos 'errorJuego' porque eso recarga la página de los jugadores.
                    enviarMensajeSistema(clave, `⚠️ El anfitrión perdió conexión. Esperando a que vuelva...`, 'alerta');
                } 
                // CASO B: Es Jugador Normal
                else {
                    enviarMensajeSistema(clave, `${jugador.nombre} perdió la conexión.`, 'alerta');
                }
                break;
            }
        }
    });

    // -- Evento: Mensaje de Usuario (Chat) --
    socket.on('sendMessage', (datos) => {
        const { mensaje, clave, nombre } = datos;

        if (partidas[clave]) {
            // Reenviamos el mensaje a todos en la sala (tipo 'usuario')
            io.to(clave).emit('systemLog', {
                msg: mensaje,
                type: 'usuario',
                nombre: nombre
            });
        }
    });
    
});



// Iniciar el servidor
server.listen(PORT, () => {
    console.log(`--- Servidor de Bingo ---`);
    console.log(`Servidor corriendo en el puerto ${PORT}`);
    console.log(`Abre esta dirección en los navegadores de tu red local:`);
    console.log(`http://[TU_IP_LOCAL]:${PORT}`);
});