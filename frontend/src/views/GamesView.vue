<template>
  <div class="page">
    <div class="inner">
      <!-- шапка -->
      <div class="header">
        <div class="avatar">DM</div>
        <div class="header-info">
          <div class="header-name">Добро пожаловать, Мастер</div>
          <div class="header-sub">{{ store.games.length }} кампаний</div>
        </div>
        <button class="btn-primary" @click="openCreate">＋ Создать игру</button>
      </div>

      <div class="section-label">Мои кампании</div>

      <!-- ошибка -->
      <div v-if="store.error" class="error-msg">{{ store.error }}</div>

      <!-- загрузка -->
      <div v-else-if="store.loading" class="empty-state">
        <div class="empty-icon">⏳</div>
        <div class="empty-title">Загружаю...</div>
      </div>

      <!-- пусто -->
      <div v-else-if="store.games.length === 0" class="empty-state">
        <div class="empty-icon">🜂</div>
        <div class="empty-title">Пока ни одной игры</div>
        <p class="empty-desc">
          Создай свою первую кампанию как мастер или присоединись к чужой игре по коду от ведущего.
        </p>
        <button class="btn-primary" @click="openCreate">＋ Создать игру</button>
      </div>

      <!-- сетка игр -->
      <div v-else class="games-grid">
        <div
          v-for="game in store.games"
          :key="game.id"
          class="game-card"
          @click="router.push(`/master/${game.id}`)"
        >
          <div class="card-cover">
            <span class="card-glyph">🜂</span>
          </div>
          <div class="card-body">
            <div class="card-title">{{ game.title }}</div>
            <div class="card-system">{{ game.system || 'Система не указана' }}</div>
            <div class="card-footer">
              {{ formatDate(game.created_at) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- модалка создания игры -->
    <Teleport to="body">
      <div v-if="createOpen" class="modal-overlay" @click.self="closeCreate">
        <div class="modal">
          <div class="modal-header">
            <h3>Новая кампания</h3>
            <button class="btn-close" @click="closeCreate">✕</button>
          </div>

          <label class="field-label">Название</label>
          <input
            v-model="form.title"
            autofocus
            class="field-input"
            placeholder="Тени над Гавенвудом"
            @keydown.enter="submitCreate"
          />

          <label class="field-label">Игровая система</label>
          <input
            v-model="form.system"
            class="field-input"
            placeholder="D&D 5e, OSR, самопис..."
            @keydown.enter="submitCreate"
          />

          <div class="modal-actions">
            <button class="btn-primary" :disabled="!form.title.trim() || creating" @click="submitCreate">
              {{ creating ? 'Создаю...' : 'Создать' }}
            </button>
            <button class="btn-secondary" @click="closeCreate">Отмена</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCampaignStore } from '../stores/campaign'

const store = useCampaignStore()
const router = useRouter()

onMounted(() => store.fetchGames())

const createOpen = ref(false)
const creating = ref(false)
const form = ref({ title: '', system: '' })

function openCreate() {
  form.value = { title: '', system: '' }
  createOpen.value = true
}

function closeCreate() {
  createOpen.value = false
}

async function submitCreate() {
  if (!form.value.title.trim() || creating.value) return
  creating.value = true
  try {
    const game = await store.createGame({ title: form.value.title.trim(), system: form.value.system.trim() })
    closeCreate()
    router.push(`/master/${game.id}`)
  } finally {
    creating.value = false
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<style scoped>
.page {
  min-height: 100%;
  background: radial-gradient(120% 70% at 50% -10%, var(--accentBg) 0%, transparent 55%), var(--t0);
  overflow: auto;
}

.inner {
  max-width: 1080px;
  margin: 0 auto;
  padding: 34px 32px 60px;
}

/* шапка */
.header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 34px;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--accentBg);
  border: 1px solid var(--accentBd);
  color: var(--accent);
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.header-info { flex: 1; min-width: 0; }

.header-name {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -.02em;
}

.header-sub {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  letter-spacing: .06em;
  color: var(--t34);
  margin-top: 3px;
}

/* кнопки */
.btn-primary {
  background: var(--accent);
  color: var(--onAccent);
  border: none;
  border-radius: 9px;
  padding: 11px 17px;
  font-size: 13px;
  font-weight: 700;
  transition: background .12s;
}
.btn-primary:hover:not(:disabled) { background: var(--accentH); }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }

.btn-secondary {
  background: var(--t5);
  border: 1px solid var(--t19);
  color: var(--t29);
  border-radius: 9px;
  padding: 11px 17px;
  font-size: 13px;
  font-weight: 500;
  transition: border-color .12s;
}
.btn-secondary:hover { border-color: var(--t20); }

.btn-close {
  background: none;
  border: none;
  color: var(--t34);
  font-size: 16px;
  padding: 4px;
}
.btn-close:hover { color: var(--t28); }

/* метка секции */
.section-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  letter-spacing: .14em;
  color: var(--t34);
  text-transform: uppercase;
  margin-bottom: 16px;
}

/* ошибка */
.error-msg {
  color: #f88;
  background: #3b1111;
  border-radius: 10px;
  padding: 14px 18px;
}

/* пустое состояние */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 64px 20px;
  border: 1px dashed var(--t19);
  border-radius: 16px;
  background: var(--t1);
  gap: 0;
}

.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: var(--accentBg);
  border: 1px solid var(--accentBd);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  margin-bottom: 20px;
}

.empty-title {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -.01em;
  margin-bottom: 8px;
}

.empty-desc {
  margin: 0 0 22px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--t33);
  max-width: 380px;
}

/* сетка карточек */
.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 18px;
}

.game-card {
  background: var(--t1);
  border: 1px solid var(--t16);
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color .12s, transform .12s;
}
.game-card:hover {
  border-color: var(--t21);
  transform: translateY(-2px);
}

.card-cover {
  height: 120px;
  background: var(--accentBg);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.card-glyph {
  font-size: 40px;
  opacity: .6;
}

.card-body {
  padding: 14px 15px 15px;
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -.01em;
  line-height: 1.2;
}

.card-system {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  letter-spacing: .04em;
  color: var(--t34);
  margin-top: 5px;
}

.card-footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--t15);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  color: var(--t35);
}

/* модалка */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: var(--ov4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modal {
  width: 100%;
  max-width: 440px;
  background: var(--t1);
  border: 1px solid var(--t21);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, .6);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.modal-header h3 {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -.01em;
}

.field-label {
  display: block;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  letter-spacing: .1em;
  color: var(--t35);
  text-transform: uppercase;
  margin-bottom: 7px;
}

.field-input {
  display: block;
  width: 100%;
  background: var(--t5);
  border: 1px solid var(--t17);
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--t28);
  font-size: 14px;
  margin-bottom: 18px;
  transition: border-color .12s;
}
.field-input:focus { border-color: var(--t20); }

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 6px;
}
</style>
