const LAZY_IMPORT_FAILURE = /(?:failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|chunkloaderror|loading chunk .+ failed)/i
const MODULE_URL = /https?:\/\/[^\s)]+/i

/**
 * Decide whether a rejected React.lazy import deserves one full-page retry.
 * The failed module URL normally contains Vite's timestamp or a production
 * chunk hash, so a later deployment produces a new signature while the same
 * rejected promise cannot cause a reload loop.
 */
export const planLazyImportRecovery = (error, pageUrl = '', previousSignature = null) => {
  const message = String(error?.message || error || '')
  if (!LAZY_IMPORT_FAILURE.test(message)) {
    return { shouldReload: false, signature: null }
  }

  const failedModule = message.match(MODULE_URL)?.[0] || message
  const signature = `${pageUrl}::${failedModule}`
  return {
    shouldReload: signature !== previousSignature,
    signature,
  }
}

export default { planLazyImportRecovery }
