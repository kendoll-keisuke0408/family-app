
import { defineConfig } from 'vite'

export default defineConfig({
    // GitHub Pagesでサブディレクトリ（リポジトリ名）にデプロイする場合、ここを '/リポジトリ名/' にします。
    // 例: https://username.github.io/family-app/ なら base: '/family-app/'
    // 一旦ルート設定にしておきますが、必要に応じて変更してください。
    base: './',
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false
    },
    server: {
        host: true
    }
})
