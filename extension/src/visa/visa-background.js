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

			Promise.all([chrome.storage.local.get("visaTrackUrl"), getCurrentProxyIp()])
				.then(([{ visaTrackUrl }, ip]) => {
					if (!visaTrackUrl) {
						throw new Error("Visa Track URL is not configured")
					}

					return fetch(`${visaTrackUrl}/visa`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							name: givenNames,
							lastname: surnames,
							application_id: response.applicationID,
							ip,
						}),
					})
				})
				.then(async (response) => {
					if (!response.ok) {
						throw new Error((await response.text()) || `HTTP ${response.status}`)
					}

					return response.json()
				})
				.then((data) => console.log("Visa saved:", data))
				.catch((err) => console.error("Failed to save visa:", err.message))
		})
	},
	{ urls: ["https://ceac.state.gov/GenNIV/General/complete/complete_personal.aspx*"] },
	["requestBody"],
)
