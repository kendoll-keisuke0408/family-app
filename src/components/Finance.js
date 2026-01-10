import { escape } from '../utils.js'
import { callGemini } from '../gemini_api.js'
import { processImage } from '../image_utils.js'

const FINANCE_KEY = 'family_app_finance'
const BUDGET = 150000

function getExpenses() {
  const saved = localStorage.getItem(FINANCE_KEY)
  if (saved) return JSON.parse(saved)
  return [
    { id: 1, title: 'スーパー', amount: 5400, date: '2026-01-10', category: '食費' },
    { id: 2, title: '電気代', amount: 8200, date: '2026-01-08', category: '水道光熱費' },
    { id: 3, title: 'カフェ', amount: 450, date: '2026-01-08', category: '趣味・娯楽' },
    { id: 4, title: 'クリスマスケーキ', amount: 4500, date: '2025-12-24', category: '食費' },
    { id: 5, title: '大掃除用品', amount: 3000, date: '2025-12-20', category: '日用品' },
    { id: 6, title: '忘年会', amount: 5000, date: '2025-12-15', category: '趣味・娯楽' },
  ]
}

function saveExpenses(data) {
  localStorage.setItem(FINANCE_KEY, JSON.stringify(data))
}

const CATEGORIES = {
  '食費': '🥦',
  '日用品': '🧻',
  'ファッション': '👕',
  '趣味・娯楽': '☕',
  '交通費': '🚃',
  '水道光熱費': '⚡',
  '通信費': '📱',
  '医療費': '🏥',
  '教育費': '✏️',
  'その他': '🤔'
}

// Stats Logic
function getMonthlyStats(expenses) {
  const now = new Date()
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Calculate Last Month
  let lastYear = now.getFullYear()
  let lastMonth = now.getMonth() // 0-11
  if (lastMonth === 0) {
    lastMonth = 12
    lastYear--
  }
  const lastMonthPrefix = `${lastYear}-${String(lastMonth).padStart(2, '0')}`

  const thisMonthExpenses = expenses.filter(e => e.date.startsWith(currentMonthPrefix))
  const lastMonthExpenses = expenses.filter(e => e.date.startsWith(lastMonthPrefix))

  const thisMonthTotal = thisMonthExpenses.reduce((sum, item) => sum + item.amount, 0)
  const lastMonthTotal = lastMonthExpenses.reduce((sum, item) => sum + item.amount, 0)

  const remaining = BUDGET - thisMonthTotal

  return {
    thisMonthTotal,
    lastMonthTotal,
    remaining,
    thisMonthExpenses,
    diff: thisMonthTotal - lastMonthTotal,
    isOverBudget: remaining < 0
  }
}

function analyzeFinances(expenses) {
  const total = expenses.reduce((sum, item) => sum + item.amount, 0)
  const byCategory = expenses.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount
    return acc
  }, {})

  // Find highest spender
  let highestCat = ''
  let highestAmount = 0
  for (const [cat, amount] of Object.entries(byCategory)) {
    if (amount > highestAmount) {
      highestAmount = amount
      highestCat = cat
    }
  }

  return { total, byCategory, highestCat, highestAmount }
}

function getMascotAdvice(stats, analysis) {
  const { remaining, thisMonthTotal, lastMonthTotal } = stats

  if (remaining < 0) {
    return {
      mood: 'dizzy',
      text: `あわわ...赤字確定だよ〜💦\n来月は引き締めないとまずいかも...！`,
      color: '#ff6b6b'
    }
  } else if (remaining < 20000) {
    return {
      mood: 'worry',
      text: `うーん、残りが少なくなってきたね。\n今月はあと ${remaining.toLocaleString()}円 しか使えないよ🐷`,
      color: '#ff9f1c'
    }
  } else if (thisMonthTotal < lastMonthTotal) {
    return {
      mood: 'happy',
      text: `先月より節約できてるね！✨\nこの調子なら、残り ${remaining.toLocaleString()}円 は来月に繰り越して貯金できそう！`,
      color: '#a3da8d'
    }
  } else {
    return {
      mood: 'normal',
      text: `今のところ順調だよ！\nこのままいけば来月に繰り越せるね💰`,
      color: '#4ecdc4'
    }
  }
}

// AI Functions
async function analyzeReceiptImage(file) {
  const apiKey = localStorage.getItem('gemini_api_key')
  // Process image
  const base64 = await processImage(file, 800, 0.7)

  if (apiKey) {
    try {
      const prompt = `
          このレシート画像を解析し、以下の情報のJSONのみ返してください。
          {
              "title": "店名(不明なら'不明')",
              "amount": 合計金額(数値),
              "category": "食費" (食費, 日用品, ファッション, 趣味・娯楽, 交通費, 水道光熱費, 通信費, 医療費, 教育費, その他 から最も適切なもの)
          }
          Code blockは含めないでください。
          `
      const resultStr = await callGemini(prompt, '', base64)
      const clean = resultStr.replace(/```json/g, '').replace(/```/g, '').trim()
      return JSON.parse(clean)
    } catch (e) {
      console.error("AI Scan Failed", e)
      alert('AI解析に失敗しました。(APIキー設定を確認してください)\nモックを使用します。')
    }
  } else {
    alert('APIキーが設定されていません。\nデモ用のモックデータを使用します。')
  }

  // Mock Fallback
  return new Promise((resolve) => {
    const presets = [
      { title: 'イオンモール', amount: 4580, category: '食費' },
      { title: 'ユニクロ', amount: 3990, category: 'ファッション' },
      { title: 'セブンイレブン', amount: 850, category: '食費' },
    ]
    const result = presets[Math.floor(Math.random() * presets.length)]
    setTimeout(() => resolve(result), 1000)
  })
}

export function render() {
  const expenses = getExpenses()
  const stats = getMonthlyStats(expenses)
  const analysis = analyzeFinances(stats.thisMonthExpenses)
  const advice = getMascotAdvice(stats, analysis)

  // Prepare chart data
  const chartData = Object.entries(analysis.byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amount]) => ({
      cat,
      amount,
      percent: Math.round((amount / analysis.total) * 100) || 0
    }))

  setTimeout(() => {
    // 1. Receipt Scan
    const form = document.querySelector('#expense-form')
    const list = document.querySelector('.recent-transactions')
    const cameraInput = document.querySelector('#camera-input')
    const scanBtn = document.querySelector('#scan-btn')
    const scanStatus = document.querySelector('#scan-status')

    if (scanBtn && cameraInput) {
      // Check API Key
      if (!localStorage.getItem('gemini_api_key')) {
        scanBtn.innerText = '📷 レシート撮影 (デモ)'
      }

      scanBtn.onclick = () => cameraInput.click()
      cameraInput.onchange = async (e) => {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0]
          scanBtn.disabled = true
          scanStatus.style.display = 'block'
          scanStatus.innerHTML = `<div class="spinner"></div> <span>解析中...</span>`

          try {
            const result = await analyzeReceiptImage(file)
            if (result) {
              document.querySelector('input[name="title"]').value = result.title
              document.querySelector('input[name="amount"]').value = result.amount
              // Find matching category option
              const select = document.querySelector('select[name="category"]')
              if (result.category && Object.keys(CATEGORIES).includes(result.category)) {
                select.value = result.category
              } else {
                select.value = 'その他'
              }

              scanStatus.innerHTML = `<span style="color: var(--success);">完了！</span>`
            }
          } catch (err) {
            scanStatus.innerHTML = `<span style="color: var(--danger);">エラー</span>`
          }

          scanBtn.disabled = false
          setTimeout(() => scanStatus.style.display = 'none', 3000)
        }
      }
    }

    // 2. Add Expense
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault()
        const title = form.querySelector('input[name="title"]').value
        const amount = Number(form.querySelector('input[name="amount"]').value)
        const category = form.querySelector('select[name="category"]').value
        if (!title || !amount) return
        const date = new Date().toLocaleDateString('ja-JP').split('/').join('-')

        expenses.unshift({ id: Date.now(), title, amount, date, category })
        saveExpenses(expenses)
        document.querySelector('[data-route=finance]').click()
      }
    }

    // 3. Delete Expense
    if (list) {
      list.onclick = (e) => {
        const btn = e.target.closest('.delete-btn')
        if (btn) {
          const id = Number(btn.dataset.id)
          expenses.splice(expenses.findIndex(e => e.id === id), 1)
          saveExpenses(expenses)
          document.querySelector('[data-route=finance]').click()
        }
      }
    }

    // 4. Mascot AI Advice
    const aiAdviceBtn = document.querySelector('#ai-advice-btn')
    const mascotText = document.querySelector('#mascot-text')

    if (aiAdviceBtn) {
      aiAdviceBtn.onclick = async () => {
        const apiKey = localStorage.getItem('gemini_api_key')
        if (!apiKey) {
          alert('設定でGemini APIキーを設定すると、AIが詳しく分析してくれます！')
          return
        }

        mascotText.innerHTML = '<div class="spinner"></div> 考え中...';
        aiAdviceBtn.disabled = true;

        try {
          const prompt = `
                 あなたは節約上手の「ぶーちゃん」というキャラクターです。口調は「〜だぶー！」「〜だね！」と親しみやすくしてください。
                 今月の家計簿データを分析して、具体的なアドバイスを300文字以内でください。
                 
                 予算: ${BUDGET}円
                 今月の支出: ${stats.thisMonthTotal}円
                 残り: ${stats.remaining}円
                 
                 カテゴリ別支出:
                 ${JSON.stringify(analysis.byCategory)}
                 
                 具体的な改善点や褒めるポイントを挙げてね。
                 `
          const advice = await callGemini(prompt)
          mascotText.innerText = advice
        } catch (e) {
          console.error(e)
          mascotText.innerText = 'ごめんね、ちょっと疲れちゃった... (エラー)'
        }
        aiAdviceBtn.disabled = false
      }
    }

  }, 0)

  // Mascot SVG based on mood
  const mascotFaces = {
    happy: '🐷',
    normal: '🐷',
    worry: '😰',
    dizzy: '😱'
  }

  // Format diff string
  const diffStr = stats.diff > 0
    ? `+¥${stats.diff.toLocaleString()} (増えてる💦)`
    : `${stats.diff.toLocaleString()} (減った！✨)`

  return `
    <style>
      .spinner { width: 20px; height: 20px; border: 3px solid rgba(0,0,0,0.1); border-top-color: var(--primary-accent); border-radius: 50%; animation: spin 1s infinite; display: inline-block; vertical-align: middle; margin-right: 5px; }
      @keyframes spin { to { transform: rotate(360deg); } }
      .chart-bar-container { display: flex; align-items: center; margin-bottom: 8px; }
      .chart-label { width: 80px; font-size: 0.8rem; font-weight: 700; color: var(--text-muted); }
      .chart-bar-bg { flex: 1; height: 12px; background: #eee; border-radius: 6px; overflow: hidden; }
      .chart-bar-fill { height: 100%; border-radius: 6px; transition: width 0.5s ease-out; }
      .chart-value { width: 50px; text-align: right; font-size: 0.8rem; font-weight: 700; }
      
      .stat-card {
          background: white;
          padding: 10px;
          border-radius: 8px;
          flex: 1;
          border: 1px solid #eee;
          text-align: center;
      }
      .stat-label { font-size: 0.75rem; color: var(--text-muted); font-weight: 700; margin-bottom: 4px; }
      .stat-value { font-size: 1rem; font-weight: 800; }
    </style>

    <div class="finance-container fade-in">
      <h2 style="margin-bottom: var(--space-md);">家計簿 & アドバイス 💴</h2>
      
      <!-- Mascot Advice Section -->
      <div class="glass-panel" style="padding: var(--space-md); margin-bottom: var(--space-lg); border: 4px solid ${advice.color}; background: white; display: flex; align-items: flex-start; gap: var(--space-md);">
        <div style="font-size: 3.5rem; line-height: 1;">
            ${mascotFaces[advice.mood]}
            <div style="font-size: 0.7rem; text-align: center; font-weight: bold; color: var(--text-muted); margin-top: 5px;">ぶーちゃん</div>
        </div>
        <div style="flex: 1;">
            <div style="font-weight: 800; color: ${advice.color}; margin-bottom: 4px; font-size: 0.9rem; display: flex; justify-content: space-between; align-items: center;">
                <span>AI家計簿アドバイザー</span>
                <button id="ai-advice-btn" style="background: ${advice.color}; color: white; border: none; border-radius: 20px; padding: 2px 10px; font-size: 0.7rem; cursor: pointer; font-weight: 700;">詳しく聞く ✨</button>
            </div>
            <div id="mascot-text" style="font-size: 0.95rem; line-height: 1.5; white-space: pre-wrap;">${advice.text}</div>
        </div>
      </div>
      
      <!-- Monthly Stats Overview -->
       <div style="display: flex; gap: 8px; margin-bottom: var(--space-md);">
          <div class="stat-card">
              <div class="stat-label">今月の支出</div>
              <div class="stat-value" style="color: var(--primary-accent);">¥${stats.thisMonthTotal.toLocaleString()}</div>
          </div>
           <div class="stat-card">
              <div class="stat-label">先月との比較</div>
              <div class="stat-value" style="color: ${stats.diff > 0 ? '#ff6b6b' : '#4ecdc4'};">${diffStr}</div>
          </div>
      </div>
      <div class="glass-panel" style="padding: var(--space-md); margin-bottom: var(--space-lg); background: linear-gradient(135deg, #a3da8d 0%, #4ecdc4 100%); color: white; text-align: center;">
          <div style="font-size: 0.9rem; font-weight: 700; opacity: 0.9;">💰 繰り越し可能額 (残り予算)</div>
          <div style="font-size: 2rem; font-weight: 900; margin: 5px 0;">¥${stats.remaining.toLocaleString()}</div>
          <div style="font-size: 0.8rem; font-weight: 600;">このままだと、来月にこれだけ回せるよ！</div>
      </div>

      <!-- Graph Section -->
      <div class="glass-panel" style="padding: var(--space-lg); margin-bottom: var(--space-lg);">
        <h3 style="margin-bottom: var(--space-md); font-size: 1.1rem;">📊 今月の内訳</h3>
        ${chartData.length > 0 ? chartData.map(d => `
            <div class="chart-bar-container">
                <div class="chart-label">${d.cat.substring(0, 6)}</div>
                <div class="chart-bar-bg">
                    <div class="chart-bar-fill" style="width: ${d.percent}%; background: ${advice.mood === 'dizzy' ? '#ff6b6b' : 'var(--primary-accent)'};"></div>
                </div>
                <div class="chart-value">${d.percent}%</div>
            </div>
        `).join('') : '<div style="text-align: center; color: var(--text-muted);">データがまだないよ 🐖</div>'}
      </div>

      <!-- Receipt Scan & Add -->
      <div class="glass-panel" style="padding: var(--space-md); margin-bottom: var(--space-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
           <h3 style="font-size: 1.1rem; margin: 0;">📝 出費を入力</h3>
           <input type="file" id="camera-input" accept="image/*" capture="environment" style="display: none;">
           <button id="scan-btn" class="btn" style="background: var(--text-main); color: white; font-size: 0.85rem; padding: 0.5rem;">
             📷 レシート撮影 (AI)
           </button>
        </div>
        <div id="scan-status" style="display: none; background: #f0f0f0; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-weight: 700; font-size: 0.9rem; color: var(--text-main);"></div>

        <form id="expense-form" style="display: grid; gap: var(--space-sm);">
          <input type="text" name="title" placeholder="何を買った？" required>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-sm);">
            <input type="number" name="amount" placeholder="金額 (円)" required>
            <select name="category">
              ${Object.keys(CATEGORIES).map(c => `<option value="${c}">${c} ${CATEGORIES[c]}</option>`).join('')}
            </select>
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: var(--space-xs);">この内容で登録</button>
        </form>
      </div>

      <!-- Recent List -->
      <div class="recent-transactions">
        <h3 style="margin-bottom: var(--space-md); font-size: 1.1rem;">最近の履歴 (全期間)</h3>
        <div style="display: flex; flex-direction: column; gap: var(--space-sm);">
          ${expenses.map(item => `
            <div class="glass-panel" style="padding: var(--space-md); display: flex; justify-content: space-between; align-items: center; border: 2px solid white; position: relative;">
              <div style="display: flex; align-items: center; gap: var(--space-md);">
                <div style="width: 44px; height: 44px; border-radius: 50%; background: #fff4e6; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">
                  ${CATEGORIES[item.category] || '🤔'}
                </div>
                <div>
                  <div style="font-weight: 700;">${escape(item.title)}</div>
                  <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500;">
                    ${item.date} <span style="background: #eee; padding: 2px 6px; border-radius: 4px; margin-left: 4px;">${item.category}</span>
                  </div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="font-weight: 800; color: var(--secondary-accent);">-¥${item.amount.toLocaleString()}</div>
                <button class="delete-btn" data-id="${item.id}" style="border: none; background: none; color: #ccc; cursor: pointer; font-size: 1.2rem;">×</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `
}
