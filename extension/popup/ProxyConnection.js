import JanusCache from "./JanusCache.js"
import Nodes from "./Nodes.js"
import Proxy from "./Proxy.js"
import state from "./State.js"
import { sendRuntimeMessage } from "./utils.js"

export default class ProxyConnection {
	static async handleConnect() {
		const host = state.elements.hostInput.value.trim()
		if (!host) {
			Proxy.setProxyStatus("Host is required.", "error")
			state.elements.hostInput.focus()
			return
		}

		state.connecting = true
		this.setConnectionBadge("Connecting", "info")
		Proxy.setProxyStatus(`Connecting to ${host}:${state.DEFAULT_PORT}…`, "info")
		this.#setButtonLoading(state.elements.connectBtn, true, "Connect", "Connecting…")

		try {
			const response = await sendRuntimeMessage({ type: "SET_PROXY", host, port: state.DEFAULT_PORT })
			if (!response?.ok) {
				throw new Error(response?.error || "Unable to configure proxy")
			}

			const verified = await Proxy.verifyProxyConnectivity()
			if (!verified) {
				throw new Error("Proxy handshake failed. Node may be unreachable.")
			}

			this.#persistCurrentProxy({ host, port: state.DEFAULT_PORT, connectedAt: Date.now(), status: "connected" })
			this.setConnectionBadge("Connected", "success")
			Proxy.setProxyStatus(`Connected to ${host}:${state.DEFAULT_PORT}.`, "success")
		} catch (error) {
			await this.#safeClearProxy()

			this.#persistCurrentProxy({ host, port: state.DEFAULT_PORT, status: "failed", timestamp: Date.now() })
			this.setConnectionBadge("Error", "error")

			Proxy.setProxyStatus(error instanceof Error ? error.message : String(error), "error")
			Nodes.fetchNodes({ force: true })
		} finally {
			state.connecting = false
			this.#setButtonLoading(state.elements.connectBtn, false, "Connect")
		}
		await this.refreshProxyStatus()
	}

	static async handleDisconnect() {
		this.#setButtonLoading(state.elements.disconnectBtn, true, "Disconnect", "Disconnecting…")
		try {
			await sendRuntimeMessage({ type: "CLEAR_PROXY" })
		} catch (error) {
			console.error("Failed to clear proxy", error)
		} finally {
			this.#setButtonLoading(state.elements.disconnectBtn, false, "Disconnect")
		}
		this.setConnectionBadge("Idle", "idle")
		Proxy.setProxyStatus("Proxy disabled.", "info")
		this.#persistCurrentProxy({ status: "disconnected", timestamp: Date.now() })
	}

	static async refreshProxyStatus() {
		const settings = await Proxy.getProxySettings()
		if (!settings) {
			return
		}

		const { mode, rules } = settings
		const singleProxy = rules?.singleProxy

		if (mode === "fixed_servers" && singleProxy?.host) {
			const port = singleProxy.port || state.DEFAULT_PORT
			state.elements.hostInput.value = singleProxy.host
			this.#persistCurrentProxy({
				host: singleProxy.host,
				port,
				status: "connected",
				connectedAt: Date.now(),
			})
			this.setConnectionBadge("Connected", "success")
			Proxy.setProxyStatus(`Proxy active on ${singleProxy.host}:${port}.`, "success")
			return
		}

		if (!state.connecting) {
			this.setConnectionBadge("Idle", "idle")
			Proxy.setProxyStatus("Not connected to mesh proxy.", "muted")
		}
	}

	static monitorProxyEvents() {
		if (chrome?.proxy?.onProxyError) {
			chrome.proxy.onProxyError.addListener((details) => {
				this.setConnectionBadge("Error", "error")

				const message = details?.error ? `Proxy error: ${details.error}` : "Proxy error detected."
				Proxy.setProxyStatus(message, "error")

				this.#persistCurrentProxy({ status: "error", timestamp: Date.now() })
				Nodes.fetchNodes({ force: true })
			})
		}

		if (chrome?.proxy?.settings?.onChange) {
			chrome.proxy.settings.onChange.addListener(() => {
				this.refreshProxyStatus()
			})
		}
	}

	/**
	 * @param {HTMLButtonElement} button
	 * @param {boolean} isLoading
	 * @param {"Connect" | "Disconnect"} idleLabel
	 * @param {string} [loadingLabel]
	 */
	static #setButtonLoading(button, isLoading, idleLabel, loadingLabel) {
		if (!button) return

		button.disabled = isLoading
		button.classList.toggle("opacity-60", isLoading)

		if (idleLabel) {
			button.dataset.label = idleLabel
		} else if (!button.dataset.label) {
			button.dataset.label = button.textContent.trim()
		}

		button.textContent = isLoading ? loadingLabel || "Working…" : button.dataset.label
	}

	/**
	 * @param {string} label
	 * @param {"idle" | "info" | "success" | "error"} tone
	 */
	static setConnectionBadge(label, tone) {
		if (!state.elements.connectionBadge) return
		const palette = {
			idle: "text-amber-200",
			info: "text-blue-200",
			success: "text-emerald-200",
			error: "text-rose-200",
		}
		Object.values(palette).forEach((cls) => state.elements.connectionBadge.classList.remove(cls))
		const toneClass = palette[tone] || palette.idle
		state.elements.connectionBadge.classList.add(toneClass)
		state.elements.connectionBadge.textContent = label
	}

	static async #safeClearProxy() {
		try {
			await sendRuntimeMessage({ type: "CLEAR_PROXY" })
		} catch (error) {
			console.warn("Unable to clear proxy", error)
		}
	}

	/** @param {any} partial */
	static #persistCurrentProxy(partial) {
		const payload = { ...(state.currentProxy || {}), ...partial }
		state.currentProxy = payload
		JanusCache.writeJsonToStorage(state.CURRENT_PROXY_KEY, payload)
	}
}
