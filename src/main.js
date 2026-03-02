import emojiData from 'unicode-emoji-json/data-by-group.json'
import './style.css'

// Skip "Component" — those are bare skin-tone modifiers, not usable standalone
const ALL_CATEGORIES = Object.keys(emojiData).filter(c => c !== 'Component')

let activeCategory = 'all'
let searchQuery = ''
let toastTimer = null

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
      </div>
    </header>

    <nav class="cat-nav" id="cat-nav" aria-label="Emoji categories">
      <button class="cat-btn active" data-cat="all">All</button>
      ${ALL_CATEGORIES.map(c => `
        <button class="cat-btn" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>
      `).join('')}
    </nav>

    <main id="main" class="main"></main>

    <div id="toast" class="toast" role="status" aria-live="polite"></div>
  `

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

  renderGrid()
  searchInput.focus()
}

document.addEventListener('DOMContentLoaded', init)
