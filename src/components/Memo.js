import { getCurrentUser, getUsers } from '../auth.js'
import { escape } from '../utils.js'
import { processImage } from '../image_utils.js'

const MEMOS_KEY = 'family_app_memos'

function getMemos() {
  const saved = localStorage.getItem(MEMOS_KEY)
  if (saved) return JSON.parse(saved)
  // Default Welcome Memo
  return [{
    id: Date.now(),
    text: '家族みんなへの伝言板だよ！\nここにメモを残してね。',
    color: 'white',
    reactions: {},
    x: 50, y: 50,
    createdBy: { name: '開発者', icon: '👨‍💻' },
    date: new Date().toISOString().split('T')[0]
  }]
}

function saveMemos(memos) {
  // Limit to last 20 to save space
  if (memos.length > 20) memos = memos.slice(0, 20)
  localStorage.setItem(MEMOS_KEY, JSON.stringify(memos))
}

export function render() {
  const memos = getMemos()
  const currentUser = getCurrentUser()
  const allUsers = getUsers()
  const REACTIONS = ['👍', '❤️', '✨', '😢', '🙏']

  // Handlers
  setTimeout(() => {
    const list = document.querySelector('.memo-container')
    const form = document.querySelector('#add-memo-form')
    const textarea = form?.querySelector('textarea')

    // Add Memo
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault()
        const text = textarea.value
        const color = form.querySelector('select').value
        const fileInput = form.querySelector('#memo-image-input')

        if (!text) return

        let image = null
        if (fileInput.files && fileInput.files[0]) {
          try {
            // Larger size for memos, 800px max
            image = await processImage(fileInput.files[0], 800, 0.7)
          } catch (err) {
            console.error("Memo image upload failed", err)
            alert('写真の読み込みに失敗しました')
          }
        }

        const newMemo = {
          id: Date.now(),
          text: text,
          image: image,
          color: color,
          reactions: {},
          x: Math.random() * 20 + 40,
          y: Math.random() * 20 + 40,
          createdBy: {
            name: currentUser.name,
            icon: currentUser.icon
          },
          date: new Date().toISOString().split('T')[0]
        }

        // Add to front
        memos.unshift(newMemo)
        saveMemos(memos)
        document.querySelector('[data-route=memo]').click()
      }
    }

    // Global Click Handler (Delete, Reaction, Quote)
    if (list) {
      list.onclick = (e) => {
        const deleteBtn = e.target.closest('.delete-memo-btn')
        const reactionBtn = e.target.closest('.reaction-btn')
        const quoteBtn = e.target.closest('.quote-btn')

        // Delete Logic
        if (deleteBtn) {
          if (confirm('このメモを消しますか？')) {
            const id = Number(deleteBtn.dataset.id)
            const newMemos = memos.filter(m => m.id !== id)
            saveMemos(newMemos)
            document.querySelector('[data-route=memo]').click()
          }
        }

        // Reaction Logic (Toggle Name)
        if (reactionBtn) {
          const id = Number(reactionBtn.dataset.id)
          const type = reactionBtn.dataset.type
          const idx = memos.findIndex(m => m.id === id)
          if (idx > -1) {
            if (!memos[idx].reactions) memos[idx].reactions = {}

            // Initialize as array if undefined or if it was number (legacy compatibility)
            const currentReacts = memos[idx].reactions[type]
            let reactors = []
            if (Array.isArray(currentReacts)) {
              reactors = [...currentReacts]
            } else if (typeof currentReacts === 'number') {
              // Legacy: Can't convert number to names, so reset or ignore. Let's start fresh.
              reactors = []
            }

            // Toggle logic
            const userName = currentUser.name
            if (reactors.includes(userName)) {
              // Remove (Unlike)
              reactors = reactors.filter(n => n !== userName)
            } else {
              // Add
              reactors.push(userName)
            }

            memos[idx].reactions[type] = reactors
            saveMemos(memos)
            document.querySelector('[data-route=memo]').click()
          }
        }

        // Quote Reply Logic
        if (quoteBtn) {
          const id = Number(quoteBtn.dataset.id)
          const memo = memos.find(m => m.id === id)
          if (memo && textarea) {
            const quoteText = memo.text.split('\n').map(line => `> ${line}`).join('\n')
            textarea.value = `${quoteText}\n\n` + textarea.value
            textarea.focus()

            // Scroll form into view
            form.scrollIntoView({ behavior: 'smooth' })
          }
        }
      }
    }

  }, 0)

  // Helper to render icon safely
  const renderUserIcon = (icon) => {
    if (icon && icon.startsWith('data:')) return `<img src="${icon}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;vertical-align:middle;">`
    return icon
  }

  // Format Helper for Last Login
  const formatTime = (isoString) => {
    if (!isoString) return 'まだ'
    const d = new Date(isoString)
    const now = new Date()
    // If today, show time. Else show date
    if (d.toDateString() === now.toDateString()) {
      return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
    }
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  return `
    <div class="memo-container fade-in" style="height: 100%; display: flex; flex-direction: column;">
      
      <!-- Blackboard Area -->
      <div style="
        flex: 1;
        background-color: #2b463c; /* Dark Green */
        background-image: 
            radial-gradient(#3c5e50 15%, transparent 16%),
            radial-gradient(#3c5e50 15%, transparent 16%);
        background-size: 20px 20px;
        background-position: 0 0, 10px 10px;
        border: 12px solid #8b5a2b; /* Wood Frame */
        border-radius: 8px;
        box-shadow: 0 10px 20px rgba(0,0,0,0.3) inset, 0 5px 15px rgba(0,0,0,0.2);
        position: relative;
        overflow-y: auto;
        padding: 20px;
        color: white;
        font-family: 'Zen Kaku Gothic New', sans-serif;
      ">
        <!-- Last Login Status -->
        <div style="position: absolute; top: 10px; right: 10px; display: flex; gap: 8px; align-items: center;">
            ${allUsers.map(u => `
                <div style="text-align: center; opacity: ${u.id === currentUser.id ? 1 : 0.7};">
                    <div style="font-size: 1.2rem; background: rgba(255,255,255,0.2); border-radius: 50%; width: 30px; height: 30px; display:flex; align-items:center; justify-content:center;">${renderUserIcon(u.icon)}</div>
                    <div style="font-size: 0.6rem; margin-top: 2px;">${formatTime(u.lastLogin)}</div>
                </div>
            `).join('')}
        </div>

        <h2 style="
            text-align: center; 
            font-family: 'M PLUS Rounded 1c', sans-serif; 
            color: rgba(255,255,255,0.9);
            text-shadow: 2px 2px 0 rgba(0,0,0,0.2);
            margin-bottom: 20px;
            border-bottom: 2px dashed rgba(255,255,255,0.3);
            padding-bottom: 10px;
        ">
            みんなの伝言板 🏫
        </h2>
        
        <div style="display: flex; flex-direction: column; gap: 20px;">
            ${memos.length === 0 ? '<div style="text-align: center; color: rgba(255,255,255,0.5);">メモはまだないよ...✍️</div>' : ''}
            
            ${memos.map(memo => {
    // Safety check for reactions
    const reactions = memo.reactions || {}
    return `
                <div class="chalk-memo" style="
                    background: rgba(255,255,255,0.1);
                    padding: 15px;
                    border-radius: 4px;
                    box-shadow: 2px 2px 5px rgba(0,0,0,0.1);
                    border-left: 4px solid ${memo.color === 'pink' ? '#ff99cc' : memo.color === 'blue' ? '#99ccff' : memo.color === 'yellow' ? '#ffd700' : '#ffffca'};
                    position: relative;
                    animation: popIn 0.5s;
                ">
                    <div style="position: absolute; top: 5px; right: 5px; display: flex; gap: 8px;">
                        <button class="quote-btn" data-id="${memo.id}" style="
                            background: none; border: none; color: rgba(255,255,255,0.6); cursor: pointer; font-size: 0.9rem;
                        " title="引用して返信">↩️</button>
                        <button class="delete-memo-btn" data-id="${memo.id}" style="
                            background: none; border: none; color: rgba(255,255,255,0.3); cursor: pointer; font-size: 1.1rem;
                        " title="削除">×</button>
                    </div>

                    <div style="font-size: 1.1rem; line-height: 1.6; white-space: pre-wrap; font-weight: 500; font-family: 'M PLUS Rounded 1c'; color: ${memo.color === 'pink' ? '#ffe6f2' : memo.color === 'blue' ? '#e6f2ff' : memo.color === 'yellow' ? '#fff9c4' : '#fffff0'}; margin-bottom: 10px;">
                        ${escape(memo.text)}
                    </div>
                    
                    ${memo.image ? `
                        <div style="margin-top: 10px; margin-bottom: 10px; border: 4px solid white; transform: rotate(-2deg); display: inline-block; box-shadow: 0 4px 5px rgba(0,0,0,0.3);">
                            <img src="${memo.image}" style="max-width: 100%; max-height: 200px; display: block;">
                        </div>
                    ` : ''}

                    <!-- Reactions Bar -->
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; border-top: 1px dashed rgba(255,255,255,0.2); padding-top: 8px;">
                        ${REACTIONS.map(emoji => {
      let count = 0
      let tooltip = ''
      let names = []
      // Check compatibility
      if (Array.isArray(reactions[emoji])) {
        count = reactions[emoji].length
        names = reactions[emoji]
        tooltip = names.join(', ')
      } else if (typeof reactions[emoji] === 'number') {
        count = reactions[emoji] // Legacy support (display only)
      }

      const isSelected = names.includes(currentUser.name)

      return `
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <button class="reaction-btn" data-id="${memo.id}" data-type="${emoji}" style="
                                    background: ${isSelected ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.2)'}; 
                                    border: 1px solid rgba(255,255,255,0.2); 
                                    border-radius: 12px; padding: 2px 8px; color: white; cursor: pointer; font-size: 0.8rem;
                                    display: flex; align-items: center; gap: 4px; transition: background 0.2s;
                                " title="${tooltip}">
                                    <span>${emoji}</span>
                                    <span style="font-weight: 700; font-size: 0.75rem;">${count}</span>
                                </button>
                                ${count > 0 && names.length > 0 ?
          `<span style="font-size: 0.7rem; color: rgba(255,255,255,0.5);">${names[0]}${names.length > 1 ? '..' : ''}</span>`
          : ''}
                            </div>
                        `}).join('')}
                    </div>
                    
                    <div style="margin-top: 8px; font-size: 0.8rem; color: rgba(255,255,255,0.6); display: flex; align-items: center; gap: 5px; justify-content: flex-end;">
                        <span>✍️ ${renderUserIcon(memo.createdBy?.icon)} ${memo.createdBy?.name || '誰か'}</span>
                        <span>(${memo.date || '不明'})</span>
                    </div>
                </div>
            `}).join('')}
        </div>
      </div>

      <!-- Controls -->
      <div style="margin-top: 15px;">
        <form id="add-memo-form" style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                <textarea placeholder="ここにメッセージを書いてね..." style="flex: 1; padding: 10px; border-radius: 8px; border: 2px solid #ddd; height: 80px; resize: none;" required></textarea>
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <select style="padding: 5px; border-radius: 5px; border: 2px solid #ddd; font-size: 0.8rem;">
                        <option value="white">⚪ 白</option>
                        <option value="pink">🔴 赤</option>
                        <option value="blue">🔵 青</option>
                        <option value="yellow">🟡 黄</option>
                    </select>
                    <label class="btn" style="padding: 5px; font-size: 0.8rem; text-align: center; background: #eee; cursor: pointer; border: 2px solid #ddd; color: #555;">
                        📷 写真
                        <input type="file" id="memo-image-input" accept="image/*" style="display: none;">
                    </label>
                </div>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; border-radius: 12px; padding: 10px;">
                黒板に書く ✍️
            </button>
        </form>
      </div>
    </div>
  `
}
