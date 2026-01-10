import { escape } from '../utils.js'

const CHALLENGES_KEY = 'family_app_challenges'

function getChallenges() {
    const saved = localStorage.getItem(CHALLENGES_KEY)
    if (saved) return JSON.parse(saved)
    return [
        { id: 1, title: 'みんなで夕食を食べる 🍲', target: 5, current: 2, badge: '🏆', badgeName: '絆マスター', completed: false },
        { id: 2, title: '休日に公園に行く 🌳', target: 3, current: 3, badge: '🏃', badgeName: 'アウトドア家族', completed: true },
        { id: 3, title: 'お部屋の片付けをする 🧹', target: 10, current: 4, badge: '✨', badgeName: 'ピカピカ団', completed: false },
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
        // Stamp logic
        const list = document.querySelector('.challenge-list')
        if (list) {
            list.onclick = (e) => {
                const btn = e.target.closest('.stamp-btn')
                const undoBtn = e.target.closest('.undo-btn')

                if (btn) {
                    const id = Number(btn.dataset.id)
                    const idx = challenges.findIndex(c => c.id === id)
                    if (idx > -1 && !challenges[idx].completed) {
                        challenges[idx].current += 1

                        // Check completion
                        if (challenges[idx].current >= challenges[idx].target) {
                            challenges[idx].current = challenges[idx].target
                            challenges[idx].completed = true
                            alert(`おめでとう！🎉\n「${challenges[idx].badgeName}」バッジをゲットしたよ！`)
                        }
                        saveChallenges(challenges)
                        document.querySelector('[data-route=challenges]').click()
                    }
                }

                if (undoBtn) {
                    const id = Number(undoBtn.dataset.id)
                    const idx = challenges.findIndex(c => c.id === id)
                    if (idx > -1 && challenges[idx].current > 0) {
                        if (confirm('一つ戻しますか？')) {
                            challenges[idx].current -= 1
                            challenges[idx].completed = false // Un-complete if it was done
                            saveChallenges(challenges)
                            document.querySelector('[data-route=challenges]').click()
                        }
                    }
                }
            }
        }

        // Reset/Prestige (Debug feature really)
        const resetBtn = document.querySelector('#reset-challenges')
        if (resetBtn) {
            resetBtn.onclick = () => {
                if (confirm('本当にリセットしますか？')) {
                    localStorage.removeItem(CHALLENGES_KEY)
                    document.querySelector('[data-route=challenges]').click()
                }
            }
        }

    }, 0)

    return `
    <div class="challenges-container fade-in">
       <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
        <h2>家族チャレンジ 👑</h2>
        <div style="background: #fff; padding: 5px 15px; border-radius: 20px; font-weight: 800; color: var(--primary-accent); box-shadow: var(--shadow-sm); border: 2px solid var(--primary-accent);">
            獲得バッジ: ${totalBadges}個
        </div>
      </div>

      <!-- Badge Collection (Showcase) -->
       <div class="glass-panel" style="padding: var(--space-md); margin-bottom: var(--space-lg); background: linear-gradient(to bottom, #fff, #f0f8ff);">
         <h3 style="font-size: 1rem; margin-bottom: var(--space-sm); color: var(--text-muted); text-align: center;">🏆 コレクション</h3>
         <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; min-height: 60px;">
            ${challenges.filter(c => c.completed).map(c => `
                <div style="display: flex; flex-direction: column; align-items: center; animation: popIn 0.5s;">
                    <div style="font-size: 2.5rem; filter: drop-shadow(0 4px 0 rgba(0,0,0,0.1));">${c.badge}</div>
                    <div style="font-size: 0.7rem; font-weight: 700; background: var(--primary-accent); color: white; padding: 2px 6px; border-radius: 4px;">${c.badgeName}</div>
                </div>
            `).join('')}
            ${challenges.filter(c => c.completed).length === 0 ? '<div style="color: #ccc; font-size: 0.9rem;">まだバッジはないよ... チャレンジしよう！💪</div>' : ''}
         </div>
       </div>

      <div class="challenge-list" style="display: flex; flex-direction: column; gap: var(--space-md);">
        ${challenges.map(c => {
        const progress = (c.current / c.target) * 100
        const isFinished = c.completed

        return `
            <div class="glass-panel" style="padding: var(--space-md); border: 4px solid ${isFinished ? '#ffd700' : 'white'}; position: relative; overflow: hidden;">
                ${isFinished ? '<div style="position: absolute; top: 10px; right: -30px; background: #ffd700; color: #fff; transform: rotate(45deg); padding: 5px 40px; font-weight: 800; font-size: 0.8rem; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">COMPLETED</div>' : ''}
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h3 style="margin: 0; font-size: 1.1rem;">${c.title}</h3>
                    <div style="font-weight: 800; font-size: 1.2rem; color: var(--primary-accent);">${c.current} <span style="font-size: 0.8rem; color: #ccc;">/ ${c.target}</span></div>
                </div>
                
                <!-- Progress Bar -->
                <div style="height: 16px; background: #eee; border-radius: 10px; overflow: hidden; margin-bottom: 15px; border: 2px solid white;">
                    <div style="height: 100%; width: ${progress}%; background: repeating-linear-gradient(45deg, var(--tertiary-accent), var(--tertiary-accent) 10px, #45b7af 10px, #45b7af 20px); transition: width 0.5s;"></div>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; items-center; gap: 5px; font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">
                        <span>報酬:</span>
                        <span style="font-size: 1.2rem;">${c.badge}</span>
                        <span>${c.badgeName}</span>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 5px;">
                        ${c.current > 0 ? `
                        <button class="undo-btn btn" data-id="${c.id}" style="
                            padding: 0.4rem 0.8rem;
                            font-size: 0.8rem;
                            background: white;
                            color: var(--text-muted);
                            border-color: #eee;
                        " title="1つ戻す">
                            ↩
                        </button>
                        ` : ''}

                        ${!isFinished ? `
                        <button class="stamp-btn btn" data-id="${c.id}" style="
                            padding: 0.4rem 1rem; 
                            font-size: 0.9rem; 
                            background: var(--secondary-accent); 
                            color: white;
                            box-shadow: 0 4px 0 #cc5555;
                        ">
                            やったよ！👆
                        </button>
                        ` : `
                        <button disabled class="btn" style="
                            padding: 0.4rem 1rem; 
                            font-size: 0.9rem; 
                            background: #eee; 
                            color: #aaa;
                            border-color: #ddd;
                            box-shadow: none;
                            cursor: default;
                            transform: none !important;
                        ">
                            達成済み ✨
                        </button>
                        `}
                    </div>
                </div>
            </div>
            `
    }).join('')}
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
         <button id="reset-challenges" style="background: none; border: none; text-decoration: underline; color: #ccc; cursor: pointer;">リセットする</button>
      </div>
    </div>
  `
}
