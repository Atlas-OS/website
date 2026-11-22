import manager from '@/assets/atlas-manager-home.png';

// Keep the preload and the visible image on the same responsive candidates.
export const managerPreview = {
  src: manager,
  width: 902,
  height: 681,
  widths: [450, 700, 902],
  sizes: '(max-width: 767px) 92vw, (max-width: 1100px) 76vw, 800px',
  format: 'avif' as const,
};
