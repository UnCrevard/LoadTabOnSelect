let url = window.location.search.split("?url=")[1];
document.title = url;
document.addEventListener("focus", e => {
    window.location.replace(url);
});
