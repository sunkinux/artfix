export interface ProcessedImage {
  original: string | null;
  restored: string | null;
  transparent: string | null;
}

export enum AppState {
  IDLE = 'IDLE',
  PROCESSING_RESTORE = 'PROCESSING_RESTORE',
  PROCESSING_MATTING = 'PROCESSING_MATTING',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS',
}

export interface MattingSettings {
  threshold: number;
  smoothing: number;
  mode: 'luminance' | 'color'; // Luminance is best for calligraphy, color for paintings
}

export type ProcessingStage = 'upload' | 'restore' | 'matte' | 'export';

declare global {
  interface AIStudio {
    hasSelectedApiKey(): Promise<boolean>;
    openSelectKey(): Promise<void>;
  }
}