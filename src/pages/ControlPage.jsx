import './ControlPage.css';

import { useState, useEffect } from 'react';
import { ConnectionPanel } from '../components/ConnectionPanel';
import { SpeedPanel } from '../components/SpeedPanel';
import { MovementPanel } from '../components/MovementPanel';
import { GripperPanel } from '../components/GripperPanel';
import { CommandMonitor } from '../components/CommandMonitor';
import { ModeSelector } from '../components/ModeSelector';

import { useBLE } from '../hooks/useBLE';
import { useWifi } from '../hooks/useWifi';
import { useKeyboardControls } from '../hooks/useKeyboardControls';

import { MdScreenRotation } from 'react-icons/md';
import GameIcon from '../components/icons/GameIcon';

export default function ControlPage() {
  const [commMode, setCommMode] = useState('wifi');
  const [isPortrait, setIsPortrait] = useState(false);

  // Detectar orientación del dispositivo
  useEffect(() => {
    const checkOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const bleHook = useBLE();
  const wifiHook = useWifi();
  const activeHook = commMode === 'ble' ? bleHook : wifiHook;

  const {
    connected,
    speedLevel,
    lastCommand,
    commandHistory,
    controlMode,
    connectionStatus,
    connectBle,
    connectWifi,
    disconnectBle,
    disconnectWifi,
    changeSpeed,
    handleKeyDown,
    handleKeyUp,
    handleButtonDown,
    handleButtonUp,
    enqueueCommand,
    resetAllKeys,
    toggleControlMode,
  } = activeHook;

  useKeyboardControls(handleKeyDown, handleKeyUp, resetAllKeys);

  const handleConnect = () => {
    if (commMode === 'ble') connectBle();
    else connectWifi();
  };

  const handleDisconnect = () => {
    if (commMode === 'ble') disconnectBle();
    else disconnectWifi();
  };

  const handleModeChange = (newMode) => {
    if (connected) {
      if (commMode === 'ble') disconnectBle();
      else disconnectWifi();
    }
    setCommMode(newMode);
  };

  // Mostrar mensaje si está en orientación vertical
  if (isPortrait) {
    return (
      <div className="orientation-warning">
        <div className="orientation-content">
          <div className="orientation-content-icons">
            <GameIcon stroke="#fff" size={64} />
            <MdScreenRotation className="rotate-icon" size={64} />
          </div>
          <h2>Gira tu dispositivo</h2>
          <p>Esta aplicación funciona mejor en orientación horizontal</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="remote-control">
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

        <div className="remote-body">
          <div className="movement-section">
            <MovementPanel
              connected={connected}
              onButtonDown={handleButtonDown}
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
