export { }

const DEBUG = false

const debug = console.debug
const error = console.error;

let settings: Settings =
{
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

storage.get(null, (items: Settings) =>
{

	if (items)
	{

		Object.assign(settings, items)

		DEBUG && debug("settings", settings)
	}
})

function onCreated(tab: chrome.tabs.Tab)
{

	DEBUG && debug("onCreated", tab)

	/* backgrounded tab ? */

	if (tab.active == false)
	{

		// @chrome : url = url (ctrl bookmark) ou "" (ctrl+link)
		// @firefox : url = "about:blank"

		tabs[tab.id] = {
			isSleeping: false,
			title: null,
			url: null,
			id: tab.id,
			faviconUrl: null,
			stop: true
		}
	}
}

function cleanUpLink(url: URL): string
{

	DEBUG && debug(url)

	/*

	remove tracking

	*/

	if (url.hostname.match("^www.youtube.[a-z]+$") && url.pathname == "/redirect")
	{
		return url.searchParams.get("q")
	} else if (url.hostname.match("^www.google.[a-z]+$") && url.pathname == "/url")
	{
		return url.searchParams.get("url")
	} else
	{
		return url.href
	}
}

function onUpdated(tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tabInfo: chrome.tabs.Tab)
{

	DEBUG && debug("onUpdated", tabId, changeInfo, tabInfo)

	if (tabId in tabs)
	{
		let tab = tabs[tabId]

		DEBUG && debug("tab", tab)

		if (tab.isSleeping)
		{

		} else
		{
			if (changeInfo.url && changeInfo.url != "about:blank") tab.url = changeInfo.url
			if (changeInfo.title) tab.title = changeInfo.title
			if (changeInfo.favIconUrl) tab.faviconUrl = changeInfo.favIconUrl

			if (changeInfo.status && changeInfo.status == Status.complete && tab.url)
			{
				tab.isSleeping = true

				let url = new URL(tab.url)

				let protocol = url.protocol

				switch (protocol)
				{

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

						tab.url = cleanUpLink(url)

						/*

						if the page has been visited before,
						the title is probably set (tab.title!=null)

						*/
						if (tab.title || !settings.prefetching) return

						tab.stop = false

						DEBUG && debug("prefetching", tab)

						fetch(tab.url,
							{
							credentials: "include"
						})
							.then(res => res.text())
							.then(body =>
							{
								/*
								debug("title",body.match(/<title>(.*?)<\/title>/gi))
								debug("link",body.match(/<link.*?>/gi))
								*/
								tab.stop = true // prevent DOMParser leaks

								let html = new DOMParser().parseFromString(body, "text/html")

								// extract title

								let titles = html.querySelectorAll("head title")
								tab.title = titles.length ? titles[0].textContent : tab.url

								DEBUG && debug("titles", titles)

								// extract favicons

								let links = html.querySelectorAll("head link")
								let icons = []

								// favicon by default

								icons.push({
									href: chrome.runtime.getURL("img/icon.png"),
									size: 0
								})

								links.forEach(link =>
								{
									if (link.getAttribute("rel") == "icon")
									{
										let size = (link.getAttribute("sizes") || "32x32").split("x")[0]

										icons.push({
											href: new URL(link.getAttribute("href"), tab.url),
											size: size
										})
									}
								})

								DEBUG && debug("favicons", icons)

								// best quality

								tab.faviconUrl = icons.sort((a, b) => b.size - a.size)[0].href

								chrome.tabs.update(tabId, {
									url: `html/tab.html?data=${encodeURIComponent(JSON.stringify(tab))}`
								})

								tab.stop = false; // unlock tab for favicon

								DEBUG && debug(tab)
							})
							.catch(err =>
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

function onActivated(activeInfo: chrome.tabs.TabActiveInfo)
{

	DEBUG && debug("onActivated", activeInfo)

	if (activeInfo.tabId in tabs)
	{

		let tab = tabs[activeInfo.tabId]

		let url = tab.url

		if (!url) throw "url is empty !!!"

		delete tabs[activeInfo.tabId]

		// 'hashtag char' issue is gone

		chrome.tabs.update({
			url: url
		})
	}
}

function onRemoved(tabId: number, removeInfo: chrome.tabs.TabRemoveInfo)
{

	DEBUG && debug("onRemoved", tabId, removeInfo)
	/*

	.windowId:number
	.isWindowClosing:false

	*/
	if (tabId in tabs)
	{
		delete tabs[tabId]
	}
}
/*
	block tab loading

	on @chrome onBeforeRequest is fired before onCreated

 */
function onBeforeRequest(details: chrome.webRequest.WebRequestDetails)
{

	// DEBUG && debug("onBeforeRequest",details)

	if (details.tabId < 0 && details.documentUrl && details.documentUrl.startsWith("moz-extension://"))
	{
		// from an addon
		DEBUG && debug("addon bypass", details)
	} else if (details.tabId in tabs)
	{
		// from a backgrounded tab

		let tab = tabs[details.tabId]

		if (!tab.url) tab.url = details.url

		if (tab.stop)
		{
			DEBUG && debug("block", details)
			return {
				cancel: true
			}
		} else
		{
			DEBUG && debug("allow", details)
		}
	} else
	{
		// from an active tab

		/*

		DEBUG && debug("ignore",details)

		originUrl

			string. URL de la ressource qui a déclenché la requête. Par exemple, si "https://example.com"
			contient un lien, et que l'utilisateur clique sur le lien,
			alors originUrl de la requête résultante est "https://example.com".

		if ((details.originUrl as string).startsWith("moz-extension://"))
		{
			debug("ignore", details)
		}

		*/
	}
}

/*
	exchange settings with options page

 */
function onMessage(msg: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void)
{
	try
	{

		/*

			id on @chrome
			extensionId on @firefox

		 */

		if (msg == "settings")
		{
			sendResponse(settings)
		} else
		{

			settings = msg as Settings
			storage.set(settings)

			DEBUG && console.debug("update settings", settings)
		}
	} catch (e)
	{
		error(e)
	}
}

chrome.runtime.onMessage.addListener(onMessage)

chrome.tabs.onUpdated.addListener(onUpdated)
chrome.tabs.onCreated.addListener(onCreated)
chrome.tabs.onActivated.addListener(onActivated)
chrome.tabs.onRemoved.addListener(onRemoved)

chrome.webRequest.onBeforeRequest.addListener(onBeforeRequest, {
	urls: ["<all_urls>"]
},
	[
		"blocking" // make the request synchronous, so you can cancel or redirect the request
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
