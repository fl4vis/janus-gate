chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
	if (msg.type === "GET_NODES") {
		chrome.storage.local
			.get("apiUrl")
			.then(({ apiUrl }) => {
				if (!apiUrl) {
					throw new Error("API URL is not configured")
				}

				return fetch(`${apiUrl}/nodes`)
			})
			.then((res) => {
				if (!res.ok) {
					throw new Error(`HTTP ${res.status}`)
				}

				return res.json()
			})
			.then((nodes) => sendResponse(nodes))
			.catch((err) => {
				console.error("failed to fetch nodes:", err)
				sendResponse({ error: err.message })
			})

		return true
	}

	if (msg.type === "SET_PROXY") {
		const config = {
			// Send traffic through a proxy server
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
		// Do not use settings.clear()
		// It restores a profile's previous proxy which may be an unreachable proxy
		chrome.proxy.settings.set(
			{
				// Send traffic to normal network
				value: { mode: "direct" },
				scope: "regular",
			},
			() => {
				if (chrome.runtime.lastError) {
					sendResponse({ ok: false, error: chrome.runtime.lastError.message })
				} else {
					sendResponse({ ok: true })
				}
			},
		)
		return true
	}
})
