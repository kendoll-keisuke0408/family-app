import { escape } from '../utils.js'
import { processImage } from '../image_utils.js'

const EVENTS_KEY = 'family_app_events'

function getEvents() {
  const saved = localStorage.getItem(EVENTS_KEY)
  if (saved) return JSON.parse(saved)
  // Initial Mock Data
  return [
    { id: 1, date: '2026-01-10', title: 'サッカーの練習', time: '16:00', type: 'kids' },
    { id: 2, date: '2026-01-14', title: '歯医者さん', time: '10:30', type: 'health' },
    { id: 3, date: '2026-01-15', title: '特売日！買い出し', time: '18:00', type: 'chore' },
    { id: 4, date: '2026-01-20', title: '家族でディナー', time: '19:00', type: 'family' },
    { id: 5, date: '2026-02-03', title: '節分', time: '18:00', type: 'family' }
  ]
}

function saveEvents(data) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(data))
}

// Global state for calendar view (reset on reload is fine for now)
let currentYear = 2026
let currentMonth = 0 // January (0-indexed)
let selectedDate = new Date(2026, 0, 10).toISOString().split('T')[0] // Default select today

// Temporary state for file upload in the form
let tempAttachment = null

export function render() {
  const events = getEvents()

  // Calculate calendar grid
  const firstDay = new Date(currentYear, currentMonth, 1)
  const lastDay = new Date(currentYear, currentMonth + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startDayOfWeek = firstDay.getDay() // 0 = Sun

  // Header Text
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  const displayYearMonth = `${currentYear}年 ${monthNames[currentMonth]}`

  // Filter events for selected day details
  const selectedEvents = events.filter(e => e.date === selectedDate)

  setTimeout(() => {
    // Navigation Handlers
    const prevBtn = document.querySelector('#prev-month')
    const nextBtn = document.querySelector('#next-month')

    if (prevBtn && nextBtn) {
      prevBtn.onclick = () => {
        currentMonth--
        if (currentMonth < 0) { currentMonth = 11; currentYear-- }
        document.querySelector('[data-route=calendar]').click()
      }
      nextBtn.onclick = () => {
        currentMonth++
        if (currentMonth > 11) { currentMonth = 0; currentYear++ }
        document.querySelector('[data-route=calendar]').click()
      }
    }

    // Day Click Handlers
    const days = document.querySelectorAll('.cal-day')
    days.forEach(day => {
      day.onclick = () => {
        const date = day.dataset.date
        if (date) {
          selectedDate = date
          // Reset temp attachment when changing days
          tempAttachment = null
          document.querySelector('[data-route=calendar]').click()
        }
      }
    })

    // File Input Handler
    const fileInput = document.querySelector('#event-file-input')
    const filePreview = document.querySelector('#file-preview-area')

    if (fileInput) {
      fileInput.onchange = async (e) => {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0]

          // Helper to read file
          const readFile = (f) => new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = (ev) => resolve(ev.target.result)
            reader.readAsDataURL(f)
          })

          try {
            if (file.type.startsWith('image/')) {
              // Compress image
              const base64 = await processImage(file, 800, 0.7)
              tempAttachment = { type: 'image', data: base64, name: file.name }
            } else {
              // For PDF etc, limit size
              if (file.size > 500 * 1024) { // 500KB limit
                alert('ファイルサイズが大きすぎます(500KBまで)。\n画像にするか、小さくしてください。')
                fileInput.value = ''
                tempAttachment = null
                if (filePreview) filePreview.innerHTML = ''
                return
              }
              const base64 = await readFile(file)
              tempAttachment = { type: 'file', data: base64, name: file.name }
            }

            // Show preview
            if (filePreview) {
              filePreview.innerHTML = `
                            <div style="font-size: 0.8rem; color: var(--primary-accent); display: flex; align-items: center; gap: 5px; background: #f0fdf4; padding: 5px; border-radius: 4px;">
                                <span>${tempAttachment.type === 'image' ? '📷' : '📎'} ${file.name}</span>
                                <button type="button" onclick="document.querySelector('#event-file-input').value = ''; this.parentElement.remove(); tempAttachment = null;" style="border:none; bg:none; cursor:pointer;">×</button>
                            </div>
                        `
            }

          } catch (err) {
            console.error(err)
            alert('ファイルの読み込みに失敗しました')
          }
        }
      }
    }

    // Add Event Handler
    const addForm = document.querySelector('#add-event-form')
    if (addForm) {
      addForm.onsubmit = (e) => {
        e.preventDefault()
        const titleInput = addForm.querySelector('input[name="title"]')
        const timeInput = addForm.querySelector('input[name="time"]')

        if (!titleInput.value) return

        const newEvent = {
          id: Date.now(),
          date: selectedDate, // Add to currently selected date
          title: titleInput.value,
          time: timeInput.value,
          type: 'family',
          attachment: tempAttachment ? { ...tempAttachment } : null
        }

        events.push(newEvent)
        saveEvents(events)

        // Reset
        tempAttachment = null
        document.querySelector('[data-route=calendar]').click()
      }
    }

    // Delete Event
    const eventList = document.querySelector('.event-list')
    if (eventList) {
      eventList.onclick = (e) => {
        if (e.target.classList.contains('delete-btn')) {
          const id = Number(e.target.dataset.id)
          const idx = events.findIndex(ev => ev.id === id)
          if (idx > -1) {
            events.splice(idx, 1)
            saveEvents(events)
            document.querySelector('[data-route=calendar]').click()
          }
        }
      }
    }

  }, 0)

  // Generate Grid HTML
  let gridHtml = ''
  // Empty slots
  for (let i = 0; i < startDayOfWeek; i++) {
    gridHtml += `<div class="cal-cell empty"></div>`
  }
  // Days
  for (let d = 1; d <= daysInMonth; d++) {
    const year = currentYear;
    const month = String(currentMonth + 1).padStart(2, '0')
    const dayStr = String(d).padStart(2, '0')
    const fullDate = `${year}-${month}-${dayStr}`

    const isSelected = fullDate === selectedDate
    const isToday = fullDate === new Date().toISOString().split('T')[0] // Simple today check (UTC based roughly)

    // Check events
    const daysEvents = events.filter(e => e.date === fullDate)
    const hasEvent = daysEvents.length > 0
    const hasAttachment = daysEvents.some(e => e.attachment)

    gridHtml += `
        <div class="cal-cell cal-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}" data-date="${fullDate}">
            <div class="day-num">${d}</div>
            
            ${hasAttachment ? `<div style="position: absolute; top: 2px; right: 2px; font-size: 0.7rem;">📎</div>` : ''}

            ${hasEvent ? `
                <div class="event-dots">
                    ${daysEvents.slice(0, 3).map(ev =>
      `<div class="dot" style="background: ${getEventColor(ev.type)};"></div>`
    ).join('')}
                </div>
            ` : ''}
        </div>
      `
  }

  function getEventColor(type) {
    if (type === 'kids') return '#ff9f1c'
    if (type === 'health') return '#ff6b6b'
    if (type === 'chore') return '#4ecdc4'
    return '#6366f1' // default
  }

  return `
    <style>
      .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 20px; }
      .cal-header { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 8px; text-align: center; font-size: 0.8rem; font-weight: 700; color: var(--text-muted); }
      .cal-cell { aspect-ratio: 1; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 5px; cursor: pointer; transition: all 0.2s; background: rgba(255,255,255,0.5); font-weight: 500; position: relative; }
      .cal-cell.empty { background: transparent; cursor: default; }
      .cal-cell:hover:not(.empty) { background: white; transform: scale(1.05); z-index: 10; boxShadow: 0 4px 10px rgba(0,0,0,0.1); }
      .cal-cell.selected { background: var(--primary-accent); color: white; box-shadow: 0 4px 12px rgba(255,159,28, 0.4); transform: scale(1.1); z-index: 20; }
      .cal-cell.today { border: 2px solid var(--secondary-accent); }
      .event-dots { display: flex; gap: 2px; margin-top: 4px; }
      .dot { width: 6px; height: 6px; border-radius: 50%; }
      
      .cal-nav-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
      .cal-nav-btn:hover { background: rgba(0,0,0,0.05); }
    </style>

    <div class="calendar-container fade-in">
       <!-- Month Nav -->
       <div class="glass-panel" style="padding: var(--space-md); margin-bottom: var(--space-md); display: flex; justify-content: space-between; align-items: center;">
          <button id="prev-month" class="cal-nav-btn">◀</button>
          <h2 style="margin: 0; font-size: 1.2rem;">${displayYearMonth}</h2>
          <button id="next-month" class="cal-nav-btn">▶</button>
       </div>

      <!-- Calendar Grid -->
      <div class="cal-header">
        <span style="color: #ff6b6b">日</span>
        <span>月</span>
        <span>火</span>
        <span>水</span>
        <span>木</span>
        <span>金</span>
        <span style="color: #4ecdc4">土</span>
      </div>
      <div class="cal-grid">
        ${gridHtml}
      </div>

      <!-- Selected Day Details -->
      <div class="glass-panel" style="padding: var(--space-md);">
        <h3 style="margin-bottom: var(--space-md); font-size: 1.1rem; border-bottom: 2px solid #eee; padding-bottom: 8px;">
            ${new Date(selectedDate).getDate()}日の予定
            <span style="font-size: 0.8rem; font-weight: 500; color: var(--text-muted); margin-left: 8px;">${events.filter(e => e.date === selectedDate).length}件</span>
        </h3>
        
        <div class="event-list" style="display: flex; flex-direction: column; gap: var(--space-md); margin-bottom: var(--space-lg);">
            ${selectedEvents.length > 0 ? selectedEvents.map(ev => `
                <div style="background: white; border-radius: 8px; padding: 10px; border: 1px solid #eee;">
                    <div style="display: flex; align-items: flex-start; gap: 10px;">
                        <div style="background: ${getEventColor(ev.type)}; width: 4px; height: 40px; border-radius: 2px;"></div>
                        <div style="flex: 1;">
                            <div style="font-weight: 700; font-size: 1rem;">${escape(ev.title)}</div>
                            <div style="font-size: 0.85rem; color: var(--text-muted);">🕒 ${ev.time || '終日'}</div>
                        </div>
                        <button class="delete-btn" data-id="${ev.id}" style="border: none; background: none; color: #ccc; font-size: 1.2rem; cursor: pointer;">×</button>
                    </div>

                    ${ev.attachment ? `
                        <div style="margin-top: 10px; background: #f9f9f9; padding: 8px; border-radius: 6px;">
                            ${ev.attachment.type === 'image'
        ? `<div style="font-weight:700; font-size:0.75rem; margin-bottom:4px;">📎 画像添付</div>
                                   <img src="${ev.attachment.data}" style="max-width: 100%; max-height: 150px; border-radius: 4px; border: 1px solid #ddd;">`
        : `<div style="display: flex; align-items: center; gap: 5px; font-size: 0.85rem;">
                                     📄 <span>${ev.attachment.name}</span>
                                     <a href="${ev.attachment.data}" download="${ev.attachment.name}" style="background: #eee; padding: 2px 8px; border-radius: 4px; text-decoration: none; color: #333; font-size: 0.75rem;">DL</a>
                                   </div>`
      }
                        </div>
                    ` : ''}
                </div>
            `).join('') : '<div style="text-align: center; color: var(--text-muted); padding: 10px;">予定はないよ 💤</div>'}
        </div>

        <!-- Add Event Mini Form -->
        <div style="border-top: 2px dashed #eee; padding-top: 15px;">
            <div id="file-preview-area" style="margin-bottom: 5px;"></div>
            <form id="add-event-form" style="display: flex; gap: 8px; align-items: center;">
                <label class="btn" style="background: #f0f0f0; color: #555; padding: 0 10px; height: 38px; display: flex; align-items: center; cursor: pointer;" title="ファイルを添付">
                    📎
                    <input type="file" id="event-file-input" accept="image/*,.pdf" style="display: none;">
                </label>
                <input type="time" name="time" style="width: auto; height: 38px;" required>
                <input type="text" name="title" placeholder="新しい予定" style="flex: 1; height: 38px;" required>
                <button type="submit" class="btn btn-primary" style="padding: 0 1rem; height: 38px;">追加</button>
            </form>
        </div>
      </div>
    </div>
  `
}

