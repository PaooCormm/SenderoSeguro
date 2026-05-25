import { useState, useEffect, useCallback } from 'react';
import { Dimensions } from 'react-native';

/**
 * useOrientation
 * Retorna { isLandscape, isTablet, width, height } y se actualiza
 * automáticamente al rotar el dispositivo.
 */
export function useOrientation() {
  const getState = useCallback(() => {
    const { width, height } = Dimensions.get('window');
    const isLandscape = width > height;
    // heurístico: tablet si la pantalla más corta supera 600 dp
    const isTablet = Math.min(width, height) >= 600;
    return { width, height, isLandscape, isTablet };
  }, []);

  const [state, setState] = useState(getState);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', () => {
      setState(getState());
    });
    return () => sub?.remove?.();
  }, [getState]);

  return state;
}