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
		if (!form) return

		const nationalId = form["ctl00$SiteContentPlaceHolder$FormView1$tbxAPP_NATIONAL_ID"]?.[0]

		// Personal2 -> update DNI
		if (nationalId) {
			chrome.tabs.sendMessage(details.tabId, { type: "GET_APPLICATION_ID" }, async (response) => {
				if (!response?.applicationID) return

				const { dstrackUrl } = await chrome.storage.local.get("dstrackUrl")

				if (!dstrackUrl) {
					console.error("DS Track URL is not configured")
					return
				}

				try {
					const res = await fetch(`${dstrackUrl}/visa`, {
						method: "PATCH",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							application_id: response.applicationID,
							dni: nationalId,
						}),
					})

					if (!res.ok) {
						throw new Error((await res.text()) || `HTTP ${res.status}`)
					}

					console.log("Visa DNI updated:", nationalId)
				} catch (err) {
					console.error("Failed to update visa:", err.message)
				}
			})

			return
		}

		// Personal1 -> create visa
		const surnames = form["ctl00$SiteContentPlaceHolder$FormView1$tbxAPP_SURNAME"]?.[0]
		const givenNames = form["ctl00$SiteContentPlaceHolder$FormView1$tbxAPP_GIVEN_NAME"]?.[0]

		if (!surnames || !givenNames) return

		chrome.tabs.sendMessage(details.tabId, { type: "GET_APPLICATION_ID" }, (response) => {
			if (!response?.applicationID) return

			Promise.all([chrome.storage.local.get(["dstrackUrl", "asesor"]), getCurrentProxyIp()])
				.then(([{ dstrackUrl, asesor }, ip]) => {
					if (!dstrackUrl) {
						throw new Error("DS Track URL is not configured")
					}

					if (!asesor) {
						throw new Error("DS Track asesor is not configured")
					}

					return fetch(`${dstrackUrl}/visa`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							name: givenNames,
							lastname: surnames,
							application_id: response.applicationID,
							asesor,
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
				.catch((err) => console.log("Failed to save visa:", err.message))
		})
	},
	{
		urls: [
			"https://ceac.state.gov/GenNIV/General/complete/complete_personal.aspx*",
			"https://ceac.state.gov/GenNIV/General/complete/complete_personalcont.aspx*",
		],
	},
	["requestBody"],
)
