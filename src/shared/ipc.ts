/** Canonical IPC channel names shared between main and preload. */
export const IpcChannels = {
  selectImages: 'dialog:select-images',
  selectFolderImages: 'dialog:select-folder-images',
  selectOutputFolder: 'dialog:select-output-folder',
  getMetadata: 'image:get-metadata',
  generatePreview: 'image:generate-preview',
  processImage: 'image:process',
  processBatch: 'image:process-batch',
  cancelBatch: 'image:cancel-batch',
  settingsLoad: 'settings:load',
  settingsSave: 'settings:save',
  capabilitiesAvif: 'capabilities:avif',

  // Events (main -> renderer)
  batchProgress: 'image:progress',
  imageCompleted: 'image:completed',
  imageError: 'image:error',
  batchCompleted: 'batch:completed'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
