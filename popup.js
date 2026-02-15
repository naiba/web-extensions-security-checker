'use strict';

const loadingMessage = document.getElementById('loadingMessage');
const loadingText = document.getElementById('loadingText');
const hasHighRiskDiv = document.getElementById('hasHighRiskExtensions');
const noHighRiskDiv = document.getElementById('noHighRiskExtensionsFound');
const highRiskList = document.getElementById('highRiskExtensions');

const RISK_LABELS = { high: 'High', medium: 'Medium', low: 'Low' };
const STORAGE_KEYS = ['checkStatus', 'checked', 'total', 'highRiskExtensionsReason', 'lastCheckTime', 'dismissedAlerts'];

let extensionNameMap = null;

async function getNameMap() {
    if (extensionNameMap) return extensionNameMap;
    const extensions = await chrome.management.getAll();
    extensionNameMap = {};
    for (const ext of extensions) {
        extensionNameMap[ext.id] = ext.name;
    }
    return extensionNameMap;
}

function renderCard(id, name, entry) {
    const { reasons, riskLevel } = entry;
    const reasonItems = reasons.map(r => `<li>${r}</li>`).join('');
    return `<li class="risk-${riskLevel}">
        <div class="card-header">
            <span class="card-name">${name}</span>
            <span class="risk-badge badge-${riskLevel}">${RISK_LABELS[riskLevel]}</span>
            <button class="dismiss-btn" data-id="${id}" title="Dismiss">✕</button>
        </div>
        <ul class="reason-list">${reasonItems}</ul>
    </li>`;
}

async function render(data) {
    const { checkStatus, checked, total, highRiskExtensionsReason, lastCheckTime, dismissedAlerts } = data;
    const allReasons = highRiskExtensionsReason || {};
    const dismissed = dismissedAlerts || {};
    const isChecking = checkStatus === 'checking';

    const nameMap = await getNameMap();
    const visibleIds = Object.keys(allReasons).filter(id =>
        dismissed[id] !== allReasons[id].fingerprint && nameMap[id]
    );

    if (isChecking) {
        loadingText.textContent = `Checking extensions… ${checked || 0}/${total || 0}`;
        loadingMessage.classList.remove('hide');
    }

    if (visibleIds.length) {
        const riskOrder = { high: 0, medium: 1, low: 2 };
        visibleIds.sort((a, b) => (riskOrder[allReasons[a].riskLevel] || 2) - (riskOrder[allReasons[b].riskLevel] || 2));
        let html = '';
        for (const id of visibleIds) {
            html += renderCard(id, nameMap[id] || id, allReasons[id]);
        }
        highRiskList.innerHTML = html;
        hasHighRiskDiv.classList.remove('hide');
        noHighRiskDiv.classList.add('hide');
        if (!isChecking) loadingMessage.classList.add('hide');
    } else if (!isChecking && (lastCheckTime || checkStatus === 'done')) {
        loadingMessage.classList.add('hide');
        hasHighRiskDiv.classList.add('hide');
        noHighRiskDiv.classList.remove('hide');
    }
}

highRiskList.addEventListener('click', async (e) => {
    const btn = e.target.closest('.dismiss-btn');
    if (!btn) return;
    const extId = btn.dataset.id;
    const { highRiskExtensionsReason, dismissedAlerts } = await chrome.storage.local.get(['highRiskExtensionsReason', 'dismissedAlerts']);
    const dismissed = dismissedAlerts || {};
    const entry = (highRiskExtensionsReason || {})[extId];
    if (entry) {
        dismissed[extId] = entry.fingerprint;
        await chrome.storage.local.set({ dismissedAlerts: dismissed });

        const reasons = highRiskExtensionsReason || {};
        const count = Object.entries(reasons)
            .filter(([id, v]) => (v.riskLevel === 'high' || v.riskLevel === 'medium') && dismissed[id] !== v.fingerprint)
            .length;
        chrome.action.setBadgeText({ text: count ? count.toString() : '' });
        chrome.action.setIcon({ path: count ? 'shield-danger.png' : 'shield-128.png' });
    }
});

chrome.storage.local.get(STORAGE_KEYS, render);

chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    chrome.storage.local.get(STORAGE_KEYS, render);
});
