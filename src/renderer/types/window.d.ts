import type { ImagePrepApi } from '../../preload'

declare global {
  interface Window {
    imageprep: ImagePrepApi
  }
}

export {}
