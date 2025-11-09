import { useState, useRef, useCallback } from 'react';

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

const KEY_MAP = {
  w: 'W',
  s: 'S',
  a: 'A',
  d: 'D',
  q: 'Q',
  e: 'E',
};

export function useBLE() {
  const [connected, setConnected] = useState(false);
  const [speedLevel, setSpeedLevel] = useState(5);
  const [lastCommand, setLastCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);

  const deviceRef = useRef(null);
  const charRef = useRef(null);
  const writeInProgress = useRef(false);
  const pendingCommand = useRef(null); // Solo UNO pendiente
  const movementActive = useRef(false);
  const keyHeld = useRef({});

  // Constantes de velocidad
  const MAX_SPEED = 9;
  const MIN_SPEED = 0;
  const INTER_COMMAND_DELAY = 30; // 30ms entre comandos para no saturar buffer GATT

  // Función helper para resetear todas las teclas y enviar STOP
  const resetAllKeys = useCallback(() => {
    const wasMovementActive = movementActive.current;
    keyHeld.current = {};
    movementActive.current = false;

    // Solo enviar STOP si había movimiento activo
    if (wasMovementActive) {
      const c = charRef.current;
      if (c && connected) {
        // Enviar STOP directamente sin usar sendCommand para evitar cola
        const buf = new TextEncoder().encode('X');
        c.writeValue(buf).catch((err) => console.error('Error enviando STOP de emergencia:', err));
        console.log('⚠️ STOP de emergencia enviado - reseteo de teclas');
      }
    }
  }, [connected]);

  const updateUI = useCallback((isConnected) => {
    setConnected(isConnected);
    if (!isConnected) {
      deviceRef.current = null;
      charRef.current = null;
      keyHeld.current = {};
      writeInProgress.current = false;
      pendingCommand.current = null;
      movementActive.current = false;
    }
  }, []);

  const sendCommand = useCallback(async (ch) => {
    const c = charRef.current;
    if (!c) {
      console.error('Característica BLE no disponible. ¿Estás conectado?');
      return;
    }

    // Si ya hay una escritura en progreso
    if (writeInProgress.current) {
      // Solo guardamos el ÚLTIMO comando pendiente
      // 'X' (STOP) tiene prioridad sobre cualquier otro
      if (ch === 'X' || pendingCommand.current !== 'X') {
        pendingCommand.current = ch;
        console.debug(`⏸️ Comando ${ch} pendiente - escritura en progreso`);
      }
      return;
    }

    writeInProgress.current = true;

    try {
      const buf = new TextEncoder().encode(ch);
      await c.writeValue(buf);
      setLastCommand(ch);
      setCommandHistory((prev) => {
        const newHistory = [...prev, ch];
        return newHistory.slice(-10);
      });
      console.debug('✅ Comando enviado:', ch);
    } catch (err) {
      console.error('Error al escribir en GATT:', err);
    } finally {
      writeInProgress.current = false;

      // Procesar el comando pendiente si existe, con un pequeño delay
      // para no saturar el buffer GATT del ESP32
      if (pendingCommand.current) {
        const next = pendingCommand.current;
        pendingCommand.current = null;

        // Delay de 30ms para darle tiempo al ESP32 de procesar
        setTimeout(() => {
          sendCommand(next);
        }, INTER_COMMAND_DELAY);
      }
    }
  }, []);

  const connectBle = useCallback(async () => {
    if (!navigator.bluetooth) {
      alert(
        '⚠️ Web Bluetooth no está disponible en este navegador.\n\nPor favor usa Chrome, Edge o Opera.'
      );
      return;
    }

    try {
      // Filtrar por nombre del dispositivo (más compatible que por UUID de servicio)
      // El ESP32 debe anunciar un nombre que comience con 'ADCA07'
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'ADCA07' }],
        optionalServices: [SERVICE_UUID],
      });
      deviceRef.current = device;

      // Escuchar desconexiones
      device.addEventListener('gattserverdisconnected', () => {
        console.log('Dispositivo BLE desconectado');
        updateUI(false);
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);
      const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
      charRef.current = characteristic;
      updateUI(true);

      // Enviar velocidad inicial
      await sendCommand(String(speedLevel));
    } catch (err) {
      console.error('Error al conectar BLE:', err);
      if (err.name === 'NotFoundError') {
        alert(
          '❌ No se encontró el dispositivo ADCA07.\n\nAsegúrate de que el ESP32 esté encendido y cerca.'
        );
      } else if (err.name === 'NotAllowedError') {
        // Usuario canceló el diálogo
        console.log('Usuario canceló la selección de dispositivo');
      } else {
        alert(`Error al conectar: ${err.message}`);
      }
      updateUI(false);
    }
  }, [updateUI, sendCommand, speedLevel]);

  const disconnectBle = useCallback(() => {
    const d = deviceRef.current;
    if (d && d.gatt && d.gatt.connected) d.gatt.disconnect();
    updateUI(false);
  }, [updateUI]);

  const changeSpeed = useCallback(
    (delta) => {
      if (!connected) return;
      const newSpeed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speedLevel + delta));
      if (newSpeed !== speedLevel) {
        setSpeedLevel(newSpeed);
        sendCommand(String(newSpeed));
      }
    },
    [connected, speedLevel, sendCommand]
  );

  const isAnyMovementKeyPressed = useCallback(() => {
    const h = keyHeld.current;
    return !!(h.w || h.a || h.s || h.d);
  }, []);

  const handleKeyDown = useCallback(
    (event) => {
      if (!connected) return;

      const key = (event.key || '').toLowerCase();
      const command = KEY_MAP[key];
      const isMovementKey = ['w', 'a', 's', 'd'].includes(key);

      // 0. ESCAPE - Reseteo de emergencia
      if (event.key === 'Escape' || key === 'x') {
        console.log('🛑 Reseteo manual activado');
        resetAllKeys();
        event.preventDefault();
        return;
      }

      // 1. Manejo de Movimiento (W, A, S, D)
      if (isMovementKey) {
        if (keyHeld.current[key]) {
          console.debug(`⏭️ Tecla ${key.toUpperCase()} ya presionada - ignorando repetición`);
          return; // Ya está presionado
        }
        keyHeld.current[key] = true;
        // Indicar que hay una acción de movimiento activa en el cliente
        movementActive.current = true;
        console.log(`▶️ Tecla ${key.toUpperCase()} presionada`);
        sendCommand(command);
        event.preventDefault(); // Evita scroll de la página
      }
      // 2. Manejo de Pinza (Q, E)
      else if (['q', 'e'].includes(key)) {
        // Pinza: Acción única, no de 'hold', pero prevenimos repetición accidental
        if (keyHeld.current[key]) return;
        keyHeld.current[key] = true;
        sendCommand(command);
      }
      // 3. Manejo de Velocidad (Flechas Arriba/Abajo)
      else if (event.key === 'ArrowUp') {
        changeSpeed(1);
        event.preventDefault();
      } else if (event.key === 'ArrowDown') {
        changeSpeed(-1);
        event.preventDefault();
      }
    },
    [connected, sendCommand, changeSpeed, resetAllKeys]
  );

  const handleKeyUp = useCallback(
    (event) => {
      if (!connected) return;

      const key = (event.key || '').toLowerCase();
      const isMovementKey = ['w', 'a', 's', 'd'].includes(key);

      // Si la tecla liberada es de movimiento (W, A, S, D)
      if (isMovementKey) {
        if (!keyHeld.current[key]) {
          console.debug(`⚠️ Tecla ${key.toUpperCase()} liberada pero no estaba presionada`);
          return;
        }
        keyHeld.current[key] = false;
        console.log(`⏸️ Tecla ${key.toUpperCase()} liberada`);
        // Enviar 'X' (STOP) solo si NINGUNA otra tecla de movimiento está actualmente presionada
        if (!isAnyMovementKeyPressed() && movementActive.current) {
          // Solo enviar STOP si realmente había movimiento activo
          movementActive.current = false;
          console.log(`🛑 Enviando STOP - ninguna tecla de movimiento activa`);
          sendCommand('X');
        } else if (isAnyMovementKeyPressed()) {
          const activeKeys = Object.keys(keyHeld.current).filter((k) => keyHeld.current[k]);
          console.log(`⏩ Otras teclas aún activas: ${activeKeys.join(', ').toUpperCase()}`);
        }
      }
      // Para Q y E (Pinza), liberamos el bloqueo de repetición
      else if (['q', 'e'].includes(key)) {
        keyHeld.current[key] = false;
      }
    },
    [connected, sendCommand, isAnyMovementKeyPressed]
  );

  const handleButtonDown = useCallback(
    (key) => {
      if (!connected) return;

      const command = KEY_MAP[key];

      // 1. Lógica de Press & Hold (igual que el teclado)
      if (keyHeld.current[key]) return;
      keyHeld.current[key] = true;

      // 2. Acción
      // Si es una tecla de movimiento, marcamos movementActive
      if (['w', 'a', 's', 'd'].includes(key)) {
        movementActive.current = true;
      }
      sendCommand(command);
    },
    [connected, sendCommand]
  );

  const handleButtonUp = useCallback(
    (key) => {
      if (!connected) return;

      // 1. Solo procesamos si el botón que se suelta estaba marcado como presionado.
      if (!keyHeld.current[key]) return;

      // 2. Desmarcar como presionado.
      keyHeld.current[key] = false;

      // 3. Enviar STOP ('X') si no queda ninguna tecla/botón de movimiento activo.
      if (!isAnyMovementKeyPressed() && movementActive.current) {
        movementActive.current = false;
        sendCommand('X');
      }
    },
    [connected, sendCommand, isAnyMovementKeyPressed]
  );

  return {
    connected,
    speedLevel,
    lastCommand,
    commandHistory,
    connectBle,
    disconnectBle,
    changeSpeed,
    handleKeyDown,
    handleKeyUp,
    handleButtonDown,
    handleButtonUp,
    sendCommand,
    resetAllKeys,
  };
}
