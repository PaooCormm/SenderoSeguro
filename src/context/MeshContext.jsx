import React, { createContext, useContext } from 'react';
import { useMesh } from '../hooks/useMesh';

const MeshContext = createContext(null);

export function MeshProvider({ children }) {
  const mesh = useMesh();
  return (
    <MeshContext.Provider value={mesh}>
      {children}
    </MeshContext.Provider>
  );
}

export function useMeshContext() {
  const ctx = useContext(MeshContext);
  if (!ctx) {
    throw new Error('useMeshContext must be used within MeshProvider');
  }
  return ctx;
}
