#include <WiFi.h>
#include <HTTPClient.h>

/* ================= CONFIGURACIÓN ================= */
const char* ssid     = "erick_2.4G";
const char* password = "secom100";
// Asegúrate de que esta IP sea la correcta de tu PC con Flask
const char* server   = "http://192.168.0.102:5000/datos";

/* ================= UART FPGA ================= */
// Usamos el Serial 2 del ESP32 (Pines 16 RX y 17 TX)
HardwareSerial SerialFPGA(2);

/* ================= VARIABLES ================= */
String vehiculo  = "camion_1";
String estado    = "activo";
String puerta    = "cerrada";
int    alerta    = 0;
int    vibracion = 0;

// Variables para comparar y detectar cambios
String estadoAnterior    = "";
String puertaAnterior    = "";
int    alertaAnterior    = -1;
int    vibracionAnterior = -1;

unsigned long ultimoEnvio = 0;
// Intervalo configurable desde config.py (convertido a ms)
const unsigned long INTERVALO_MAXIMO = 1500; 

/* ================= SETUP ================= */
void setup() {
  // Monitor Serial para depuración
  Serial.begin(115200);

  // Comunicación con la FPGA: Ambos deben estar a la misma velocidad.
  // Si tu FPGA transmite a 115200, deja este valor.
  SerialFPGA.begin(115200, SERIAL_8N1, 16, 17);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi conectado: " + WiFi.localIP().toString());
}

/* ================= LOOP ================= */
void loop() {
  // Verificación de conexión
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
    delay(1000);
    return;
  }

  // 1. Revisar si entró algo por el puerto de la FPGA
  bool huboDato = leerUART_FPGA();

  // 2. Detectar si el estado actual es diferente al que enviamos la última vez
  bool cambioReal = (estado    != estadoAnterior)
                 || (puerta    != puertaAnterior)
                 || (alerta    != alertaAnterior)
                 || (vibracion != vibracionAnterior);

  unsigned long ahora = millis();
  bool tiempoExcedido = (ahora - ultimoEnvio) >= INTERVALO_MAXIMO;

  // 3. ENVIAR SOLO SI: Hay un cambio real O si ya pasó el tiempo de seguridad
  if (cambioReal || tiempoExcedido) {
    enviarDatos();
    ultimoEnvio = ahora;

    // Actualizamos el historial para la siguiente comparación
    estadoAnterior    = estado;
    puertaAnterior    = puerta;
    alertaAnterior    = alerta;
    vibracionAnterior = vibracion;
  }

  // Delay mínimo de 10ms para estabilidad del procesador
  delay(10);
}

/* ================= LEER FPGA ================= */
bool leerUART_FPGA() {
  bool recibiAlgo = false;

  while (SerialFPGA.available()) {
    char dato = SerialFPGA.read();
    recibiAlgo = true;

    Serial.print("FPGA dice: ");
    Serial.println(dato);

    if (dato == 'A') {
      estado = "alerta";
      alerta = 1;
      vibracion = 1;
      puerta = "cerrada";
    }
    else if (dato == 'P') {
      estado = "alerta";
      alerta = 1;
      vibracion = 0;
      puerta = "abierta";
    }
    else if (dato == 'B') {
      estado = "alerta";
      alerta = 1;
      vibracion = 1;
      puerta = "abierta";
    }
    else if (dato == 'N') {
      estado = "activo";
      alerta = 0;
      vibracion = 0;
      puerta = "cerrada";
    }
  }
  return recibiAlgo;
}

/* ================= ENVIAR A FLASK ================= */
void enviarDatos() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  
  // Iniciamos la conexión al servidor
  http.begin(server);
  http.addHeader("Content-Type", "application/json");
  
  // Timeout corto: Si el servidor no responde en 800ms, abortamos 
  // para no congelar la lectura de la FPGA.
  http.setTimeout(800);

  // Construcción manual del JSON
  String json = "{";
  json += "\"vehiculo\":\""  + vehiculo        + "\",";
  json += "\"estado\":\""    + estado          + "\",";
  json += "\"alerta\":"      + String(alerta)  + ",";
  json += "\"puerta\":\""    + puerta          + "\",";
  json += "\"vibracion\":"   + String(vibracion);
  json += "}";

  Serial.println(">>> Enviando a Flask...");
  
  int code = http.POST(json);

  if (code > 0) {
    Serial.print("Servidor respondió: ");
    Serial.println(code);
  } else {
    Serial.print("Error en envío: ");
    Serial.println(http.errorToString(code).c_str());
  }

  http.end();
}