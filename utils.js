function setBadgeAndShield(count, isPopup, loadingMessage, hasHighRiskDiv, noHighRiskDiv) {
    console.log('Setting badge and shield with count:', count, isPopup);

    // Hide loading message if we are in the popup context
    if (isPopup && loadingMessage) {
        loadingMessage.classList.add('hide');
    }

    if (!count) {
        chrome.action.setBadgeText({ text: '' });
        chrome.action.setIcon({ path: 'shield-128.png' });
        if (isPopup && hasHighRiskDiv && noHighRiskDiv) {
            hasHighRiskDiv.classList.add('hide');
            noHighRiskDiv.classList.remove('hide');
        }
        return;
    }

    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setIcon({ path: "shield-danger.png" });
    if (isPopup && hasHighRiskDiv && noHighRiskDiv) {
        hasHighRiskDiv.classList.remove('hide');
        noHighRiskDiv.classList.add('hide');
    }
}

export { setBadgeAndShield };