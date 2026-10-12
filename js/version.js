// GitHub Version & Update Checker for Fire Starter

import { APP_VERSION, GITHUB_REPO, CURRENT_COMMIT_SHORT } from './constants.js';

export function evaluateVersionStatus(remoteInput, localVersion = APP_VERSION, localSha = CURRENT_COMMIT_SHORT) {
  if (!remoteInput) {
    return { status: 'UNKNOWN', label: '', isLatest: false };
  }

  const remoteSha = (typeof remoteInput === 'string') ? remoteInput : (remoteInput.sha || '');
  const remoteMsg = (typeof remoteInput === 'object') ? (remoteInput.message || '') : '';

  const cleanRemoteSha = remoteSha.trim().toLowerCase();
  const cleanLocalSha = (localSha || '').trim().toLowerCase();
  const cleanLocalVer = (localVersion || '').trim().toLowerCase();
  const rawNumVer = cleanLocalVer.replace(/^v/, '');

  // Check 1: Direct SHA match or prefix match
  const shaMatches = cleanRemoteSha && cleanLocalSha && (cleanRemoteSha.startsWith(cleanLocalSha) || cleanLocalSha.startsWith(cleanRemoteSha));

  // Check 2: Commit message contains local version tag (e.g. "v1.5.1" or "1.5.1")
  const verMatches = remoteMsg && (remoteMsg.toLowerCase().includes(cleanLocalVer) || remoteMsg.toLowerCase().includes(`v${rawNumVer}`) || remoteMsg.toLowerCase().includes(`(${rawNumVer})`));

  if (shaMatches || verMatches) {
    return {
      status: 'LATEST',
      label: 'LATEST',
      isLatest: true,
      tooltip: `GitHub同期済み (${cleanLocalVer}): 最新バージョンです`
    };
  }

  return {
    status: 'UPDATE_AVAILABLE',
    label: 'UPDATE AVAIL',
    isLatest: false,
    tooltip: `GitHub上に新しい更新があります (最新: ${cleanRemoteSha.slice(0, 7) || 'HEAD'})`
  };
}

export async function fetchLatestGitHubCommit(repo = GITHUB_REPO) {
  const url = `https://api.github.com/repos/${repo}/commits/main`;
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    sha: data.sha,
    message: data.commit?.message?.split('\n')[0] || '',
    date: data.commit?.committer?.date || '',
    htmlUrl: data.html_url || `https://github.com/${repo}`
  };
}

export function initVersionBadge() {
  const container = document.getElementById('version-container');
  const linkEl = document.getElementById('version-link');
  const tagEl = document.getElementById('version-tag');
  const dotEl = document.getElementById('version-sync-dot');
  const statusEl = document.getElementById('version-status-text');

  if (!container || !tagEl) return;

  // Set initial state
  tagEl.textContent = APP_VERSION;
  if (linkEl) {
    linkEl.href = `https://github.com/${GITHUB_REPO}`;
    linkEl.title = `Fire Starter ${APP_VERSION} (クリックでGitHubを開く)`;
  }

  if (dotEl) {
    dotEl.className = 'sync-dot sync-checking';
  }
  if (statusEl) {
    statusEl.textContent = 'SYNCING...';
  }

  // Asynchronously query GitHub in background
  fetchLatestGitHubCommit()
    .then(commitInfo => {
      const evaluation = evaluateVersionStatus(commitInfo, APP_VERSION, CURRENT_COMMIT_SHORT);

      if (linkEl) {
        linkEl.title = `${evaluation.tooltip} - ${commitInfo.message}`;
      }

      if (dotEl) {
        dotEl.className = `sync-dot ${evaluation.isLatest ? 'sync-latest' : 'sync-update'}`;
      }

      if (statusEl) {
        statusEl.textContent = evaluation.label;
      }
    })
    .catch(err => {
      // Graceful offline fallback: hide sync indicators quietly
      if (dotEl) {
        dotEl.className = 'sync-dot sync-offline';
      }
      if (statusEl) {
        statusEl.textContent = '';
      }
    });
}
