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
    letra_l: "Letra L",
    bordes: "Bordes (O)",
    cruz: "Cruz",
    carton_lleno: "Cartón Lleno"
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

function verificarBingo(cartilla, patron, fichasSet) {
    const checkFila = (fila) => {
        for (let col = 0; col < 5; col++) {
            if (!checkCelda(cartilla[fila][col], fichasSet)) return false;
        }
        return true;
    };
    const checkColumna = (col) => {
        for (let fila = 0; fila < 5; fila++) {
            if (!checkCelda(cartilla[fila][col], fichasSet)) return false;
        }
        return true;
    };
    switch (patron) {
        case 'linea':
            for (let f = 0; f < 5; f++) if (checkFila(f)) return true;
            for (let c = 0; c < 5; c++) if (checkColumna(c)) return true;
            let diag1 = true;
            for (let i = 0; i < 5; i++) if (!checkCelda(cartilla[i][i], fichasSet)) diag1 = false;
            if (diag1) return true;
            let diag2 = true;
            for (let i = 0; i < 5; i++) if (!checkCelda(cartilla[i][4 - i], fichasSet)) diag2 = false;
            if (diag2) return true;
            return false;
        case 'letra_l':
            return checkColumna(0) && checkFila(4);
        case 'bordes':
            const fila1 = checkFila(0);
            const fila5 = checkFila(4);
            let col1 = true, col5 = true;
            for (let f = 1; f < 4; f++) {
                if (!checkCelda(cartilla[f][0], fichasSet)) col1 = false;
                if (!checkCelda(cartilla[f][4], fichasSet)) col5 = false;
            }
            return fila1 && fila5 && col1 && col5;
        case 'cruz':
            return checkColumna(2) && checkFila(2);
        case 'carton_lleno':
            for (let f = 0; f < 5; f++) if (!checkFila(f)) return false;
            return true;
        default:
            return false;
    }
}
// --- Fin de funciones de verificación ---


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
            
            // 1. Actualizamos su ID de socket (el viejo ya no sirve)
            jugadorEncontrado.id = socket.id;
            
            // 2. Lo volvemos a meter en la sala
            socket.join(claveEncontrada);

            // 3. Le enviamos el "paquete de reconexión"
            const datosReconexion = {
                esAnfitrion: jugadorEncontrado.esAnfitrion,
                patronTexto: NOMBRES_PATRONES[partidaEncontrada.patronJuego],
                fichasHistorial: partidaEncontrada.fichasHistorial // ¡El historial completo!
            };

            if (jugadorEncontrado.esAnfitrion) {
                // Si es anfitrión, le mandamos la última ficha
                if (partidaEncontrada.fichasHistorial.length > 0) {
                    datosReconexion.ultimaFicha = partidaEncontrada.fichasHistorial[partidaEncontrada.fichasHistorial.length - 1];
                    if (partidaEncontrada.fichasHistorial.length > 1) {
                        datosReconexion.anteriorFicha = partidaEncontrada.fichasHistorial[partidaEncontrada.fichasHistorial.length - 2];
                    }
                }
            } else {
                // Si es jugador, le mandamos su cartilla
                datosReconexion.cartilla = jugadorEncontrado.cartilla;
            }
            
            // Enviamos el evento de reconexión SÓLO a él
            socket.emit('reconexionExitosa', datosReconexion);
            
            // Avisamos al lobby (opcional, pero bueno)
            actualizarLobby(claveEncontrada);

        } else {
            // No encontramos a nadie con ese playerId, es un "Pase VIP" inválido
            console.log(`PlayerId ${playerId} no encontrado. Forzando limpieza.`);
            socket.emit('forzarLimpieza'); // Le decimos al cliente que borre ese ID
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
        let clave = null;
        for (const k in partidas) {
            if (partidas[k].jugadores.find(j => j.id === socket.id)) {
                clave = k;
                break;
            }
        }

        if (!clave) {
            console.log(`Error: El socket ${socket.id} cantó bingo pero no está en ninguna partida.`);
            return socket.emit('bingoFalso');
        }
        
        const partida = partidas[clave];
        const jugador = partida.jugadores.find(j => j.id === socket.id);

        if (!jugador || !partida || !partida.juegoIniciado) {
            console.log(`Error: Canto de bingo inválido del jugador ${jugador?.nombre}.`);
            return socket.emit('bingoFalso');
        }
        
        console.log(`Jugador ${jugador.nombre} está cantando BINGO... verificando...`);
        const esValido = verificarBingo(jugador.cartilla, partida.patronJuego, partida.fichasSorteadasSet);

        if (esValido) {
            console.log(`¡BINGO VÁLIDO para ${jugador.nombre}!`);
            io.to(clave).emit('juegoTerminado', { nombreGanador: jugador.nombre });
            
            partida.juegoIniciado = false; 
            partida.bombo = [];
            partida.fichasSorteadasSet.clear();
            // OJO: No limpiamos el historial, puede ser útil verlo en el lobby
            // partida.fichasHistorial = [];

        } else {
            console.log(`Bingo Falso para ${jugador.nombre}`);
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