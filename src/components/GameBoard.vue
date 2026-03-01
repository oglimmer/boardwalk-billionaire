<template>
  <div class="board">
    <BoardSpace v-for="i in 40" :key="i - 1" :index="i - 1" />
    <BoardCenter />
  </div>
</template>

<script setup>
import BoardSpace from './BoardSpace.vue'
import BoardCenter from './BoardCenter.vue'
</script>

<style scoped>
.board { display: grid; grid-template-columns: repeat(11, 62px); grid-template-rows: repeat(11, 62px); gap: 1px; background: #2d2d44; border: 2px solid #444; flex-shrink: 0; }
</style>
