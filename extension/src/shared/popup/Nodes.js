import JanusCache from "./JanusCache.js"
import Proxy from "./Proxy.js"
import { sendRuntimeMessage } from "./utils.js"
import state from "./State.js"

export default class Nodes {
	static async fetchNodes({ force = false } = {}) {
		if (state.nodesLoading) return

		const isCacheFresh = state.nodesUpdatedAt && Date.now() - state.nodesUpdatedAt < state.NODE_CACHE_TTL_MS
		if (!force && isCacheFresh) return

		this.setNodesLoading(true)
		try {
			const response = await sendRuntimeMessage({ type: "GET_NODES" })
			if (response?.error) {
				throw new Error(response.error)
			}

			if (!Array.isArray(response)) {
				throw new Error("Unexpected nodes payload")
			}

			const nodes = response
				.map((item) => ({ ip: typeof item.ip === "string" ? item.ip.trim() : "" }))
				.filter((item) => Boolean(item.ip))
			state.nodes = nodes
			state.nodesUpdatedAt = Date.now()

			JanusCache.writeJsonToStorage(state.NODE_CACHE_KEY, {
				nodes,
				timestamp: state.nodesUpdatedAt,
			})

			this.renderNodes(nodes, { source: "live" })
		} catch (error) {
			console.error("Node discovery failed", error)

			this.renderNodes([], { error: error.message })
			Proxy.setProxyStatus(`Node discovery failed: ${error.message}`, "error")
		} finally {
			this.setNodesLoading(false)
		}
	}

	static renderNodes(nodes, { source = "cache", error = null } = {}) {
		if (error) {
			state.elements.nodesList.innerHTML = `<p class="text-rose-300">${error}</p>`
			state.elements.nodesMeta.textContent = "Unable to load mesh nodes."
			return
		}
		if (!nodes.length) {
			state.elements.nodesList.innerHTML = `<p class="text-slate-400">No reachable nodes right now.</p>`
			state.elements.nodesMeta.textContent = "Nodes update automatically when connections change."
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
		state.elements.nodesList.innerHTML = template
		const descriptor = source === "live" ? "Live" : "Cached"
		state.elements.nodesMeta.textContent = `${descriptor} ${nodes.length} ${nodes.length === 1 ? "node" : "nodes"} • Updated ${this.#formatRelativeTime(state.nodesUpdatedAt)}`
	}

	/** @param {boolean} isLoading*/
	static setNodesLoading(isLoading) {
		state.nodesLoading = isLoading
		if (state.elements.nodesBtn) {
			state.elements.nodesBtn.disabled = isLoading
		}
		if (state.elements.nodesIndicator) {
			state.elements.nodesIndicator.classList.toggle("animate-pulse", isLoading)
			state.elements.nodesIndicator.classList.toggle("bg-blue-200", isLoading)
			state.elements.nodesIndicator.classList.toggle("bg-blue-300", !isLoading)
		}
		if (state.elements.nodesLabel) {
			state.elements.nodesLabel.textContent = isLoading ? "Loading" : "Refresh"
		}
	}

	static handleNodeSelection(event) {
		const control = event.target.closest("[data-node-ip]")
		if (!control) return

		const { nodeIp } = control.dataset
		if (!nodeIp) return

		state.elements.hostInput.value = nodeIp
		Proxy.setProxyStatus(`Node ${nodeIp} selected. Press Connect to start routing.`, "info")
	}

	static toggleNodesList() {
		state.elements.nodesList.classList.toggle("hidden")
		state.elements.arrow.classList.toggle("rotate-180")
	}

	static #formatRelativeTime(timestamp) {
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
}
