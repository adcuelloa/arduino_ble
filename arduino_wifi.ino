#include <Arduino.h>
#include <ESP32Servo.h>
#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>

// ==========================================================
// --- CONFIGURACIÓN DE FUNCIONALIDADES ---
const bool SENSOR_ULTRASONICO_CONECTADO = false;

// --- CONFIGURACIÓN WIFI ---
// Elige uno de los dos modos:
// MODO 1: Access Point (AP) - El ESP32 crea su propia red WiFi
// MODO 2: Station (STA) - El ESP32 se conecta a una red WiFi existente

#define USE_ACCESS_POINT true // true = Access Point, false = Station

#if USE_ACCESS_POINT
// Configuración Access Point (el ESP32 crea su propia red)
const char *AP_SSID = "ADCA07";
const char *AP_PASSWORD = "robot12345";
const IPAddress AP_IP(192, 168, 4, 1);
const IPAddress AP_GATEWAY(192, 168, 4, 1);
const IPAddress AP_SUBNET(255, 255, 255, 0);
#else
// Configuración Station (conectarse a red WiFi existente)
const char *WIFI_SSID = "TU_RED_WIFI";     // 🔧 CAMBIAR: Nombre de tu red WiFi
const char *WIFI_PASSWORD = "tu_password"; // 🔧 CAMBIAR: Contraseña de tu red WiFi
#endif
// ==========================================================

// --- VARIABLES GLOBALES DEL SISTEMA ---
#define TRIG_PIN 10 // Pin Trig del HC-SR04
#define ECHO_PIN 12

Servo servo1;
int servoPin = 18;

// Bluetooth signal Store in this variable
char btSignal = 'X';
bool newSignalReceived = false;

// Variables para movimiento del servo no bloqueante
int servoTarget = 90;     // Posición objetivo del servo
int servoCurrentPos = 90; // Posición actual del servo
unsigned long lastServoUpdate = 0;
const int SERVO_DELAY = 10; // ms entre cada grado de movimiento

// NO usamos cola, solo el último comando recibido
// El frontend controla cuándo enviar comandos

// initial Speed
int Speed = 0;

// PWM Pin for Controlling the speed
int enA = 3;
int enB = 46;

// motor controlling pin
int IN1 = 19;
int IN2 = 20;
int IN3 = 14;
int IN4 = 21;

long distancia, d;
long duracion;

// --- SERVIDOR WIFI Y WEBSOCKET ---
AsyncWebServer server(80); // Servidor HTTP en puerto 80
AsyncWebSocket ws("/ws");  // WebSocket en ruta /ws
bool clientConnected = false;

// Variables para ACK
volatile bool ackRequested = false;
char lastReceivedForAck = 0;

// ==========================================================
// --- FUNCIONES DE WEBSOCKET ---
// ==========================================================

void onWsEvent(AsyncWebSocket *server, AsyncWebSocketClient *client,
               AwsEventType type, void *arg, uint8_t *data, size_t len)
{

  switch (type)
  {
  case WS_EVT_CONNECT:
    Serial.printf("WebSocket cliente #%u conectado desde %s\n",
                  client->id(), client->remoteIP().toString().c_str());
    clientConnected = true;
    // Enviar mensaje de bienvenida
    client->text("CONNECTED");
    break;

  case WS_EVT_DISCONNECT:
    Serial.printf("WebSocket cliente #%u desconectado\n", client->id());
    clientConnected = false;
    // Detener el robot por seguridad
    stop();
    break;

  case WS_EVT_DATA:
  {
    // Recibir comando del cliente
    AwsFrameInfo *info = (AwsFrameInfo *)arg;
    if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT)
    {
      data[len] = 0;            // Null-terminator
      char cmd = (char)data[0]; // Primer carácter es el comando

      // Guardar comando
      btSignal = cmd;
      newSignalReceived = true;

      // Marcar ACK pendiente
      lastReceivedForAck = cmd;
      ackRequested = true;

      Serial.printf("📥 Comando recibido: %c\n", cmd);
    }
  }
  break;

  case WS_EVT_PONG:
  case WS_EVT_ERROR:
    break;
  }
}

void sendAck(char command)
{
  if (clientConnected)
  {
    // Crear mensaje "ACK:X" donde X es el comando
    char ackMsg[6];
    ackMsg[0] = 'A';
    ackMsg[1] = 'C';
    ackMsg[2] = 'K';
    ackMsg[3] = ':';
    ackMsg[4] = command;
    ackMsg[5] = '\0';

    ws.textAll(ackMsg);
    Serial.printf("✅ ACK enviado: %s\n", ackMsg);
  }
  else
  {
    Serial.printf("❌ No se puede enviar ACK para '%c' - cliente desconectado\n", command);
  }
}

// --- FUNCIONES DE HARDWARE ---

long medirDistancia()
{
  // Generar pulso de trigger
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  // Medir la duración del pulso de echo con un timeout de 20ms (NUEVO)
  // Esto evita que el código se bloquee si el sensor no responde.
  duracion = pulseIn(ECHO_PIN, HIGH, 20000);
  // Conversión a cm. Si hay timeout, duracion es 0.
  d = duracion / 58.2;
  return d;
}

void abre()
{
  // Versión NO bloqueante - solo establece el objetivo
  servoTarget = 150;
}

void cierra()
{
  // Versión NO bloqueante - solo establece el objetivo
  servoTarget = 90;
}

void backward()
{
  analogWrite(enA, Speed);
  analogWrite(enB, Speed);

  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
}

void forward()
{
  analogWrite(enA, Speed);
  analogWrite(enB, Speed);

  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
}

void left()
{
  analogWrite(enA, Speed);
  analogWrite(enB, Speed);

  // Gira sobre su eje
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
}

void right()
{
  analogWrite(enA, Speed);
  analogWrite(enB, Speed);

  // Gira sobre su eje
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
}

void stop()
{
  // Desactiva PWM y pines de dirección
  analogWrite(enA, 0);
  analogWrite(enB, 0);

  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
}

// --- SETUP ---

void setup()
{
  Serial.begin(115200);
  Serial.println("\n\n=== ESP32 Robot Car - Modo WiFi ===");

  // ==========================================================
  // CONFIGURACIÓN WIFI
  // ==========================================================

#if USE_ACCESS_POINT
  // --- MODO ACCESS POINT ---
  Serial.println("Configurando Access Point...");

  WiFi.mode(WIFI_AP);
  WiFi.softAPConfig(AP_IP, AP_GATEWAY, AP_SUBNET);
  WiFi.softAP(AP_SSID, AP_PASSWORD);

  Serial.println("✅ Access Point iniciado");
  Serial.printf("SSID: %s\n", AP_SSID);
  Serial.printf("Password: %s\n", AP_PASSWORD);
  Serial.printf("IP: %s\n", WiFi.softAPIP().toString().c_str());
  Serial.printf("WebSocket: ws://%s/ws\n", WiFi.softAPIP().toString().c_str());

#else
  // --- MODO STATION (conectarse a red existente) ---
  Serial.println("Conectando a red WiFi...");
  Serial.printf("SSID: %s\n", WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  // Esperar hasta conectarse (con timeout de 20 segundos)
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40)
  {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.println("\n✅ Conectado a WiFi");
    Serial.printf("IP asignada: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("WebSocket: ws://%s/ws\n", WiFi.localIP().toString().c_str());
  }
  else
  {
    Serial.println("\n❌ Error: No se pudo conectar a la red WiFi");
    Serial.println("Verifica SSID y contraseña en el código");
    // Opcional: reintentar o cambiar a modo AP como respaldo
    while (true)
    {
      delay(1000); // Detener aquí
    }
  }
#endif

  // ==========================================================
  // CONFIGURACIÓN WEBSOCKET
  // ==========================================================

  ws.onEvent(onWsEvent);
  server.addHandler(&ws);

  // ==========================================================
  // CONFIGURACIÓN SERVIDOR HTTP (Para servir página de prueba)
  // ==========================================================

  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request)
            {
    String ip = WiFi.localIP().toString();
    if (WiFi.getMode() == WIFI_AP) {
      ip = WiFi.softAPIP().toString();
    }
    
    String html = "<!DOCTYPE html><html><head><title>ESP32 Robot Car</title></head>";
    html += "<body><h1>ESP32 Robot Car - WiFi Mode</h1>";
    html += "<p>WebSocket Server: ws://" + ip + "/ws</p>";
    html += "<p>Status: <span id='status'>Disconnected</span></p>";
    html += "<script>";
    html += "const ws = new WebSocket('ws://" + ip + "/ws');";
    html += "ws.onopen = () => { document.getElementById('status').textContent = 'Connected'; };";
    html += "ws.onclose = () => { document.getElementById('status').textContent = 'Disconnected'; };";
    html += "ws.onmessage = (e) => { console.log('Received:', e.data); };";
    html += "</script></body></html>";
    request->send(200, "text/html", html); });

  server.on("/status", HTTP_GET, [](AsyncWebServerRequest *request)
            {
    String json = "{\"connected\":" + String(clientConnected ? "true" : "false") + ",";
    json += "\"clients\":" + String(ws.count()) + ",";
    json += "\"uptime\":" + String(millis()) + "}";
    request->send(200, "application/json", json); });

  server.begin();

#if USE_ACCESS_POINT
  Serial.println("Servidor HTTP iniciado en http://192.168.4.1");
#else
  Serial.printf("Servidor HTTP iniciado en http://%s\n", WiFi.localIP().toString().c_str());
#endif

  // ==========================================================
  // CONFIGURACIÓN HARDWARE
  // ==========================================================
  pinMode(enA, OUTPUT);
  pinMode(enB, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  servo1.attach(servoPin, 500, 2400);
  servo1.write(90);

  // Estado inicial: detenido
  stop();
}

// --- LOOP (LÓGICA SIMPLIFICADA) ---

void loop()
{
  // Limpiar clientes WebSocket desconectados
  ws.cleanupClients();

  // Actualizar servo de forma no bloqueante
  if (millis() - lastServoUpdate >= SERVO_DELAY)
  {
    lastServoUpdate = millis();

    if (servoCurrentPos < servoTarget)
    {
      servoCurrentPos++;
      servo1.write(servoCurrentPos);
    }
    else if (servoCurrentPos > servoTarget)
    {
      servoCurrentPos--;
      servo1.write(servoCurrentPos);
    }
  }

  // Procesar solo si hay un nuevo comando
  if (newSignalReceived)
  {
    newSignalReceived = false; // Marcar como procesado

    // Log opcional - COMENTADO para máximo rendimiento
    // Serial.print("Procesando: ");
    // Serial.println(btSignal);

    // 1. LÓGICA DE VELOCIDAD
    if (btSignal == '0')
      Speed = 110;
    else if (btSignal == '1')
      Speed = 120;
    else if (btSignal == '2')
      Speed = 130;
    else if (btSignal == '3')
      Speed = 140;
    else if (btSignal == '4')
      Speed = 150;
    else if (btSignal == '5')
      Speed = 160;
    else if (btSignal == '6')
      Speed = 170;
    else if (btSignal == '7')
      Speed = 180;
    else if (btSignal == '8')
      Speed = 190;
    else if (btSignal == '9')
      Speed = 200;

    // 2. LÓGICA DE MOVIMIENTO / PINZA

    // COMANDO W (ADELANTE): Incluye la lógica condicional del sensor.
    if (btSignal == 'W')
    {
      bool obstaculoCerca = false;

      // ⚠️ IMPORTANTE: Solo medir distancia si el sensor está conectado
      // De lo contrario, pulseIn() bloqueará el loop por 20ms esperando una respuesta
      if (SENSOR_ULTRASONICO_CONECTADO)
      {
        distancia = medirDistancia();
        // Si distancia es 0 (timeout) o <= 15cm, consideramos obstáculo
        if (distancia <= 15 && distancia > 0)
        {
          obstaculoCerca = true;
        }
      }

      if (obstaculoCerca)
      {
        // Serial.println("¡OBSTÁCULO DETECTADO! Deteniendo.");
        stop();
        // NO hacemos maniobra de evasión automática (delays bloqueantes)
        // El usuario debe controlar manualmente
      }
      else
      {
        // Si no hay obstáculo (o la evasión está deshabilitada), avanzar normalmente
        forward();
      }
    }
    // Resto de comandos (no necesitan chequeo de obstáculos)
    else if (btSignal == 'S')
    {
      backward();
    }
    else if (btSignal == 'A')
    {
      left();
    }
    else if (btSignal == 'D')
    {
      right();
    }

    // Comandos de Pinza
    else if (btSignal == 'Q')
    {
      abre();
    }
    else if (btSignal == 'E')
    {
      cierra();
    }

    // Detener
    else if (btSignal == 'X')
    {
      stop();
    }

    // ✅ ENVIAR ACK DESPUÉS DE PROCESAR (no antes)
    if (ackRequested)
    {
      if (clientConnected)
      {
        sendAck(lastReceivedForAck);
        ackRequested = false;
      }
      else
      {
        Serial.println("⚠️ ACK solicitado pero cliente no conectado");
        ackRequested = false;
      }
    }
  }
}