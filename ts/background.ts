export { }

//const log = console.log
//const debug = console.debug
const error = console.error;


let settings: Settings = {
	prefetching: true
}

/*

	firefox : temporary addon can't use storage.sync without some id...

*/
const storage = chrome.runtime.id.includes("@temporary-addon") ? chrome.storage.local : chrome.storage.sync

const tabs: Array<Tab> = []

const isChrome = chrome.runtime.getURL("").split("-")[0] == "chrome"

/*

	@todo

 */

storage.get(null, (items: Settings) => {

	if (items) {

		settings = Object.assign(settings, items)
	}
})

/*

	Fired when a profile that has this extension installed first starts up. This event is not fired when an incognito profile is started.

 */

function onStartup() {
}

// Sent to the event page just before the extension is unloaded. This gives the extension an opportunity to do some cleanup.

function onSuspend() {
}
/*

	chrome : ctrl+r

	{previousVersion: "1.x", reason: "update"}
*/
function onInstalled(details: chrome.runtime.InstalledDetails) {
	chrome.runtime.openOptionsPage(error)
}

// Fired when an update is available, but isn't installed immediately because the extension is currently running.

function onUpdateAvailable(details: chrome.runtime.UpdateAvailableDetails) {
}

function onRestartRequired(reason: string) {
}

function onCreated(tab: chrome.tabs.Tab) {

	// log("onCreated", tab.id, tab.url, tab.favIconUrl)

	/* backgrounded tab ? */

	if (tab.active == false) {

		// @chrome : url = url (ctrl bookmark) ou "" (ctrl+link)
		// @firefox : url = "about:blank"

		tabs[tab.id] =
			{
				isSleeping: false,
				title: null,
				url: null,
				id: tab.id,
				faviconUrl: null,
				stop: true
			}
	}
}

function onUpdated(tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tabInfo: chrome.tabs.Tab) {

	if (tabId in tabs) {
		let tab = tabs[tabId]

		if (tab.isSleeping) {

		}
		else {

			// log("onUpdated", changeInfo, tab)

			if (changeInfo.url && changeInfo.url != "about:blank") tab.url = changeInfo.url
			if (changeInfo.title) tab.title = changeInfo.title
			if (changeInfo.favIconUrl) tab.faviconUrl = changeInfo.favIconUrl

			if (changeInfo.status && changeInfo.status == Status.complete && tab.url) {
				tab.isSleeping = true
				tab.stop = false

				let protocol = new URL(tab.url).protocol

				switch (protocol) {

					// web extensions can't manipulate these protocols

					case "file:":
					case "moz-extension:":
					case "chrome-extension:":
					case "about:":
					case "chrome:":
						delete tabs[tab.id]
						break;

					case "http:":
					case "https:":

						if (!settings.prefetching) return

						fetch(tab.url, {
							credentials: "include",
							"cache": "force-cache"
						})
							.then(res => res.text())
							.then(body => {

								//log("title",body.match(/<title>(.*?)<\/title>/gi))
								//log("link",body.match(/<link.*?>/gi))

								//tab.stop=true // prevent DOMParser leaks

								let html = new DOMParser().parseFromString(body, "text/html")

								// extract title

								let titles = html.querySelectorAll("head title")
								tab.title = (titles) ? titles[0].textContent : tab.url

								// extract favicons

								let links = html.querySelectorAll("head link")
								let icons = []

								// favicon by default

								icons.push({
									href: chrome.runtime.getURL("img/icon.png"),
									size: 0
								})

								links.forEach(link => {
									if (link.getAttribute("rel") == "icon") {
										let size = (link.getAttribute("sizes") || "32x32").split("x")[0]

										icons.push({
											href: new URL(link.getAttribute("href"), tab.url),
											size: size
										})
									}
								})

								// best quality

								tab.faviconUrl = icons.sort((a, b) => b.size - a.size)[0].href

								chrome.tabs.update(tabId, {
									url: `html/tab.html?data=${encodeURIComponent(JSON.stringify(tab))}`
								})
							})
							.catch(error)
						break;

					default:
						error(protocol, tab.url)
				}
			}
		}
	}
}

function onActivated(activeInfo: chrome.tabs.TabActiveInfo) {

	if (activeInfo.tabId in tabs) {

		// log("onActivated", activeInfo)

		let tab = tabs[activeInfo.tabId]

		let url = tab.url

		if (!url) throw "url is empty !!!"

		delete tabs[activeInfo.tabId]

		/*

		remove tracking from google search

		*/

		let extract = new URL(url)

		if (extract.hostname.match("^www.google.[a-z]+$")) {

			let realURL = extract.searchParams.get("url")

			if (realURL) url = realURL
		}

		// 'hashtag char' issue is gone

		chrome.tabs.update({ url: url })
	}
}

function onRemoved(tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) {

	// log("onRemoved", tabId, removeInfo)
	/*

	.windowId:number
	.isWindowClosing:false

	*/
	if (tabId in tabs) {
		delete tabs[tabId]
	}
}
/*
	block tab loading

 */
function onBeforeRequest(details: chrome.webRequest.WebRequestDetails) {

	if (details.tabId < 0) {
		// from an addon
		//debug("addon", details)
	}
	else if (details.tabId in tabs) {

		let tab = tabs[details.tabId]

		if (!tab.url) tab.url = details.url

		if (tab.stop) {
			//debug("block", details)
			return { cancel: true }
		}
		else {
			//debug("allow", details)
		}
	}
}

// @hack : remove headers leaks

function onBeforeSendHeaders(details: chrome.webRequest.WebRequestHeadersDetails) {

	// from extension ?

	if (details.tabId < 0) {

		let headers = []

		for (let header of details.requestHeaders) {
			switch (header.name.toLowerCase()) {
				case "origin": // @firefox
				case "x-devtools-emulate-network-conditions-client-id": // @chrome
					break;
				default:
					headers.push(header)
			}
		}

		return { requestHeaders: headers }
	}
}
/*
	exchange settings with options page

 */

function onMessage(msg:any,sender:chrome.runtime.MessageSender,sendResponse:(response:any)=>void)
{
	if (sender.extensionId!= chrome.runtime.id) throw sender

	if (msg=="settings")
	{
		sendResponse(settings)
	}
	else
	{
		console.debug("update settings",settings)

		settings=msg as Settings
		storage.set(settings)
	}
}

chrome.runtime.onMessage.addListener(onMessage)

chrome.runtime.onStartup.addListener(onStartup)
chrome.runtime.onInstalled.addListener(onInstalled)
chrome.runtime.onUpdateAvailable.addListener(onUpdateAvailable)
"onSuspend" in chrome.runtime && chrome.runtime.onSuspend.addListener(onSuspend)
"onRestartRequired" in chrome.runtime && chrome.runtime.onRestartRequired.addListener(onRestartRequired)
chrome.tabs.onUpdated.addListener(onUpdated)
chrome.tabs.onCreated.addListener(onCreated)
chrome.tabs.onActivated.addListener(onActivated)
chrome.tabs.onRemoved.addListener(onRemoved)
chrome.webRequest.onBeforeRequest.addListener(onBeforeRequest,
	{
		urls: ["<all_urls>"]
	},
	[
		"blocking" // make the request synchronous, so you can cancel or redirect the request
	])

chrome.webRequest.onBeforeSendHeaders.addListener(onBeforeSendHeaders, {
	urls: ["<all_urls>"]
},
	[
		/*
		To have the request headers passed into the listener along with the rest of the request data,
		pass "requestHeaders" in the extraInfoSpec array.
		 */
		"requestHeaders",
		/*
		To modify the headers synchronously: pass "blocking" in extraInfoSpec,
		then in your event listener, return a BlockingResponse with a property named requestHeaders,
		whose value is the set of request headers to send.
		 */
		"blocking"
	])


// check if leaking

/*
fetch("https://httpbin.org/headers")
	.then(res => res.json())
	.then(headers => {
		log("%o", headers)
	})
	.catch(error)
*/
