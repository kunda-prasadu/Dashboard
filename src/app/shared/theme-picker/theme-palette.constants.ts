export interface ThemePalette {
  readonly id: string;
  readonly name: string;
  readonly swatch: string;
  // Light-mode tokens
  readonly primary: string;
  readonly onPrimary: string;
  readonly primaryContainer: string;
  readonly onPrimaryContainer: string;
  // Dark-mode tokens
  readonly primaryDark: string;
  readonly onPrimaryDark: string;
  readonly primaryContainerDark: string;
  readonly onPrimaryContainerDark: string;
}

export const THEME_PALETTES: readonly ThemePalette[] = [
  {
    id: 'azure',
    name: 'Azure Blue',
    swatch: '#1565C0',
    primary: '#1565C0', onPrimary: '#ffffff',
    primaryContainer: '#BBDEFB', onPrimaryContainer: '#0d2e5e',
    primaryDark: '#90CAF9', onPrimaryDark: '#001d6c',
    primaryContainerDark: '#00478a', onPrimaryContainerDark: '#BBDEFB',
  },
  {
    id: 'forest',
    name: 'Forest',
    swatch: '#2E7D32',
    primary: '#2E7D32', onPrimary: '#ffffff',
    primaryContainer: '#C8E6C9', onPrimaryContainer: '#1b4d1e',
    primaryDark: '#A5D6A7', onPrimaryDark: '#003a00',
    primaryContainerDark: '#1a5c20', onPrimaryContainerDark: '#C8E6C9',
  },
  {
    id: 'crimson',
    name: 'Crimson',
    swatch: '#C62828',
    primary: '#C62828', onPrimary: '#ffffff',
    primaryContainer: '#FFCDD2', onPrimaryContainer: '#7f0000',
    primaryDark: '#EF9A9A', onPrimaryDark: '#7f0000',
    primaryContainerDark: '#8b1a1a', onPrimaryContainerDark: '#FFCDD2',
  },
  {
    id: 'amber',
    name: 'Amber',
    swatch: '#E65100',
    primary: '#E65100', onPrimary: '#ffffff',
    primaryContainer: '#FFE0B2', onPrimaryContainer: '#7f2d00',
    primaryDark: '#FFCC80', onPrimaryDark: '#7f2d00',
    primaryContainerDark: '#bf360c', onPrimaryContainerDark: '#FFE0B2',
  },
  {
    id: 'violet',
    name: 'Violet',
    swatch: '#6A1B9A',
    primary: '#6A1B9A', onPrimary: '#ffffff',
    primaryContainer: '#E1BEE7', onPrimaryContainer: '#3d0066',
    primaryDark: '#CE93D8', onPrimaryDark: '#3d0066',
    primaryContainerDark: '#4a0072', onPrimaryContainerDark: '#E1BEE7',
  },
  {
    id: 'teal',
    name: 'Teal',
    swatch: '#00695C',
    primary: '#00695C', onPrimary: '#ffffff',
    primaryContainer: '#B2DFDB', onPrimaryContainer: '#003c35',
    primaryDark: '#80CBC4', onPrimaryDark: '#003c35',
    primaryContainerDark: '#004d40', onPrimaryContainerDark: '#B2DFDB',
  },
  {
    id: 'rose',
    name: 'Rose',
    swatch: '#AD1457',
    primary: '#AD1457', onPrimary: '#ffffff',
    primaryContainer: '#FCE4EC', onPrimaryContainer: '#6b0033',
    primaryDark: '#F48FB1', onPrimaryDark: '#6b0033',
    primaryContainerDark: '#880e4f', onPrimaryContainerDark: '#FCE4EC',
  },
  {
    id: 'indigo',
    name: 'Indigo',
    swatch: '#283593',
    primary: '#283593', onPrimary: '#ffffff',
    primaryContainer: '#C5CAE9', onPrimaryContainer: '#0d1a5b',
    primaryDark: '#9FA8DA', onPrimaryDark: '#0d1a5b',
    primaryContainerDark: '#1a237e', onPrimaryContainerDark: '#C5CAE9',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    swatch: '#1B5E20',
    primary: '#1B5E20', onPrimary: '#ffffff',
    primaryContainer: '#DCEDC8', onPrimaryContainer: '#003300',
    primaryDark: '#DCEDC8', onPrimaryDark: '#003300',
    primaryContainerDark: '#1b5e20', onPrimaryContainerDark: '#DCEDC8',
  },
  {
    id: 'slate',
    name: 'Slate',
    swatch: '#37474F',
    primary: '#37474F', onPrimary: '#ffffff',
    primaryContainer: '#CFD8DC', onPrimaryContainer: '#102027',
    primaryDark: '#B0BEC5', onPrimaryDark: '#102027',
    primaryContainerDark: '#263238', onPrimaryContainerDark: '#CFD8DC',
  },
] as const;
