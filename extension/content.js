chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	if (message.type !== "GET_APPLICATION_ID") return

	const element = document.querySelector("#ctl00_lblAppID")

	sendResponse({
		applicationID: element?.textContent?.trim() ?? null,
	})
})
