import { getCurrentUser, setCurrentUser, getUsers } from '../auth.js'

// --- Data Helpers ---
function getTasksData() {
    return JSON.parse(localStorage.getItem('family_app_tasks') || '[]')
}
function getChallengesData() {
    return JSON.parse(localStorage.getItem('family_app_challenges') || '[]')
}
function getFinanceData() {
    return JSON.parse(localStorage.getItem('family_app_finance') || '[]')
}
function getIncomeData() {
    return JSON.parse(localStorage.getItem('family_app_income') || '[]')
}
function getEventsData() {
    return JSON.parse(localStorage.getItem('family_app_events') || '[]')
}

// --- Status Helpers ---
function getTaskSummary() {
    const tasks = getTasksData()
    const pending = tasks.filter(t => !t.done)
    return {
        count: pending.length,
        topTask: pending.length > 0 ? pending[0].text : null
    }
}

function getChallengeSummary() {
    const challenges = getChallengesData()
    // For "Today", we basically count uncompleted ones that have progress < target?
    // Actually challenges are persistent. Let's show "Active Challenges" progress.
    // Or just "Daily Progress" if we had daily reset.
    // For now: Total Tasks vs Completed Tasks status
    // Actually challenges have "current" and "target".
    // Let's count how many are "DONE" (completed: true) vs Total
    const total = challenges.length
    const done = challenges.filter(c => c.completed).length
    return { total, done, percent: total > 0 ? Math.round((done / total) * 100) : 0 }
}

function getFinanceSummary() {
    const expenses = getFinanceData()
    const incomes = getIncomeData()

    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const thisMonthExpenses = expenses.filter(e => e.date.startsWith(currentMonth))
    const thisMonthIncomes = incomes.filter(i => i.date.startsWith(currentMonth))

    const totalExp = thisMonthExpenses.reduce((sum, i) => sum + i.amount, 0)
    let totalInc = thisMonthIncomes.reduce((sum, i) => sum + i.amount, 0)

    // Default budget fallback if 0 income
    if (totalInc === 0 && thisMonthIncomes.length === 0) totalInc = 200000

    const remaining = totalInc - totalExp
    return { remaining, totalExp, totalInc }
}

export function render() {
    const currentUser = getCurrentUser()
    const users = getUsers()

    // Data Summaries
    const taskSum = getTaskSummary()
    const challSum = getChallengeSummary()
    const finSum = getFinanceSummary()

    // Events
    const events = getEventsData()
    const todayStr = new Date().toISOString().slice(0, 10)
    const todayEvents = events.filter(e => e.date === todayStr).sort((a, b) => a.time.localeCompare(b.time))

    // Notifications (Unread Tasks)
    const notifications = getTasksData().filter(t => !t.done && (t.assignedTo === currentUser.id || t.assignedTo === 'everyone'))

    setTimeout(() => {
        // User Switcher Logic
        document.querySelectorAll('.user-switch-btn').forEach(btn => {
            btn.onclick = (e) => {
                const id = e.target.closest('.user-switch-btn').dataset.id
                setCurrentUser(id)
            }
        })
    }, 0)

    return `
    <div class="dashboard-container fade-in">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        
        <!-- Header / User Switch -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                 <div style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid var(--magic-gold); overflow: hidden; background: white;">
                    ${currentUser.icon.startsWith('data:') ? `<img src="${currentUser.icon}" style="width: 100%; height: 100%; object-fit: cover;">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;">${currentUser.icon}</div>`}
                 </div>
                 <div>
                    <div style="font-size: 0.75rem; color: rgba(255,255,255,0.7); font-weight: 700;">
                        WELCOME <span style="font-weight:400; opacity:0.8; margin-left:5px; color:#ffd700;">v2.5</span>
                    </div>
                    <div style="font-size: 1.2rem; font-weight: 900; color: white;">${currentUser.name}</div>
                 </div>
            </div>
            
             <div style="display: flex; gap: -8px;">
                ${users.filter(u => u.id !== currentUser.id).map(u => `
                    <button class="user-switch-btn" data-id="${u.id}" style="
                        width: 36px; height: 36px; border-radius: 50%; border: 2px solid white; 
                        background: #eee; cursor: pointer; display: flex; align-items: center; justify-content: center;
                        margin-left: -10px; overflow: hidden; font-size: 1rem;
                    ">
                        ${u.icon.startsWith('data:') ? `<img src="${u.icon}" style="width: 100%; height: 100%; object-fit: cover;">` : u.icon}
                    </button>
                `).join('')}
            </div>
        </div>

        <!-- Main Concierge Section -->
        ${(() => {
            // Concierge Logic
            let msg = ''
            let mood = 'normal'
            let borderColor = '#ffd700'

            if (finSum.remaining < 0) {
                msg = `🚨 **緊急事態ですぞ！**\n家計が赤字になっています...！\n今すぐ「宝箱」を確認して、対策を立てましょう💦`
                mood = 'alert'
                borderColor = '#ff6b6b'
            } else if (taskSum.count >= 5) {
                msg = `🧹 **お忙しいようですな...**\n未完了のタスクが${taskSum.count}個も溜まっています。\n今日は少し片付けに集中しましょうか？`
                mood = 'worry'
                borderColor = '#ff9f1c'
            } else if (challSum.percent < 100 && challSum.total > 0) {
                msg = `⚔️ **冒険の時間です！**\nクエストの進行度は${challSum.percent}%です。\nあと少しで目標達成できそうですぞ！✨`
                mood = 'happy'
                borderColor = '#a78bfa'
            } else {
                msg = `✨ **素晴らしい！**\nタスクも家計も順調そのものです。\n今日はゆっくり魔法のティータイムでもいかが？🍵`
                mood = 'calm'
                borderColor = '#4ecdc4'
            }

            return `
            <div style="display: flex; align-items: flex-start; gap: 15px; margin-bottom: 25px; background: rgba(255,255,255,0.1); padding: 15px; border-radius: 20px; border: 2px solid ${borderColor};">
                <div style="flex-shrink: 0; position: relative;">
                    <img src="./magic_guide.png" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid ${borderColor}; box-shadow: 0 4px 10px rgba(0,0,0,0.3); background: #333; object-fit: cover;">
                    <div style="position: absolute; bottom: -5px; right: -5px; font-size: 1.5rem;">
                        ${mood === 'alert' ? '😱' : mood === 'worry' ? '🤔' : mood === 'happy' ? '😆' : '🧙‍♂️'}
                    </div>
                </div>
                <div style="flex: 1; position: relative;">
                    <div style="background: white; padding: 15px; border-radius: 12px; border-top-left-radius: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.1); color: #333; font-size: 0.9rem; line-height: 1.5;">
                        ${msg.replace(/\n/g, '<br>')}
                    </div>
                </div>
            </div>
            `
        })()}

        <!-- 1. Today's Overview -->
        <div style="margin-bottom: 20px;">
            <h2 style="font-size: 1rem; color: white; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-calendar-day"></i> 今日の予定
            </h2>
            ${todayEvents.length > 0 ? `
                <div class="glass-panel" style="padding: 15px; display: flex; flex-direction: column; gap: 10px; background: rgba(255,255,255,0.95);">
                    ${todayEvents.map(ev => `
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="font-weight: 700; color: var(--magic-blue); width: 50px;">${ev.time}</div>
                            <div style="font-weight: 700; color: var(--text-main);">${ev.title}</div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="glass-panel" style="padding: 15px; color: rgba(255,255,255,0.8); text-align: center; font-size: 0.9rem;">
                    今日は特に予定はないよ ✨
                </div>
            `}
        </div>

        <!-- 2. Status Widgets Grid (Clean Style) -->
        <h2 style="font-size: 1rem; color: white; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-chart-pie"></i> 現在の状況
        </h2>
        
        <div style="display: grid; gap: 15px;">
            
            <!-- Tasks Widget -->
            <div onclick="document.querySelector('[data-route=tasks]').click()" class="glass-panel" style="
                padding: 15px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;
                background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85));
                border-left: 5px solid ${taskSum.count > 0 ? '#ff6b6b' : '#4ecdc4'};
                transition: transform 0.2s;
            " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                <div>
                     <div style="font-size: 0.8rem; color: #888; font-weight: 700; margin-bottom: 4px;">やることリスト (Tasks)</div>
                     <div style="font-size: 1.1rem; font-weight: 800; color: #333;">
                        ${taskSum.count > 0 ? `あと <span style="color: #ff6b6b; font-size: 1.3rem;">${taskSum.count}</span> 個` : '完了！✨'}
                     </div>
                     ${taskSum.topTask ? `<div style="font-size: 0.8rem; color: #666; margin-top: 4px;">👉 ${taskSum.topTask}</div>` : ''}
                </div>
                <div style="font-size: 2rem; color: ${taskSum.count > 0 ? '#ff6b6b' : '#4ecdc4'};">
                    ${taskSum.count > 0 ? '<i class="fa-solid fa-list-check"></i>' : '<i class="fa-solid fa-check-circle"></i>'}
                </div>
            </div>

            <!-- Finance Widget -->
            <div onclick="document.querySelector('[data-route=finance]').click()" class="glass-panel" style="
                padding: 15px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;
                background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85));
                border-left: 5px solid ${finSum.remaining < 0 ? '#ff6b6b' : '#ffd700'};
                transition: transform 0.2s;
            " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                <div>
                     <div style="font-size: 0.8rem; color: #888; font-weight: 700; margin-bottom: 4px;">今月の宝箱 (Finance)</div>
                     <div style="font-size: 1.1rem; font-weight: 800; color: #333;">
                        残り <span style="color: ${finSum.remaining < 0 ? '#ff6b6b' : '#10b981'}; font-size: 1.3rem;">¥${finSum.remaining.toLocaleString()}</span>
                     </div>
                     <div style="font-size: 0.8rem; color: #666; margin-top: 4px;">支出: ¥${finSum.totalExp.toLocaleString()}</div>
                </div>
                <div style="font-size: 2rem; color: #ffd700;">
                    <i class="fa-solid fa-coins"></i>
                </div>
            </div>

            <!-- Challenge Widget -->
            <div onclick="document.querySelector('[data-route=challenges]').click()" class="glass-panel" style="
                padding: 15px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;
                background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85));
                border-left: 5px solid #a78bfa;
                transition: transform 0.2s;
            " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                <div>
                     <div style="font-size: 0.8rem; color: #888; font-weight: 700; margin-bottom: 4px;">クエスト (Quests)</div>
                     <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="font-size: 1.1rem; font-weight: 800; color: #333;">
                            進行度 ${challSum.percent}%
                        </div>
                        <div style="width: 60px; height: 8px; background: #eee; border-radius: 4px;">
                            <div style="width: ${challSum.percent}%; height: 100%; background: #a78bfa; border-radius: 4px;"></div>
                        </div>
                     </div>
                     <div style="font-size: 0.8rem; color: #666; margin-top: 4px;">${challSum.done}/${challSum.total} クリア</div>
                </div>
                <div style="font-size: 2rem; color: #a78bfa;">
                    <i class="fa-solid fa-crown"></i>
                </div>
            </div>

        </div>

        
        <!-- Quick Nav -->
        <h2 style="font-size: 1rem; color: white; margin-top: 20px; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-compass"></i> メニュー
        </h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
             <button onclick="document.querySelector('[data-route=memo]').click()" class="glass-panel" style="padding: 15px; border:none; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5px; background: rgba(255,255,255,0.9);">
                <i class="fa-solid fa-chalkboard-user" style="font-size: 1.5rem; color: #555;"></i>
                <span style="font-size: 0.7rem; font-weight: 700; color: #555;">伝言板</span>
             </button>
             <button onclick="document.querySelector('[data-route=calendar]').click()" class="glass-panel" style="padding: 15px; border:none; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5px; background: rgba(255,255,255,0.9);">
                <i class="fa-regular fa-calendar" style="font-size: 1.5rem; color: #4a90e2;"></i>
                <span style="font-size: 0.7rem; font-weight: 700; color: #555;">カレンダー</span>
             </button>
             <button onclick="document.querySelector('[data-route=settings]').click()" class="glass-panel" style="padding: 15px; border:none; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5px; background: rgba(255,255,255,0.9);">
                <i class="fa-solid fa-gear" style="font-size: 1.5rem; color: #aaa;"></i>
                <span style="font-size: 0.7rem; font-weight: 700; color: #555;">設定</span>
             </button>
        </div>

    </div>
    `
}
