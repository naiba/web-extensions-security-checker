'use strict';

chrome.storage.sync.get(['totalHighRiskExtensions', 'highRiskExtensionsReason'], function (result) {
    if (!result || !result.totalHighRiskExtensions) {
        document.getElementById('hasHighRiskExtensions').classList.add('hide')
        document.getElementById('noHighRiskExtensionsFound').classList.remote('hide')
        return
    }
    
    chrome.management.getAll(extensions => {
        var highRiskExtensions = ''
        for (let i = 0; i < extensions.length; i++) {
            const extension = extensions[i]
            if (result.highRiskExtensionsReason[extension.id]) {
                highRiskExtensions += `<li>${extension.name} - <span>${result.highRiskExtensionsReason[extension.id]}</span></li>`
            }
        }
        if (!highRiskExtensions) {
            document.getElementById('hasHighRiskExtensions').classList.add('hide')
            document.getElementById('noHighRiskExtensionsFound').classList.remote('hide')
            return
        }
        document.getElementById('hasHighRiskExtensions').classList.remove('hide')
        document.getElementById('noHighRiskExtensionsFound').classList.add('hide')
        document.getElementById('highRiskExtensions').innerHTML = highRiskExtensions
    })
});
