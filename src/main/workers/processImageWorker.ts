/**
 * Sharp worker child process.
 *
 * This is spawned by `sharpClient.ts` with `child_process.fork` using
 * `ELECTRON_RUN_AS_NODE=1` and (on Linux) `LD_PRELOAD` pointing at libvips, so
 * that all Sharp/libvips work happens in a process with a consistent glib —
 * isolated from the main Electron process's GUI glib. See `nativeFix.ts`.
 *
 * It receives `WorkerRequest` messages over the fork IPC channel and replies
 * with `WorkerResponse`. All Sharp imports live behind this boundary; the main
 * process never loads Sharp.
 */
import {
  generatePreview,
  getMetadataForPaths,
  isAvifSupported,
  processImage
} from '../imageProcessor'
import type { WorkerRequest, WorkerResponse } from './protocol'
import type { ProcessImageRequest } from '@shared/types'

function send(response: WorkerResponse): void {
  process.send?.(response)
}

process.on('message', async (msg: WorkerRequest) => {
  try {
    let result: unknown
    switch (msg.type) {
      case 'metadata':
        result = await getMetadataForPaths((msg.payload as { paths: string[] }).paths)
        break
      case 'preview':
        result = await generatePreview(msg.payload as ProcessImageRequest)
        break
      case 'process':
        result = await processImage(msg.payload as ProcessImageRequest)
        break
      case 'avif':
        result = await isAvifSupported()
        break
      default:
        throw new Error(`Unknown worker task type: ${String(msg.type)}`)
    }
    send({ id: msg.id, ok: true, result })
  } catch (err) {
    send({ id: msg.id, ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

// Signal readiness (useful for debugging; the pool does not require it).
process.send?.({ id: 0, ok: true, result: 'ready' } satisfies WorkerResponse)
