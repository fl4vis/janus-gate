const visaTrackUrlInput = document.querySelector("#visaTrackUrl")

async function loadVisaTrackerSettings() {
	const { visaTrackUrl = "" } = await chrome.storage.local.get("visaTrackUrl")
	visaTrackUrlInput.value = visaTrackUrl
}

function validateVisaTrackerUrl(value) {
	if (!value) {
		throw new Error("Enter a Visa Track URL.")
	}

	let url

	try {
		url = new URL(value)
	} catch {
		throw new Error("Enter a valid Visa Track URL.")
	}

	if (!["http:", "https:"].includes(url.protocol)) {
		throw new Error("Visa Track URL must use HTTP or HTTPS.")
	}

	return url.origin
}

async function saveVisaTrackerSettings() {
	try {
		const visaTrackUrl = validateVisaTrackerUrl(visaTrackUrlInput.value.trim())
		await chrome.storage.local.set({ visaTrackUrl })
		visaTrackUrlInput.value = visaTrackUrl
	} catch (error) {
		const status = document.querySelector("#status")
		status.textContent = error.message
		status.className = "text-xs text-red-300"
	}
}

document.querySelector("#save").addEventListener("click", saveVisaTrackerSettings)
visaTrackUrlInput.addEventListener("keydown", (event) => {
	if (event.key === "Enter") {
		saveVisaTrackerSettings()
	}
})

loadVisaTrackerSettings()
