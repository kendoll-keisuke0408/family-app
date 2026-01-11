import { saveData, subscribeData } from './dataSync.js'

const USERS_KEY = 'family_app_users'
const PIN_KEY = 'family_app_pin'
const CURRENT_USER_ID_KEY = 'family_app_current_user_id'

// Default Data
const DEFAULT_USERS = [
    { id: 'mama', name: 'ママ', icon: '👩', role: 'admin' },
    { id: 'papa', name: 'パパ', icon: '👨', role: 'admin' },
    { id: 'kid1', name: 'さくら', icon: '👧', role: 'child' },
]

// Start syncing users in the background
subscribeData(USERS_KEY, (data) => {
    // If we get new data from cloud, we just let it sit in LocalStorage (subscribeData handles this internally usually?)
    // Ah, wait. My subscribeData implementation ALREADY updates LocalStorage before calling callback.
    // So we don't strictly need to do anything here unless we want to trigger a UI refresh.
    // However, if the current user was deleted remotely, we might have issues.
    // For now, silent sync is fine. The next time getUsers() is called, it will be fresh.
    console.log('👥 Users synced')
})


// Get all users
export function getUsers() {
    const saved = localStorage.getItem(USERS_KEY)
    if (saved) return JSON.parse(saved)
    // Initialize if empty
    // If we are offline and first run, save default.
    // BUT, we should use saveData to push defaults to cloud if possible.
    saveData(USERS_KEY, DEFAULT_USERS)
    return DEFAULT_USERS
}

// Save users
export function saveUsers(users) {
    saveData(USERS_KEY, users)
}


// Add a user
export function addUser(name, icon) {
    const users = getUsers()
    const newUser = {
        id: 'user_' + Date.now(),
        name,
        icon,
        role: 'member'
    }
    users.push(newUser)
    saveUsers(users)
    return newUser
}

// Update a user
export function updateUser(id, newData) {
    let users = getUsers()
    users = users.map(u => u.id === id ? { ...u, ...newData } : u)
    saveUsers(users)
}

// Remove a user
export function removeUser(id) {
    let users = getUsers()
    // Prevent deleting the last user
    if (users.length <= 1) {
        throw new Error('LAST_USER')
    }
    users = users.filter(u => u.id !== id)
    saveUsers(users)
}

// Get PIN
export function getAppPin() {
    return localStorage.getItem(PIN_KEY) || '0000'
}

// Set PIN
export function setAppPin(newPin) {
    localStorage.setItem(PIN_KEY, newPin)
}

// Current User Management
export function getCurrentUser() {
    const users = getUsers()
    const currentId = localStorage.getItem(CURRENT_USER_ID_KEY)
    return users.find(u => u.id === currentId) || users[0]
}

export function setCurrentUser(id) {
    // Update Last Login
    let users = getUsers()
    const idx = users.findIndex(u => u.id === id)
    if (idx > -1) {
        users[idx].lastLogin = new Date().toISOString()
        saveUsers(users)
    }

    localStorage.setItem(CURRENT_USER_ID_KEY, id)
    window.location.reload() // Reload to reflect changes globally
}
