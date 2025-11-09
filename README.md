# ESP32 Robot Car — Control Web Dual Mode (BLE + WiFi)

[![React 18.3.1](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=white)](https://reactjs.org)
[![Vite 5.4.21](https://img.shields.io/badge/Vite-5.4.21-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Prettier 3.6.2](https://img.shields.io/badge/Prettier-3.6.2-F7B93E?logo=prettier&logoColor=white)](https://prettier.io)
[![ESLint 9.39.1](https://img.shields.io/badge/ESLint-9.39.1-4B3263?logo=eslint&logoColor=white)](https://eslint.org)
[![pnpm 10.20.0](https://img.shields.io/badge/pnpm-10.20.0-F69220?logo=pnpm&logoColor=white)](https://pnpm.io)
[![React Icons 4.12.0](https://img.shields.io/badge/React%20Icons-4.12.0-61DAFB?logo=react&logoColor=white)](https://react-icons.github.io/react-icons/)
[![ESP32-S3](https://img.shields.io/badge/ESP32--S3-supported-2A9D8F)](https://www.espressif.com/en/products/socs/esp32)

**Proyecto:** Interfaz web (React + Vite) para controlar un robot ESP32-S3 mediante **Web Bluetooth (BLE)** o **WiFi (WebSocket)**.

---

## 📋 Resumen

Este repositorio contiene:

- **Frontend React:** Control remoto visual estilo consola física para manejar un robot
- **Dos modos de comunicación:**
  - 🔵 **BLE (Bluetooth Low Energy)** - Conexión directa vía Web Bluetooth API
  - 📡 **WiFi (WebSocket)** - Conexión vía red WiFi con latencia ultra-baja
- **Firmware ESP32-S3:** Dos sketches de Arduino
  - `arduino.ino` - Modo BLE (usando Bluedroid)
  - `arduino_wifi.ino` - Modo WiFi Access Point + WebSocket

---

## 🚀 Stack Tecnológico

### Frontend
- **React 18** con Vite (desarrollo rápido)
- **Web Bluetooth API** para modo BLE
- **WebSocket** para modo WiFi
- **ESLint + Prettier** para calidad de código
- **React Icons** para iconografía

### Backend (ESP32-S3)
- **BLE (Bluedroid)** - Bajo consumo, conexión directa
- **WiFi Access Point** - Mayor alcance y estabilidad
- **AsyncWebServer + AsyncTCP** - Servidor HTTP/WebSocket asíncrono
- **ESP32Servo** - Control no bloqueante del servo de la pinza

---

## 📁 Estructura del Proyecto

```
├── src/
│   ├── hooks/
│   │   ├── useBLE.js              # Hook para modo Bluetooth
│   │   ├── useWifi.js             # Hook para modo WiFi
│   │   └── useKeyboardControls.js # Manejo de teclado
│   ├── components/
│   │   ├── ConnectionPanel.jsx    # Botón de conexión (dinámico BLE/WiFi)
│   │   ├── ModeSelector.jsx       # Selector BLE vs WiFi
│   │   ├── MovementPanel.jsx      # D-Pad de control (W/A/S/D)
│   │   ├── GripperPanel.jsx       # Control de pinza (Q/E)
│   │   ├── SpeedPanel.jsx         # Selector de velocidad (0-9)
│   │   └── CommandMonitor.jsx     # Monitor de comandos enviados
│   ├── App.jsx                    # Componente principal con selector de modo
│   └── styles.css                 # Estilos globales
├── arduino.ino                    # Firmware BLE
├── arduino_wifi.ino               # Firmware WiFi + WebSocket
└── README.md                      # Este archivo
```

---

## 🔌 Modo 1: Conexión por Bluetooth (BLE)

### 📥 Preparación del ESP32

1. **Abrir `arduino.ino`** en Arduino IDE
2. **Configurar parámetros** (si es necesario):
   ```cpp
   const bool SENSOR_ULTRASONICO_CONECTADO = false; // Cambiar a true si tienes sensor
   ```
3. **Compilar y subir** al ESP32-S3
4. **Verificar en Serial Monitor** (115200 baud):
   ```
   BLE Advertising Started (Optimizado para baja latencia)
   ```

### 🌐 Conectar desde el Navegador

1. **Abrir la aplicación web** en un navegador compatible:
   - ✅ Chrome/Edge en Windows/Mac/Linux/Android
   - ✅ Chrome en ChromeOS
   - ❌ Safari (no soporta Web Bluetooth)
   - ❌ Firefox (no soporta Web Bluetooth nativamente)

2. **Seleccionar modo BLE:**
   - Click en el botón **🔵 BLE** en la parte superior izquierda

3. **Hacer click en el botón de conexión:**
   - Aparece un ícono de **Bluetooth** (azul cuando está desconectado)
   - Click en el botón redondo

4. **Seleccionar el dispositivo:**
   - Se abre un diálogo del navegador
   - Buscar **"ADCA07"** en la lista
   - Click en **"Emparejar"** o **"Connect"**

5. **Verificar conexión:**
   - El LED del botón cambia a **verde brillante** ✅
   - En la consola del navegador verás: `✅ BLE conectado`
   - En el Serial Monitor del ESP32: `--- BLE CONECTADO ---`

### 📡 Especificaciones BLE

- **Nombre advertido:** `ADCA07`
- **SERVICE_UUID:** `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
- **CHARACTERISTIC_UUID (WRITE):** `beb5483e-36e1-4688-b7f5-ea07361b26a8`
- **NOTIFY_UUID (ACK):** `12345678-1234-5678-1234-56789abcdef0`
- **MTU:** 517 bytes (máximo para ESP32)
- **Intervalo de conexión:** 7.5-22.5ms (optimizado para baja latencia)

---

## 📡 Modo 2: Conexión por WiFi (WebSocket)

### 📥 Preparación del ESP32

1. **Instalar librerías necesarias** (Arduino IDE):
   ```
   Sketch → Include Library → Manage Libraries
   ```
   - Buscar e instalar: **AsyncTCP**
   - Buscar e instalar: **ESPAsyncWebServer**

2. **Abrir `arduino_wifi.ino`** en Arduino IDE

3. **Configurar credenciales WiFi** (líneas 10-13):
   ```cpp
   const char* AP_SSID = "ESP32_ROBOT_CAR";     // Nombre de tu red WiFi
   const char* AP_PASSWORD = "robot12345";      // Contraseña (mín. 8 caracteres)
   const IPAddress AP_IP(192, 168, 4, 1);       // IP fija del ESP32
   ```

4. **Compilar y subir** al ESP32-S3

5. **Verificar en Serial Monitor** (115200 baud):
   ```
   === ESP32 Robot Car - Modo WiFi ===
   Access Point iniciado
   SSID: ESP32_ROBOT_CAR
   Password: robot12345
   IP: 192.168.4.1
   Servidor HTTP iniciado en http://192.168.4.1
   WebSocket disponible en ws://192.168.4.1/ws
   ```

### 🌐 Conectar desde el Navegador

#### Paso 1: Conectar tu dispositivo a la red WiFi del ESP32

1. **En tu teléfono/computadora:**
   - Ir a **Configuración de WiFi**
   - Buscar la red **"ESP32_ROBOT_CAR"**
   - Conectarse usando la contraseña: **robot12345**
   - Esperar a que se conecte (puede tomar 5-10 segundos)

2. **Verificar conexión WiFi:**
   - Tu dispositivo debe decir "Conectado sin Internet" (esto es normal)
   - La IP de tu dispositivo será algo como `192.168.4.X`

#### Paso 2: Abrir la aplicación web

3. **Abrir el navegador** y cargar la aplicación React:
   ```
   http://localhost:5173
   ```
   O la URL donde esté desplegada la app

4. **Seleccionar modo WiFi:**
   - Click en el botón **📡 WiFi** en la parte superior izquierda
   - El botón debe quedar resaltado en azul

5. **Hacer click en el botón de conexión:**
   - Aparece un ícono de **WiFi** (rojo cuando está desconectado)
   - Click en el botón redondo
   - El LED cambiará a **amarillo pulsante** (conectando)

6. **Verificar conexión:**
   - El LED del botón cambia a **verde brillante** ✅
   - En la consola del navegador verás:
     ```
     🔌 Conectando a ws://192.168.4.1/ws...
     ✅ WebSocket conectado
     📨 Mensaje recibido: CONNECTED
     ```
   - En el Serial Monitor del ESP32:
     ```
     WebSocket cliente #1 conectado desde 192.168.4.2
     ```

### 🔍 Verificación y Troubleshooting WiFi

**Si no puedes conectarte:**

1. **Verificar que estás conectado a la red WiFi del ESP32**
   ```
   ping 192.168.4.1
   ```
   Debería responder

2. **Probar el servidor HTTP** (opcional):
   - Abrir en el navegador: `http://192.168.4.1`
   - Deberías ver una página simple con status del WebSocket

3. **Ver logs en consola del navegador:**
   - Presiona F12 → pestaña Console
   - Busca errores de WebSocket

4. **Verificar Serial Monitor del ESP32:**
   - Debe mostrar "Access Point iniciado"
   - Si no, verifica que compilaste y subiste el sketch correcto

### 📊 Comparación BLE vs WiFi

| Característica | BLE (Bluetooth) | WiFi (WebSocket) |
|----------------|-----------------|------------------|
| **Alcance** | ~10 metros | ~30-50 metros (depende del ESP32) |
| **Latencia** | 7.5-22.5ms | 1-5ms |
| **Throughput** | Limitado (MTU 517) | Alto (sin límite práctico) |
| **Configuración** | Plug & Play | Conectar a red WiFi primero |
| **Compatibilidad** | Solo Chrome/Edge | Todos los navegadores |
| **Consumo** | Bajo | Medio-Alto |
| **Estabilidad** | Media | Alta |
| **Mejor para** | Conexiones rápidas, móviles | Control preciso, largo tiempo |

---

## 🎮 Modos de Control

Notas importantes sobre robustez
--------------------------------
- El hook `useBLE` implementa una cola simple con prioridad: el comando `X` (STOP) tiene prioridad máxima y no puede ser sobrescrito por comandos de movimiento mientras está pendiente.
- El sketch `arduino.ino` evita procesar comandos duplicados repetidos y garantiza que `X` siempre se procese inmediatamente.

Desarrollo & pruebas locales
----------------------------
1. Instala dependencias (usa pnpm):

```bash
pnpm install
```

2. Levantar servidor de desarrollo (Vite):

```bash
pnpm dev
```

Por defecto Vite sirve en `http://localhost:5173`. En desktop puedes usar localhost sin HTTPS y Web Bluetooth funcionará.

Probar en móvil
---------------
- Web Bluetooth en móviles funciona con restricciones:
  - Android: Chrome (recomendado), Edge; Web Bluetooth está soportado
  - iOS: Safari 16.4+ (y navegadores que usan WebKit) soportan Web Bluetooth
- Requisito: **HTTPS obligatorio** en producción. En desarrollo `localhost` funciona sin HTTPS.
- Para probar desde tu teléfono en la misma LAN: inicia Vite, sirve por la IP local (ej.: `http://192.168.1.100:5173`) y usa Chrome/Edge (Android) o Safari (iOS 16.4+).
- Si quieres pruebas con HTTPS en desarrollo, puedes configurar Vite para servir con HTTPS (o usar un túnel como `ngrok` o `localtunnel`).

Flashing / subir `arduino.ino`
-----------------------------
- Abre `arduino.ino` en el IDE de Arduino o PlatformIO.
- Selecciona la placa ESP32 y el puerto correcto.
- Subir el sketch.

Depuración y trazas
-------------------
- El sketch imprime en `Serial` los comandos recibidos y acciones (útil para depuración).
- En el frontend abre la consola del navegador para ver trazas del `useBLE` (se imprimen eventos de teclas, encolado y envío de comandos).

Problemas conocidos y soluciones
--------------------------------
- Síntoma: el robot sigue moviéndose unos instantes después de soltar la tecla.
  - Causa: race entre escritura GATT y nuevos comandos. Solución aplicada: `X` (STOP) tiene prioridad en la cola y el sketch ignora comandos duplicados; además, el cliente resetea teclas cuando la pestaña pierde foco.
- Si el dispositivo NO aparece en la lista de dispositivos BLE en el móvil, prueba a usar `filters: [{ namePrefix: 'ADCA07' }]` (recomendado) porque algunos ESP32 no anuncian el servicio UUID en el advertising packet.

Comandos útiles
---------------
- `pnpm dev` — iniciar servidor de desarrollo
- `pnpm build` — generar build de producción
- `pnpm preview` — preview del build
- `pnpm run lint` — ejecutar ESLint
- `pnpm run format` — ejecutar Prettier (no tocará `*.ino` por la `.prettierignore`)

Contribuir
----------
- Abre un issue describiendo el bug o la mejora.
- Para cambios en el protocolo BLE, comunica también el cambio en el sketch `arduino.ino`.
