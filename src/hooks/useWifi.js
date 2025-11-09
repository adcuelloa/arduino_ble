import { useState, useRef, useCallback, useEffect } from 'react';

const KEY_MAP = {
  w: 'W',
  s: 'S',
  a: 'A',
  d: 'D',
  q: 'Q',
  e: 'E',
};

export function useWifi() {
  const [connected, setConnected] = useState(false);
  const [speedLevel, setSpeedLevel] = useState(5);
  const [lastCommand, setLastCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);
  const [controlMode, setControlMode] = useState('hold'); // 'hold' o 'toggle'
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected', 'error'

  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const keyHeld = useRef({});
  const movementActive = useRef(false);
  const currentToggleCommand = useRef(null);
  const lastEnqueueTime = useRef(0);

  // Cola de comandos con ACK
  const queueRef = useRef([]);
  const processingRef = useRef(false);
  const ackResolveRef = useRef(null);
  const ackTimeoutRef = useRef(null);

  // Constantes
  const MAX_SPEED = 9;
  const MIN_SPEED = 0;

  // 🔧 CONFIGURACIÓN: Cambia esta IP según tu modo WiFi
  // - Modo AP (Access Point): ws://192.168.4.1/ws
  // - Modo Station: ws://<IP_DE_TU_ROUTER>/ws (ejemplo: ws://192.168.1.100/ws)
  const WEBSOCKET_URL = 'ws://192.168.4.1/ws';

  const ACK_TIMEOUT = 1000; // Aumentado a 1000ms para WiFi (vs 500ms en BLE)
  const MAX_RETRIES = 2;
  const RECONNECT_DELAY = 3000; // Descomentar si usas auto-reconexión

  // Función helper para resetear todas las teclas y enviar STOP
  const resetAllKeys = useCallback(() => {
    const wasMovementActive = movementActive.current;
    keyHeld.current = {};
    movementActive.current = false;
    currentToggleCommand.current = null;

    if (wasMovementActive && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send('X');
      console.log('⚠️ STOP de emergencia enviado - reseteo de teclas');
    }
  }, []);

  // Cleanup al desconectar
  const updateUI = useCallback((isConnected) => {
    setConnected(isConnected);
    if (!isConnected) {
      queueRef.current = [];
      processingRef.current = false;
      keyHeld.current = {};
      movementActive.current = false;
      currentToggleCommand.current = null;

      if (ackTimeoutRef.current) {
        clearTimeout(ackTimeoutRef.current);
        ackTimeoutRef.current = null;
      }
      if (ackResolveRef.current) {
        ackResolveRef.current = null;
      }
    }
  }, []);

  // Handler de mensajes WebSocket
  const handleMessage = useCallback((data) => {
    console.log('📨 Mensaje recibido:', data);

    // Procesar ACK - Formato: "ACK:X" donde X es el comando
    if (data.startsWith('ACK:')) {
      const ackCommand = data.charAt(4); // Posición 4 porque el formato es ACK:X
      console.log(`🔔 ACK recibido para comando: ${ackCommand}`);

      if (ackResolveRef.current) {
        ackResolveRef.current(true);
        ackResolveRef.current = null;
      }
      if (ackTimeoutRef.current) {
        clearTimeout(ackTimeoutRef.current);
        ackTimeoutRef.current = null;
      }
    } else if (data === 'CONNECTED') {
      console.log('✅ WebSocket: Confirmación de conexión recibida');
    }
  }, []);

  // Conectar WebSocket
  const connectWifi = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('⚠️ Ya hay una conexión WebSocket activa');
      return;
    }

    setConnectionStatus('connecting');
    console.log(`🔌 Conectando a ${WEBSOCKET_URL}...`);

    try {
      const ws = new WebSocket(WEBSOCKET_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket conectado');
        setConnectionStatus('connected');
        updateUI(true);

        // Limpiar timer de reconexión
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }

        // 🎯 IMPORTANTE: Enviar comando de velocidad inicial PRIMERO
        const initialSpeed = 5;
        setSpeedLevel(initialSpeed);
        console.log(`🚀 Estableciendo velocidad inicial: ${initialSpeed}`);

        // Pequeño delay para asegurar que el WebSocket esté completamente listo
        // Enviamos directamente por WebSocket (sin usar enqueueCommand para evitar dependencia circular)
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(String(initialSpeed));
            console.log(`✅ Comando de velocidad inicial ${initialSpeed} enviado`);
          }
        }, 100);
      };

      ws.onmessage = (event) => {
        handleMessage(event.data);
      };

      ws.onerror = (error) => {
        console.error('❌ Error WebSocket:', error);
        setConnectionStatus('error');
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket desconectado');
        console.log(
          `   Código: ${event.code}, Razón: "${event.reason || 'ninguna'}", Limpio: ${event.wasClean}`
        );
        setConnectionStatus('disconnected');
        updateUI(false);
        wsRef.current = null;

        // Auto-reconexión automática
        reconnectTimerRef.current = setTimeout(() => {
          console.log('🔄 Intentando reconectar...');
          connectWifi();
        }, RECONNECT_DELAY);
      };
    } catch (error) {
      console.error('❌ Error al crear WebSocket:', error);
      setConnectionStatus('error');
      alert(
        `Error de conexión: ${error.message}\n\nAsegúrate de:\n1. Estar conectado a la red WiFi "${WEBSOCKET_URL.includes('192.168.4.1') ? 'ESP32_ROBOT_CAR' : 'del ESP32'}"\n2. El ESP32 esté encendido y funcionando`
      );
    }
  }, [updateUI, handleMessage, WEBSOCKET_URL]);

  // Desconectar WebSocket
  const disconnectWifi = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    updateUI(false);
    setConnectionStatus('disconnected');
  }, [updateUI]);

  // Procesar cola de comandos
  const processQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) {
      return;
    }

    processingRef.current = true;

    while (queueRef.current.length > 0) {
      const item = queueRef.current[0];
      const { ch, retries } = item;

      try {
        // Enviar comando via WebSocket
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          throw new Error('WebSocket no conectado');
        }

        wsRef.current.send(ch);
        console.log(`✅ Comando ${ch} enviado`);

        // Actualizar historial
        setLastCommand(ch);
        setCommandHistory((prev) => [...prev.slice(-9), ch]);

        // STOP (X) no espera ACK - es fire-and-forget
        if (ch === 'X') {
          console.log('🛑 Comando STOP enviado (sin esperar ACK)');
          queueRef.current.shift();
          await new Promise((resolve) => setTimeout(resolve, 10));
          continue;
        }

        // Esperar ACK con timeout (solo para comandos que no sean X)
        const ackReceived = await new Promise((resolve) => {
          ackResolveRef.current = resolve;

          ackTimeoutRef.current = setTimeout(() => {
            resolve(false);
          }, ACK_TIMEOUT);
        });

        if (ackReceived) {
          // ACK recibido, eliminar de cola
          queueRef.current.shift();
        } else {
          // Timeout
          if (retries < MAX_RETRIES) {
            console.warn(
              `⚠️ Envío de ${ch} falló (intento ${retries + 1}/${MAX_RETRIES + 1}): ACK timeout`
            );
            item.retries++;
          } else {
            console.error(`❌ Descartando comando ${ch} tras ${MAX_RETRIES} reintentos`);
            queueRef.current.shift();
          }
        }

        // Pequeño delay entre comandos
        await new Promise((resolve) => setTimeout(resolve, 10));
      } catch (error) {
        console.error(`❌ Error enviando comando ${ch}:`, error.message);

        if (retries < MAX_RETRIES) {
          item.retries++;
        } else {
          queueRef.current.shift();
        }

        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    processingRef.current = false;
  }, [ACK_TIMEOUT, MAX_RETRIES]);

  // Encolar comando
  const enqueueCommand = useCallback(
    (ch) => {
      // Rate limit
      const now = Date.now();
      const timeSinceLastEnqueue = now - lastEnqueueTime.current;
      if (timeSinceLastEnqueue < 50 && ch !== 'X') {
        console.debug(`⏱️ Rate limit: ignorando ${ch} (${timeSinceLastEnqueue}ms desde último)`);
        return;
      }
      lastEnqueueTime.current = now;

      // Protección de cola saturada
      if (queueRef.current.length >= 5) {
        console.warn(`⚠️ Cola saturada (${queueRef.current.length} comandos) - ignorando ${ch}`);
        return;
      }

      // Prioridad a STOP
      if (ch === 'X') {
        queueRef.current = [{ ch, retries: 0 }];
        console.debug('🛑 STOP prioritario encolado - cola limpiada');
      } else {
        const lastInQueue = queueRef.current[queueRef.current.length - 1];
        if (!lastInQueue || lastInQueue.ch !== ch) {
          queueRef.current.push({ ch, retries: 0 });
          console.debug(`📥 Comando ${ch} encolado (cola: ${queueRef.current.length})`);
        } else {
          console.debug(`⏭️ Comando ${ch} duplicado - ignorado (ya en cola)`);
        }
      }

      if (!processingRef.current) {
        processQueue();
      }
    },
    [processQueue]
  );

  // Funciones de control (iguales a useBLE)
  const changeSpeed = useCallback(
    (delta) => {
      if (!connected) return;
      const newSpeed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speedLevel + delta));
      if (newSpeed !== speedLevel) {
        setSpeedLevel(newSpeed);
        enqueueCommand(String(newSpeed));
      }
    },
    [connected, speedLevel, enqueueCommand, MAX_SPEED, MIN_SPEED]
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

      if (event.key === 'Escape' || key === 'x') {
        console.log('🛑 Reseteo manual activado');
        resetAllKeys();
        event.preventDefault();
        return;
      }

      if (isMovementKey) {
        // Modo Toggle
        if (controlMode === 'toggle') {
          if (currentToggleCommand.current) {
            currentToggleCommand.current = null;
            movementActive.current = false;
            console.log(`🔄 Modo Toggle: Deteniendo`);
            enqueueCommand('X');
          } else {
            currentToggleCommand.current = command;
            movementActive.current = true;
            console.log(`🔄 Modo Toggle: Iniciando ${key.toUpperCase()}`);
            enqueueCommand(command);
          }
          event.preventDefault();
          return;
        }

        // Modo Hold
        if (keyHeld.current[key]) {
          console.debug(`⏭️ Tecla ${key.toUpperCase()} ya presionada - ignorando repetición`);
          return;
        }
        keyHeld.current[key] = true;
        movementActive.current = true;
        console.log(`▶️ Tecla ${key.toUpperCase()} presionada`);
        enqueueCommand(command);
        event.preventDefault();
      } else if (['q', 'e'].includes(key)) {
        if (keyHeld.current[key]) return;
        keyHeld.current[key] = true;
        enqueueCommand(command);
      } else if (event.key === 'ArrowUp') {
        changeSpeed(1);
        event.preventDefault();
      } else if (event.key === 'ArrowDown') {
        changeSpeed(-1);
        event.preventDefault();
      }
    },
    [connected, enqueueCommand, changeSpeed, resetAllKeys, controlMode]
  );

  const handleKeyUp = useCallback(
    (event) => {
      if (!connected) return;
      if (controlMode === 'toggle') return;

      const key = (event.key || '').toLowerCase();
      const isMovementKey = ['w', 'a', 's', 'd'].includes(key);

      if (isMovementKey) {
        if (!keyHeld.current[key]) {
          console.debug(`⚠️ Tecla ${key.toUpperCase()} liberada pero no estaba presionada`);
          return;
        }
        keyHeld.current[key] = false;
        console.log(`⏸️ Tecla ${key.toUpperCase()} liberada`);

        if (!isAnyMovementKeyPressed() && movementActive.current) {
          movementActive.current = false;
          console.log(`🛑 Enviando STOP - ninguna tecla de movimiento activa`);
          enqueueCommand('X');
        } else if (isAnyMovementKeyPressed()) {
          const activeKeys = Object.keys(keyHeld.current).filter((k) => keyHeld.current[k]);
          console.log(`⏩ Otras teclas aún activas: ${activeKeys.join(', ').toUpperCase()}`);
        }
      } else if (['q', 'e'].includes(key)) {
        keyHeld.current[key] = false;
      }
    },
    [connected, enqueueCommand, isAnyMovementKeyPressed, controlMode]
  );

  const handleButtonDown = useCallback(
    (key) => {
      if (!connected) return;
      const command = KEY_MAP[key];

      if (keyHeld.current[key]) return;
      keyHeld.current[key] = true;

      if (['w', 'a', 's', 'd'].includes(key)) {
        movementActive.current = true;
      }

      enqueueCommand(command);
    },
    [connected, enqueueCommand]
  );

  const handleButtonUp = useCallback(
    (key) => {
      if (!connected) return;

      if (!keyHeld.current[key]) return;
      keyHeld.current[key] = false;

      if (!isAnyMovementKeyPressed() && movementActive.current) {
        movementActive.current = false;
        enqueueCommand('X');
      }
    },
    [connected, enqueueCommand, isAnyMovementKeyPressed]
  );

  const toggleControlMode = useCallback(() => {
    if (movementActive.current) {
      resetAllKeys();
    }

    setControlMode((prev) => {
      const newMode = prev === 'hold' ? 'toggle' : 'hold';
      console.log(
        `🎮 Modo de control cambiado a: ${newMode === 'hold' ? 'Press & Hold' : 'Toggle'}`
      );
      return newMode;
    });
  }, [resetAllKeys]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      disconnectWifi();
    };
  }, [disconnectWifi]);

  return {
    connected,
    speedLevel,
    lastCommand,
    commandHistory,
    controlMode,
    connectionStatus,
    connectWifi,
    disconnectWifi,
    changeSpeed,
    handleKeyDown,
    handleKeyUp,
    handleButtonDown,
    handleButtonUp,
    enqueueCommand,
    resetAllKeys,
    toggleControlMode,
  };
}
