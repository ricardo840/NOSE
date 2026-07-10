//=========================================================
// HIVEMQ CLOUD
//=========================================================

const broker = "wss://e999dc5e80ac4cefbf2e13e3e60d378c.s1.eu.hivemq.cloud:8884/mqtt";

const SQLITE_STORAGE_KEY = "cords_sqlite_history";

const SQLJS_WASM_PATH = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.11.0/";

const options = {

    username: "SG",

    password: "BRAYANSG22",

    clientId: "Panel_" + Math.random().toString(16).substring(2,10),

    clean: true,

    reconnectPeriod: 3000,

    keepalive: 60,

    connectTimeout: 30000,

    protocolVersion: 4

};

const client = mqtt.connect(broker, options);

//=========================================================
// OBJETOS HTML
//=========================================================

const estado = document.getElementById("estado");

const ledNorte = document.getElementById("ledNorte");
const ledSur = document.getElementById("ledSur");
const ledEste = document.getElementById("ledEste");
const ledOeste = document.getElementById("ledOeste");

const lblNorte = document.getElementById("lblNorte");
const lblSur = document.getElementById("lblSur");
const lblEste = document.getElementById("lblEste");
const lblOeste = document.getElementById("lblOeste");

const distNorte = document.getElementById("distNorte");
const distSur = document.getElementById("distSur");
const distEste = document.getElementById("distEste");
const distOeste = document.getElementById("distOeste");

const tablaNorte = document.getElementById("tablaNorte");
const tablaSur = document.getElementById("tablaSur");
const tablaEste = document.getElementById("tablaEste");
const tablaOeste = document.getElementById("tablaOeste");

const btnHistorial = document.getElementById("btnHistorial");
const bloqueHistorial = document.getElementById("bloqueHistorial");
const cuerpoHistorial = document.getElementById("cuerpoHistorial");

const estadoSensores = {
    NORTE: {activo: false, registradoEnCiclo: false, distancia: null},
    SUR: {activo: false, registradoEnCiclo: false, distancia: null},
    ESTE: {activo: false, registradoEnCiclo: false, distancia: null},
    OESTE: {activo: false, registradoEnCiclo: false, distancia: null}

};

let SQL = null;

let db = null;

let historialVisible = false;

const dbReady = initSqlJs({
    locateFile: archivo => SQLJS_WASM_PATH + archivo

}).then(SQLLib => {

    SQL = SQLLib;

    db = cargarBaseDeDatos();

    crearTablaHistorial();

    renderHistorial();

}).catch(error => {

    console.error("No fue posible inicializar SQLite", error);

});

btnHistorial.addEventListener("click", () => {

    historialVisible = !historialVisible;

    bloqueHistorial.classList.toggle("oculto", !historialVisible);

    btnHistorial.textContent = historialVisible ? "Ocultar historial" : "Ver historial";

    if(historialVisible){

        renderHistorial();

    }

});

function cargarBaseDeDatos(){

    const guardado = localStorage.getItem(SQLITE_STORAGE_KEY);

    const base = guardado ? new SQL.Database(base64ToUint8Array(guardado)) : new SQL.Database();

    return base;

}

function crearTablaHistorial(){

    db.run(`
        CREATE TABLE IF NOT EXISTS historial (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            punto_cardinal TEXT NOT NULL,
            distancia REAL,
            fecha_deteccion TEXT NOT NULL,
            hora_deteccion TEXT NOT NULL
        )
    `);

    guardarBaseDeDatos();

}

function guardarBaseDeDatos(){

    const bytes = db.export();
    const base64 = uint8ArrayToBase64(bytes);

    localStorage.setItem(SQLITE_STORAGE_KEY, base64);

}

function uint8ArrayToBase64(bytes){

    let cadena = "";

    for(const byte of bytes){

        cadena += String.fromCharCode(byte);

    }

    return btoa(cadena);

}

function base64ToUint8Array(base64){

    const cadena = atob(base64);
    const bytes = new Uint8Array(cadena.length);

    for(let indice = 0; indice < cadena.length; indice += 1){

        bytes[indice] = cadena.charCodeAt(indice);

    }

    return bytes;

}

function formatearFechaYHora(fecha){

    const fechaLocal = fecha.toLocaleDateString("es-ES");
    const horaLocal = fecha.toLocaleTimeString("es-ES", {hour12: false});

    return {fechaLocal, horaLocal};

}

function registrarDeteccion(puntoCardinal){

    if(!db){

        return;

    }

    const sensor = estadoSensores[puntoCardinal];

    if(sensor.registradoEnCiclo){

        return;

    }

    if(sensor.distancia === null || sensor.distancia === undefined || sensor.distancia === ""){

        return;

    }

    const ahora = new Date();
    const tiempos = formatearFechaYHora(ahora);

    db.run(
        "INSERT INTO historial (punto_cardinal, distancia, fecha_deteccion, hora_deteccion) VALUES (?, ?, ?, ?)",
        [puntoCardinal, Number(sensor.distancia), tiempos.fechaLocal, tiempos.horaLocal]
    );

    sensor.registradoEnCiclo = true;
    guardarBaseDeDatos();

    if(historialVisible){

        renderHistorial();

    }

}

function renderHistorial(){

    if(!db || !cuerpoHistorial){

        return;

    }

    const registros = db.exec("SELECT punto_cardinal, distancia, fecha_deteccion, hora_deteccion FROM historial ORDER BY id DESC");

    const filas = registros.length ? registros[0].values : [];

    cuerpoHistorial.innerHTML = filas.length ? filas.map(([punto, distancia, fecha, hora]) => `\n<tr>\n<td>${punto}</td>\n<td>${distancia} cm</td>\n<td>${fecha}</td>\n<td>${hora}</td>\n</tr>`).join("") : `\n<tr>\n<td colspan="4" class="sin-registros">Sin registros aún</td>\n</tr>`;

}

function procesarEstadoSensor(puntoCardinal, valor){

    const sensor = estadoSensores[puntoCardinal];
    const estadoActivo = Number(valor) === 1;

    if(estadoActivo && !sensor.activo){

        sensor.registradoEnCiclo = false;

    }

    if(!estadoActivo){

        sensor.registradoEnCiclo = false;

    }

    sensor.activo = estadoActivo;

    if(estadoActivo){

        dbReady.then(() => registrarDeteccion(puntoCardinal));

    }

}

//=========================================================
// CONEXIÓN
//=========================================================

client.on("connect", ()=>{

    console.clear();

    console.log("Conectado");

    estado.innerHTML="Conectado";

    estado.className="conectado";

    client.subscribe("NORTE");
    client.subscribe("SUR");
    client.subscribe("ESTE");
    client.subscribe("OESTE");

    client.subscribe("DIST_NORTE");
    client.subscribe("DIST_SUR");
    client.subscribe("DIST_ESTE");
    client.subscribe("DIST_OESTE");

});

//=========================================================

client.on("offline",()=>{

    estado.innerHTML="Desconectado";

    estado.className="desconectado";

});

//=========================================================

client.on("reconnect",()=>{

    estado.innerHTML="Reconectando...";

    estado.className="reconectando";

});

//=========================================================

client.on("error",(e)=>{

    console.log(e);

});

//=========================================================
// FUNCIONES
//=========================================================

function actualizarLed(led,activo){

    if(activo){

        led.classList.remove("inactivo");

        led.classList.add("activo");

    }

    else{

        led.classList.remove("activo");

        led.classList.add("inactivo");

    }

}

//=========================================================

function actualizarEstado(label,valor){

    if(valor==1){

        label.innerHTML="Detectado";

        label.style.color="#00ff55";

    }

    else{

        label.innerHTML="Libre";

        label.style.color="#ff4444";

    }

}

//=========================================================
// MENSAJES MQTT
//=========================================================

client.on("message",(topic,message)=>{

    let dato=message.toString();

    console.log(topic+" -> "+dato);

    switch(topic){

        //==========================
        // NORTE
        //==========================

        case "NORTE":

            actualizarLed(ledNorte,Number(dato));

            actualizarEstado(lblNorte,Number(dato));

			procesarEstadoSensor("NORTE", dato);

        break;

        //==========================
        // SUR
        //==========================

        case "SUR":

            actualizarLed(ledSur,Number(dato));

            actualizarEstado(lblSur,Number(dato));

			procesarEstadoSensor("SUR", dato);

        break;

        //==========================
        // ESTE
        //==========================

        case "ESTE":

            actualizarLed(ledEste,Number(dato));

            actualizarEstado(lblEste,Number(dato));

			procesarEstadoSensor("ESTE", dato);

        break;

        //==========================
        // OESTE
        //==========================

        case "OESTE":

            actualizarLed(ledOeste,Number(dato));

            actualizarEstado(lblOeste,Number(dato));

			procesarEstadoSensor("OESTE", dato);

        break;

        //==========================
        // DISTANCIAS
        //==========================

        case "DIST_NORTE":

            distNorte.innerHTML=dato+" cm";

            tablaNorte.innerHTML=dato+" cm";

			estadoSensores.NORTE.distancia = dato;
			dbReady.then(() => registrarDeteccion("NORTE"));

        break;

        case "DIST_SUR":

            distSur.innerHTML=dato+" cm";

            tablaSur.innerHTML=dato+" cm";

			estadoSensores.SUR.distancia = dato;
			dbReady.then(() => registrarDeteccion("SUR"));

        break;

        case "DIST_ESTE":

            distEste.innerHTML=dato+" cm";

            tablaEste.innerHTML=dato+" cm";

			estadoSensores.ESTE.distancia = dato;
			dbReady.then(() => registrarDeteccion("ESTE"));

        break;

        case "DIST_OESTE":

            distOeste.innerHTML=dato+" cm";

            tablaOeste.innerHTML=dato+" cm";

			estadoSensores.OESTE.distancia = dato;
			dbReady.then(() => registrarDeteccion("OESTE"));

        break;

    }

});