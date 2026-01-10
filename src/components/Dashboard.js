import { getCurrentUser, setCurrentUser, getUsers } from '../auth.js'

// Simple helper to check unread tasks for user
function getMyNotifications(userId) {
  const todos = JSON.parse(localStorage.getItem('family_app_tasks') || '[]')
  return todos.filter(t => !t.done && (t.assignedTo === userId || t.assignedTo === 'everyone' || t.assignedTo === undefined))
}

// Get today's events
function getTodayEvents() {
  const events = JSON.parse(localStorage.getItem('family_app_events') || '[]')
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const todayStr = `${y}-${m}-${d}`

  return events.filter(e => e.date === todayStr).sort((a, b) => a.time.localeCompare(b.time))
}

export function render() {
  const currentUser = getCurrentUser()
  const users = getUsers()

  // Get notifications
  const allTasks = JSON.parse(localStorage.getItem('family_app_tasks') || '[]')
  const notifications = allTasks.filter(t => !t.done && (t.assignedTo === currentUser.id || t.assignedTo === 'everyone'))

  // Get Today's Events
  const todayEvents = getTodayEvents()

  setTimeout(() => {
    const switcher = document.querySelectorAll('.user-switch-btn')
    switcher.forEach(btn => {
      btn.onclick = (e) => {
        setCurrentUser(e.target.closest('.user-switch-btn').dataset.id)
      }
    })

    const notifArea = document.querySelector('#notification-area')
    if (notifArea && notifications.length > 0) {
      setTimeout(() => notifArea.classList.add('show'), 300)
    }

  }, 0)

  return `
    <div class="dashboard-container fade-in">
        <style>
            #notification-area {
                background: #ffe66d;
                color: #5d5d5d;
                padding: 15px;
                border-radius: var(--radius-md);
                margin-bottom: var(--space-md);
                border: 3px solid white;
                box-shadow: 0 4px 0 rgba(0,0,0,0.1);
                display: none;
                animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                position: relative;
            }
            #notification-area.show { display: block; }
        </style>

        <!-- Notification Area -->
        <div id="notification-area">
             <div style="position: absolute; top: -10px; right: -5px; font-size: 1.5rem; transform: rotate(15deg);">🔔</div>
            <div style="font-weight: 800; font-size: 1.1rem; margin-bottom: 5px; color: #d48806;">あなたへの通知 (${notifications.length})</div>
            <div style="font-size: 0.95rem; font-weight: 700;">
                ${notifications.slice(0, 3).map(n => `
                    <div style="margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px dashed rgba(0,0,0,0.1);">
                        ${n.icon || '📝'} ${n.text} 
                        <span style="font-size: 0.75rem; color: #888; font-weight: 500; margin-left: 5px;">
                            by ${n.createdBy?.name || '誰か'}
                        </span>
                    </div>
                `).join('')}
                ${notifications.length > 3 ? `<div style="text-align: center; font-size: 0.8rem; color: #888;">...他 ${notifications.length - 3} 件</div>` : ''}
            </div>
             <button onclick="document.querySelector('[data-route=tasks]').click()" style="width: 100%; margin-top: 5px; background: white; border: none; padding: 8px 10px; border-radius: 10px; font-weight: 800; cursor: pointer; font-size: 0.9rem; color: #d48806;">確認する 👉</button>
        </div>

        <!-- User Switcher Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
            <div>
                <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 700;">今のユーザー</div>
                <div style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                    <span style="background: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-sm); border: 2px solid var(--primary-accent); overflow: hidden;">
                        ${currentUser.icon.startsWith('data:') ? `<img src="${currentUser.icon}" style="width: 100%; height: 100%; object-fit: cover;">` : currentUser.icon}
                    </span>
                    ${currentUser.name}
                </div>
            </div>
            
            <div style="display: flex; gap: 2px;">
                ${users.filter(u => u.id !== currentUser.id).map(u => `
                    <button class="user-switch-btn" data-id="${u.id}" style="
                        width: 40px; 
                        height: 40px; 
                        border-radius: 50%; 
                        border: 3px solid white; 
                        background: #eee; 
                        font-size: 1.4rem; 
                        cursor: pointer;
                        display: flex; align-items: center; justify-content: center;
                        transition: transform 0.2s;
                        box-shadow: 0 4px 0 rgba(0,0,0,0.1);
                        overflow: hidden;
                        padding: 0;
                    " title="${u.name}に切り替え">
                        ${u.icon.startsWith('data:') ? `<img src="${u.icon}" style="width: 100%; height: 100%; object-fit: cover;">` : u.icon}
                    </button>
                `).join('')}
            </div>
        </div>

      <div class="glass-panel" style="padding: var(--space-lg); margin-bottom: var(--space-lg); text-align: center; background: linear-gradient(135deg, #fff 0%, #fffbf0 100%);">
        <h2 style="font-size: 1.3rem; margin-bottom: 2px; color: var(--text-main);">
          ${currentUser.name}、おかえり！✨
        </h2>
        <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 15px;">今日は何する？</div>

        <!-- Today's Schedule Highlight -->
        <div style="background: rgba(255,255,255,0.6); border-radius: 12px; padding: 15px; text-align: left; border: 2px solid white;">
            <div style="font-size: 0.85rem; font-weight: 800; color: var(--primary-accent); margin-bottom: 10px; display: flex; align-items: center; gap: 5px;">
                📅 今日の予定 (${todayEvents.length}件)
            </div>
            
            ${todayEvents.length > 0 ? `
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${todayEvents.map(ev => `
                        <div style="display: flex; align-items: center; background: white; padding: 8px 10px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                            <div style="background: var(--tertiary-accent); width: 4px; height: 30px; border-radius: 2px; margin-right: 10px;"></div>
                            <div style="flex: 1;">
                                <div style="font-weight: 700; font-size: 0.95rem; line-height: 1.2;">${ev.title}</div>
                                <div style="font-size: 0.8rem; color: var(--text-muted);">🕒 ${ev.time || '終日'}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div style="text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 10px;">
                    今日の予定はないよ 🍵
                    <br><span style="font-size: 0.8rem;">ゆっくり過ごそう〜</span>
                </div>
            `}
        </div>
      </div>

        <!-- Quick Actions Grid -->
        <h3 style="margin-bottom: var(--space-md); font-size: 1.1rem;">あぷり一覧</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); margin-bottom: var(--space-xl);">
            <button onclick="document.querySelector('[data-route=finance]').click()" class="glass-panel" style="padding: var(--space-lg); display: flex; flex-direction: column; align-items: center; gap: 10px; cursor: pointer; border: 2px solid white;">
                <div style="font-size: 2.5rem;">💰</div>
                <div style="font-weight: 800; color: var(--text-main);">家計簿</div>
            </button>
            
            <button onclick="document.querySelector('[data-route=calendar]').click()" class="glass-panel" style="padding: var(--space-lg); display: flex; flex-direction: column; align-items: center; gap: 10px; cursor: pointer; border: 2px solid white;">
                <div style="font-size: 2.5rem;">📅</div>
                <div style="font-weight: 800; color: var(--text-main);">予定表</div>
            </button>
            
             <button onclick="document.querySelector('[data-route=tasks]').click()" class="glass-panel" style="padding: var(--space-lg); display: flex; flex-direction: column; align-items: center; gap: 10px; cursor: pointer; border: 2px solid white;">
                <div style="font-size: 2.5rem;">✓</div>
                <div style="font-weight: 800; color: var(--text-main);">やること</div>
            </button>
            
             <button onclick="document.querySelector('[data-route=memo]').click()" class="glass-panel" style="padding: var(--space-lg); display: flex; flex-direction: column; align-items: center; gap: 10px; cursor: pointer; border: 2px solid white;">
                <div style="font-size: 2.5rem;">📝</div>
                <div style="font-weight: 800; color: var(--text-main);">伝言板</div>
            </button>
            
             <button onclick="document.querySelector('[data-route=challenges]').click()" class="glass-panel" style="padding: var(--space-lg); display: flex; flex-direction: column; align-items: center; gap: 10px; cursor: pointer; border: 2px solid white;">
                <div style="font-size: 2.5rem;">👑</div>
                <div style="font-weight: 800; color: var(--text-main);">挑戦</div>
            </button>
            
             <button onclick="document.querySelector('[data-route=settings]').click()" class="glass-panel" style="padding: var(--space-lg); display: flex; flex-direction: column; align-items: center; gap: 10px; cursor: pointer; border: 2px solid white;">
                <div style="font-size: 2.5rem;">⚙️</div>
                <div style="font-weight: 800; color: var(--text-main);">設定</div>
            </button>
        </div>

      </div>
    </div>
  `
}
