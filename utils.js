function setBadgeAndShield(count) {
    if (!count) {
        chrome.action.setBadgeText({ text: '' });
        chrome.action.setIcon({ path: 'shield-128.png' });
        return;
    }
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setIcon({ path: "shield-danger.png" });
}

export { setBadgeAndShield };