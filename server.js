const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const crypto = require('crypto'); // ¡NUEVO! Para generar IDs únicos

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

// --- LÓGICA DEL JUEGO ---

const partidas = {};

const NOMBRES_PATRONES = {
    linea: "Línea Simple",
    carton_lleno: "Cartón Lleno",
    cuadrado: "Cuadrado (Marco)",
    letra_l: "Letra L",
    l_invertida: "L Invertida",
    cruz: "Letra X",
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
        const jugadores = partidas[clave].jugadores.map(j => ({
            nombre: j.nombre,
            esAnfitrion: j.esAnfitrion
        }));
        io.to(clave).emit('actualizarLobby', { jugadores: jugadores });
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
            // 3. Chequear Diagonales
            const d1 = Array.from({length:5}, (_, i) => ({r:i, c:i})); // \
            const winD1 = checkCoords(d1);
            if (winD1) return winD1;

            const d2 = Array.from({length:5}, (_, i) => ({r:i, c:4-i})); // /
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

        // --- B. LETRAS ---
        case 'letra_l': // Columna 0 + Fila 4 (|_ )
            const l_col0 = getColCoords(0);
            const l_fila4 = getFilaCoords(4);
            const coordsL = [...l_col0, ...l_fila4.slice(1)];
            return checkCoords(coordsL);

        case 'l_invertida': // Columna 4 + Fila 4 ( _| ) - La opuesta visual
            const li_col4 = getColCoords(4);
            const li_fila4 = getFilaCoords(4);
            // Unimos y evitamos duplicar la esquina (4,4)
            const coordsLInv = [...li_col4, ...li_fila4.filter(p => p.c !== 4)]; 
            return checkCoords(coordsLInv);

        case 'cruz': // Letra X
            const d1_x = Array.from({length:5}, (_, i) => ({r:i, c:i}));
            const d2_x = Array.from({length:5}, (_, i) => ({r:i, c:4-i}));
            // Unimos sin duplicar centro
            const coordsCruz = [...d1_x, ...d2_x.filter(p => p.r !== 2)];
            return checkCoords(coordsCruz);

        // --- C. DIAGONALES ---
        case 'diagonal_backslash': // De Arriba-Izq a Abajo-Der (\)
            const dBack = Array.from({length:5}, (_, i) => ({r:i, c:i}));
            return checkCoords(dBack);

        case 'diagonal_slash': // De Abajo-Izq a Arriba-Der (/)
            const dSlash = Array.from({length:5}, (_, i) => ({r:i, c:4-i}));
            return checkCoords(dSlash);

        // --- D. VERTICALES ---
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


function terminarJuego(clave) {
    const partida = partidas[clave];
    if (!partida || !partida.ganadoresTemp) return;

    // Convertimos el Set de fichas a Array para enviarlo
    const numerosSorteados = Array.from(partida.fichasSorteadasSet);

    // Emitimos el evento final con la LISTA de ganadores
    io.to(clave).emit('juegoTerminado', {
        listaGanadores: partida.ganadoresTemp, // Array de ganadores
        numerosSorteados: numerosSorteados
    });

    // Limpieza de partida
    partida.juegoIniciado = false;
    partida.cierreEnCurso = false;
    partida.ganadoresTemp = null;
    partida.bombo = [];
    partida.fichasSorteadasSet.clear();
    partida.fichasHistorial = [];
    console.log(`Partida ${clave} finalizada con ${partida.ganadoresTemp?.length || 0} ganadores.`);
}


// --- Lógica de Conexión ---
io.on('connection', (socket) => {
    console.log(`Nuevo cliente conectado: ${socket.id}`);

    // -- Evento: Crear Partida --
    socket.on('crearPartida', (datos) => {
        const nombreAnfitrion = datos.nombre;
        const clave = generarClave();
        const playerId = generarPlayerId(); // ¡NUEVO!

        partidas[clave] = {
            clave: clave,
            anfitrionId: socket.id,
            jugadores: [],
            patronJuego: 'linea',
            juegoIniciado: false,
            bombo: [],
            fichasSorteadasSet: new Set(),
            fichasHistorial: [] // ¡NUEVO! Guardamos el historial de fichas con letra
        };

        const anfitrion = {
            id: socket.id,
            playerId: playerId, // ¡NUEVO!
            nombre: nombreAnfitrion,
            esAnfitrion: true,
            cartilla: null
        };
        partidas[clave].jugadores.push(anfitrion);

        socket.join(clave);
        // ¡NUEVO! Enviamos el playerId al anfitrión
        socket.emit('partidaCreada', { clave: clave, playerId: playerId });
        actualizarLobby(clave);
        console.log(`Partida creada por ${nombreAnfitrion} (${socket.id}). Clave: ${clave}`);
    });

    // -- Evento: Unirse a Partida --
    socket.on('unirsePartida', (datos) => {
        const { nombre, clave } = datos;
        if (!partidas[clave]) {
            socket.emit('errorUnion', 'Error: Esa clave de partida no existe.');
            return;
        }
        if (partidas[clave].juegoIniciado) {
            socket.emit('errorUnion', 'Error: ¡El juego ya ha comenzado!');
            return;
        }
        
        const playerId = generarPlayerId(); // ¡NUEVO!
        const nuevoJugador = {
            id: socket.id,
            playerId: playerId, // ¡NUEVO!
            nombre: nombre,
            esAnfitrion: false,
            cartilla: generarCartilla()
        };
        partidas[clave].jugadores.push(nuevoJugador);

        socket.join(clave);
        // ¡NUEVO! Enviamos el playerId al jugador
        socket.emit('unionExitosa', { clave: clave, playerId: playerId });
        actualizarLobby(clave);
        console.log(`Jugador ${nombre} (${socket.id}) se unió a la partida ${clave}`);
    });

// --- ¡NUEVO EVENTO: Reconexión! ---
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
            
            // 2. Lo volvemos a meter en la sala
            socket.join(claveEncontrada);

            // 3. Le enviamos el "paquete de reconexión"
            const datosReconexion = {
                esAnfitrion: jugadorEncontrado.esAnfitrion,
                nombre: jugadorEncontrado.nombre, // <--- ¡AQUÍ ESTÁ LA CORRECCIÓN! Enviamos el nombre guardado
                patronTexto: NOMBRES_PATRONES[partidaEncontrada.patronJuego],
                fichasHistorial: partidaEncontrada.fichasHistorial
            };

            if (jugadorEncontrado.esAnfitrion) {
                if (partidaEncontrada.fichasHistorial.length > 0) {
                    datosReconexion.ultimaFicha = partidaEncontrada.fichasHistorial[partidaEncontrada.fichasHistorial.length - 1];
                    if (partidaEncontrada.fichasHistorial.length > 1) {
                        datosReconexion.anteriorFicha = partidaEncontrada.fichasHistorial[partidaEncontrada.fichasHistorial.length - 2];
                    }
                }
            } else {
                datosReconexion.cartilla = jugadorEncontrado.cartilla;
            }
            
            socket.emit('reconexionExitosa', datosReconexion);
            actualizarLobby(claveEncontrada);

        } else {
            console.log(`PlayerId ${playerId} no encontrado. Forzando limpieza.`);
            socket.emit('forzarLimpieza'); 
        }
    });

    // -- Evento: Empezar Partida --
    socket.on('empezarPartida', (datos) => {
        const { patron } = datos;
        const clave = Array.from(socket.rooms)[1];
        if (!partidas[clave] || partidas[clave].anfitrionId !== socket.id) return;

        console.log(`Anfitrión ${socket.id} inicia la partida ${clave} con patrón ${patron}`);
        
        const partida = partidas[clave];
        partida.juegoIniciado = true;
        partida.patronJuego = patron;
        partida.bombo = generarBombo();
        partida.fichasSorteadasSet.clear();
        partida.fichasHistorial = []; // ¡NUEVO! Limpiamos historial

        partida.jugadores.forEach(jugador => {
            const socketJugador = io.sockets.sockets.get(jugador.id);
            if (!socketJugador) return;

            let datosPartida = {
                patronTexto: NOMBRES_PATRONES[patron] || "Línea Simple"
            };
            if (!jugador.esAnfitrion) {
                datosPartida.cartilla = jugador.cartilla;
            }
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
    }
});

    // -- Evento: Desconexión --
    socket.on('disconnect', () => {
        console.log(`Cliente desconectado: ${socket.id}`);
        
        // ¡NUEVO! La lógica de desconexión cambia.
        // Ya no borramos al jugador, solo lo marcamos como "desconectado"
        // El verdadero borrado ocurre si el ANFITRIÓN se va.

        let clavePartida = null;
        let jugadorDesconectado = null;

        for (const clave in partidas) {
            const partida = partidas[clave];
            const indice = partida.jugadores.findIndex(j => j.id === socket.id);

            if (indice !== -1) {
                clavePartida = clave;
                jugadorDesconectado = partida.jugadores[indice];
                
                // Si el anfitrión se desconecta, matamos la partida
                if (jugadorDesconectado.esAnfitrion) {
                    console.log(`Anfitrión se desconectó. Cerrando sala ${clave}`);
                    // ¡NUEVO! Emitimos el error ANTES de borrar la partida
                    io.to(clave).emit('errorJuego', '¡El anfitrión se ha desconectado! Juego terminado.');
                    delete partidas[clave];
                } else {
                    // Si un jugador se va ANTES de que empiece el juego, lo sacamos
                    if (!partida.juegoIniciado) {
                         partida.jugadores.splice(indice, 1)[0];
                         console.log(`Jugador ${jugadorDesconectado.nombre} salió del lobby ${clavePartida}`);
                         actualizarLobby(clavePartida);
                    }
                    // Si el juego YA EMPEZÓ, no lo borramos,
                    // solo dejamos de tener su 'socket.id'.
                    // Podrá reconectarse con su 'playerId'.
                }
                break;
            }
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