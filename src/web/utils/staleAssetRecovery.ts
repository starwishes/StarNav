/** Session flag: avoid infinite reload loops when a deploy leaves stale chunks. */
export const STALE_ASSET_RECOVERY_KEY = 'starnav-stale-asset-recovery'

type RecoveryDeps = {
  reload?: () => void
  getRegistrations?: () => Promise<readonly ServiceWorkerRegistration[]>
  cachesApi?: Pick<CacheStorage, 'keys' | 'delete'>
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
}

const defaultStorage = (): RecoveryDeps['storage'] | undefined => {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage : undefined
  } catch {
    return undefined
  }
}

/**
 * After a Docker/image rebuild, the open tab may still run an old SW shell that
 * points at deleted AdminDashboard-*.js hashes → endless loading until SW updates.
 * Unregister SW + drop Cache Storage once, then hard reload.
 */
export async function recoverFromStaleAssets(deps: RecoveryDeps = {}): Promise<'recovered' | 'skipped'> {
  const storage = deps.storage ?? defaultStorage()
  if (storage?.getItem(STALE_ASSET_RECOVERY_KEY) === '1') {
    return 'skipped'
  }

  try {
    storage?.setItem(STALE_ASSET_RECOVERY_KEY, '1')
  } catch {
    // ignore quota / private mode
  }

  try {
    const getRegistrations =
      deps.getRegistrations ??
      (() =>
        typeof navigator !== 'undefined' && navigator.serviceWorker
          ? navigator.serviceWorker.getRegistrations()
          : Promise.resolve([] as ServiceWorkerRegistration[]))

    const registrations = await getRegistrations()
    await Promise.all([...registrations].map((registration) => registration.unregister()))

    const cachesApi =
      deps.cachesApi ??
      (typeof caches !== 'undefined' ? caches : undefined)
    if (cachesApi) {
      const keys = await cachesApi.keys()
      await Promise.all(keys.map((key) => cachesApi.delete(key)))
    }
  } catch {
    // Best-effort cleanup; still reload below.
  }

  const reload = deps.reload ?? (() => window.location.reload())
  reload()
  return 'recovered'
}

export const clearStaleAssetRecoveryFlag = (storage?: RecoveryDeps['storage']) => {
  try {
    ;(storage ?? defaultStorage())?.removeItem(STALE_ASSET_RECOVERY_KEY)
  } catch {
    // ignore
  }
}
