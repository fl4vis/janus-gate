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

function getCurrentProxyIp() {
	return new Promise((resolve) => {
		chrome.proxy.settings.get({ incognito: false }, (config) => {
			if (chrome.runtime.lastError) {
				console.error("failed to get proxy settings:", chrome.runtime.lastError)
				resolve("0.0.0.0")
				return
			}

			const proxy = config.value?.rules?.singleProxy
			resolve(config.value?.mode === "fixed_servers" && proxy?.host ? proxy.host : "0.0.0.0")
		})
	})
}

chrome.webRequest.onBeforeRequest.addListener(
	(details) => {
		if (details.method !== "POST") {
			return
		}

		const form = details.requestBody?.formData

		if (!form) {
			return
		}

		const surnames = form["ctl00$SiteContentPlaceHolder$FormView1$tbxAPP_SURNAME"]?.[0]
		const givenNames = form["ctl00$SiteContentPlaceHolder$FormView1$tbxAPP_GIVEN_NAME"]?.[0]

		if (!surnames || !givenNames) return

		chrome.tabs.sendMessage(details.tabId, { type: "GET_APPLICATION_ID" }, (response) => {
			if (!response?.applicationID) return

			const applicationID = response.applicationID

			console.log({ surnames, givenNames, applicationID })
			Promise.all([chrome.storage.local.get("visaTrackUrl"), getCurrentProxyIp()])
				.then(([{ visaTrackUrl }, ip]) => {
					if (!visaTrackUrl) {
						throw new Error("Visa Track URL is not configured")
					}

					return fetch(`${visaTrackUrl}/visa`, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							name: givenNames,
							lastname: surnames,
							application_id: applicationID,
							ip,
						}),
					})
				})
				.then(async (response) => {
					if (!response.ok) {
						const message = await response.text()
						throw new Error(message || `HTTP ${response.status}`)
					}

					return response.json()
				})
				.then((data) => {
					console.log("Visa saved:", data)
				})
				.catch((err) => {
					console.error("Failed to save visa:", err.message)
				})
		})
	},
	{
		urls: ["https://ceac.state.gov/GenNIV/General/complete/complete_personal.aspx*"],
	},
	["requestBody"],
)
