function setBadgeAndShield(count, isPopup) {
    if (!count) {
        chrome.action.setBadgeText({ text: '' });
        chrome.action.setIcon({ path: 'shield-128.png' });
        if (isPopup) {
            document.getElementById('hasHighRiskExtensions').classList.add('hide')
            document.getElementById('noHighRiskExtensionsFound').classList.remove('hide')
        }
        return
    }
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setIcon({ path: "shield-danger.png" });
    if (isPopup) {
        document.getElementById('hasHighRiskExtensions').classList.remove('hide')
        document.getElementById('noHighRiskExtensionsFound').classList.add('hide')
    }
}

export { setBadgeAndShield }