import { escape } from '../utils.js'
import { getCurrentUser, getUsers } from '../auth.js'
import { saveData, subscribeData } from '../dataSync.js'

const TASKS_KEY = 'family_app_tasks'
let todos = []

// Subscribe
subscribeData(TASKS_KEY, (data) => {
  if (Array.isArray(data)) {
    todos = data
    // Try refresh if active
    // Simplest check: is #task-input visible?
    const input = document.getElementById('task-input')
    if (input) {
      const currentRoute = localStorage.getItem('family_app_route') || 'dashboard'
      if (currentRoute === 'tasks') {
        // Re-render only if we are on tasks page to avoid side effects
        // We can trigger a click on the nav, but that flashes screen.
        // Ideally, we extract render logic.
        // For now, same "click sync" hack.
        document.querySelector('[data-route=tasks]').click()
      }
    }
  }
})

const saveTasks = (data) => {
  saveData(TASKS_KEY, data)
  todos = data
}

// "Mini AI" for icons
function getSmartIcon(text) {
  if (!text) return '📝'
  const t = text.toLowerCase()
  if (t.includes('牛乳') || t.includes('milk')) return '🥛'
  if (t.includes('卵') || t.includes('egg')) return '🥚'
  if (t.includes('パン') || t.includes('bread')) return '🍞'
  if (t.includes('肉') || t.includes('meat')) return '🥩'
  if (t.includes('魚') || t.includes('fish')) return '🐟'
  if (t.includes('野菜') || t.includes('vegetable')) return '🥦'
  if (t.includes('果物') || t.includes('fruit')) return '🍎'
  if (t.includes('ビール') || t.includes('beer') || t.includes('酒')) return '🍺'
  if (t.includes('オムツ') || t.includes('baby')) return '👶'
  if (t.includes('銀行') || t.includes('金') || t.includes('払') || t.includes('pay')) return '💴'
  if (t.includes('病院') || t.includes('薬') || t.includes('予約')) return '🏥'
  if (t.includes('電話') || t.includes('call')) return '📞'
  if (t.includes('掃除') || t.includes('clean')) return '🧹'
  if (t.includes('洗濯') || t.includes('wash')) return '👕'
  if (t.includes('amazon') || t.includes('荷物') || t.includes('宅急便')) return '📦'
  if (t.includes('ゴミ') || t.includes('trash')) return '🗑️'
  if (t.includes('本') || t.includes('book')) return '📚'
  if (t.includes('プレゼント') || t.includes('gift')) return '🎁'
  return '📝' // Default
}

// Cleanup old tasks (completed > 7 days ago)
// We run this only when rendering or saving, but better to filter on load.
function cleanupOldTasks(list) {
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000
  const now = Date.now()
  return list.filter(t => {
    if (!t.done) return true
    if (!t.completedAt) return true
    return (now - new Date(t.completedAt).getTime()) < ONE_WEEK_MS
  })
}


export function render() {
  // Clean up old stuff on render
  const cleanList = cleanupOldTasks(todos)
  if (cleanList.length !== todos.length) {
    saveTasks(cleanList) // Sync cleanups
  } else {
    // triggers a re-render loop if we are not careful, but saveTasks updates variable too.
  }

  const currentUser = getCurrentUser()
  const users = getUsers()

  setTimeout(() => {
    const list = document.querySelector('.task-list')

    const input = document.querySelector('#task-input')
    const addBtn = document.querySelector('#add-task-btn')
    const assignSelect = document.querySelector('#assign-select')

    if (addBtn && input && assignSelect) {
      // Shared add function
      const addTask = () => {
        const text = input.value.trim()
        if (!text) return
        const icon = getSmartIcon(text)
        const assignedTo = assignSelect.value

        const now = new Date()
        const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`

        todos.unshift({
          id: Date.now(),
          text,
          icon,
          done: false,
          createdBy: { name: currentUser.name, icon: currentUser.icon },
          createdAt: timeStr,
          assignedTo
        })
        saveTasks(todos)
        document.querySelector('[data-route=tasks]').click() // Re-render
      }

      addBtn.onclick = addTask
      input.onkeydown = (e) => {
        if (e.key === 'Enter') addTask()
      }
    }

    if (list) {
      list.onclick = (e) => {
        const item = e.target.closest('.task-item')
        if (!item) return

        if (e.target.classList.contains('delete-btn')) {
          e.stopPropagation()
          const id = Number(item.dataset.id)
          const index = todos.findIndex(t => t.id === id)
          if (index > -1) {
            todos.splice(index, 1)
            saveTasks(todos)
            document.querySelector('[data-route=tasks]').click()
          }
          return
        }

        // Reminder/Notify Button (Bell)
        if (e.target.classList.contains('remind-btn')) {
          e.stopPropagation()
          alert(`📢 家族みんなに「${item.dataset.text}」のリマインドを送ったよ！`)
          // In a real app, this would send a push notification
          return
        }

        const id = Number(item.dataset.id)
        const index = todos.findIndex(t => t.id === id)
        if (index === -1) return

        // Toggle done
        todos[index].done = !todos[index].done

        // If done, mark who did it/checked it
        if (todos[index].done) {
          todos[index].completedBy = { name: currentUser.name, icon: currentUser.icon }
          todos[index].completedAt = new Date().toISOString()
        } else {
          delete todos[index].completedBy
          delete todos[index].completedAt
        }

        saveTasks(todos)
        document.querySelector('[data-route=tasks]').click()
      }
    }
  }, 0)

  return `
    <div class="tasks-container fade-in">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
        <h2>やることリスト ✅</h2>
         <div style="font-size: 0.8rem; background: rgba(255,255,255,0.5); padding: 5px 10px; border-radius: 20px;">
           👤 ${currentUser.name} で操作中
        </div>
      </div>

      <!-- Character Reminder Area -->
      ${(() => {
      const pendingCount = todos.filter(t => !t.done).length
      let msg = ''
      let mood = 'normal'
      let ringColor = '#4ecdc4' // Cyan

      if (pendingCount === 0) {
        msg = `順調ですぞ！✨\nこの調子で、魔法のにちじょうを楽しみましょう！`
        mood = 'happy'
        ringColor = '#ffd700' // Gold
      } else if (pendingCount >= 4) {
        msg = `おやおや...タスクが${pendingCount}個も溜まってますぞ💦\n魔法の手で片付けてしまいましょう！`
        mood = 'worry'
        ringColor = '#ff6b6b' // Red
      } else {
        msg = `残りのタスクはあと${pendingCount}個です！\nササッと終わらせて、おやつタイムですぞ🍩`
        mood = 'normal'
        ringColor = '#4ecdc4'
      }

      return `
          <div style="
              background: #0f172a; 
              border: 3px solid white; 
              border-radius: 20px; 
              padding: 20px; 
              display: flex; 
              gap: 20px; 
              align-items: flex-start; 
              margin-bottom: 20px;
              box-shadow: 0 4px 15px rgba(0,0,0,0.3);
              position: relative;
              overflow: hidden;
          ">
             <!-- Background Stars Effect (Simple CSS) -->
             <div style="position: absolute; top: 10px; right: 20px; color: rgba(255,255,255,0.1); font-size: 2rem;">✦</div>
             <div style="position: absolute; bottom: 10px; left: 100px; color: rgba(255,255,255,0.1); font-size: 1rem;">✨</div>

             <!-- Avatar Section -->
             <div style="flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 5px;">
                 <div style="
                    width: 70px; 
                    height: 70px; 
                    border-radius: 50%; 
                    border: 3px solid ${ringColor}; 
                    padding: 3px;
                    background: rgba(255,255,255,0.1);
                 ">
                    <img src="./magic_guide.png" style="
                        width: 100%; 
                        height: 100%; 
                        border-radius: 50%; 
                        object-fit: cover;
                        background: #333;
                    " onerror="this.src='https://placehold.co/70x70/1e293b/FFF?text=🧙‍♂️'">
                 </div>
                 <div style="
                    font-size: 0.6rem; 
                    font-weight: 800; 
                    letter-spacing: 1px; 
                    color: ${ringColor};
                 ">GUIDE</div>
             </div>

             <!-- Text Section -->
             <div style="flex: 1; z-index: 1;">
                 <div style="
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    margin-bottom: 8px;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    padding-bottom: 8px;
                 ">
                    <span style="color: #5eead4; font-weight: 800; font-size: 0.9rem;">Adviser</span>
                    <span style="background: rgba(94, 234, 212, 0.2); color: #5eead4; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700;">Task: ${pendingCount}</span>
                 </div>
                 <div style="
                    color: white; 
                    font-weight: 700; 
                    font-size: 0.95rem; 
                    line-height: 1.6; 
                    white-space: pre-wrap;
                    font-family: 'M PLUS Rounded 1c';
                    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
                 ">${msg}</div>
             </div>
          </div>
          `
    })()}


       <div style="font-size: 0.75rem; color: var(--text-muted); text-align: right; margin-top: -10px; margin-bottom: 10px;">
           ※完了から1週間経つと自動で消えるよ🧹
      </div>

      <div class="glass-panel" style="padding: var(--space-md); margin-bottom: var(--space-lg); display: flex; flex-direction: column; gap: var(--space-sm);">
        <div style="display: flex; gap: var(--space-sm); align-items: stretch; margin-bottom: 5px;">
            <select id="assign-select" style="width: auto; flex: 0 0 90px; font-size: 0.9rem; padding: 0.5rem; border-radius: 8px; border: 2px solid #eee;">
                <option value="everyone">🏠 全員</option>
                ${users.map(u => `<option value="${u.id}">${u.icon} ${u.name}</option>`).join('')}
            </select>
            <input id="task-input" type="text" placeholder="例: 牛乳を買う..." style="border: 2px solid #eee; border-radius: 8px; font-size: 1rem; flex: 1; padding: 0.8rem;">
        </div>
        <button id="add-task-btn" class="btn btn-primary" style="width: 100%; border-radius: 12px; padding: 0.8rem;">
            決定して追加 ✨
        </button>
      </div>

      <div class="task-list" style="display: flex; flex-direction: column; gap: var(--space-sm);">
        ${todos.map(todo => {
      const assignee = users.find(u => u.id === todo.assignedTo)
      const assigneeIcon = assignee ? assignee.icon : '🏠'
      const isForMe = todo.assignedTo === currentUser.id || todo.assignedTo === 'everyone'

      return `
              <div class="task-item glass-panel" data-id="${todo.id}" data-text="${escape(todo.text)}" style="
                    padding: var(--space-md); 
                    display: flex; 
                    align-items: center; 
                    gap: var(--space-md); 
                    opacity: ${todo.done ? 0.6 : 1}; 
                    transition: all 0.2s; 
                    cursor: pointer; 
                    position: relative;
                    border-left: 6px solid ${isForMe ? 'var(--primary-accent)' : 'transparent'};
                ">
                
                <div style="
                  width: 44px; 
                  height: 44px; 
                  border: 3px solid ${todo.done ? 'var(--success)' : 'var(--text-muted)'}; 
                  border-radius: 50%; 
                  display: flex; 
                  align-items: center; 
                  justify-content: center;
                  background: ${todo.done ? 'var(--success)' : 'white'};
                  font-size: 1.4rem;
                  flex-shrink: 0;">
                  ${todo.done ? '✓' : (todo.icon || getSmartIcon(todo.text))}
                </div>
                
                 <div style="flex: 1;">
                    <div style="text-decoration: ${todo.done ? 'line-through' : 'none'}; font-weight: 700; font-size: 1.1rem; word-break: break-all;">
                        ${escape(todo.text)}
                    </div>
                    
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; font-weight: 600; align-items: center;">
                        <span style="background: #eee; padding: 2px 6px; border-radius: 4px;">To: ${assigneeIcon}</span>
                        ${todo.createdBy ? `<span>From: ${todo.createdBy.name}</span>` : ''}
                        ${!todo.done ? `<button class="remind-btn" style="border: 1px solid #ccc; background: white; border-radius: 4px; padding: 0 4px; cursor: pointer; color: var(--text-main);">🔔 リマインド</button>` : ''}
                    </div>
                </div>
                
                ${!todo.done ? `
                <button class="delete-btn" style="
                  background: #ffebee; 
                  border: none; 
                  color: var(--danger); 
                  width: 36px;
                  height: 36px;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  cursor: pointer;
                  font-size: 1rem;
                  flex-shrink: 0;
                  transition: background 0.2s;
                ">✕</button>
                ` : ''}
              </div>
            `
    }).join('')}
      </div>
    </div>
  `
}
