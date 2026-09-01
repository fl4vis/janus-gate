import state from "./State.js"

export default class Proxy {
	static #PROBE_URL = "https://www.google.com/generate_204"
	static #PROBE_TIMEOUT_MS = 4000

	/**
	 * @param {string} message
	 * @param {"muted"|"info"|"success"|"error"} [tone="muted"]
	 */
	static setProxyStatus(message, tone = "muted") {
		if (!state.elements.proxyStatus) return

		const palette = {
			muted: "text-slate-300",
			info: "text-blue-200",
			success: "text-emerald-200",
			error: "text-rose-200",
		}
		Object.values(palette).forEach((cls) => state.elements.proxyStatus.classList.remove(cls))

		if (palette[tone]) {
			state.elements.proxyStatus.classList.add(palette[tone])
		}
		state.elements.proxyStatus.textContent = message
	}

	static async verifyProxyConnectivity() {
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), this.#PROBE_TIMEOUT_MS)

		try {
			await fetch(this.#PROBE_URL, {
				method: "GET",
				mode: "no-cors",
				cache: "no-store",
				credentials: "omit",
				signal: controller.signal,
			})
			return true
		} catch (error) {
			console.error("Proxy verification failed", error)
			return false
		} finally {
			clearTimeout(timeoutId)
		}
	}

	/**
	 * Get the current Chrome proxy configuration
	 * @returns {Promise<chrome.proxy.ProxyConfig|null>}
	 */
	static getProxySettings() {
		return new Promise((resolve) => {
			if (!chrome?.proxy?.settings?.get) {
				resolve(null)
				return
			}

			chrome.proxy.settings.get({ incognito: false }, (details) => {
				if (chrome.runtime?.lastError) {
					console.warn("Failed to read proxy settings", chrome.runtime.lastError)
					resolve(null)
					return
				}
				resolve(details?.value || null)
			})
		})
	}
}
