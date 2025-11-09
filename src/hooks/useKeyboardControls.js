import { useEffect } from 'react';

export function useKeyboardControls(handleKeyDown, handleKeyUp, resetAllKeys) {
  useEffect(() => {
    function onKeyDown(e) {
      handleKeyDown(e);
    }

    function onKeyUp(e) {
      handleKeyUp(e);
    }

    function onBlur() {
      console.log('⚠️ Ventana perdió el foco - reseteando teclas');
      resetAllKeys();
    }

    function onVisibilityChange() {
      if (document.hidden) {
        console.log('⚠️ Pestaña oculta - reseteando teclas');
        resetAllKeys();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [handleKeyDown, handleKeyUp, resetAllKeys]);
}
