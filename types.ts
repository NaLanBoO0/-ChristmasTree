
export enum TreeState {
  FOLDED = 'FOLDED',
  SCATTERED = 'SCATTERED',
  ZOOMED = 'ZOOMED'
}

export interface HandData {
  isFist: boolean;
  isOpen: boolean;
  isPinching: boolean;
  rotation: number; // in radians or normalized
  position: { x: number; y: number; z: number };
  rawLandmarks: any[];
}

export interface ElementData {
  id: string;
  type: 'sphere' | 'box' | 'candy' | 'photo';
  textureUrl?: string;
  initialPos: [number, number, number];
  scatterPos: [number, number, number];
}
