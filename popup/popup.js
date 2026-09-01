import JanusCache from "./JanusCache.js"
import Nodes from "./Nodes.js"
import Proxy from "./Proxy.js"
import ProxyConnection from "./ProxyConnection.js"
import state from "./State.js"

init()

function init() {
	ProxyConnection.setConnectionBadge("Idle", "idle")
	Proxy.setProxyStatus("Not connected to mesh proxy.", "muted")
	JanusCache.hydrateNodesFromCache()
	JanusCache.hydrateProxyFromCache()
	wireEvents()
	Nodes.fetchNodes()
	ProxyConnection.monitorProxyEvents()
	ProxyConnection.refreshProxyStatus()
}

function wireEvents() {
	state.elements.nodesBtn.addEventListener("click", () => Nodes.fetchNodes({ force: true }))
	state.elements.nodesList.addEventListener("click", Nodes.handleNodeSelection)
	state.elements.nodesTitle.addEventListener("click", Nodes.toggleNodesList)

	state.elements.connectBtn.addEventListener("click", ProxyConnection.handleConnect)
	state.elements.disconnectBtn.addEventListener("click", ProxyConnection.handleDisconnect)

	window.addEventListener("focus", ProxyConnection.refreshProxyStatus)
}
