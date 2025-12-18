
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'three',
        '@react-three/fiber',
        '@react-three/drei',
        '@react-three/postprocessing',
        'lucide-react',
        'gsap'
      ],
      output: {
        format: 'esm'
      }
    }
  },
  optimizeDeps: {
    exclude: [
      'react',
      'react-dom',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      '@react-three/postprocessing',
      'lucide-react',
      'gsap'
    ]
  }
});
