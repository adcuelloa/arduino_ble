import './ControlPage.css';

import { useState } from 'react';
import { ConnectionPanel } from '../components/ConnectionPanel';
import { SpeedPanel } from '../components/SpeedPanel';
import { MovementPanel } from '../components/MovementPanel';
import { GripperPanel } from '../components/GripperPanel';
import { CommandMonitor } from '../components/CommandMonitor';
import { ModeSelector } from '../components/ModeSelector';

import { useBLE } from '../hooks/useBLE';
import { useWifi } from '../hooks/useWifi';
import { useKeyboardControls } from '../hooks/useKeyboardControls';

export default function ControlPage() {
  const [commMode, setCommMode] = useState('wifi');

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
