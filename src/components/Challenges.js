
import { escape } from '../utils.js'

const CHALLENGES_KEY = 'family_app_challenges'

function getChallenges() {
    const saved = localStorage.getItem(CHALLENGES_KEY)
    if (saved) return JSON.parse(saved)
    return [
        { id: 1, title: '晩餐会を開く (夕食)', target: 5, current: 2, icon: 'fa-utensils', badgeName: 'シェフの帽子', completed: false },
        { id: 2, title: '王国の探検 (公園)', target: 3, current: 3, icon: 'fa-tree', badgeName: '冒険者の靴', completed: true },
        { id: 3, title: 'お城の美化活動 (片付け)', target: 10, current: 4, icon: 'fa-broom', badgeName: '輝くほうき', completed: false },
    ]
}

function saveChallenges(data) {
    localStorage.setItem(CHALLENGES_KEY, JSON.stringify(data))
}

export function render() {
    const challenges = getChallenges()

    // Calculate Progress
    const totalBadges = challenges.filter(c => c.completed).length

    setTimeout(() => {
        const list = document.querySelector('.challenge-list')
        const editorArea = document.querySelector('#editor-area')
        const toggleEditBtn = document.querySelector('#toggle-edit-btn')
        const challengeForm = document.querySelector('#challenge-form')
        let editingId = null

        // Toggle Edit Mode
        if (toggleEditBtn) {
            toggleEditBtn.onclick = () => {
                const isHidden = editorArea.style.display === 'none'
                editorArea.style.display = isHidden ? 'block' : 'none'
                toggleEditBtn.innerHTML = isHidden ? '完了' : '⚙️ 設定'

                // Toggle Delete/Edit buttons on items
                document.querySelectorAll('.manage-btn').forEach(btn => {
                    btn.style.display = isHidden ? 'inline-block' : 'none'
                })
            }
        }

        // Add / Update Challenge
        if (challengeForm) {
            challengeForm.onsubmit = (e) => {
                e.preventDefault()
                const title = challengeForm.querySelector('input[name="title"]').value
                const target = Number(challengeForm.querySelector('input[name="target"]').value)
                const badgeName = challengeForm.querySelector('input[name="badgeName"]').value
                const icon = challengeForm.querySelector('select[name="icon"]').value

                if (editingId) {
                    // Update
                    const idx = challenges.findIndex(c => c.id === editingId)
                    if (idx > -1) {
                        challenges[idx].title = title
                        challenges[idx].target = target
                        challenges[idx].badgeName = badgeName
                        challenges[idx].icon = icon
                        editingId = null
                        challengeForm.querySelector('button[type="submit"]').innerText = '追加する'
                    }
                } else {
                    // Create
                    challenges.push({
                        id: Date.now(),
                        title,
                        target,
                        current: 0,
                        icon,
                        badgeName,
                        completed: false
                    })
                }
                saveChallenges(challenges)
                document.querySelector('[data-route=challenges]').click()
            }
        }

        // List Interaction (Stamp, Undo, Edit, Delete)
        if (list) {
            list.onclick = (e) => {
                const stampBtn = e.target.closest('.stamp-btn')
                const undoBtn = e.target.closest('.undo-btn')
                const editBtn = e.target.closest('.edit-challenge-btn')
                const deleteBtn = e.target.closest('.delete-challenge-btn')

                // Stamp
                if (stampBtn) {
                    const id = Number(stampBtn.dataset.id)
                    const idx = challenges.findIndex(c => c.id === id)
                    if (idx > -1 && !challenges[idx].completed) {
                        challenges[idx].current += 1
                        if (challenges[idx].current >= challenges[idx].target) {
                            challenges[idx].current = challenges[idx].target
                            challenges[idx].completed = true
                            alert(`ファンタスティック！✨\n「${challenges[idx].badgeName}」を手に入れたよ！`)
                        }
                        saveChallenges(challenges)
                        document.querySelector('[data-route=challenges]').click()
                    }
                }

                // Undo
                if (undoBtn) {
                    const id = Number(undoBtn.dataset.id)
                    const idx = challenges.findIndex(c => c.id === id)
                    if (idx > -1 && challenges[idx].current > 0) {
                        if (confirm('魔法をひとつ戻しますか？')) {
                            challenges[idx].current -= 1
                            challenges[idx].completed = false
                            saveChallenges(challenges)
                            document.querySelector('[data-route=challenges]').click()
                        }
                    }
                }

                // Edit Logic
                if (editBtn) {
                    const id = Number(editBtn.dataset.id)
                    const item = challenges.find(c => c.id === id)
                    if (item) {
                        editingId = id
                        challengeForm.querySelector('input[name="title"]').value = item.title
                        challengeForm.querySelector('input[name="target"]').value = item.target
                        challengeForm.querySelector('input[name="badgeName"]').value = item.badgeName
                        challengeForm.querySelector('select[name="icon"]').value = item.icon

                        challengeForm.querySelector('button[type="submit"]').innerText = '変更を保存'
                        editorArea.style.display = 'block'
                        editorArea.scrollIntoView({ behavior: 'smooth' })
                        toggleEditBtn.innerHTML = '完了'
                        // Ensure manage buttons are visible
                        document.querySelectorAll('.manage-btn').forEach(btn => {
                            btn.style.display = 'inline-block'
                        })
                    }
                }

                // Delete Logic
                if (deleteBtn) {
                    if (confirm('このクエストを削除しますか？')) {
                        const id = Number(deleteBtn.dataset.id)
                        const idx = challenges.findIndex(c => c.id === id)
                        challenges.splice(idx, 1)
                        saveChallenges(challenges)
                        document.querySelector('[data-route=challenges]').click()
                    }
                }
            }
        }

        // Reset
        const resetBtn = document.querySelector('#reset-challenges')
        if (resetBtn) {
            resetBtn.onclick = () => {
                if (confirm('すべてのチャレンジをリセットしますか？')) {
                    localStorage.removeItem(CHALLENGES_KEY)
                    document.querySelector('[data-route=challenges]').click()
                }
            }
        }

    }, 0)

    return `
    <div class="challenges-container fade-in">
       <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
       
       <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
        <h2 style="font-size: 1.4rem; color: #fff; margin:0; border:none; padding:0; text-shadow: 0 2px 4px rgba(0,0,0,0.3); font-family: 'M PLUS Rounded 1c', sans-serif;">
            <i class="fa-solid fa-crown" style="color: var(--magic-gold);"></i> 王国のチャレンジ
        </h2>
        <div style="display: flex; gap: 10px; align-items: center;">
             <div style="background: white; padding: 5px 15px; border-radius: 20px; font-weight: 800; color: var(--magic-blue); box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                <i class="fa-solid fa-medal"></i> メダル: ${totalBadges}
            </div>
            <button id="toggle-edit-btn" style="background: rgba(255,255,255,0.2); border: 2px solid #fff; color: #fff; border-radius: 20px; padding: 5px 10px; cursor: pointer; font-size: 0.8rem;">⚙️ 設定</button>
        </div>
      </div>

      <!-- Editor Area -->
      <div id="editor-area" style="display: none; background: rgba(255,255,255,0.95); padding: 15px; border-radius: 16px; margin-bottom: 20px; border: 3px solid var(--magic-gold);">
        <h3 style="margin-top: 0; color: var(--magic-blue);">📜 新しいクエストを作る</h3>
        <form id="challenge-form" style="display: grid; gap: 10px;">
            <input type="text" name="title" placeholder="クエスト名 (例: 皿洗い)" required style="padding: 8px; border-radius: 8px; border: 1px solid #ccc;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <input type="number" name="target" placeholder="目標回数 (例: 5)" required style="padding: 8px; border-radius: 8px; border: 1px solid #ccc;">
                <select name="icon" style="padding: 8px; border-radius: 8px; border: 1px solid #ccc;">
                    <option value="fa-utensils">食事 🍴</option>
                    <option value="fa-person-hiking">運動 🏃</option>
                    <option value="fa-book">勉強 📖</option>
                    <option value="fa-broom">掃除 🧹</option>
                    <option value="fa-bed">睡眠 🛌</option>
                    <option value="fa-dog">ペット 🐶</option>
                    <option value="fa-gamepad">ゲーム 🎮</option>
                    <option value="fa-music">音楽 🎵</option>
                    <option value="fa-tree">自然 🌳</option>
                    <option value="fa-star">その他 ⭐</option>
                </select>
            </div>
            <input type="text" name="badgeName" placeholder="報酬バッジ名 (例: あらいぐま)" required style="padding: 8px; border-radius: 8px; border: 1px solid #ccc;">
            <button type="submit" class="btn" style="background: var(--magic-gold); color: #333; font-weight: 800;">追加する</button>
        </form>
      </div>

      <!-- Badge Collection (Showcase) -->
       <div class="glass-panel" style="padding: var(--space-md); margin-bottom: var(--space-lg); background: rgba(255, 255, 255, 0.9);">
         <h3 style="font-size: 0.9rem; margin-bottom: var(--space-m); color: var(--text-sub); text-align: center;">
            <i class="fa-solid fa-gem"></i> 宝物庫
         </h3>
         <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; min-height: 60px;">
            ${challenges.filter(c => c.completed).map(c => `
                <div style="display: flex; flex-direction: column; align-items: center; animation: popIn 0.5s;">
                    <div style="width: 50px; height: 50px; border-radius: 50%; border: 3px solid var(--magic-gold); display: flex; align-items: center; justify-content: center; background: white; box-shadow: 0 4px 10px rgba(255, 215, 0, 0.3); margin-bottom: 5px; position: relative;">
                        <i class="fa-solid ${c.icon}" style="font-size: 1.5rem; color: var(--magic-blue);"></i>
                        <i class="fa-solid fa-sparkles" style="position: absolute; top: -5px; right: -5px; color: var(--magic-gold); font-size: 1rem;"></i>
                    </div>
                    <div style="font-size: 0.7rem; font-weight: 700; color: var(--text-main);">${c.badgeName}</div>
                </div>
            `).join('')}
            ${challenges.filter(c => c.completed).length === 0 ? '<div style="color: #aaa; font-size: 0.8rem;">まだメダルはないよ。冒険に出かけよう！🎈</div>' : ''}
         </div>
       </div>

      <div class="challenge-list" style="display: flex; flex-direction: column; gap: var(--space-md);">
        ${challenges.map(c => {
        const progress = (c.current / c.target) * 100
        const isFinished = c.completed

        return `
            <div class="glass-panel" style="padding: 15px; border: 3px solid ${isFinished ? 'var(--magic-gold)' : 'white'}; position: relative; overflow: hidden; background: white; border-radius: 16px;">
                ${isFinished ? '<div style="position: absolute; top: 10px; right: 10px; color: var(--magic-gold); font-size: 1.5rem;"><i class="fa-solid fa-check-circle"></i></div>' : ''}
                
                <div style="margin-bottom: 15px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                        <div style="background: ${isFinished ? 'var(--magic-gold)' : '#f0f4f8'}; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                             <i class="fa-solid ${c.icon}" style="color: ${isFinished ? 'white' : 'var(--magic-blue)'}; font-size: 1.2rem;"></i>
                        </div>
                        <h3 style="margin: 0; font-size: 1rem; color: var(--text-main); text-shadow: none;">${c.title}</h3>
                        
                        <!-- Manage Buttons (Hidden by default) -->
                        <button class="manage-btn edit-challenge-btn" data-id="${c.id}" style="border:none; background:rgba(255,255,255,0.9); border-radius: 4px; color:var(--magic-blue); cursor:pointer; margin-left: auto; font-size: 1rem; display: none; z-index: 10; position: relative;">✏️</button>
                        <button class="manage-btn delete-challenge-btn" data-id="${c.id}" style="border:none; background:rgba(255,255,255,0.9); border-radius: 4px; color:red; cursor:pointer; font-size: 1.2rem; display: none; z-index: 10; position: relative; margin-left: 5px;">×</button>
                    </div>
                </div>
                
                <!-- Progress Bar -->
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                    <div style="flex: 1; height: 12px; background: #eee; border-radius: 6px; overflow: hidden;">
                        <div style="height: 100%; width: ${progress}%; background: linear-gradient(90deg, var(--magic-blue), var(--magic-purple)); border-radius: 6px; transition: width 0.5s;"></div>
                    </div>
                    <div style="font-weight: 800; font-size: 0.9rem; color: var(--magic-blue); min-width: 40px; text-align: right;">
                        ${c.current}/${c.target}
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; items-center; gap: 5px; font-size: 0.8rem; color: var(--text-sub); font-weight: 600;">
                        <i class="fa-solid fa-gift" style="color: var(--magic-pink);"></i>
                        <span>ごほうび: ${c.badgeName}</span>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 5px;">
                        ${c.current > 0 ? `
                        <button class="undo-btn" data-id="${c.id}" style="
                            background: none; border: none; color: #ccc; cursor: pointer; font-size: 0.9rem;
                        " title="もどす">
                            <i class="fa-solid fa-rotate-left"></i>
                        </button>
                        ` : ''}

                        ${!isFinished ? `
                        <button class="stamp-btn btn" data-id="${c.id}" style="
                            padding: 6px 15px; 
                            font-size: 0.85rem; 
                            background: var(--magic-blue); 
                            color: white;
                            border-radius: 20px;
                            box-shadow: 0 4px 10px rgba(74, 144, 226, 0.3);
                        ">
                            できた！ <i class="fa-solid fa-wand-magic-sparkles"></i>
                        </button>
                        ` : `
                        <span style="font-size: 0.8rem; font-weight: 700; color: var(--magic-gold);">
                            クリア！🎉
                        </span>
                        `}
                    </div>
                </div>
            </div>
            `
    }).join('')}
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
         <button id="reset-challenges" style="background: none; border: none; color: rgba(255,255,255,0.6); font-size: 0.8rem; cursor: pointer; text-decoration: underline;">さいしょから遊ぶ</button>
      </div>
    </div>
  `
}
