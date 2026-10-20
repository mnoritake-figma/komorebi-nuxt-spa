<script setup lang="ts">
import { createClient, type User } from '@supabase/supabase-js'
import { Leaf, House, Search, Heart, UserRound, Plus, ArrowUpRight, RefreshCw, Trash2, Globe } from 'lucide-vue-next'
type Post = { id: string; user_id: string; author: string; content: string; created_at: string; likes: { user_id: string }[] }
const config = useRuntimeConfig()
const db = config.public.supabaseUrl && config.public.supabaseKey ? createClient(config.public.supabaseUrl, config.public.supabaseKey) : null
const demo = ref(!db), user = ref<User | null>(null), posts = ref<Post[]>([]), text = ref(''), name = ref(''), query = ref(''), tab = ref('home'), busy = ref(false), loading = ref(false), notice = ref(''), error = ref(''), composer = ref<HTMLTextAreaElement>()
const uid = computed(() => demo.value ? 'demo-me' : user.value?.id)
const count = computed(() => Array.from(text.value).length)
const filtered = computed(() => posts.value.filter(p => (tab.value !== 'likes' || p.likes.some(l => l.user_id === uid.value)) && (tab.value !== 'profile' || p.user_id === uid.value) && `${p.author} ${p.content}`.toLowerCase().includes(query.value.toLowerCase())))
const title = computed(() => ({home:'ホーム',search:'見つける',likes:'いいね',profile:'マイプロフィール'}[tab.value]))
const tags = computed(() => [...new Set(posts.value.flatMap(p => p.content.match(/#[^\s#。、！]+/gu) || []))].slice(0,5))
function seed(): Post[] { return [
 ['山田 はる','haru','朝のコーヒーを淹れて、窓を開ける。\n少し涼しくなった風が気持ちいい。今日もいい一日になりますように。 ☕\n\n#日々のこと #朝時間'],
 ['青木 そら','sora','小さな「できた」を大切にしたい。\nずっと作りたかったアプリが、少しずつ形になってきました 🌱\n\n#ものづくり'],
 ['木村 なつ','natsu','帰り道、いつもと違う道を歩いたら素敵な本屋さんを発見。\n寄り道する余白って、大事ですね。\n\n#小さな発見 #読書']
 ].map((p,i) => ({id:`sample-${i}`,user_id:p[1]!,author:p[0]!,content:p[2]!,created_at:new Date(Date.now()-i*3600000-300000).toISOString(),likes:[]})) }
function saveDemo() { try { localStorage.setItem('komorebi-posts', JSON.stringify(posts.value)) } catch { notice.value = 'このブラウザではデータを保存できません。' } }
function startDemo() { demo.value=true; error.value=''; try { const saved=JSON.parse(localStorage.getItem('komorebi-posts') || 'null'); posts.value=Array.isArray(saved) && saved.every(p=>typeof p.content==='string' && Array.isArray(p.likes)) ? saved : seed() } catch { posts.value=seed() } }
async function load() { if(demo.value) return; loading.value=true; error.value=''; try { const {data,error:e}=await db!.from('posts').select('*, likes(user_id)').order('created_at',{ascending:false}).limit(100); if(e) throw e; posts.value=data || [] } catch(e:any) { error.value=e.code==='PGRST205' ? 'データベースの準備が必要です。SupabaseのSQL Editorで ../supabase/schema.sql を実行してください。' : `投稿を取得できませんでした: ${e.message}` } finally { loading.value=false } }
let guestSession: Promise<boolean> | null = null
async function authenticated(): Promise<boolean> {
 if(uid.value) return true
 if(!db) return false
 if(guestSession) return guestSession
 guestSession=(async()=>{
  try {
   const {data,error:e}=await db.auth.signInAnonymously()
   if(e) throw e
   user.value=data.user
   return !!data.user
  } catch(e:any) {
   error.value=e.code==='anonymous_provider_disabled'
    ? '投稿の準備が必要です。Supabaseで「Allow anonymous sign-ins」を有効にしてください。'
    : `投稿の準備ができませんでした: ${e.message}`
   return false
  }
 })()
 try { return await guestSession } finally { guestSession=null }
}
async function publish() { if(!text.value.trim() || count.value>280 || busy.value) return; busy.value=true; error.value=''; if(!await authenticated()) { busy.value=false; return } const p={user_id:uid.value!,author:name.value.trim() || '名もなき散歩人',content:text.value.trim()}; try { if(demo.value) { posts.value.unshift({...p,id:crypto.randomUUID(),created_at:new Date().toISOString(),likes:[]});saveDemo() } else { const {error:e}=await db!.from('posts').insert(p); if(e) throw e; await load() } text.value=''; notice.value='投稿しました。'; tab.value='home' } catch(e:any) { error.value=`投稿できませんでした: ${e.message}` } finally { busy.value=false } }
const pending = ref(new Set<string>())
async function like(p:Post) { if(pending.value.has(p.id)) return; pending.value.add(p.id); error.value=''; if(!await authenticated()) { pending.value.delete(p.id); return } const liked=p.likes.some(l=>l.user_id===uid.value); try { if(!demo.value) { const result=liked ? await db!.from('likes').delete().eq('post_id',p.id).eq('user_id',uid.value!) : await db!.from('likes').insert({post_id:p.id,user_id:uid.value!}); if(result.error) throw result.error } p.likes=liked?p.likes.filter(l=>l.user_id!==uid.value):[...p.likes,{user_id:uid.value!}]; if(demo.value) saveDemo() } catch(e:any) { error.value=`いいねを更新できませんでした: ${e.message}` } finally { pending.value.delete(p.id) } }
async function remove(p:Post) { if(!confirm('この投稿を削除しますか？')) return; try { if(!demo.value) { const {error:e}=await db!.from('posts').delete().eq('id',p.id).eq('user_id',uid.value!); if(e) throw e } posts.value=posts.value.filter(x=>x.id!==p.id); if(demo.value) saveDemo() } catch(e:any) { error.value=e.message } }
function when(date:string) { return new Intl.DateTimeFormat('ja-JP',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(date)) }
let unsubscribe: (()=>void) | undefined
onMounted(async()=>{ if(demo.value) startDemo(); else { const {data,error:e}=await db!.auth.getSession(); if(e) error.value=e.message; user.value=data.session?.user || null; const {data:listener}=db!.auth.onAuthStateChange((_event,session)=>{user.value=session?.user || null}); unsubscribe=()=>listener.subscription.unsubscribe(); await load() } })
onBeforeUnmount(()=>unsubscribe?.())
</script>

<template>
 <div class="layout">
  <aside class="sidebar">
   <a class="brand" href="/" aria-label="komorebi ホーム"><span class="brand-icon"><Leaf :size="23" /></span>komorebi<span class="brand-dot">.</span></a>
   <p class="tagline">日々を、ひとこと。</p>
   <nav aria-label="メインナビゲーション">
    <button v-for="item in [{id:'home',label:'ホーム',icon:House},{id:'search',label:'見つける',icon:Search},{id:'likes',label:'いいね',icon:Heart},{id:'profile',label:'プロフィール',icon:UserRound}]" :key="item.id" :aria-label="item.label" :class="{active:tab===item.id}" @click="tab=item.id; query=''" :aria-current="tab===item.id?'page':undefined"><component :is="item.icon" :size="21"/><span>{{ item.label }}</span><i v-if="tab===item.id"/></button>
   </nav>
   <button class="primary new-post" @click="tab='home'; composer?.focus()"><Plus :size="19"/><span>投稿する</span></button>
   <div class="sidebar-bottom"><div class="connection"><span/>{{ demo ? 'デモモード' : 'Supabaseに接続' }}</div><button class="account" @click="tab='profile'"><span class="avatar mint">{{ (name || '私').slice(0,1) }}</span><span><strong>{{ name || (uid?'散歩人':'ゲスト') }}</strong><small>ログイン不要で参加できます</small></span></button></div>
  </aside>
  <main>
   <header class="page-header"><div><span class="eyebrow">YOUR DAILY LITTLE MOMENTS</span><h1>{{ title }}</h1></div><button class="icon-button" aria-label="タイムラインを更新" @click="load"><RefreshCw :size="18" :class="{spin:loading}"/></button></header>
   <section class="welcome"><div><span class="eyebrow">HELLO, LITTLE WORLD</span><h2>何気ない日々に、<br>小さなつながりを。</h2><p>思いついたこと、見つけたこと。<br>あなたの今日を、ここに置いていこう。</p></div><div class="botanical" aria-hidden="true"><span class="sun"/><Leaf :size="110" :stroke-width="0.8"/><span class="botanical-caption">take a little breath.</span></div></section>
   <div v-if="error" class="message error" role="alert">{{ error }}<button v-if="!demo" @click="startDemo">デモで試す →</button></div>
   <div v-if="notice" class="message" role="status">{{ notice }}<button aria-label="通知を閉じる" @click="notice=''">×</button></div>
   <div v-if="demo" class="demo-note">デモ表示中 · 投稿はこのブラウザにのみ保存されます。<button v-if="db" @click="demo=false; posts=[]; load()">本番に戻る</button></div>
   <section v-if="tab==='home'" class="composer"><span class="avatar mint">{{ (name || '私').slice(0,1) }}</span><form @submit.prevent="publish"><input v-model="name" class="name-input" maxlength="40" aria-label="投稿の表示名" placeholder="あなたの表示名"><textarea ref="composer" v-model="text" placeholder="いま、どんなことを考えてる？" aria-label="投稿内容"/><p class="composer-hint">投稿する前に、内容と公開範囲をもう一度確認してください</p><div class="composer-footer"><span><Globe :size="13"/>みんなに公開</span><div><small :class="{over:count>280}">{{ count }} / 280</small><button class="primary" :disabled="busy || !text.trim() || count>280" type="submit">{{ busy?'投稿中…':'投稿する' }}<ArrowUpRight :size="16"/></button></div></div></form></section>
   <div class="feed-heading"><h3>{{ tab==='home'?'タイムライン':title }}</h3><span>{{ filtered.length }} posts</span></div>
   <label v-if="tab==='search'" class="search-box inline-search"><Search :size="18"/><input v-model="query" placeholder="キーワードや #タグで検索" aria-label="投稿を検索"></label>
   <div v-if="loading" class="empty">読み込み中…</div>
   <div v-else-if="!filtered.length" class="empty"><Leaf :size="30"/><h3>{{ query?'投稿が見つかりませんでした':'まだ投稿がありません' }}</h3><p>{{ tab==='likes'?'気になった投稿に、ハートを送ってみよう。':'最初のひとことから、はじめてみよう。' }}</p></div>
   <article v-for="(post,index) in filtered" :key="post.id" class="post"><span class="avatar" :class="['peach','lavender','mint'][index%3]">{{ post.author.slice(0,1) }}</span><div class="post-body"><div class="post-meta"><strong>{{ post.author }}</strong><span>@{{ post.user_id.slice(0,8) }}</span><time :datetime="post.created_at">{{ when(post.created_at) }}</time></div><p>{{ post.content }}</p><div class="post-actions"><button :class="{liked:post.likes.some(l=>l.user_id===uid)}" :disabled="pending.has(post.id)" :aria-pressed="post.likes.some(l=>l.user_id===uid)" aria-label="いいね" @click="like(post)"><Heart :size="17"/><span>{{ post.likes.length || 'いいね' }}</span></button><button v-if="post.user_id===uid" aria-label="投稿を削除" @click="remove(post)"><Trash2 :size="16"/></button></div></div></article>
   <footer class="feed-end">ひと息ついて、また会いましょう。<Leaf :size="13"/></footer>
  </main>
  <aside class="rightbar"><label class="search-box"><Search :size="18"/><input v-model="query" placeholder="気になることを検索" aria-label="タイムラインを検索"></label><section class="about-card"><span class="tiny-leaf"><Leaf :size="20"/></span><h3>ここは、小さなひだまり。</h3><p>大きなニュースじゃなくてもいい。<br>あなたらしいひとことが、<br>誰かの一日を、ちょっと明るくする。</p><span class="small-label">WELCOME TO KOMOREBI</span></section><section class="topics"><h3>話題を見つける <span>↗</span></h3><button v-for="tag in tags" :key="tag" @click="query=tag;tab='search'"><span>{{ tag }}</span><small>会話をのぞいてみる</small></button><p v-if="!tags.length">投稿に #タグ を添えて、<br>好きなことを共有しよう。</p></section><div class="right-footer">やさしい言葉で、心地よい場所に。<br>© 2026 komorebi</div></aside>

 </div>
</template>
