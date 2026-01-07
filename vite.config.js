import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 請確認您的 GitHub Repo 名稱是否為 "handbook"
  // 如果是其他名稱，請修改這裡，前後都要有斜線
  base: '/handbook/', 
})