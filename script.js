//=========================================================
// HIVEMQ CLOUD
//=========================================================

const broker = "wss://e999dc5e80ac4cefbf2e13e3e60d378c.s1.eu.hivemq.cloud:8884/mqtt";

const HISTORIAL_API = "/api/historial";

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

let historialVisible = false;

const historialCache = [];

btnHistorial.addEventListener("click", () => {

    historialVisible = !historialVisible;

    bloqueHistorial.classList.toggle("oculto", !historialVisible);

    btnHistorial.textContent = historialVisible ? "Ocultar historial" : "Ver historial";

    if(historialVisible){

        renderHistorial();

    }

});

function formatearFechaYHora(fecha){

    const fechaLocal = fecha.toLocaleDateString("es-ES");
    const horaLocal = fecha.toLocaleTimeString("es-ES", {hour12: false});

    return {fechaLocal, horaLocal};

}

function registrarDeteccion(puntoCardinal){

    const sensor = estadoSensores[puntoCardinal];

    if(sensor.registradoEnCiclo){

        return;

    }

    if(sensor.distancia === null || sensor.distancia === undefined || sensor.distancia === ""){

        return;

    }

    const ahora = new Date();
    const tiempos = formatearFechaYHora(ahora);

    return fetch(HISTORIAL_API, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            punto_cardinal: puntoCardinal,
            distancia: Number(sensor.distancia),
            fecha_deteccion: tiempos.fechaLocal,
            hora_deteccion: tiempos.horaLocal
        })
    })
    .then(respuesta => {

        if(!respuesta.ok){

            throw new Error("No fue posible guardar el historial");

        }

        sensor.registradoEnCiclo = true;

        if(historialVisible){

            cargarHistorial();

        }

    })
    .catch(error => {

        console.error(error);

    });

}

function renderHistorial(){

    if(!cuerpoHistorial){

        return;

    }

    const filas = historialCache;

    cuerpoHistorial.innerHTML = filas.length ? filas.map(({punto_cardinal, distancia, fecha_deteccion, hora_deteccion}) => `\n<tr>\n<td>${punto_cardinal}</td>\n<td>${distancia} cm</td>\n<td>${fecha_deteccion}</td>\n<td>${hora_deteccion}</td>\n</tr>`).join("") : `\n<tr>\n<td colspan="4" class="sin-registros">Sin registros aún</td>\n</tr>`;

}

function cargarHistorial(){

    return fetch(HISTORIAL_API)
        .then(respuesta => {

            if(!respuesta.ok){

                throw new Error("No fue posible cargar el historial");

            }

            return respuesta.json();

        })
        .then(registros => {

            historialCache.length = 0;
            historialCache.push(...registros);

            if(historialVisible){

                renderHistorial();

            }

        })
        .catch(error => {

            console.error(error);

            historialCache.length = 0;

            if(historialVisible){

                renderHistorial();

            }

        });

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

        registrarDeteccion(puntoCardinal);

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
            registrarDeteccion("NORTE");

        break;

        case "DIST_SUR":

            distSur.innerHTML=dato+" cm";

            tablaSur.innerHTML=dato+" cm";

            estadoSensores.SUR.distancia = dato;
            registrarDeteccion("SUR");

        break;

        case "DIST_ESTE":

            distEste.innerHTML=dato+" cm";

            tablaEste.innerHTML=dato+" cm";

            estadoSensores.ESTE.distancia = dato;
            registrarDeteccion("ESTE");

        break;

        case "DIST_OESTE":

            distOeste.innerHTML=dato+" cm";

            tablaOeste.innerHTML=dato+" cm";

            estadoSensores.OESTE.distancia = dato;
			registrarDeteccion("OESTE");

        break;

    }

});

cargarHistorial();