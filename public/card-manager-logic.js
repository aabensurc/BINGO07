// card-manager-logic.js

const CardManager = {
    COLECCION_KEY: 'bingoCartonesColeccion',
    ACTIVO_KEY: 'bingoCartonActivoId',

    // --- MÉTODOS DE DATOS ---

    obtenerColeccion: function() {
        const data = localStorage.getItem(this.COLECCION_KEY);
        return data ? JSON.parse(data) : [];
    },

    guardarColeccion: function(coleccion) {
        localStorage.setItem(this.COLECCION_KEY, JSON.stringify(coleccion));
    },

    obtenerIdActivo: function() {
        return localStorage.getItem(this.ACTIVO_KEY);
    },

    fijarIdActivo: function(id) {
        if(id) {
            localStorage.setItem(this.ACTIVO_KEY, id);
        } else {
            localStorage.removeItem(this.ACTIVO_KEY);
        }
    },

/**
     * Guarda el cartón actual como favorito.
     */
    guardarFavorito: function(cartilla) {
        let coleccion = this.obtenerColeccion();
        let idActivo = this.obtenerIdActivo();
        let cartonGuardado = null;

        // 1. Si tenemos un ID activo, significa que estamos EDITANDO un favorito existente.
        if (idActivo) {
            cartonGuardado = coleccion.find(c => c.id === idActivo);
        }

        if (cartonGuardado) {
            // ACTUALIZAR EXISTENTE: Solo actualizamos la fecha, mantenemos el nombre y ID.
            cartonGuardado.cartilla = cartilla; 
            cartonGuardado.fecha = new Date().toISOString();
        } else {
            // CREAR NUEVO: No había ID activo (era un cartón temporal/aleatorio).
            // Generamos un ID único basado en tiempo y azar para evitar colisiones.
            const nuevoId = 'carton_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
            const nuevoNombre = `Cartón ${coleccion.length + 1}`;
            
            cartonGuardado = {
                id: nuevoId,
                nombre: nuevoNombre,
                cartilla: cartilla,
                fecha: new Date().toISOString()
            };
            coleccion.push(cartonGuardado);
            
            // IMPORTANTE: Ahora este nuevo cartón pasa a ser el ACTIVO.
            this.fijarIdActivo(nuevoId);
        }

        this.guardarColeccion(coleccion);
        return true; 
    },

    /**
     * Elimina el cartón activo de la colección (Acción del Toggle OFF).
     */
    eliminarActivoDeColeccion: function() {
        const idActivo = this.obtenerIdActivo();
        if (!idActivo) return; // No hay nada que borrar

        let coleccion = this.obtenerColeccion();
        // Filtramos para quitar el activo
        coleccion = coleccion.filter(c => c.id !== idActivo);
        
        this.guardarColeccion(coleccion);
        this.fijarIdActivo(null); // Limpiamos el puntero
    },

    eliminarCartonPorId: function(id) {
        let coleccion = this.obtenerColeccion();
        coleccion = coleccion.filter(c => c.id !== id);
        this.guardarColeccion(coleccion);
        
        // Si borramos el que estaba activo, limpiamos el puntero
        if (this.obtenerIdActivo() === id) {
            this.fijarIdActivo(null);
        }
        this.renderizarModal(); // Refrescar vista
    },

    actualizarNombre: function(id, nuevoNombre) {
        let coleccion = this.obtenerColeccion();
        const carton = coleccion.find(c => c.id === id);
        if (carton) {
            carton.nombre = nuevoNombre;
            this.guardarColeccion(coleccion);
        }
    },

    // --- MÉTODOS DE UI (MODAL) ---

    abrirModal: function() {
        const modal = document.getElementById('modalGestorCartones');
        if(modal) {
            modal.classList.add('visible');
            this.renderizarModal();
        }
    },

    cerrarModal: function() {
        const modal = document.getElementById('modalGestorCartones');
        if(modal) modal.classList.remove('visible');
    },

    seleccionarCarton: function(carton) {
        // 1. Establecer como activo persistente
        this.fijarIdActivo(carton.id);
        
        // 2. Cargar en variable global (integración con client.js)
        if (typeof recibirCartonDesdeGestor === 'function') {
            recibirCartonDesdeGestor(carton.cartilla);
        }

        // 3. Cerrar
        this.cerrarModal();
    },

    renderizarModal: function() {
        const contenedor = document.getElementById('gridCartonesGuardados');
        if(!contenedor) return;
        contenedor.innerHTML = '';

        const coleccion = this.obtenerColeccion();
        const idActivo = this.obtenerIdActivo();

        if (coleccion.length === 0) {
            contenedor.innerHTML = '<p style="text-align:center; width:100%; color:#888;">No tienes cartones guardados.</p>';
            return;
        }

        coleccion.forEach(carton => {
            const div = document.createElement('div');
            div.className = `carton-item ${carton.id === idActivo ? 'activo' : ''}`;

            // Botón Eliminar
            const btnDel = document.createElement('button');
            btnDel.className = 'btn-eliminar-carton';
            btnDel.textContent = '✕';
            btnDel.onclick = (e) => { e.stopPropagation(); this.eliminarCartonPorId(carton.id); };

            // Miniatura Visual (Reutilizamos dibujarCartillaModerna si existe)
            const divMini = document.createElement('div');
            divMini.className = 'mini-cartilla-visual';
            if (typeof dibujarCartillaModerna === 'function') {
                dibujarCartillaModerna(carton.cartilla, divMini);
            }

            // Input Nombre
            const inputNom = document.createElement('input');
            inputNom.className = 'input-nombre-carton';
            inputNom.value = carton.nombre;
            inputNom.onchange = (e) => this.actualizarNombre(carton.id, e.target.value);

            // Botón Usar
            const btnUsar = document.createElement('button');
            btnUsar.className = 'btn-usar-este';
            btnUsar.textContent = (carton.id === idActivo) ? 'EN USO' : 'USAR ESTE';
            btnUsar.disabled = (carton.id === idActivo);
            btnUsar.onclick = () => this.seleccionarCarton(carton);

            div.appendChild(btnDel);
            div.appendChild(divMini);
            div.appendChild(inputNom);
            div.appendChild(btnUsar);

            contenedor.appendChild(div);
        });
    }
};