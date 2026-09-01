// state.js
class State {
	/** @type {Array<string>} */
	nodes = []

	/** @type {number|null} */
	nodesUpdatedAt = null

	/** @type {boolean} */
	nodesLoading = false

	/** @type {boolean} */
	connecting = false

	/** @type {Object|null} */
	currentProxy = null

	count = 0

	elements = {
		nodesTitle: /** @type{HTMLButtonElement} */ (document.getElementById("nodesTitle")),
		nodesBtn: /** @type {HTMLButtonElement} */ (document.getElementById("nodes")),
		nodesIndicator: /** @type {HTMLElement} */ (document.getElementById("nodesIndicator")),
		nodesLabel: /** @type {HTMLElement} */ (document.getElementById("nodesLabel")),
		nodesList: /** @type {HTMLElement} */ (document.getElementById("status")),
		nodesMeta: /** @type {HTMLElement} */ (document.getElementById("nodesMeta")),
		arrow: /**@type {HTMLElement} */ (document.getElementById("nodesChevron")),
		hostInput: /** @type {HTMLInputElement} */ (document.getElementById("host")),
		portInput: /** @type {HTMLInputElement} */ (document.getElementById("port")),
		connectBtn: /** @type {HTMLButtonElement} */ (document.getElementById("connect")),
		disconnectBtn: /** @type {HTMLButtonElement} */ (document.getElementById("disconnect")),
		proxyStatus: /** @type {HTMLElement} */ (document.getElementById("proxyStatus")),
		connectionBadge: /** @type {HTMLElement} */ (document.getElementById("connectionBadge")),
	}

	CURRENT_PROXY_KEY = "janus:current-proxy"
	NODE_CACHE_KEY = "janus:nodes-cache"
	NODE_CACHE_TTL_MS = 60 * 60 * 1000
	DEFAULT_PORT = 1080
}
export default new State() // instance, not the class
