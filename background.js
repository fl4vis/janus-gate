const API_URL = "http://127.0.0.1:8787/nodes"

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
	if (msg.type === "GET_NODES") {
		fetch(API_URL)
			.then((res) => res.json())
			.then((nodes) => sendResponse(nodes))
			.catch((err) => {
				console.error("failed to fetch nodes:", err)
				sendResponse({ error: err.message })
			})
		return true // keep sendResponse alive for the async fetch
	}

	if (msg.type === "SET_PROXY") {
		const config = {
			mode: "fixed_servers",
			rules: {
				singleProxy: {
					scheme: "socks5",
					host: msg.host,
					port: msg.port,
				},
			},
		}

		chrome.proxy.settings.set({ value: config, scope: "regular" }, () => {
			if (chrome.runtime.lastError) {
				sendResponse({ ok: false, error: chrome.runtime.lastError.message })
			} else {
				sendResponse({ ok: true })
			}
		})
		return true
	}

	if (msg.type === "CLEAR_PROXY") {
		chrome.proxy.settings.clear({ scope: "regular" }, () => {
			sendResponse({ ok: true })
		})
		return true
	}
})
