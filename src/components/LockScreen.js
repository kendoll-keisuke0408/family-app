import { escape } from '../utils.js'
import { getAppPin } from '../auth.js'

export function render(onUnlock) {
  setTimeout(() => {
    const pins = []
    const correctPin = getAppPin()

    const dots = document.querySelectorAll('.pin-dot')
    const keys = document.querySelectorAll('.pin-key')

    keys.forEach(key => {
      key.onclick = () => {
        const val = key.dataset.val
        if (val === 'del') {
          pins.pop()
        } else {
          if (pins.length < 4) pins.push(val)
        }

        // Update UI
        dots.forEach((dot, i) => {
          dot.style.background = i < pins.length ? 'var(--primary-accent)' : '#ddd'
        })

        // Check
        if (pins.length === 4) {
          if (pins.join('') === correctPin) {
            onUnlock()
          } else {
            // Shake anim
            const container = document.querySelector('.pin-container')
            container.animate([
              { transform: 'translateX(0)' },
              { transform: 'translateX(-10px)' },
              { transform: 'translateX(10px)' },
              { transform: 'translateX(0)' }
            ], { duration: 300 })
            pins.length = 0
            dots.forEach(dot => dot.style.background = '#ddd')
          }
        }
      }
    })
  }, 0)

  return `
    <div class="pin-container fade-in" style="
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      justify-content: center; 
      height: 80vh; 
      text-align: center;">
      
      <div style="font-size: 3rem; margin-bottom: var(--space-md);">🔒</div>
      <h2 style="margin-bottom: var(--space-sm);">パスコードを入力</h2>
      <p style="color: var(--text-muted); margin-bottom: var(--space-xl);">家族の大事なデータを守るよ (初期: 0000)</p>
      
      <div style="display: flex; gap: var(--space-md); margin-bottom: var(--space-xl);">
        <div class="pin-dot" style="width: 16px; height: 16px; border-radius: 50%; background: #ddd; transition: all 0.2s;"></div>
        <div class="pin-dot" style="width: 16px; height: 16px; border-radius: 50%; background: #ddd; transition: all 0.2s;"></div>
        <div class="pin-dot" style="width: 16px; height: 16px; border-radius: 50%; background: #ddd; transition: all 0.2s;"></div>
        <div class="pin-dot" style="width: 16px; height: 16px; border-radius: 50%; background: #ddd; transition: all 0.2s;"></div>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-md);">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `
          <button class="pin-key btn glass-panel" data-val="${n}" style="
            width: 70px; height: 70px; 
            font-size: 1.5rem; 
            font-weight: 700;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
          ">${n}</button>
        `).join('')}
        <div style="width: 70px;"></div>
        <button class="pin-key btn glass-panel" data-val="0" style="
            width: 70px; height: 70px; 
            font-size: 1.5rem; 
            font-weight: 700;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
          ">0</button>
        <button class="pin-key btn" data-val="del" style="
            width: 70px; height: 70px; 
            font-size: 1rem; 
            color: var(--text-muted);
            background: transparent;
          ">⌫</button>
      </div>
    </div>
  `
}
