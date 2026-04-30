#include <WiFi.h>
#include <HTTPClient.h>

/* ================= CONFIGURACIÓN ================= */
const char* ssid     = "erick_2.4G";
const char* password = "secom100";
const char* server   = "https://tracksecurity.up.railway.app/datos";

/* ================= UART FPGA ================= */
HardwareSerial SerialFPGA(2);

/* ================= VARIABLES ================= */
String vehiculo  = "camion_1";
String estado    = "activo";
String puerta    = "cerrada";
int    alerta    = 0;
int    vibracion = 0;

/* ================= GPS SIMULADO ================= */
float lat = 16.7569;
float lng = -93.1292;

/* Movimiento simulado */
unsigned long lastGPSUpdate = 0;

/* ================= CONTROL DE CAMBIOS ================= */
String estadoAnterior    = "";
String puertaAnterior    = "";
int    alertaAnterior    = -1;
int    vibracionAnterior = -1;

unsigned long ultimoEnvio = 0;
const unsigned long INTERVALO_MAXIMO = 1500;

/* ======= CONTROL DE RECONEXIÓN WIFI ======= */
unsigned long ultimoIntentoWiFi = 0;

/* ================= SETUP ================= */
void setup() {
  Serial.begin(115200);
  SerialFPGA.begin(115200, SERIAL_8N1, 16, 17);

  WiFi.begin(ssid, password);

  Serial.print("Conectando a WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi conectado: " + WiFi.localIP().toString());
}

/* ================= LOOP ================= */
void loop() {

  /* ======= WIFI ======= */
  if (WiFi.status() != WL_CONNECTED) {
    unsigned long ahora = millis();

    if (ahora - ultimoIntentoWiFi > 5000) {
      Serial.println("Intentando reconectar WiFi...");
      WiFi.disconnect();
      WiFi.begin(ssid, password);
      ultimoIntentoWiFi = ahora;
    }

    return;
  }

  /* ================= GPS SIMULADO ================= */
  simularGPS();

  /* ================= FPGA ================= */
  bool huboDato = leerUART_FPGA();

  /* ================= CAMBIOS ================= */
  bool cambioReal = (estado    != estadoAnterior)
                 || (puerta    != puertaAnterior)
                 || (alerta    != alertaAnterior)
                 || (vibracion != vibracionAnterior);

  unsigned long ahora = millis();
  bool tiempoExcedido = (ahora - ultimoEnvio) >= INTERVALO_MAXIMO;

  /* ================= ENVÍO ================= */
  if (cambioReal || tiempoExcedido) {
    enviarDatos();
    ultimoEnvio = ahora;

    estadoAnterior    = estado;
    puertaAnterior    = puerta;
    alertaAnterior    = alerta;
    vibracionAnterior = vibracion;
  }

  delay(10);
}

/* ================= SIMULAR GPS ================= */
void simularGPS() {
  unsigned long ahora = millis();

  // Actualiza cada 1 segundo
  if (ahora - lastGPSUpdate > 1000) {
    lastGPSUpdate = ahora;

    // Movimiento leve (simula trayecto)
    lat += 0.00005;
    lng += 0.00005;

    Serial.print("GPS -> Lat: ");
    Serial.print(lat, 6);
    Serial.print(" | Lng: ");
    Serial.println(lng, 6);
  }
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

  http.begin(server);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(800);

  String json = "{";
  json += "\"vehiculo\":\""  + vehiculo        + "\",";
  json += "\"estado\":\""    + estado          + "\",";
  json += "\"alerta\":"      + String(alerta)  + ",";
  json += "\"puerta\":\""    + puerta          + "\",";
  json += "\"vibracion\":"   + String(vibracion) + ",";
  json += "\"lat\":"         + String(lat, 6)  + ",";
  json += "\"lng\":"         + String(lng, 6);
  json += "}";

  Serial.println(">>> Enviando a Flask...");
  Serial.println(json);

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