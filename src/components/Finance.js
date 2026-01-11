import { escape } from '../utils.js'
import { callGemini } from '../gemini_api.js'
import { processImage } from '../image_utils.js'
import { saveData, subscribeData } from '../dataSync.js'

const FINANCE_KEY = 'family_app_finance'
const INCOME_KEY = 'family_app_income'
const DEFAULT_BUDGET = 200000

let expenses = []
let incomes = []

// Subscribe: Expenses
subscribeData(FINANCE_KEY, (data) => {
  if (Array.isArray(data)) {
    // Sort by date desc (if needed) or just populate
    expenses = data
    tryRefresh()
  }
})

// Subscribe: Incomes
subscribeData(INCOME_KEY, (data) => {
  if (Array.isArray(data)) {
    incomes = data
    tryRefresh()
  }
})

function tryRefresh() {
  const el = document.querySelector('.finance-container')
  if (el) {
    const currentRoute = localStorage.getItem('family_app_route') || 'dashboard'
    if (currentRoute === 'finance') {
      // Avoid loop if inputting? Maybe fine.
      // Just trigger route reload.
      document.querySelector('[data-route=finance]').click()
    }
  }
}

function saveExpenses(data) {
  saveData(FINANCE_KEY, data)
  expenses = data
}

function saveIncomes(data) {
  saveData(INCOME_KEY, data)
  incomes = data
}


const CATEGORIES = {
  '食費': '🥦',
  '日用品': '🧻',
  'ファッション': '👕',
  '趣味・娯楽': '☕',
  '交通費': '🚃',
  '居住費': '🏠',
  '水道光熱費': '⚡',
  '通信費': '📱',
  '医療費': '🏥',
  '教育費': '✏️',
  'その他': '🤔'
}

// Stats Logic (Dynamic Budget)
function getMonthlyStats(expenses, incomes, targetMonthPrefix) {
  // If targetMonthPrefix is not provided, use current month
  const now = new Date()
  const currentMonthPrefix = targetMonthPrefix || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Calculate This Month Stats
  const thisMonthExpenses = expenses.filter(e => e.date.startsWith(currentMonthPrefix))
  const currentMonthIncomes = incomes.filter(i => i.date.startsWith(currentMonthPrefix))

  // Calculate Income Sum
  const incomeSum = currentMonthIncomes.reduce((sum, item) => sum + item.amount, 0)

  // Logic: if current month has logged income, use it. Else use DEFAULT only if it's the ACTUAL current month and list is empty?
  // Let's simplified: Use sum. If 0, stick to 0 (user should add info).
  // BUT for better UX, if 0 and incomes list is totally empty (first run), use DEFAULT.
  const totalIncome = incomeSum > 0 ? incomeSum : (incomes.length > 0 ? 0 : DEFAULT_BUDGET)

  const thisMonthTotal = thisMonthExpenses.reduce((sum, item) => sum + item.amount, 0)
  const remaining = totalIncome - thisMonthTotal

  return {
    thisMonthTotal,
    totalIncome,
    remaining,
    thisMonthExpenses,
    currentMonthIncomes,
    isOverBudget: remaining < 0,
    monthLabel: currentMonthPrefix
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
  const { remaining, thisMonthTotal, totalIncome } = stats

  if (remaining < 0) {
    return {
      mood: 'dizzy',
      text: `あわわ...魔法の力が足りない！💦\n今月は ${Math.abs(remaining).toLocaleString()}円 のオーバーですぞ...\n来月は挽回しましょう！`,
      color: '#ff6b6b'
    }
  } else if (remaining < 20000) {
    return {
      mood: 'worry',
      text: `むむ...残りの魔力(予算)が少なくなってきました。\nあと ${remaining.toLocaleString()}円 です。\n慎重に使うのですぞ🧞‍♂️`,
      color: '#ff9f1c'
    }
  } else {
    return {
      mood: 'normal',
      text: `順調ですぞ！✨\nこのまま黒字を目指して、夢を叶えましょう！\n(残高: ¥${remaining.toLocaleString()})`,
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
              "category": "食費" (食費, 日用品, ファッション, 趣味・娯楽, 交通費, 居住費, 水道光熱費, 通信費, 医療費, 教育費, その他 から最も適切なもの)
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

// Global state for selected month (simple implementation)
// We use a query param or a temporary window variable if routing doesn't support it fully.
// Or just default to current month and use DOM state.
let currentYearMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

export function render() {
  // Global variables: expenses, incomes are managed by subscriptions


  // Calculate available months from data
  const availableMonths = new Set()
  availableMonths.add(new Date().toISOString().slice(0, 7)) // Always include this month
  expenses.forEach(e => availableMonths.add(e.date.slice(0, 7)))
  incomes.forEach(i => availableMonths.add(i.date.slice(0, 7)))
  const sortedMonths = Array.from(availableMonths).sort().reverse()

  const stats = getMonthlyStats(expenses, incomes, currentYearMonth)
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
    const form = document.querySelector('#expense-form')
    const incomeForm = document.querySelector('#income-form')
    const list = document.querySelector('.recent-transactions')
    const incomeList = document.querySelector('.income-list')
    const cameraInput = document.querySelector('#camera-input')
    const scanBtn = document.querySelector('#scan-btn')
    const scanStatus = document.querySelector('#scan-status')
    const monthSelect = document.querySelector('#month-select')

    // Month Selector Change
    if (monthSelect) {
      monthSelect.value = currentYearMonth
      monthSelect.onchange = (e) => {
        currentYearMonth = e.target.value
        document.querySelector('[data-route=finance]').click()
      }
    }

    // Edit State
    let editingId = null
    let incomeEditingId = null
    const submitBtn = form?.querySelector('button[type="submit"]')
    const formTitle = document.querySelector('#expense-form-title')
    const incomeSubmitBtn = incomeForm?.querySelector('button[type="submit"]')

    if (scanBtn && cameraInput) {
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

    // 2. Add / Edit Expense
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault()
        const title = form.querySelector('input[name="title"]').value
        const amount = Number(form.querySelector('input[name="amount"]').value)
        const category = form.querySelector('select[name="category"]').value
        if (!title || !amount) return

        if (editingId) {
          // Update existing
          const idx = expenses.findIndex(e => e.id === editingId)
          if (idx > -1) {
            expenses[idx].title = title
            expenses[idx].amount = amount
            expenses[idx].category = category
            editingId = null
          }
        } else {
          // Create new (use today's date, or update logic to allow date selection?)
          // Usually we add for TODAY.
          const now = new Date()
          const year = now.getFullYear()
          const month = String(now.getMonth() + 1).padStart(2, '0')
          const day = String(now.getDate()).padStart(2, '0')
          const date = `${year}-${month}-${day}`
          expenses.unshift({ id: Date.now(), title, amount, date, category })
        }

        saveExpenses(expenses)
        document.querySelector('[data-route=finance]').click()
      }
    }

    // 2.5 Add / Edit Income
    if (incomeForm) {
      incomeForm.onsubmit = (e) => {
        e.preventDefault()
        const title = incomeForm.querySelector('input[name="income-title"]').value
        const amount = Number(incomeForm.querySelector('input[name="income-amount"]').value)
        if (!title || !amount) return

        if (incomeEditingId) {
          const idx = incomes.findIndex(i => i.id === incomeEditingId)
          if (idx > -1) {
            incomes[idx].title = title
            incomes[idx].amount = amount
            incomeEditingId = null
          }
        } else {
          const now = new Date()
          const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
          incomes.unshift({ id: Date.now(), title, amount, date, category: '給料' })
        }

        saveIncomes(incomes)
        document.querySelector('[data-route=finance]').click()
      }
    }

    // 3. Delete / Start Edit Expense
    if (list) {
      list.onclick = (e) => {
        const deleteBtn = e.target.closest('.delete-btn')
        const editBtn = e.target.closest('.edit-btn')

        if (deleteBtn) {
          if (confirm('本当に削除しますか？')) {
            const id = Number(deleteBtn.dataset.id)
            expenses.splice(expenses.findIndex(e => e.id === id), 1)
            saveExpenses(expenses)
            document.querySelector('[data-route=finance]').click()
          }
        }

        if (editBtn) {
          const id = Number(editBtn.dataset.id)
          const item = expenses.find(e => e.id === id)
          if (item) {
            form.querySelector('input[name="title"]').value = item.title
            form.querySelector('input[name="amount"]').value = item.amount
            form.querySelector('select[name="category"]').value = item.category

            editingId = id
            if (submitBtn) {
              submitBtn.innerText = '更新する'
              submitBtn.style.background = 'var(--magic-gold)'
              submitBtn.style.color = '#333'
            }
            if (formTitle) formTitle.innerText = '📝 支出を編集'
            form.scrollIntoView({ behavior: 'smooth' })
          }
        }
      }
    }

    // Delete / Edit Income
    if (incomeList) {
      incomeList.onclick = (e) => {
        const deleteBtn = e.target.closest('.delete-btn')
        const editBtn = e.target.closest('.income-edit-btn')

        if (deleteBtn) {
          if (confirm('この収入を削除しますか？')) {
            const id = Number(deleteBtn.dataset.id)
            incomes.splice(incomes.findIndex(i => i.id === id), 1)
            saveIncomes(incomes)
            document.querySelector('[data-route=finance]').click()
          }
        }

        if (editBtn) {
          const id = Number(editBtn.dataset.id)
          const item = incomes.find(i => i.id === id)
          if (item) {
            incomeForm.querySelector('input[name="income-title"]').value = item.title
            incomeForm.querySelector('input[name="income-amount"]').value = item.amount

            incomeEditingId = id
            if (incomeSubmitBtn) {
              incomeSubmitBtn.innerText = '更新'
              incomeSubmitBtn.style.background = 'var(--magic-gold)'
              incomeSubmitBtn.style.color = '#333'
            }

            incomeForm.closest('details').open = true
            incomeForm.scrollIntoView({ behavior: 'smooth' })
          }
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
                  あなたは家計を守る「魔法のランプの魔人」です。口調は「〜ですぞ！」「〜だね！」と頼もしく、かつユーモアを交えてください。
                  今月の家計簿データを分析して、ディズニー映画のようなワクワクするアドバイスを300文字以内でください。
                  
                  対象月: ${stats.monthLabel}
                  予実管理:
                  収入: ${stats.totalIncome}円
                  支出: ${stats.thisMonthTotal}円
                  残り: ${stats.remaining}円
                  
                  カテゴリ別支出:
                  ${JSON.stringify(analysis.byCategory)}
                  
                  具体的な改善点や魔法のような節約術を提案してね。
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
  const mascotFaces = { happy: '🧞‍♂️', normal: '🎩', worry: '🧚‍♂️', dizzy: '😱' }

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
           padding: 15px;
           border-radius: 16px;
           flex: 1;
           box-shadow: 0 4px 10px rgba(0,0,0,0.03);
           text-align: center;
           border: 1px solid #f0f0f0;
      }
      .stat-label { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; margin-bottom: 8px; }
      .stat-value { font-size: 1.2rem; font-weight: 800; }
    </style>

    <div class="finance-container fade-in">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
        <h2 style="margin:0;">家計簿 & アドバイス 💴</h2>
        <select id="month-select" style="padding: 5px; border-radius: 8px; border: 2px solid #ddd; font-weight: 700; font-size: 0.9rem;">
            ${sortedMonths.map(m => `<option value="${m}" ${m === currentYearMonth ? 'selected' : ''}>${m}</option>`).join('')}
        </select>
      </div>
      
      <!-- Mascot New Design -->
      <div style="
          background: #0f172a; 
          border: 3px solid white; 
          border-radius: 20px; 
          padding: 20px; 
          display: flex; 
          gap: 20px; 
          align-items: flex-start; 
          margin-bottom: var(--space-lg);
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
          position: relative;
          overflow: hidden;
      ">
         <!-- Stars -->
         <div style="position: absolute; top: 20px; right: 100px; color: rgba(255,255,255,0.15); font-size: 1.5rem;">✦</div>
         <div style="position: absolute; bottom: 10px; left: 120px; color: rgba(255,255,255,0.1); font-size: 0.8rem;">✨</div>

         <!-- Avatar Section -->
         <div style="flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 5px;">
             <div style="
                width: 70px; 
                height: 70px; 
                border-radius: 50%; 
                border: 3px solid ${advice.color}; 
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
                color: ${advice.color};
             ">GUIDE</div>
         </div>

         <!-- Text Section -->
         <div style="flex: 1; z-index: 1;">
             <div style="
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
                margin-bottom: 10px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                padding-bottom: 10px;
             ">
                <span style="color: #2dd4bf; font-weight: 800; font-size: 0.95rem;">Adviser (${stats.monthLabel})</span>
                <button id="ai-advice-btn" style="
                    background: #2dd4bf; 
                    color: #0f172a; 
                    border: none; 
                    border-radius: 6px; 
                    padding: 5px 12px; 
                    font-size: 0.75rem; 
                    cursor: pointer; 
                    font-weight: 800;
                    transition: transform 0.2s;
                ">相談する</button>
             </div>
             <div id="mascot-text" style="
                color: white; 
                font-weight: 700; 
                font-size: 0.9rem; 
                line-height: 1.6; 
                white-space: pre-wrap;
                font-family: 'M PLUS Rounded 1c';
             ">${advice.text}</div>
         </div>
      </div>
      
      <!-- Stats Board -->
       <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
          <div class="stat-card">
              <div class="stat-label">収入(予算)</div>
              <div class="stat-value" style="color: #10b981;">¥${stats.totalIncome.toLocaleString()}</div>
          </div>
          <div class="stat-card">
              <div class="stat-label">支出</div>
              <div class="stat-value" style="color: #ef4444;">¥${stats.thisMonthTotal.toLocaleString()}</div>
          </div>
          <div class="stat-card" style="grid-column: 1 / -1; background: #fafafa;">
              <div class="stat-label">残り使えるお金 (黒字)</div>
              <div class="stat-value" style="color: ${stats.remaining < 0 ? '#ef4444' : '#10b981'}; font-size: 1.5rem;">¥${stats.remaining.toLocaleString()}</div>
          </div>
      </div>
      
      <!-- Income Editor (Accordion Style) -->
      <details class="glass-panel" style="margin-bottom: var(--space-lg); padding: 0; overflow: hidden; border: 1px solid #e0e0e0; box-shadow: none;">
        <summary style="padding: 15px; font-weight: 700; cursor: pointer; background: #f9f9f9; list-style: none; display: flex; justify-content: space-between; align-items: center;">
            <span>💰 収入・予算を編集する</span>
            <span style="font-size: 0.8rem; color: #888;">▼</span>
        </summary>
        <div style="padding: 15px;">
            <div class="income-list" style="margin-bottom: 15px;">
                ${stats.currentMonthIncomes.length > 0 ?
      stats.currentMonthIncomes.map(inc => `
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding: 8px 0;">
                        <div>
                            <div style="font-weight: 700;">${inc.title}</div>
                            <div style="font-size: 0.8rem; color: #888;">${inc.date}</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="font-weight: 700; color: #10b981;">+¥${inc.amount.toLocaleString()}</div>
                            <button class="income-edit-btn" data-id="${inc.id}" style="border: none; background: none; color: var(--magic-blue); cursor: pointer; font-size: 1rem;" title="編集">✏️</button>
                            <button class="delete-btn" data-id="${inc.id}" style="border: none; background: none; color: #ccc; cursor: pointer; font-size: 1.2rem;" title="削除">×</button>
                        </div>
                    </div>
                `).join('') : '<div style="color: #ccc; font-size: 0.8rem;">この月の収入記録はありません</div>'}
            </div>
            
            <form id="income-form" style="display: flex; gap: 5px;">
                <input type="text" name="income-title" placeholder="例: 手当" style="flex: 1;" required>
                <input type="number" name="income-amount" placeholder="金額" style="width: 100px;" required>
                <button type="submit" class="btn" style="background: #10b981; color: white; padding: 0 15px;">追加</button>
            </form>
        </div>
      </details>

      <!-- Expense Add -->
      <div class="glass-panel" style="padding: var(--space-md); margin-bottom: var(--space-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
           <h3 id="expense-form-title" style="font-size: 1rem; margin: 0;">📝 支出を入力 (${stats.monthLabel === new Date().toISOString().slice(0, 7) ? '今月' : stats.monthLabel})</h3>
           <input type="file" id="camera-input" accept="image/*" capture="environment" style="display: none;">
           <button id="scan-btn" class="btn" style="font-size: 0.8rem; padding: 0.4rem 0.8rem; background: #f3f4f6; color: #333;">📷 レシート撮影</button>
        </div>
        <div id="scan-status" style="display: none; background: #f0f0f0; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-weight: 700; font-size: 0.9rem;"></div>

        <form id="expense-form" style="display: grid; gap: 10px;">
          <input type="text" name="title" placeholder="品名 (例: ランチ)" required>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <input type="number" name="amount" placeholder="金額 (円)" required>
            <select name="category">
              ${Object.keys(CATEGORIES).map(c => `<option value="${c}">${c} ${CATEGORIES[c]}</option>`).join('')}
            </select>
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%;">登録する</button>
        </form>
      </div>
      
      <!-- Graph -->
      <div class="glass-panel" style="padding: var(--space-lg); margin-bottom: var(--space-lg);">
        <h3 style="margin-bottom: var(--space-md); font-size: 1rem;">📊 カテゴリ別支出 (${stats.monthLabel})</h3>
        ${chartData.length > 0 ? chartData.map(d => `
            <div class="chart-bar-container">
                <div class="chart-label">${d.cat}</div>
                <div class="chart-bar-bg">
                    <div class="chart-bar-fill" style="width: ${d.percent}%; background: var(--primary-accent);"></div>
                </div>
                <div class="chart-value">${d.percent}%</div>
            </div>
        `).join('') : '<div style="text-align: center; color: var(--text-muted);">データがまだないよ 🐖</div>'}
      </div>

      <!-- History -->
      <div class="recent-transactions">
        <h3 style="margin-bottom: var(--space-md); font-size: 1rem;">支出履歴 (${stats.monthLabel})</h3>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${stats.thisMonthExpenses.length > 0 ? stats.thisMonthExpenses.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10).map(item => `
            <div class="glass-panel" style="padding: 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 0;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 36px; height: 36px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                  ${CATEGORIES[item.category] || '🤔'}
                </div>
                <div>
                  <div style="font-weight: 700; font-size: 0.95rem;">${escape(item.title)}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">
                    ${item.date}
                  </div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="font-weight: 700;">-¥${item.amount.toLocaleString()}</div>
                <button class="edit-btn" data-id="${item.id}" style="border: none; background: none; color: var(--magic-blue); cursor: pointer; font-size: 1rem;" title="編集">✏️</button>
                <button class="delete-btn" data-id="${item.id}" style="border: none; background: none; color: #ccc; cursor: pointer; font-size: 1.2rem;" title="削除">×</button>
              </div>
            </div>
          `).join('') : '<div style="text-align: center; color: #aaa;">この月の履歴はありません</div>'}
        </div>
      </div>
    </div>
  `
}
