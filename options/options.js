const apiUrlInput = document.querySelector("#apiUrl")
const saveButton = document.querySelector("#save")
const status = document.querySelector("#status")

async function loadSettings() {
    const { apiUrl = "" } = await chrome.storage.local.get("apiUrl")

    apiUrlInput.value = apiUrl
}

async function saveSettings() {
    const value = apiUrlInput.value.trim()

    if (!value) {
        status.textContent = "Enter an API URL."
        status.className = "text-xs text-red-300"
        return
    }

    let url

    try {
        url = new URL(value)
    } catch {
        status.textContent = "Enter a valid URL."
        status.className = "text-xs text-red-300"
        return
    }

    if (!["http:", "https:"].includes(url.protocol)) {
        status.textContent = "URL must use HTTP or HTTPS."
        status.className = "text-xs text-red-300"
        return
    }

    // Store only the origin.
    const apiUrl = url.origin

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
