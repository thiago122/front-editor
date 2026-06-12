<template>
  <!-- Toast de desfazer (lixeira) -->
  <Transition name="toast">
    <div
      v-if="toast"
      style="
        position: absolute; bottom: 10px; left: 8px; right: 8px;
        background: #1e293b; color: white; border-radius: 8px;
        padding: 8px 10px; font-size: 11px; display: flex;
        align-items: center; justify-content: space-between;
        gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 100;
      "
    >
      <span style="opacity: 0.85">🗑 {{ toast.message }}</span>
      <button
        @click="$emit('undo')"
        style="background:#4f46e5; border:none; color:white; padding:3px 10px;
               border-radius:5px; cursor:pointer; font-size:11px; font-weight:600; flex-shrink:0"
      >Desfazer</button>
    </div>
  </Transition>
</template>

<script setup>
defineProps({
  toast: { type: Object, default: null }, // { message, trashId } | null
})
defineEmits(['undo'])
</script>
