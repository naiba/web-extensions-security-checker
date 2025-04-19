'use strict';

import { setBadgeAndShield } from "./utils.js";

const loadingMessage = document.getElementById('loadingMessage');
const hasHighRiskDiv = document.getElementById('hasHighRiskExtensions');
const noHighRiskDiv = document.getElementById('noHighRiskExtensionsFound');
const highRiskList = document.getElementById('highRiskExtensions');

chrome.storage.sync.get(['totalHighRiskExtensions', 'highRiskExtensionsReason'], function (result) {
    if (!result) return;

    if (!result || !result.highRiskExtensionsReason) { // Check only for reason existence initially
        setBadgeAndShield(0, true, loadingMessage, hasHighRiskDiv, noHighRiskDiv); // Show no high risk initially or if error
        return;
    }

    chrome.management.getAll(extensions => {
        let highRiskExtensionsHTML = '';
        let highRiskExtensionsCount = 0;
        const knownReasons = result.highRiskExtensionsReason || {}; // Ensure knownReasons is an object

        for (let i = 0; i < extensions.length; i++) {
            const extension = extensions[i];
            // Only count enabled extensions that have a reason
            if (extension.enabled && knownReasons[extension.id]) {
                highRiskExtensionsHTML += `<li>${extension.name} <span>${knownReasons[extension.id]}</span></li>`;
                highRiskExtensionsCount++;
            }
        }

        // Update storage with the actual count of *enabled* high-risk extensions found
        // This ensures the badge count matches the list shown in the popup
        chrome.storage.sync.set({ totalHighRiskExtensions: highRiskExtensionsCount }, () => {
            if (!highRiskExtensionsCount) {
                setBadgeAndShield(0, true, loadingMessage, hasHighRiskDiv, noHighRiskDiv);
            } else {
                highRiskList.innerHTML = highRiskExtensionsHTML;
                setBadgeAndShield(highRiskExtensionsCount, true, loadingMessage, hasHighRiskDiv, noHighRiskDiv);
            }
        });
    });
});
