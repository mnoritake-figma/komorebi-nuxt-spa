export default defineNuxtConfig({
  compatibilityDate: '2026-10-15',
  ssr: false,
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  runtimeConfig: { public: { supabaseUrl: '', supabaseKey: '' } },
  app: { head: { title: 'komorebi — 日々を、ひとこと。', htmlAttrs: { lang: 'ja' }, meta: [{ name: 'description', content: '小さな発見や日々のことを、気軽にシェアするSNS。' }] } }
})
