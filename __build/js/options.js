const log = console.log;
let settings = null;
function togglePrefetching() {
    settings.prefetching = this.checked;
    chrome.runtime.sendMessage(settings);
}
chrome.runtime.sendMessage("settings", res => {
    settings = res;
    let checkbox = document.querySelector("input[id=tooglePrefetching]");
    checkbox.checked = settings.prefetching;
    checkbox.addEventListener("change", togglePrefetching);
});
