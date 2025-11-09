import { FaBluetoothB, FaWifi } from 'react-icons/fa';
import PropTypes from 'prop-types';
import './ConnectionPanel.css';

export function ConnectionPanel({
  connected,
  onConnect,
  onDisconnect,
  mode = 'ble',
  connectionStatus,
}) {
  const getIcon = () => {
    if (mode === 'wifi') {
      return <FaWifi className="round-icon" />;
    }
    return <FaBluetoothB className="round-icon" />;
  };

  const getTitle = () => {
    if (mode === 'wifi') {
      if (connectionStatus === 'connecting') return 'Conectando a WiFi...';
      if (connectionStatus === 'error') return 'Error de conexión WiFi';
      return connected ? 'Desconectar WiFi' : 'Conectar a ESP32 por WiFi';
    }
    return connected ? 'Desconectar BLE' : 'Conectar a ESP32 por Bluetooth';
  };

  const getClassName = () => {
    let baseClass = 'connection-round';
    if (mode === 'wifi' && connectionStatus === 'connecting') {
      return `${baseClass} connecting`;
    }
    if (mode === 'wifi' && connectionStatus === 'error') {
      return `${baseClass} error`;
    }
    return `${baseClass} ${connected ? 'connected' : 'disconnected'}`;
  };

  return (
    <div className="connection-panel">
      <button
        className={getClassName()}
        onClick={connected ? onDisconnect : onConnect}
        aria-label={connected ? 'Desconectar' : 'Conectar'}
        title={getTitle()}
        disabled={connectionStatus === 'connecting'}
      >
        {getIcon()}
        <span className="sr-only">{connected ? 'Conectado' : 'Desconectado'}</span>
      </button>
    </div>
  );
}

ConnectionPanel.propTypes = {
  connected: PropTypes.bool.isRequired,
  onConnect: PropTypes.func.isRequired,
  onDisconnect: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(['ble', 'wifi']),
  connectionStatus: PropTypes.oneOf(['disconnected', 'connecting', 'connected', 'error']),
};
