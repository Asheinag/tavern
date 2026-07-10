<template>
  <div class="page">
    <div class="inner">
      <div class="topbar">
        <button class="btn-back" @click="router.push('/games')">← Кампании</button>
      </div>

      <div class="tabs">
        <button :class="['tab', { active: tab === 'profile' }]" @click="tab = 'profile'">
          Профиль
        </button>
        <button :class="['tab', { active: tab === 'characters' }]" @click="tab = 'characters'">
          Персонажи
        </button>
        <button
          v-if="isAdmin"
          :class="['tab', { active: tab === 'invites' }]"
          @click="tab = 'invites'"
        >
          Инвайты
        </button>
      </div>

      <!-- ── Профиль ──────────────────────────────────────────────────────── -->
      <div v-if="tab === 'profile'" class="section">
        <div class="avatar-wrap">
          <div class="avatar-big">
            <img v-if="authStore.user?.avatar" :src="authStore.user.avatar" class="avatar-img" />
            <span v-else>{{ initials }}</span>
          </div>
          <label class="btn-secondary avatar-upload-btn">
            Сменить фото
            <input type="file" accept="image/*" hidden @change="onAvatarChange" />
          </label>
        </div>

        <label class="field-label">Имя пользователя</label>
        <input v-model="profileForm.username" class="field-input" />

        <label class="field-label">О себе</label>
        <textarea v-model="profileForm.bio" class="field-input field-textarea" rows="3" />

        <div class="form-actions">
          <button class="btn-primary" :disabled="savingProfile" @click="saveProfile">
            {{ savingProfile ? 'Сохраняю...' : 'Сохранить' }}
          </button>
          <span v-if="profileSaved" class="saved-hint">Сохранено</span>
        </div>
      </div>

      <!-- ── Персонажи ───────────────────────────────────────────────────── -->
      <div v-if="tab === 'characters'" class="section">
        <div class="section-header">
          <span class="section-title">Мои персонажи</span>
          <button class="btn-primary btn-sm" @click="openCreateChar">+ Новый</button>
        </div>

        <div v-if="charStore.loading" class="empty-state">Загружаю...</div>

        <div v-else-if="charStore.characters.length === 0" class="empty-state">
          Персонажей пока нет
        </div>

        <div v-else class="char-list">
          <div v-for="char in charStore.characters" :key="char.id" class="char-row">
            <div class="char-avatar">
              <img v-if="char.avatar" :src="char.avatar" class="avatar-img" />
              <span v-else>{{ char.name.slice(0, 2) }}</span>
            </div>
            <div class="char-info">
              <div class="char-name">{{ char.name }}</div>
              <div class="char-bio">{{ char.bio || 'Без описания' }}</div>
            </div>
            <div class="char-actions">
              <button class="btn-icon" title="Редактировать" @click="openEditChar(char)">✎</button>
              <button class="btn-icon btn-danger" title="Удалить" @click="deleteChar(char.id)">
                ✕
              </button>
            </div>
          </div>
        </div>

        <!-- Модалка создания/редактирования персонажа -->
        <Teleport to="body">
          <div v-if="charModalOpen" class="modal-overlay" @click.self="closeCharModal">
            <div class="modal">
              <div class="modal-header">
                <h3>{{ editingCharId ? 'Редактировать персонажа' : 'Новый персонаж' }}</h3>
                <button class="btn-close" @click="closeCharModal">✕</button>
              </div>
              <label class="field-label">Имя персонажа</label>
              <input v-model="charForm.name" class="field-input" autofocus />
              <label class="field-label">Описание / предыстория</label>
              <textarea v-model="charForm.bio" class="field-input field-textarea" rows="4" />
              <div class="modal-actions">
                <button
                  class="btn-primary"
                  :disabled="!charForm.name.trim() || savingChar"
                  @click="submitChar"
                >
                  {{ savingChar ? 'Сохраняю...' : editingCharId ? 'Сохранить' : 'Создать' }}
                </button>
                <button class="btn-secondary" @click="closeCharModal">Отмена</button>
              </div>
            </div>
          </div>
        </Teleport>
      </div>

      <!-- ── Инвайты ─────────────────────────────────────────────────────── -->
      <div v-if="tab === 'invites'" class="section">
        <div class="section-header">
          <span class="section-title">Инвайт-коды</span>
          <button class="btn-primary btn-sm" @click="generateInvite">+ Создать</button>
        </div>

        <div v-if="charStore.invites.length === 0" class="empty-state">Кодов пока нет</div>

        <div v-else class="invite-list">
          <div v-for="inv in charStore.invites" :key="inv.id" class="invite-row">
            <code class="invite-code">{{ inv.code }}</code>
            <span :class="['invite-status', inv.used_by ? 'used' : 'free']">
              {{ inv.used_by ? 'Использован' : 'Свободен' }}
            </span>
            <span class="invite-date">{{ formatDate(inv.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCharactersStore } from '../stores/characters'
import type { Character } from '../api/characters'

const router = useRouter()
const authStore = useAuthStore()
const charStore = useCharactersStore()

const tab = ref<'profile' | 'characters' | 'invites'>('profile')
const isAdmin = computed(() => authStore.user?.system_role === 'admin' || authStore.user?.system_role === 'moderator')
const initials = computed(() => authStore.user?.username?.slice(0, 2).toUpperCase() ?? '??')

// ── Профиль ───────────────────────────────────────────────────────────────────

const profileForm = ref({
  username: authStore.user?.username ?? '',
  bio: authStore.user?.bio ?? '',
})
const savingProfile = ref(false)
const profileSaved = ref(false)

async function saveProfile() {
  savingProfile.value = true
  try {
    // TODO: PATCH /api/auth/me когда добавим эндпоинт редактирования профиля
    profileSaved.value = true
    setTimeout(() => (profileSaved.value = false), 2000)
  } finally {
    savingProfile.value = false
  }
}

async function onAvatarChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  await authStore.uploadAvatar(file)
}

// ── Персонажи ─────────────────────────────────────────────────────────────────

const charModalOpen = ref(false)
const editingCharId = ref<number | null>(null)
const savingChar = ref(false)
const charForm = ref({ name: '', bio: '' })

function openCreateChar() {
  editingCharId.value = null
  charForm.value = { name: '', bio: '' }
  charModalOpen.value = true
}

function openEditChar(char: Character) {
  editingCharId.value = char.id
  charForm.value = { name: char.name, bio: char.bio ?? '' }
  charModalOpen.value = true
}

function closeCharModal() {
  charModalOpen.value = false
}

async function submitChar() {
  if (!charForm.value.name.trim() || savingChar.value) return
  savingChar.value = true
  try {
    if (editingCharId.value) {
      await charStore.updateCharacter(editingCharId.value, {
        name: charForm.value.name.trim(),
        bio: charForm.value.bio.trim() || null,
      })
    } else {
      await charStore.createCharacter(charForm.value.name.trim(), charForm.value.bio.trim())
    }
    closeCharModal()
  } finally {
    savingChar.value = false
  }
}

async function deleteChar(id: number) {
  await charStore.removeCharacter(id)
}

// ── Инвайты ───────────────────────────────────────────────────────────────────

async function generateInvite() {
  await charStore.createInvite()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

onMounted(async () => {
  await charStore.fetchCharacters()
  if (isAdmin.value) await charStore.fetchInvites()
})
</script>

<style scoped>
.page {
  min-height: 100%;
  background: radial-gradient(120% 70% at 50% -10%, var(--accentBg) 0%, transparent 55%), var(--t0);
  overflow: auto;
}

.inner {
  max-width: 680px;
  margin: 0 auto;
  padding: 28px 32px 60px;
}

.topbar {
  margin-bottom: 24px;
}

.btn-back {
  background: none;
  border: none;
  color: var(--t34);
  font-size: 13px;
  cursor: pointer;
  padding: 0;
}
.btn-back:hover { color: var(--t28); }

.tabs {
  display: flex;
  gap: 4px;
  background: var(--t5);
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 28px;
  width: fit-content;
}

.tab {
  padding: 8px 18px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--t34);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.tab.active {
  background: var(--t1);
  color: var(--t28);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

.section { max-width: 520px; }

/* Профиль */
.avatar-wrap {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 28px;
}

.avatar-big {
  width: 72px;
  height: 72px;
  border-radius: 16px;
  background: var(--accentBg);
  border: 1px solid var(--accentBd);
  color: var(--accent);
  font-weight: 700;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex: none;
}

.avatar-img { width: 100%; height: 100%; object-fit: cover; }

.avatar-upload-btn {
  cursor: pointer;
  padding: 9px 14px;
  font-size: 13px;
}

.field-label {
  display: block;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.1em;
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
  margin-bottom: 16px;
  transition: border-color 0.12s;
  box-sizing: border-box;
}
.field-input:focus { border-color: var(--t20); outline: none; }

.field-textarea { resize: vertical; min-height: 80px; font-family: inherit; }

.form-actions { display: flex; align-items: center; gap: 14px; margin-top: 4px; }

.saved-hint {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: var(--accent);
}

/* Секции */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
}

/* Персонажи */
.char-list { display: flex; flex-direction: column; gap: 10px; }

.char-row {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--t1);
  border: 1px solid var(--t16);
  border-radius: 12px;
  padding: 12px 14px;
}

.char-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--accentBg);
  border: 1px solid var(--accentBd);
  color: var(--accent);
  font-weight: 700;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex: none;
}

.char-info { flex: 1; min-width: 0; }

.char-name { font-weight: 600; font-size: 14px; }

.char-bio {
  font-size: 12px;
  color: var(--t34);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.char-actions { display: flex; gap: 6px; flex: none; }

/* Инвайты */
.invite-list { display: flex; flex-direction: column; gap: 8px; }

.invite-row {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--t1);
  border: 1px solid var(--t16);
  border-radius: 10px;
  padding: 10px 14px;
}

.invite-code {
  flex: 1;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  color: var(--accent);
  word-break: break-all;
}

.invite-status {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 5px;
  flex: none;
}
.invite-status.free { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
.invite-status.used { background: var(--t5); color: var(--t34); }

.invite-date {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  color: var(--t35);
  flex: none;
}

/* Кнопки */
.btn-primary {
  background: var(--accent);
  color: var(--onAccent);
  border: none;
  border-radius: 9px;
  padding: 11px 17px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.12s;
}
.btn-primary:hover:not(:disabled) { background: var(--accentH); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary.btn-sm { padding: 7px 12px; font-size: 12px; }

.btn-secondary {
  background: var(--t5);
  border: 1px solid var(--t19);
  color: var(--t29);
  border-radius: 9px;
  padding: 11px 17px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.12s;
}
.btn-secondary:hover { border-color: var(--t20); }

.btn-icon {
  background: var(--t5);
  border: 1px solid var(--t16);
  border-radius: 7px;
  color: var(--t34);
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.12s;
}
.btn-icon:hover { background: var(--t8); }
.btn-icon.btn-danger:hover { color: #f88; border-color: #f88; }

.btn-close {
  background: none;
  border: none;
  color: var(--t34);
  font-size: 16px;
  padding: 4px;
  cursor: pointer;
}
.btn-close:hover { color: var(--t28); }

/* Модалка */
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
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.6);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.modal-header h3 { margin: 0; font-size: 19px; font-weight: 700; }

.modal-actions { display: flex; gap: 10px; margin-top: 6px; }

.empty-state {
  padding: 32px;
  text-align: center;
  color: var(--t34);
  font-size: 14px;
  border: 1px dashed var(--t19);
  border-radius: 12px;
}
</style>
