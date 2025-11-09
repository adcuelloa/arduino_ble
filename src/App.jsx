import { useState } from 'react';
import { useBLE } from './hooks/useBLE';
import { useWifi } from './hooks/useWifi';
import { ConnectionPanel } from './components/ConnectionPanel';
import { SpeedPanel } from './components/SpeedPanel';
import { MovementPanel } from './components/MovementPanel';
import { GripperPanel } from './components/GripperPanel';
import { CommandMonitor } from './components/CommandMonitor';
import { ModeSelector } from './components/ModeSelector';
import { useKeyboardControls } from './hooks/useKeyboardControls';

export default function App() {
  // Estado para seleccionar modo de comunicación
  const [commMode, setCommMode] = useState('wifi'); // 'ble' o 'wifi'

  // Hooks de comunicación
  const bleHook = useBLE();
  const wifiHook = useWifi();

  // Seleccionar el hook activo basado en el modo
  const activeHook = commMode === 'ble' ? bleHook : wifiHook;

  const {
    connected,
    speedLevel,
    lastCommand,
    commandHistory,
    controlMode,
    connectionStatus, // Solo para WiFi
    connectBle, // Solo para BLE
    connectWifi, // Solo para WiFi
    disconnectBle, // Solo para BLE
    disconnectWifi, // Solo para WiFi
    changeSpeed,
    handleKeyDown,
    handleKeyUp,
    handleButtonDown,
    handleButtonUp,
    enqueueCommand,
    resetAllKeys,
    toggleControlMode,
  } = activeHook;

  // Hook personalizado para manejar eventos de teclado
  useKeyboardControls(handleKeyDown, handleKeyUp, resetAllKeys);

  const handleConnect = () => {
    if (commMode === 'ble') {
      connectBle();
    } else {
      connectWifi();
    }
  };

  const handleDisconnect = () => {
    if (commMode === 'ble') {
      disconnectBle();
    } else {
      disconnectWifi();
    }
  };

  const handleModeChange = (newMode) => {
    // Desconectar el modo actual antes de cambiar
    if (connected) {
      if (commMode === 'ble') {
        disconnectBle();
      } else {
        disconnectWifi();
      }
    }
    setCommMode(newMode);
  };

  return (
    <div className="app-container">
      <div className="remote-control">
        {/* HEADER: Selector de Modo + Conexión + Velocidad + Monitor */}
        <div className="remote-header">
          <div className="header-left">
            <ModeSelector
              currentMode={commMode}
              onModeChange={handleModeChange}
              connected={connected}
            />
            <ConnectionPanel
              connected={connected}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              mode={commMode}
              connectionStatus={commMode === 'wifi' ? connectionStatus : undefined}
            />
            <button
              onClick={toggleControlMode}
              className="mode-toggle-btn"
              title={
                controlMode === 'hold' ? 'Cambiar a Modo Toggle' : 'Cambiar a Modo Press & Hold'
              }
            >
              🎮 {controlMode === 'hold' ? 'Press & Hold' : 'Toggle'}
            </button>
          </div>

          <div className="header-center">
            <CommandMonitor lastCommand={lastCommand} commandHistory={commandHistory} />
          </div>

          <div className="header-right">
            <SpeedPanel speedLevel={speedLevel} onSpeedChange={changeSpeed} connected={connected} />
          </div>
        </div>

        {/* BODY: Controles principales (D-Pad + Pinza) */}
        <div className="remote-body">
          <div className="movement-section">
            <MovementPanel
              connected={connected}
              onButtonDown={(key) => {
                if (key === 'x') {
                  enqueueCommand('X');
                } else {
                  handleButtonDown(key);
                }
              }}
              onButtonUp={handleButtonUp}
            />
          </div>

          <div className="gripper-section">
            <GripperPanel connected={connected} onSendCommand={enqueueCommand} />
          </div>
        </div>
      </div>
    </div>
  );
}
