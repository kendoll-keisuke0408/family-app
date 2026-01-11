import { defineConfig } from 'vite'

export default defineConfig({
    base: '/family-app/',
    build: {
        outDir: 'dist',
        rollupOptions: {
            output: {
                entryFileNames: `assets/[name].[hash].${Date.now()}.js`,
                chunkFileNames: `assets/[name].[hash].${Date.now()}.js`,
                assetFileNames: `assets/[name].[hash].${Date.now()}.[ext]`
            }
        }
    }
})
