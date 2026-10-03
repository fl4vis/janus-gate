const dstrackUrlInput = document.querySelector("#DSTrackUrl")
const asesorInput = document.querySelector("#asesor")

async function loadVisaTrackerSettings() {
	const { dstrackUrl = "", asesor = "" } = await chrome.storage.local.get(["dstrackUrl", "asesor"])
	dstrackUrlInput.value = dstrackUrl
	asesorInput.value = asesor
}

function validateVisaTrackerUrl(value) {
	if (!value) {
		throw new Error("Enter a DS Track URL.")
	}

	let url

	try {
		url = new URL(value)
	} catch {
		throw new Error("Enter a valid DS Track URL.")
	}

	if (!["http:", "https:"].includes(url.protocol)) {
		throw new Error("DS Track URL must use HTTP or HTTPS.")
	}

	return url.origin
}

function validateAsesor(value) {
	if (!value) {
		throw new Error("Enter an Asesor name.")
	}

	if (value.length < 2) {
		throw new Error("Asesor name must be at least 2 characters.")
	}

	if (value.length > 50) {
		throw new Error("Asesor name is too long.")
	}

	return value
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function saveVisaTrackerSettings() {
	await sleep(10)
	try {
		const dstrackUrl = validateVisaTrackerUrl(dstrackUrlInput.value.trim())
		const asesor = validateAsesor(asesorInput.value.trim())

		await chrome.storage.local.set({
			dstrackUrl: dstrackUrl,
			asesor: asesor,
		})

		dstrackUrlInput.value = dstrackUrl
		asesorInput.value = asesor
	} catch (error) {
		const status = document.querySelector("#status")
		status.textContent = error.message
		status.className = "text-xs text-red-300"
	}
}

document.querySelector("#save").addEventListener("click", saveVisaTrackerSettings)
dstrackUrlInput.addEventListener("keydown", (event) => {
	if (event.key === "Enter") {
		saveVisaTrackerSettings()
	}
})
asesorInput.addEventListener("keydown", (event) => {
	if (event.key === "Enter") {
		saveVisaTrackerSettings()
	}
})

loadVisaTrackerSettings()
