document.getElementById("nodes").addEventListener("click", () => {
	chrome.runtime.sendMessage({ type: "GET_NODES" }, render)
})

function render(status) {
	let response = ``
	status.forEach((e) => {
		response += `
        <span>${e.ip}</span>
        <br>
        `
	})
	document.getElementById("status").innerHTML = response
}

document.getElementById("connect").addEventListener("click", () => {
	const host = document.getElementById("host").value
	const port = parseInt(document.getElementById("port").value, 10)

	chrome.runtime.sendMessage({ type: "SET_PROXY", host, port }, (res) => {
		document.getElementById("proxyStatus").textContent = res.ok ? `connected to ${host}:${port}` : `error: ${res.error}`
	})
})

document.getElementById("disconnect").addEventListener("click", () => {
	chrome.runtime.sendMessage({ type: "CLEAR_PROXY" }, (res) => {
		document.getElementById("proxyStatus").textContent = "disconnected"
	})
})
