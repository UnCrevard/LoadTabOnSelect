export { }

const DEBUG=false
const debug = console.debug
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

		Object.assign(settings, items)

		DEBUG && debug("settings", settings)
	}
})

/*

	Fired when a profile that has this extension installed first starts up. This event is not fired when an incognito profile is started.

 */

function onStartup() {
	/*
	chrome.tabs.query(null,tabs=>
	{
		for (let tab of tabs)
		{
			debug(tab)
		}
	})
	*/
}

// Sent to the event page just before the extension is unloaded. This gives the extension an opportunity to do some cleanup.

function onSuspend() {}
/*

	chrome : ctrl+r

	{previousVersion: "1.x", reason: "update"}
*/
function onInstalled(details: chrome.runtime.InstalledDetails) {
	//chrome.runtime.openOptionsPage(error)
}

// Fired when an update is available, but isn't installed immediately because the extension is currently running.

function onUpdateAvailable(details: chrome.runtime.UpdateAvailableDetails) {}

function onRestartRequired(reason: string) {}

function onCreated(tab: chrome.tabs.Tab) {

	DEBUG && debug("onCreated", tab)

	/* backgrounded tab ? */

	if (tab.active == false) {

		// @chrome : url = url (ctrl bookmark) ou "" (ctrl+link)
		// @firefox : url = "about:blank"

		tabs[tab.id] ={
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

			DEBUG && debug("onUpdated", changeInfo, tab)

			if (changeInfo.url && changeInfo.url != "about:blank") tab.url = changeInfo.url
			if (changeInfo.title) tab.title = changeInfo.title
			if (changeInfo.favIconUrl) tab.faviconUrl = changeInfo.favIconUrl

			if (changeInfo.status && changeInfo.status == Status.complete && tab.url) {
				tab.isSleeping = true

				let url=new URL(tab.url)

				let protocol = url.protocol

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

						/*

						remove tracking from google search

						*/

						if (url.hostname.match("^www.google.[a-z]+$"))
						{
							let realURL = url.searchParams.get("url")

							if (realURL)
							{
								tab.url = realURL
							}
						}
						/*

						if the page has been visited before,
						the title is probably set (tab.title!=null)

						*/
						if (tab.title || !settings.prefetching) return

						tab.stop = false

						DEBUG && debug("prefetching",tab)

						fetch(tab.url, {
							credentials: "include",
							"cache": "force-cache"
						})
							.then(res => res.text())
							.then(body => {
/*
								debug("title",body.match(/<title>(.*?)<\/title>/gi))
								debug("link",body.match(/<link.*?>/gi))
*/
								tab.stop=true // prevent DOMParser leaks

								let html = new DOMParser().parseFromString(body, "text/html")

								// extract title

								let titles = html.querySelectorAll("head title")
								tab.title = titles.length ? titles[0].textContent : tab.url

								DEBUG && debug("titles",titles)

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

								DEBUG && debug("favicons",icons)

								// best quality

								tab.faviconUrl = icons.sort((a, b) => b.size - a.size)[0].href

								chrome.tabs.update(tabId, {
									url: `html/tab.html?data=${encodeURIComponent(JSON.stringify(tab))}`
								})

								tab.stop=false; // unlock tab for favicon

								DEBUG && debug(tab)
							})
							.catch(err=>
							{
								error(err)
							})
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

		DEBUG && debug("onActivated", activeInfo)

		let tab = tabs[activeInfo.tabId]

		let url = tab.url

		if (!url) throw "url is empty !!!"

		delete tabs[activeInfo.tabId]

		// 'hashtag char' issue is gone

		chrome.tabs.update({ url: url })
	}
}

function onRemoved(tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) {

	DEBUG && debug("onRemoved", tabId, removeInfo)
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

	on @chrome onBeforeRequest is fired before onCreated

 */
function onBeforeRequest(details: chrome.webRequest.WebRequestDetails) {

	if (details.tabId < 0) {
		// from an addon
		DEBUG && debug("addon bypass", details)
	}
	else if (details.tabId in tabs) { // from a backgrounded tab

		let tab = tabs[details.tabId]

		if (!tab.url) tab.url = details.url

		if (tab.stop) {
			DEBUG && debug("block", details)
			return { cancel: true }
		}
		else {
			DEBUG && debug("allow", details)
		}
	}
	else
	{
		// from an active tab

		/*

		DEBUG && debug("ignore",details)

		originUrl

		    string. URL de la ressource qui a déclenché la requête. Par exemple, si "https://example.com" contient un lien, et que l'utilisateur clique sur le lien, alors originUrl de la requête résultante est "https://example.com".

		if ((details.originUrl as string).startsWith("moz-extension://"))
		{
			debug("ignore", details)
		}

		*/
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
function onMessage(msg: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) {
	try {

		/*

			id on @chrome
			extensionId on @firefox

		 */

		if (msg == "settings") {
			sendResponse(settings)
		}
		else {

			settings = msg as Settings
			storage.set(settings)

			DEBUG && console.debug("update settings", settings)
		}
	}
	catch (e) {
		error(e)
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


/*

	check if there is any leaking in headers

	adblockplus $third-party blocks this
*/

DEBUG && fetch("https://httpbin.org/headers")
	.then(res => res.json())
	.then(headers => {
		debug("headers %o", headers)
	})
	.catch(error)

/*

	network monitoring

*/

/*
"onCreatedNavigationTarget" in chrome.webNavigation && chrome.webNavigation.onCreatedNavigationTarget.addListener(details=>
{
	debug("onCreatedNavigationTarget",details)
})
*/

DEBUG && chrome.webNavigation.onBeforeNavigate.addListener(details=>
{
	debug("onBeforeNavigate",details)
})
