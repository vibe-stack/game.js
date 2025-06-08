import type { ThreeElements } from '@react-three/fiber'

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {
      // Allow all Three.js elements in JSX
      [k: string]: unknown;
    }
  }
} 

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements extends ThreeElements {
        [k: string]: unknown;
      }
    }
  }
}