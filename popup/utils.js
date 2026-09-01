/** @param {any} payload */
export function sendRuntimeMessage(payload) {
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
