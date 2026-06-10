/**
 * Locates Sharp's bundled libvips shared object.
 *
 * Why this exists: Sharp's prebuilt `libvips-cpp.so` statically embeds and
 * exports its own glib. Electron's main process loads the *system* glib for its
 * GUI/GTK integration. Loading Sharp in the main process makes the two glibs
 * collide (libvips aborts with `VIPS_IS_OBJECT` assertions; conversely forcing
 * libvips' glib breaks Electron's GTK). The robust fix is to run Sharp in a
 * separate child process that `LD_PRELOAD`s libvips so its glib is authoritative
 * there, while the main process keeps the system glib. This module just finds
 * the `.so` path to feed into that child's environment (see sharpClient.ts).
 *
 * Returns null on non-Linux (no conflict) or when the vendored lib is absent.
 */
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'

let cached: string | null | undefined

export function getLibvipsPath(): string | null {
  if (cached !== undefined) return cached
  cached = findLibvips()
  return cached
}

function findLibvips(): string | null {
  if (process.platform !== 'linux') return null
  try {
    const sharpMain = require.resolve('sharp')
    let dir = path.dirname(sharpMain)
    if (path.basename(dir) === 'lib') dir = path.dirname(dir)

    const vendor = path.join(dir, 'vendor')
    if (!existsSync(vendor)) return null

    // vendor/<libvips-version>/<platform>/lib/libvips-cpp.so.*
    for (const version of safeReaddir(vendor)) {
      const versionDir = path.join(vendor, version)
      for (const platform of safeReaddir(versionDir)) {
        const libDir = path.join(versionDir, platform, 'lib')
        const so = safeReaddir(libDir).find((f) => f.startsWith('libvips-cpp.so'))
        if (so) return toUnpackedPath(path.join(libDir, so))
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * In a packaged app the resolved path may live inside `app.asar`, which is a
 * virtual archive the dynamic linker cannot read. Sharp's native files are
 * asar-unpacked (see electron-builder.yml), so rewrite to the real path.
 */
function toUnpackedPath(p: string): string {
  if (p.includes(`app.asar${path.sep}`) && !p.includes('app.asar.unpacked')) {
    return p.replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`)
  }
  return p
}

function safeReaddir(dir: string): string[] {
  try {
    return readdirSync(dir)
  } catch {
    return []
  }
}
