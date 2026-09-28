const apiUrlInput = document.querySelector("#apiUrl")
const saveButton = document.querySelector("#save")
const status = document.querySelector("#status")

async function loadSettings() {
	const { apiUrl = "" } = await chrome.storage.local.get("apiUrl")

	apiUrlInput.value = apiUrl
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

	try {
		apiUrl = validateUrl(apiUrlInput.value.trim(), "API URL")
	} catch (error) {
		status.textContent = error.message
		status.className = "text-xs text-red-300"
		return
	}

	await chrome.storage.local.set({ apiUrl })

	apiUrlInput.value = apiUrl

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

loadSettings()
