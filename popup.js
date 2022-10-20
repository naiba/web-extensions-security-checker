'use strict';

import { setBadgeAndShield } from "./utils.js";

chrome.storage.sync.get(['totalHighRiskExtensions', 'highRiskExtensionsReason'], function (result) {
    if (!result || !result.totalHighRiskExtensions) {
        setBadgeAndShield(0, true)
        return
    }

    chrome.management.getAll(extensions => {
        var highRiskExtensions = ''
        var highRiskExtensionsCount = ''
        for (let i = 0; i < extensions.length; i++) {
            const extension = extensions[i]
            if (result.highRiskExtensionsReason[extension.id]) {
                highRiskExtensions += `<li>${extension.name} - <span>${result.highRiskExtensionsReason[extension.id]}</span></li>`
                highRiskExtensionsCount++
            }
        }
        if (!highRiskExtensionsCount) {
            setBadgeAndShield(0, true)
            return
        }
        setBadgeAndShield(highRiskExtensionsCount, true)
        document.getElementById('highRiskExtensions').innerHTML = highRiskExtensions
    })
});
