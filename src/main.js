import './style.css'
// In a real build, we'd import simple modules. For now we use the ones we touched.
import { render as renderDashboard } from './components/Dashboard.js'
import { render as renderFinance } from './components/Finance.js'
import { render as renderCalendar } from './components/Calendar.js'
import { render as renderTasks } from './components/Tasks.js'
import { render as renderMemo } from './components/Memo.js'
import { render as renderChallenges } from './components/Challenges.js'
import { render as renderSettings } from './components/Settings.js'
import { render as renderLockScreen } from './components/LockScreen.js'

const app = document.querySelector('#app')
let isLocked = true // Default state: Locked

// Init Mobile Mode
if (localStorage.getItem('family_app_mobile_mode') === 'true') {
  document.body.classList.add('mobile-preview')
}

const routes = {
  dashboard: { label: 'ホーム', icon: '🏠', render: renderDashboard },
  finance: { label: '家計簿', icon: '💰', render: renderFinance },
  calendar: { label: '予定', icon: '📅', render: renderCalendar },
  tasks: { label: 'やること', icon: '✓', render: renderTasks },
  memo: { label: 'メモ', icon: '📝', render: renderMemo },
  challenges: { label: '挑戦', icon: '👑', render: renderChallenges },
  settings: { label: '設定', icon: '⚙️', render: renderSettings }
}

let currentRoute = 'dashboard'

function render() {
  // If locked, show lock screen
  if (isLocked) {
    app.innerHTML = renderLockScreen(() => {
      isLocked = false
      render()
    })
    return
  }

  const pageContent = routes[currentRoute].render()

  app.innerHTML = `
    <!-- Header (Mobile User Info) -->
    <header class="app-header fade-in">
      <div class="logo">${localStorage.getItem('family_app_name') || 'Family Sync 🏠'}</div>
      <div class="user-greeting" style="font-size: 0.9rem; color: var(--text-muted); font-weight: 700;">今日もいい日だね！☀️</div>
    </header>

    <!-- Sidebar / Bottom Nav -->
    <nav class="app-nav fade-in">
      ${Object.entries(routes).map(([key, route]) => `
        <button class="nav-item ${key === currentRoute ? 'active' : ''}" data-route="${key}">
          <span class="nav-icon">${route.icon}</span>
          <span class="nav-label" style="font-weight: 700; font-size: 0.7rem;">${route.label}</span>
        </button>
      `).join('')}
    </nav>

    <!-- Main Content -->
    <main class="app-content fade-in">
      ${pageContent}
    </main>
  `

  // Attach events
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Find closest button in case icon was clicked
      const target = e.target.closest('.nav-item')
      if (target) {
        const route = target.dataset.route
        currentRoute = route
        render()
      }
    })
  })
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}

// Initial render
render()
