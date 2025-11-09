import PropTypes from 'prop-types';
import './ModeSelector.css';

export function ModeSelector({ currentMode, onModeChange, connected }) {
  return (
    <div className="mode-selector">
      <button
        className={`mode-btn ${currentMode === 'wifi' ? 'active' : ''}`}
        onClick={() => onModeChange('wifi')}
        disabled={connected}
        title={connected ? 'Desconecta primero para cambiar de modo' : 'Modo WiFi (WebSocket)'}
      >
        📡 WiFi
      </button>
      <button
        className={`mode-btn ${currentMode === 'ble' ? 'active' : ''}`}
        onClick={() => onModeChange('ble')}
        disabled={connected}
        title={connected ? 'Desconecta primero para cambiar de modo' : 'Modo Bluetooth (BLE)'}
      >
        🔵 BLE
      </button>
    </div>
  );
}

ModeSelector.propTypes = {
  currentMode: PropTypes.oneOf(['wifi', 'ble']).isRequired,
  onModeChange: PropTypes.func.isRequired,
  connected: PropTypes.bool.isRequired,
};
