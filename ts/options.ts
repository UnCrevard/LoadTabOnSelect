export { }

const log = console.log

let settings: Settings = null

function togglePrefetching(this: HTMLInputElement)
{
	settings.prefetching = this.checked

	chrome.runtime.sendMessage(settings)
}

chrome.runtime.sendMessage("settings", res =>
{
	settings = res as Settings

	let checkbox: HTMLInputElement = document.querySelector("input[id=tooglePrefetching]");

	checkbox.checked = settings.prefetching

	checkbox.addEventListener("change", togglePrefetching)
})