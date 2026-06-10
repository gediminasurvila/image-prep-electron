/**
 * Main-process client for the Sharp worker pool.
 *
 * Spawns a small pool of child processes (default 2) that perform all Sharp
 * work. The main Electron process never imports Sharp, which keeps its glib
 * clean for the GUI (see nativeFix.ts for the why). Each worker handles one
 * task at a time; extra tasks queue until a worker is free, which gives us the
 * batch concurrency limit for free.
 */
import { fork, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import { getLibvipsPath } from './nativeFix'
import type { TaskMap, WorkerResponse, WorkerTaskType } from './workers/protocol'
import type {
  BatchProgressEvent,
  ImageMetadata,
  PreviewResult,
  ProcessImageRequest,
  ProcessImageResult
} from '@shared/types'

const POOL_SIZE = 2

interface PendingTask {
  id: number
  type: WorkerTaskType
  payload: unknown
  resolve: (value: unknown) => void
  reject: (err: Error) => void
}

interface Worker {
  proc: ChildProcess
  current: PendingTask | null
}

const workers: Worker[] = []
const queue: PendingTask[] = []
let nextId = 1

function workerScriptPath(): string {
  // Built alongside the main bundle at out/main/workers/processImageWorker.js.
  return path.join(__dirname, 'workers', 'processImageWorker.js')
}

function spawnWorker(): Worker {
  const env: NodeJS.ProcessEnv = { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
  const lib = getLibvipsPath()
  if (lib) {
    env.LD_PRELOAD = env.LD_PRELOAD ? `${lib}:${env.LD_PRELOAD}` : lib
  }

  const proc = fork(workerScriptPath(), [], { env, stdio: ['ignore', 'inherit', 'inherit', 'ipc'] })
  const worker: Worker = { proc, current: null }

  proc.on('message', (msg: WorkerResponse) => {
    // The initial readiness ping (id 0) carries no pending task.
    if (msg.id === 0) return
    const task = worker.current
    if (!task || task.id !== msg.id) return
    worker.current = null
    if (msg.ok) task.resolve(msg.result)
    else task.reject(new Error(msg.error ?? 'Worker error'))
    pump()
  })

  const handleExit = (): void => {
    const idx = workers.indexOf(worker)
    if (idx >= 0) workers.splice(idx, 1)
    if (worker.current) {
      worker.current.reject(new Error('Sharp worker exited unexpectedly.'))
      worker.current = null
    }
    pump()
  }
  proc.on('exit', handleExit)
  proc.on('error', handleExit)

  workers.push(worker)
  return worker
}

/** Assign queued tasks to free workers, spawning workers up to POOL_SIZE. */
function pump(): void {
  while (queue.length > 0) {
    let worker = workers.find((w) => w.current === null)
    if (!worker) {
      if (workers.length < POOL_SIZE) worker = spawnWorker()
      else break
    }
    const task = queue.shift()!
    worker.current = task
    worker.proc.send({ id: task.id, type: task.type, payload: task.payload })
  }
}

function run<T extends WorkerTaskType>(
  type: T,
  payload: TaskMap[T]['payload']
): Promise<TaskMap[T]['result']> {
  return new Promise((resolve, reject) => {
    queue.push({
      id: nextId++,
      type,
      payload,
      resolve: resolve as (value: unknown) => void,
      reject
    })
    pump()
  })
}

// --- Public proxy API (mirrors imageProcessor, but routed through workers) ---

export function getMetadataForPaths(paths: string[]): Promise<ImageMetadata[]> {
  return run('metadata', { paths })
}

export function generatePreview(req: ProcessImageRequest): Promise<PreviewResult> {
  return run('preview', req)
}

export function processImage(req: ProcessImageRequest): Promise<ProcessImageResult> {
  return run('process', req)
}

export function isAvifSupported(): Promise<boolean> {
  return run('avif', undefined)
}

export interface BatchOptions {
  concurrency?: number
  onProgress?: (event: BatchProgressEvent) => void
  isCancelled?: () => boolean
}

/**
 * Process many images, emitting progress. Concurrency is naturally bounded by
 * the worker pool; we additionally cap in-flight tasks to `concurrency`.
 */
export async function processBatch(
  items: ProcessImageRequest[],
  options: BatchOptions = {}
): Promise<ProcessImageResult[]> {
  const concurrency = Math.max(1, Math.min(options.concurrency ?? POOL_SIZE, POOL_SIZE))
  const total = items.length
  const results: ProcessImageResult[] = new Array(total)
  let completedCount = 0
  let nextIndex = 0

  const worker = async (): Promise<void> => {
    while (true) {
      if (options.isCancelled?.()) return
      const index = nextIndex++
      if (index >= total) return
      const req = items[index]

      options.onProgress?.({
        imageId: req.image.id,
        status: 'processing',
        fraction: completedCount / total,
        completedCount,
        totalCount: total,
        currentOperation: `Processing ${req.image.fileName}`
      })

      // A single failure must never abort the batch.
      const result = await processImage(req).catch(
        (err): ProcessImageResult => ({
          imageId: req.image.id,
          inputPath: req.image.inputPath,
          success: false,
          status: 'error',
          originalSizeBytes: req.image.originalSizeBytes,
          originalWidth: req.image.originalWidth,
          originalHeight: req.image.originalHeight,
          error: err instanceof Error ? err.message : String(err)
        })
      )

      results[index] = result
      completedCount++
      options.onProgress?.({
        imageId: req.image.id,
        status: result.status,
        fraction: completedCount / total,
        completedCount,
        totalCount: total,
        currentOperation:
          completedCount >= total ? 'Done' : `Processed ${completedCount}/${total}`,
        result
      })
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, () => worker()))
  return results.filter(Boolean)
}

/** Gracefully terminate all workers (called on app quit). */
export function shutdownWorkers(): void {
  for (const w of workers) w.proc.kill()
  workers.length = 0
}
