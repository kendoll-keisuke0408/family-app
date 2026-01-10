import { getCurrentUser } from '../auth.js'
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
    x: 50, y: 50,
    createdBy: { name: '開発者', icon: '👨‍💻' },
    date: new Date().toISOString().split('T')[0]
  }]
}

function saveMemos(memos) {
  // Limit to last 10 to save space
  if (memos.length > 10) memos = memos.slice(0, 10)
  localStorage.setItem(MEMOS_KEY, JSON.stringify(memos))
}

export function render() {
  const memos = getMemos()
  const currentUser = getCurrentUser()

  // Handlers
  setTimeout(() => {
    // Add Memo
    const form = document.querySelector('#add-memo-form')
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault()
        const text = form.querySelector('textarea').value
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
          // Random position scatter
          x: Math.random() * 20 + 40,
          y: Math.random() * 20 + 40,
          createdBy: {
            name: currentUser.name,
            icon: currentUser.icon // This might be base64 now
          },
          date: new Date().toISOString().split('T')[0]
        }

        // Add to front
        memos.unshift(newMemo)
        saveMemos(memos)
        document.querySelector('[data-route=memo]').click()
      }
    }

    // Delete Memo
    document.querySelectorAll('.delete-memo-btn').forEach(btn => {
      btn.onclick = (e) => {
        if (confirm('このメモを消しますか？')) {
          const id = Number(e.target.dataset.id)
          const newMemos = memos.filter(m => m.id !== id)
          saveMemos(newMemos)
          document.querySelector('[data-route=memo]').click()
        }
      }
    })

  }, 0)

  // Helper to render icon safely
  const renderUserIcon = (icon) => {
    if (icon && icon.startsWith('data:')) return `<img src="${icon}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;vertical-align:middle;">`
    return icon
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
        <div style="position: absolute; top: 10px; right: 10px; color: rgba(255,255,255,0.3); font-size: 0.8rem;">
           👤 ${currentUser.name} で操作中
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
            みんなの伝言板
        </h2>
        
        <div style="display: flex; flex-direction: column; gap: 20px;">
            ${memos.length === 0 ? '<div style="text-align: center; color: rgba(255,255,255,0.5);">メモはまだないよ...✍️</div>' : ''}
            
            ${memos.map(memo => `
                <div class="chalk-memo" style="
                    background: rgba(255,255,255,0.1);
                    padding: 15px;
                    border-radius: 4px;
                    box-shadow: 2px 2px 5px rgba(0,0,0,0.1);
                    border-left: 4px solid ${memo.color === 'pink' ? '#ff99cc' : memo.color === 'blue' ? '#99ccff' : memo.color === 'yellow' ? '#ffd700' : '#ffffca'};
                    position: relative;
                    animation: popIn 0.5s;
                ">
                    <button class="delete-memo-btn" data-id="${memo.id}" style="
                        position: absolute; top: 5px; right: 5px; 
                        background: none; border: none; color: rgba(255,255,255,0.3); cursor: pointer;
                    ">×</button>

                    <div style="font-size: 1.1rem; line-height: 1.6; white-space: pre-wrap; font-weight: 500; font-family: 'M PLUS Rounded 1c'; color: ${memo.color === 'pink' ? '#ffe6f2' : memo.color === 'blue' ? '#e6f2ff' : memo.color === 'yellow' ? '#fff9c4' : '#fffff0'};">
                        ${escape(memo.text)}
                    </div>
                    
                    ${memo.image ? `
                        <div style="margin-top: 10px; border: 4px solid white; transform: rotate(-2deg); display: inline-block; box-shadow: 0 4px 5px rgba(0,0,0,0.3);">
                            <img src="${memo.image}" style="max-width: 100%; max-height: 200px; display: block;">
                        </div>
                    ` : ''}
                    
                    <div style="margin-top: 10px; font-size: 0.8rem; color: rgba(255,255,255,0.6); display: flex; align-items: center; gap: 5px; justify-content: flex-end;">
                        <span>✍️ ${renderUserIcon(memo.createdBy?.icon)} ${memo.createdBy?.name || '誰か'}</span>
                        <span>(${memo.date || '不明'})</span>
                    </div>
                </div>
            `).join('')}
        </div>
      </div>

      <!-- Controls -->
      <div style="margin-top: 15px;">
        <form id="add-memo-form" style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; gap: 10px;">
                <textarea placeholder="ここにメッセージを書いてね..." style="flex: 1; padding: 10px; border-radius: 8px; border: 2px solid #ddd; height: 60px;" required></textarea>
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <select style="padding: 5px; border-radius: 5px; border: 2px solid #ddd;">
                        <option value="white">⚪ 白チョーク</option>
                        <option value="pink">🔴 赤チョーク</option>
                        <option value="blue">🔵 青チョーク</option>
                        <option value="yellow">🟡 黄チョーク</option>
                    </select>
                    <label class="btn" style="padding: 5px; font-size: 0.8rem; text-align: center; background: #eee; cursor: pointer;">
                        📷 写真
                        <input type="file" id="memo-image-input" accept="image/*" style="display: none;">
                    </label>
                </div>
            </div>
          transform: scale(1.1) rotate(2deg);
          background: rgba(255,255,255,0.1);
        }
        #memo-area::placeholder {
          color: rgba(255,255,255,0.5);
        }
        #memo-area:focus {
          outline: none;
          background: rgba(255,255,255,0.05);
          border-radius: 8px;
        }
      </style>
    </div>
  `
}
