import JanusCache from "./JanusCache.js"

const NODE_CACHE_KEY = "janus:nodes-cache"
const CURRENT_PROXY_KEY = "janus:current-proxy"
const NODE_CACHE_TTL_MS = 60 * 60 * 1000
const PROBE_URL = "https://www.google.com/generate_204"
const PROBE_TIMEOUT_MS = 4000
const DEFAULT_PORT = 1080

const elements = {
    nodesTitle: /** @type{HTMLButtonElement} */ (document.getElementById("nodesTitle")),
    nodesBtn: /** @type {HTMLButtonElement} */ (document.getElementById("nodes")),
    nodesIndicator: /** @type {HTMLElement} */ (document.getElementById("nodesIndicator")),
    nodesLabel: /** @type {HTMLElement} */ (document.getElementById("nodesLabel")),
    nodesList: /** @type {HTMLElement} */ (document.getElementById("status")),
    nodesMeta: /** @type {HTMLElement} */ (document.getElementById("nodesMeta")),
    hostInput: /** @type {HTMLInputElement} */ (document.getElementById("host")),
    portInput: /** @type {HTMLInputElement} */ (document.getElementById("port")),
    connectBtn: /** @type {HTMLButtonElement} */ (document.getElementById("connect")),
    disconnectBtn: /** @type {HTMLButtonElement} */ (document.getElementById("disconnect")),
    proxyStatus: /** @type {HTMLElement} */ (document.getElementById("proxyStatus")),
    connectionBadge: /** @type {HTMLElement} */ (document.getElementById("connectionBadge")),
}

const state = {
    nodes: [],
    nodesUpdatedAt: null,
    nodesLoading: false,
    connecting: false,
    currentProxy: null,
}

init()

function init() {
    setConnectionBadge("Idle", "idle")
    setProxyStatus("Not connected to mesh proxy.", "muted")
    hydrateNodesFromCache()
    hydrateProxyFromCache()
    wireEvents()
    fetchNodes()
    monitorProxyEvents()
    refreshProxyStatus()
}

function wireEvents() {
    elements.nodesTitle.addEventListener("click", toggleNodesList)
    elements.nodesBtn.addEventListener("click", () => fetchNodes({ force: true }))
    elements.nodesList.addEventListener("click", handleNodeSelection)
    elements.connectBtn.addEventListener("click", handleConnect)
    elements.disconnectBtn.addEventListener("click", handleDisconnect)
    window.addEventListener("focus", refreshProxyStatus)
}

function toggleNodesList() {
    elements.nodesList.classList.toggle("hidden")

    let arrow = /**@type {HTMLElement} */ (document.getElementById("nodesChevron"))
    arrow.classList.toggle("rotate-180")
}

function hydrateNodesFromCache() {
    const cached = JanusCache.readJsonFromStorage(NODE_CACHE_KEY)
    if (!cached) return
    if (Date.now() - cached.timestamp > NODE_CACHE_TTL_MS) {
        localStorage.removeItem(NODE_CACHE_KEY)
        return
    }
    state.nodes = cached.nodes || []
    state.nodesUpdatedAt = cached.timestamp
    renderNodes(state.nodes, { source: "cache" })
}

function hydrateProxyFromCache() {
    const cached = JanusCache.readJsonFromStorage(CURRENT_PROXY_KEY)
    if (!cached?.host) return
    state.currentProxy = cached
    elements.hostInput.value = cached.host
    setProxyStatus(`Last mesh node: ${cached.host}:${cached.port || DEFAULT_PORT}.`, "info")
}

function handleNodeSelection(event) {
    const control = event.target.closest("[data-node-ip]")
    if (!control) return
    const { nodeIp } = control.dataset
    if (!nodeIp) return
    elements.hostInput.value = nodeIp
    setProxyStatus(`Node ${nodeIp} selected. Press Connect to start routing.`, "info")
}

async function fetchNodes({ force = false } = {}) {
    if (state.nodesLoading) return
    const isCacheFresh = state.nodesUpdatedAt && Date.now() - state.nodesUpdatedAt < NODE_CACHE_TTL_MS
    if (!force && isCacheFresh) return
    setNodesLoading(true)
    try {
        const response = await sendRuntimeMessage({ type: "GET_NODES" })
        if (response?.error) {
            throw new Error(response.error)
        }
        if (!Array.isArray(response)) {
            throw new Error("Unexpected nodes payload")
        }
        const nodes = response.map((item) => ({ ip: typeof item.ip === "string" ? item.ip.trim() : "" })).filter((item) => Boolean(item.ip))
        state.nodes = nodes
        state.nodesUpdatedAt = Date.now()
        JanusCache.writeJsonToStorage(NODE_CACHE_KEY, {
            nodes,
            timestamp: state.nodesUpdatedAt,
        })
        renderNodes(nodes, { source: "live" })
    } catch (error) {
        console.error("Node discovery failed", error)
        renderNodes([], { error: error.message })
        setProxyStatus(`Node discovery failed: ${error.message}`, "error")
    } finally {
        setNodesLoading(false)
    }
}

function renderNodes(nodes, { source = "cache", error = null } = {}) {
    if (error) {
        elements.nodesList.innerHTML = `<p class="text-rose-300">${error}</p>`
        elements.nodesMeta.textContent = "Unable to load mesh nodes."
        return
    }
    if (!nodes.length) {
        elements.nodesList.innerHTML = `<p class="text-slate-400">No reachable nodes right now.</p>`
        elements.nodesMeta.textContent = "Nodes update automatically when connections change."
        return
    }
    const template = nodes
        .map((node, index) => {
            return `
				<div class="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3 gap-2">
					<div>
						<p class="text-xs uppercase tracking-wide text-slate-400">Node ${index + 1}</p>
						<p class="font-semibold text-xs text-white">${node.ip}</p>
					</div>
					<button class="rounded-xl border border-blue-400/40 bg-blue-500/20 px-2 py-1 text-xs font-semibold text-blue-100 transition hover:bg-blue-500/40" data-node-ip="${node.ip}">
						Use
					</button>
				</div>
			`
        })
        .join("")
    elements.nodesList.innerHTML = template
    const descriptor = source === "live" ? "Live" : "Cached"
    elements.nodesMeta.textContent = `${descriptor} ${nodes.length} ${nodes.length === 1 ? "node" : "nodes"} • Updated ${formatRelativeTime(state.nodesUpdatedAt)}`
}

async function handleConnect() {
    const host = elements.hostInput.value.trim()
    if (!host) {
        setProxyStatus("Host is required.", "error")
        elements.hostInput.focus()
        return
    }
    if (!isValidHost(host)) {
        setProxyStatus("Enter a valid IPv4 or hostname.", "error")
        elements.hostInput.focus()
        return
    }
    state.connecting = true
    setConnectionBadge("Connecting", "info")
    setProxyStatus(`Connecting to ${host}:${DEFAULT_PORT}…`, "info")
    setButtonLoading(elements.connectBtn, true, "Connect", "Connecting…")
    try {
        const response = await sendRuntimeMessage({ type: "SET_PROXY", host, port: DEFAULT_PORT })
        if (!response?.ok) {
            throw new Error(response?.error || "Unable to configure proxy")
        }
        const verified = await verifyProxyConnectivity()
        if (!verified) {
            throw new Error("Proxy handshake failed. Node may be unreachable.")
        }
        persistCurrentProxy({ host, port: DEFAULT_PORT, connectedAt: Date.now(), status: "connected" })
        setConnectionBadge("Connected", "success")
        setProxyStatus(`Connected to ${host}:${DEFAULT_PORT}.`, "success")
    } catch (error) {
        await safeClearProxy()
        persistCurrentProxy({ host, port: DEFAULT_PORT, status: "failed", timestamp: Date.now() })
        setConnectionBadge("Error", "error")
        setProxyStatus(error.message, "error")
        fetchNodes({ force: true })
    } finally {
        state.connecting = false
        setButtonLoading(elements.connectBtn, false, "Connect")
    }
    await refreshProxyStatus()
}

async function handleDisconnect() {
    setButtonLoading(elements.disconnectBtn, true, "Disconnect", "Disconnecting…")
    try {
        await sendRuntimeMessage({ type: "CLEAR_PROXY" })
    } catch (error) {
        console.error("Failed to clear proxy", error)
    } finally {
        setButtonLoading(elements.disconnectBtn, false, "Disconnect")
    }
    setConnectionBadge("Idle", "idle")
    setProxyStatus("Proxy disabled.", "info")
    persistCurrentProxy({ status: "disconnected", timestamp: Date.now() })
}

async function refreshProxyStatus() {
    const settings = await getProxySettings()
    if (!settings) {
        return
    }
    const { mode, rules } = settings
    const singleProxy = rules?.singleProxy
    if (mode === "fixed_servers" && singleProxy?.host) {
        const port = singleProxy.port || DEFAULT_PORT
        elements.hostInput.value = singleProxy.host
        persistCurrentProxy({
            host: singleProxy.host,
            port,
            status: "connected",
            connectedAt: Date.now(),
        })
        setConnectionBadge("Connected", "success")
        setProxyStatus(`Proxy active on ${singleProxy.host}:${port}.`, "success")
        return
    }
    if (!state.connecting) {
        setConnectionBadge("Idle", "idle")
        setProxyStatus("Not connected to mesh proxy.", "muted")
    }
}

function monitorProxyEvents() {
    if (chrome?.proxy?.onProxyError) {
        chrome.proxy.onProxyError.addListener((details) => {
            setConnectionBadge("Error", "error")
            const message = details?.error ? `Proxy error: ${details.error}` : "Proxy error detected."
            setProxyStatus(message, "error")
            persistCurrentProxy({ status: "error", timestamp: Date.now() })
            fetchNodes({ force: true })
        })
    }
    if (chrome?.proxy?.settings?.onChange) {
        chrome.proxy.settings.onChange.addListener(() => {
            refreshProxyStatus()
        })
    }
}

function setNodesLoading(isLoading) {
    state.nodesLoading = isLoading
    if (elements.nodesBtn) {
        elements.nodesBtn.disabled = isLoading
    }
    if (elements.nodesIndicator) {
        elements.nodesIndicator.classList.toggle("animate-pulse", isLoading)
        elements.nodesIndicator.classList.toggle("bg-blue-200", isLoading)
        elements.nodesIndicator.classList.toggle("bg-blue-300", !isLoading)
    }
    if (elements.nodesLabel) {
        elements.nodesLabel.textContent = isLoading ? "Loading" : "Refresh"
    }
}

function setButtonLoading(button, isLoading, idleLabel, loadingLabel) {
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

function setProxyStatus(message, tone = "muted") {
    if (!elements.proxyStatus) return
    const palette = {
        muted: "text-slate-300",
        info: "text-blue-200",
        success: "text-emerald-200",
        error: "text-rose-200",
    }
    Object.values(palette).forEach((cls) => elements.proxyStatus.classList.remove(cls))
    if (palette[tone]) {
        elements.proxyStatus.classList.add(palette[tone])
    }
    elements.proxyStatus.textContent = message
}

function setConnectionBadge(label, tone = "muted") {
    if (!elements.connectionBadge) return
    const palette = {
        idle: "text-amber-200",
        info: "text-blue-200",
        success: "text-emerald-200",
        error: "text-rose-200",
    }
    Object.values(palette).forEach((cls) => elements.connectionBadge.classList.remove(cls))
    const toneClass = palette[tone] || palette.idle
    elements.connectionBadge.classList.add(toneClass)
    elements.connectionBadge.textContent = label
}

async function verifyProxyConnectivity() {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
    try {
        await fetch(PROBE_URL, {
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

async function safeClearProxy() {
    try {
        await sendRuntimeMessage({ type: "CLEAR_PROXY" })
    } catch (error) {
        console.warn("Unable to clear proxy", error)
    }
}

function getProxySettings() {
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

function sendRuntimeMessage(payload) {
    return new Promise((resolve, reject) => {
        if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
            reject(new Error("Runtime messaging unavailable"))
            return
        }
        chrome.runtime.sendMessage(payload, (response) => {
            if (chrome.runtime?.lastError) {
                reject(new Error(chrome.runtime.lastError.message))
                return
            }
            resolve(response)
        })
    })
}

function formatRelativeTime(timestamp) {
    if (!timestamp) return "just now"
    const diff = Date.now() - timestamp
    if (diff <= 0) return "just now"
    const seconds = Math.round(diff / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.round(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.round(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.round(hours / 24)
    return `${days}d ago`
}

function isValidHost(value) {
    const ipv4 = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/
    const hostname = /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$/
    return ipv4.test(value) || hostname.test(value)
}

function persistCurrentProxy(partial) {
    const payload = { ...(state.currentProxy || {}), ...partial }
    state.currentProxy = payload
    JanusCache.writeJsonToStorage(CURRENT_PROXY_KEY, payload)
}
