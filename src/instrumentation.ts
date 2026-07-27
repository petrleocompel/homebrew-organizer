/**
 * Next.js instrumentation hook.
 *
 * User provisioning deliberately does not happen at application startup. Owners
 * are created by the explicit bootstrap script and subsequent accounts use
 * seven-day invitation links.
 */
export async function register() {}
