declare const enum Status
{
	complete = "complete",
	loading = "loading"
}

interface Tab
{
	isSleeping: boolean
	title: string
	faviconUrl: string
	url: string
	id: number
	stop: boolean
}

interface Settings
{
	prefetching: boolean
}

/*
interface HTMLLinkElementX extends HTMLLinkElement {
	sizes?: Array<string>
}
*/

/* fix */

declare namespace browser.tabs
{
	/**
	 * discard (firefox 58)
	 * @param  {number}       tabId [description]
	 * @return {Promise<Tab>}       [description]
	 */
	function discard(tabId: number): Promise<Tab>;
}

declare namespace chrome.runtime
{
	function getBrowserInfo(...args: Array<any>): void

	interface MessageSender
	{
		extensionId: string
	}
}