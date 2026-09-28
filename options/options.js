const apiUrlInput = document.querySelector("#apiUrl")
const visaTrackUrlInput = document.querySelector("#visaTrackUrl")
const saveButton = document.querySelector("#save")
const status = document.querySelector("#status")

async function loadSettings() {
	const { apiUrl = "", visaTrackUrl = "" } = await chrome.storage.local.get(["apiUrl", "visaTrackUrl"])

	apiUrlInput.value = apiUrl
	visaTrackUrlInput.value = visaTrackUrl
}

function validateUrl(value, label) {
	if (!value) {
		throw new Error(`Enter a ${label}.`)
	}

	let url

	try {
		url = new URL(value)
	} catch {
		throw new Error(`Enter a valid ${label}.`)
	}

	if (!["http:", "https:"].includes(url.protocol)) {
		throw new Error(`${label} must use HTTP or HTTPS.`)
	}

	// Store only the origin.
	return url.origin
}

async function saveSettings() {
	let apiUrl
	let visaTrackUrl

	try {
		apiUrl = validateUrl(apiUrlInput.value.trim(), "API URL")
		visaTrackUrl = validateUrl(visaTrackUrlInput.value.trim(), "Visa Track URL")
	} catch (error) {
		status.textContent = error.message
		status.className = "text-xs text-red-300"
		return
	}

	await chrome.storage.local.set({ apiUrl, visaTrackUrl })

	apiUrlInput.value = apiUrl
	visaTrackUrlInput.value = visaTrackUrl

	status.textContent = "Settings saved."
	status.className = "text-xs text-emerald-300"

	setTimeout(() => {
		status.textContent = ""
	}, 2500)
}

saveButton.addEventListener("click", saveSettings)

apiUrlInput.addEventListener("keydown", (event) => {
	if (event.key === "Enter") {
		saveSettings()
	}
})

visaTrackUrlInput.addEventListener("keydown", (event) => {
	if (event.key === "Enter") {
		saveSettings()
	}
})

loadSettings()
