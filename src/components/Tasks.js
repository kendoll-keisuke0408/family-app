import { escape } from '../utils.js'
import { getCurrentUser, getUsers } from '../auth.js'

// Simple storage wrapper
const TASKS_KEY = 'family_app_tasks'

function getTasks() {
  const saved = localStorage.getItem(TASKS_KEY)
  if (saved) return JSON.parse(saved)
  // Defaults
  return [
    { id: 1, text: '牛乳と卵を買う', icon: '🥛', done: false, createdBy: { name: 'ママ', icon: '👩' }, createdAt: '10:00', assignedTo: 'papa' },
    { id: 2, text: '電気代を払う', icon: '⚡', done: false, createdBy: { name: 'パパ', icon: '👨' }, createdAt: '09:30', assignedTo: 'mama' },
  ]
}

function saveTasks(tasks) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
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

export function render() {
  const todos = getTasks()
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
        } else {
          delete todos[index].completedBy
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

      <div class="glass-panel" style="padding: var(--space-md); margin-bottom: var(--space-lg); display: flex; flex-direction: column; gap: var(--space-sm);">
        <div style="display: flex; gap: var(--space-sm);">
            <select id="assign-select" style="width: auto; flex: 0 0 100px; font-size: 1rem; padding: 0.5rem;">
                <option value="everyone">🏠 全員</option>
                ${users.map(u => `<option value="${u.id}">${u.icon} ${u.name}</option>`).join('')}
            </select>
            <input id="task-input" type="text" placeholder="例: 牛乳を買う..." style="border: none; background: transparent; outline: none; font-size: 1rem; flex: 1;">
        </div>
        <button id="add-task-btn" class="btn btn-primary" style="width: 100%; padding: 0.5rem;">追加して通知 🔔</button>
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
                  background: none; 
                  border: none; 
                  color: var(--danger); 
                  opacity: 0.4; 
                  padding: 0 10px; 
                  cursor: pointer;
                  font-size: 1.2rem;">✕</button>
                ` : ''}
              </div>
            `
  }).join('')}
      </div>
    </div>
  `
}
