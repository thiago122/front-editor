<script setup>
import { useEditorStore } from '@/stores/EditorStore'

const editorStore = useEditorStore()
// Não extraímos para uma variável local para garantir reatividade total quando o objeto é substituído
</script>

<template>
  <Teleport to="body">
    <Transition name="save-slide">
      <div v-if="editorStore.saveState.active" class="save-status shadow-xl border" :class="`save-status--${editorStore.saveState.status}`">
        <div class="save-header">
          <!-- Icon: Spinner for saving -->
          <div v-if="editorStore.saveState.status === 'saving'" class="save-icon save-icon--spinner"></div>
          <!-- Icon: Check for success -->
          <div v-if="editorStore.saveState.status === 'success'" class="save-icon save-icon--check">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <!-- Icon: X for error -->
          <div v-if="editorStore.saveState.status === 'error'" class="save-icon save-icon--error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
          
          <div class="save-title">
            {{ editorStore.saveState.message }}
          </div>
          
          <!-- Close button for error/success -->
          <button v-if="editorStore.saveState.status !== 'saving'" @click="editorStore.saveState.active = false" class="save-close">
            &times;
          </button>
        </div>

        <div v-if="editorStore.saveState.details.length" class="save-body">
          <ul class="save-details">
            <li v-for="(detail, index) in editorStore.saveState.details" :key="index" :class="{ 'detail-error': detail.startsWith('Erro') }">
              {{ detail }}
            </li>
          </ul>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.save-status {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 300px;
  background: white;
  border-radius: 12px;
  z-index: 10000;
  overflow: hidden;
  font-family: system-ui, -apple-system, sans-serif;
  transition: all 0.3s ease;
}

.save-status--saving { border-color: #e5e7eb; }
.save-status--success { border-color: #bbf7d0; background: #f0fdf4; }
.save-status--error { border-color: #fecaca; background: #fef2f2; }

.save-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 12px;
}

.save-title {
  flex-grow: 1;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.save-status--error .save-title { color: #991b1b; }
.save-status--success .save-title { color: #166534; }

.save-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.save-icon--spinner {
  border: 2px solid #e5e7eb;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: save-spin 0.8s linear infinite;
}

.save-icon--check { color: #22c55e; }
.save-icon--error { color: #ef4444; }

.save-close {
  background: transparent;
  border: none;
  font-size: 18px;
  color: #9ca3af;
  cursor: pointer;
  line-height: 1;
}
.save-close:hover { color: #4b5563; }

.save-body {
  padding: 0 16px 12px 16px;
}

.save-details {
  list-style: none;
  margin: 0;
  padding: 8px;
  background: rgba(0,0,0,0.03);
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  color: #6b7280;
  max-height: 150px;
  overflow-y: auto;
}

.save-details li {
  padding: 2px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.detail-error {
  color: #dc2626;
  font-weight: 500;
}

/* Animations */
@keyframes save-spin {
  to { transform: rotate(360deg); }
}

.save-slide-enter-active,
.save-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.save-slide-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.save-slide-leave-to {
  opacity: 0;
  transform: translateX(40px);
}
</style>
