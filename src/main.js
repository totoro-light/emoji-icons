import emojiData from 'unicode-emoji-json/data-by-group.json'
import './style.css'

// Skip "Component" — those are bare skin-tone modifiers, not usable standalone
const ALL_CATEGORIES = Object.keys(emojiData).filter(c => c !== 'Component')

// ─── Theme ────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'emoji-icons-theme'

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function getTheme() {
  return localStorage.getItem(STORAGE_KEY) // 'dark' | 'light' | null
}

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.classList.toggle('light', theme === 'light')
}

function initTheme() {
  const saved = getTheme()
  applyTheme(saved ?? (systemPrefersDark() ? 'dark' : 'light'))
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark')
    || (!document.documentElement.classList.contains('light') && systemPrefersDark())
  const next = isDark ? 'light' : 'dark'
  localStorage.setItem(STORAGE_KEY, next)
  applyTheme(next)
  updateThemeIcon()
}

function updateThemeIcon() {
  const btn = document.getElementById('theme-btn')
  if (!btn) return
  const isDark = document.documentElement.classList.contains('dark')
    || (!document.documentElement.classList.contains('light') && systemPrefersDark())
  btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode')
  btn.innerHTML = isDark ? SUN_ICON : MOON_ICON
}

const MOON_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg>`
const SUN_ICON  = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm0-2a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM11 1h2v3h-2V1zm0 19h2v3h-2v-3zM3.515 4.929l1.414-1.414L7.05 5.636 5.636 7.05 3.515 4.929zM16.95 18.364l1.414-1.414 2.121 2.121-1.414 1.414-2.121-2.121zm2.121-14.85 1.414 1.415-2.121 2.121-1.414-1.414 2.121-2.121zM5.636 16.95l1.414 1.414-2.121 2.121-1.414-1.414 2.121-2.121zM23 11v2h-3v-2h3zM4 11v2H1v-2h3z"/></svg>`

initTheme()

let activeCategory = 'all'
let searchQuery = ''
let toastTimer = null

// ─── Recent ───────────────────────────────────────────────────────────────────

const RECENT_KEY = 'emoji-icons-recent'
const RECENT_MAX = 16

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) ?? [] } catch { return [] }
}

function saveRecent(list) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(list))
}

function addRecent(emoji) {
  const list = [emoji, ...getRecent().filter(e => e !== emoji)].slice(0, RECENT_MAX)
  saveRecent(list)
  renderRecent()
}

function removeRecent(emoji) {
  saveRecent(getRecent().filter(e => e !== emoji))
  renderRecent()
}

function clearRecent() {
  saveRecent([])
  renderRecent()
}

function renderRecent() {
  const container = document.getElementById('recent')
  if (!container) return
  const list = getRecent()
  if (list.length === 0) {
    container.hidden = true
    container.innerHTML = ''
    return
  }
  container.hidden = false
  container.innerHTML = `
    <section class="category-section recent-section">
      <div class="recent-header">
        <h2 class="category-title">Recently Used</h2>
        <button class="recent-clear-btn" id="recent-clear">Clear all</button>
      </div>
      <div class="emoji-grid">
        ${list.map(emoji => `
          <div class="recent-item">
            <button class="emoji-btn" data-emoji="${escapeHtml(emoji)}" aria-label="${escapeHtml(emoji)}">${emoji}</button>
            <button class="recent-remove" data-emoji="${escapeHtml(emoji)}" aria-label="Remove ${escapeHtml(emoji)}">✕</button>
          </div>
        `).join('')}
      </div>
    </section>
  `
  document.getElementById('recent-clear').addEventListener('click', clearRecent)
  container.querySelectorAll('.recent-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation()
      removeRecent(btn.dataset.emoji)
    })
  })
  container.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => copyEmoji(btn.dataset.emoji))
  })
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function showToast(msg) {
  const toast = document.getElementById('toast')
  toast.textContent = msg
  toast.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1600)
}

// ─── Copy ─────────────────────────────────────────────────────────────────────

async function copyEmoji(emoji) {
  try {
    await navigator.clipboard.writeText(emoji)
    addRecent(emoji)
    showToast(`${emoji}  Copied!`)
  } catch {
    showToast('Copy failed — try again')
  }
}

// ─── Filter ───────────────────────────────────────────────────────────────────

function getFilteredData() {
  const cats = activeCategory === 'all' ? ALL_CATEGORIES : [activeCategory]
  const q = searchQuery

  const result = {}
  for (const cat of cats) {
    const emojis = emojiData[cat]
    const filtered = q
      ? emojis.filter(e =>
          e.name.includes(q) ||
          e.slug.replace(/_/g, ' ').includes(q)
        )
      : emojis
    if (filtered.length > 0) result[cat] = filtered
  }
  return result
}

// ─── Render grid ──────────────────────────────────────────────────────────────

function renderGrid() {
  const main = document.getElementById('main')
  const data = getFilteredData()
  const total = Object.values(data).reduce((sum, a) => sum + a.length, 0)

  if (total === 0) {
    main.innerHTML = `<p class="empty">No emojis found for "<strong>${escapeHtml(searchQuery)}</strong>"</p>`
    return
  }

  main.innerHTML = Object.entries(data).map(([cat, emojis]) => `
    <section class="category-section">
      <h2 class="category-title">${escapeHtml(cat)}</h2>
      <div class="emoji-grid">
        ${emojis.map(e => `
          <button class="emoji-btn" title="${escapeHtml(e.name)}" data-emoji="${escapeHtml(e.emoji)}" aria-label="${escapeHtml(e.name)}">
            ${e.emoji}
          </button>
        `).join('')}
      </div>
    </section>
  `).join('')
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  const app = document.getElementById('app')

  app.innerHTML = `
    <header class="header" id="header">
      <div class="header-inner">
        <span class="site-title">Emoji Icons</span>
        <div class="search-wrapper">
          <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M9 3a6 6 0 1 0 3.75 10.73l3.26 3.26a.75.75 0 1 0 1.06-1.06l-3.26-3.26A6 6 0 0 0 9 3Zm-4.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0Z" clip-rule="evenodd"/>
          </svg>
          <input
            type="search"
            id="search"
            class="search-input"
            placeholder="Search emojis…"
            autocomplete="off"
            spellcheck="false"
            aria-label="Search emojis"
          />
          <button class="search-clear" id="search-clear" aria-label="Clear search" hidden>✕</button>
        </div>
        <button class="theme-btn" id="theme-btn" aria-label="Toggle theme"></button>
      </div>
    </header>

    <nav class="cat-nav" id="cat-nav" aria-label="Emoji categories">
      <button class="cat-btn active" data-cat="all">All</button>
      ${ALL_CATEGORIES.map(c => `
        <button class="cat-btn" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>
      `).join('')}
    </nav>

    <div id="recent" class="main" style="padding-bottom:0" hidden></div>
    <main id="main" class="main"></main>

    <div id="toast" class="toast" role="status" aria-live="polite"></div>
  `

  // Theme toggle
  document.getElementById('theme-btn').addEventListener('click', toggleTheme)
  updateThemeIcon()

  // Adjust cat-nav sticky top to sit just below the header
  const header = document.getElementById('header')
  const catNav = document.getElementById('cat-nav')
  const ro = new ResizeObserver(() => {
    catNav.style.top = header.offsetHeight + 'px'
  })
  ro.observe(header)

  // Search
  const searchInput = document.getElementById('search')
  const searchClear = document.getElementById('search-clear')

  searchInput.addEventListener('input', e => {
    searchQuery = e.target.value.toLowerCase().trim()
    searchClear.hidden = searchQuery.length === 0
    renderGrid()
  })

  searchClear.addEventListener('click', () => {
    searchInput.value = ''
    searchQuery = ''
    searchClear.hidden = true
    searchInput.focus()
    renderGrid()
  })

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && searchQuery) {
      searchInput.value = ''
      searchQuery = ''
      searchClear.hidden = true
      renderGrid()
    }
    // Focus search on any printable key (when not already in input)
    if (document.activeElement !== searchInput && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
      searchInput.focus()
    }
  })

  // Category filter
  catNav.addEventListener('click', e => {
    const btn = e.target.closest('.cat-btn')
    if (!btn) return
    catNav.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    activeCategory = btn.dataset.cat
    renderGrid()
    document.getElementById('main').scrollIntoView({ behavior: 'smooth', block: 'start' })
  })

  // Emoji copy via event delegation
  document.getElementById('main').addEventListener('click', e => {
    const btn = e.target.closest('.emoji-btn')
    if (btn) copyEmoji(btn.dataset.emoji)
  })

  renderRecent()
  renderGrid()
  searchInput.focus()
}

document.addEventListener('DOMContentLoaded', init)
