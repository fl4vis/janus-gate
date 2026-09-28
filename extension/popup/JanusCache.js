import state from "./State.js"
import Nodes from "./Nodes.js"
import Proxy from "./Proxy.js"

export default class JanusCache {
	/** @param {string} key*/
	static readJsonFromStorage(key) {
		try {
			const raw = localStorage.getItem(key)
			return raw ? JSON.parse(raw) : null
		} catch (error) {
			console.warn(`Failed to read ${key}`, error)
			return null
		}
	}

	/**
	 * @param {string} key
	 * @param {Object} value
	 */
	static writeJsonToStorage(key, value) {
		try {
			localStorage.setItem(state.NODE_CACHE_KEY, JSON.stringify(value))
		} catch (error) {
			console.warn(`Failed to persist ${key}`, error)
		}
	}

	static hydrateNodesFromCache() {
		const cached = JanusCache.readJsonFromStorage(state.NODE_CACHE_KEY)
		if (!cached) return

		if (Date.now() - cached.timestamp > state.NODE_CACHE_TTL_MS) {
			localStorage.removeItem(state.NODE_CACHE_KEY)
			return
		}

		state.nodes = cached.nodes || []
		state.nodesUpdatedAt = cached.timestamp
		Nodes.renderNodes(state.nodes, { source: "cache" })
	}

	static hydrateProxyFromCache() {
		const cached = JanusCache.readJsonFromStorage(state.CURRENT_PROXY_KEY)
		if (!cached?.host) return
		state.currentProxy = cached
		state.elements.hostInput.value = cached.host
		Proxy.setProxyStatus(`Last mesh node: ${cached.host}:${cached.port || state.DEFAULT_PORT}.`, "info")
	}
}
