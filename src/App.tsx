import type { FormEvent, PointerEvent, ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  CalendarHeart,
  Camera,
  Film,
  HeartHandshake,
  Home,
  ImagePlus,
  Loader2,
  LogOut,
  MessageCircleHeart,
  Pin,
  RotateCcw,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import './App.css'
import {
  createAnniversary,
  createMessage,
  deletePhoto,
  getCurrentSession,
  listenToAuthChanges,
  loadWorkspace,
  removeAnniversary,
  removeMessage,
  signInWithEmail,
  signOut,
  toggleMessagePin,
  updateCouple,
  uploadPhoto,
  verifyEmailOtp,
} from './lib/data'
import { daysBetween, daysUntilAnnualDate, formatFullDate, formatShortDate, toDateInputValue } from './lib/date'
import { demoWorkspace } from './lib/demoData'
import { prepareImageUpload } from './lib/image'
import { isSupabaseConfigured } from './lib/supabase'
import type { Anniversary, Message, Photo, RouteId, TimelineItem, WorkspaceData } from './types'

type Notice = { type: 'success' | 'error' | 'info'; text: string } | null
const otpMinLength = 6
const otpMaxLength = 8

const routes: Array<{ id: RouteId; label: string; icon: typeof Home }> = [
  { id: 'home', label: '首页', icon: Home },
  { id: 'photos', label: '照片墙', icon: Camera },
  { id: 'messages', label: '留言板', icon: MessageCircleHeart },
  { id: 'anniversaries', label: '纪念日', icon: CalendarHeart },
  { id: 'settings', label: '设置', icon: Settings },
]

function App() {
  const [route, setRoute] = useHashRoute()
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(isSupabaseConfigured ? null : demoWorkspace)
  const [isDemo, setIsDemo] = useState(!isSupabaseConfigured)
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)
  const [notice, setNotice] = useState<Notice>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return
    }

    let mounted = true

    async function boot() {
      try {
        const session = await getCurrentSession()
        if (!mounted) {
          return
        }

        if (session) {
          const loaded = await loadWorkspace(session)
          setWorkspace(loaded)
        } else {
          setWorkspace(null)
        }
      } catch (error) {
        setNotice({ type: 'error', text: getErrorMessage(error) })
      } finally {
        setIsLoading(false)
      }
    }

    const unsubscribe = listenToAuthChanges(async (session) => {
      if (!session) {
        setWorkspace(null)
        return
      }

      setIsLoading(true)
      try {
        setWorkspace(await loadWorkspace(session))
      } catch (error) {
        setNotice({ type: 'error', text: getErrorMessage(error) })
      } finally {
        setIsLoading(false)
      }
    })

    void boot()

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  const setWorkspacePatch = (patch: Partial<WorkspaceData>) => {
    setWorkspace((current) => (current ? { ...current, ...patch } : current))
  }

  const actions = {
    addAnniversary: async (input: { title: string; date: string; note: string }) => {
      if (!workspace) {
        return
      }

      if (isDemo) {
        const anniversary: Anniversary = {
          id: crypto.randomUUID(),
          couple_id: workspace.couple.id,
          created_at: new Date().toISOString(),
          created_by: workspace.member.user_id,
          date: input.date,
          note: input.note || null,
          title: input.title,
        }
        setWorkspacePatch({ anniversaries: [...workspace.anniversaries, anniversary] })
        setNotice({ type: 'success', text: '演示纪念日已加入。' })
        return
      }

      const anniversary = await createAnniversary({
        coupleId: workspace.couple.id,
        userId: workspace.member.user_id,
        ...input,
      })
      setWorkspacePatch({ anniversaries: [...workspace.anniversaries, anniversary] })
      setNotice({ type: 'success', text: '纪念日已保存。' })
    },
    addMessage: async (input: { content: string; mood: string }) => {
      if (!workspace) {
        return
      }

      if (isDemo) {
        const message: Message = {
          id: crypto.randomUUID(),
          content: input.content,
          couple_id: workspace.couple.id,
          created_at: new Date().toISOString(),
          is_pinned: false,
          mood: input.mood || '日常',
          user_id: workspace.member.user_id,
        }
        setWorkspacePatch({ messages: [message, ...workspace.messages] })
        setNotice({ type: 'success', text: '演示留言已贴上墙。' })
        return
      }

      const message = await createMessage({
        content: input.content,
        coupleId: workspace.couple.id,
        mood: input.mood,
        userId: workspace.member.user_id,
      })
      setWorkspacePatch({ messages: [message, ...workspace.messages] })
      setNotice({ type: 'success', text: '留言已贴上墙。' })
    },
    deleteAnniversary: async (id: string) => {
      if (!workspace) {
        return
      }

      if (!isDemo) {
        await removeAnniversary(id)
      }

      setWorkspacePatch({ anniversaries: workspace.anniversaries.filter((anniversary) => anniversary.id !== id) })
      setNotice({ type: 'success', text: '纪念日已删除。' })
    },
    deleteMessage: async (id: string) => {
      if (!workspace) {
        return
      }

      if (!isDemo) {
        await removeMessage(id)
      }

      setWorkspacePatch({ messages: workspace.messages.filter((message) => message.id !== id) })
      setNotice({ type: 'success', text: '留言已删除。' })
    },
    deletePhoto: async (photo: Photo) => {
      if (!workspace) {
        return
      }

      if (!isDemo) {
        await deletePhoto(photo)
      }

      setWorkspacePatch({ photos: workspace.photos.filter((item) => item.id !== photo.id) })
      setNotice({ type: 'success', text: '照片已删除。' })
    },
    enterDemo: () => {
      setIsDemo(true)
      setWorkspace(demoWorkspace)
      setNotice({ type: 'info', text: '当前是本地演示模式，配置 Supabase 后会使用真实数据。' })
    },
    signOut: async () => {
      if (isDemo) {
        setIsDemo(false)
        setWorkspace(null)
        setNotice({ type: 'info', text: '已退出演示模式。' })
        return
      }

      await signOut()
      setWorkspace(null)
    },
    togglePin: async (message: Message) => {
      if (!workspace) {
        return
      }

      const updated = isDemo ? { ...message, is_pinned: !message.is_pinned } : await toggleMessagePin(message)
      setWorkspacePatch({
        messages: workspace.messages.map((item) => (item.id === updated.id ? updated : item)),
      })
    },
    updateCouple: async (input: { name: string; startDate: string }) => {
      if (!workspace) {
        return
      }

      if (isDemo) {
        setWorkspacePatch({
          couple: {
            ...workspace.couple,
            name: input.name,
            start_date: input.startDate,
          },
        })
        setNotice({ type: 'success', text: '演示空间设置已保存。' })
        return
      }

      const couple = await updateCouple({
        coupleId: workspace.couple.id,
        name: input.name,
        startDate: input.startDate,
      })
      setWorkspacePatch({ couple })
      setNotice({ type: 'success', text: '空间设置已保存。' })
    },
    uploadPhoto: async (input: { file: File; caption: string; takenAt: string; tags: string[] }) => {
      if (!workspace) {
        return
      }

      try {
        if (isDemo) {
          const uploadFile = await prepareImageUpload(input.file)
          const photo: Photo = {
            id: crypto.randomUUID(),
            caption: input.caption,
            couple_id: workspace.couple.id,
            created_at: new Date().toISOString(),
            signedUrl: URL.createObjectURL(uploadFile),
            storage_path: `demo/${uploadFile.name}`,
            tags: input.tags,
            taken_at: input.takenAt,
            user_id: workspace.member.user_id,
          }
          setWorkspacePatch({ photos: [photo, ...workspace.photos] })
          setNotice({ type: 'success', text: '演示照片已加入照片墙。' })
          return
        }

        const photo = await uploadPhoto({
          caption: input.caption,
          coupleId: workspace.couple.id,
          file: input.file,
          tags: input.tags,
          takenAt: input.takenAt,
          userId: workspace.member.user_id,
        })
        setWorkspacePatch({ photos: [photo, ...workspace.photos] })
        setNotice({ type: 'success', text: '照片已上传。' })
      } catch (error) {
        setNotice({ type: 'error', text: getErrorMessage(error) })
        throw error
      }
    },
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!workspace) {
    return <LoginScreen onDemo={actions.enterDemo} onNotice={setNotice} notice={notice} />
  }

  return (
    <AppShell
      actions={actions}
      isDemo={isDemo}
      notice={notice}
      onDismissNotice={() => setNotice(null)}
      onNavigate={setRoute}
      route={route}
      workspace={workspace}
    />
  )
}

function useHashRoute(): [RouteId, (next: RouteId) => void] {
  const readRoute = () => {
    const id = window.location.hash.replace('#/', '') as RouteId
    return routes.some((routeItem) => routeItem.id === id) ? id : 'home'
  }
  const [route, setRoute] = useState<RouteId>(readRoute)

  useEffect(() => {
    const onHashChange = () => setRoute(readRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = (next: RouteId) => {
    window.location.hash = `/${next}`
    setRoute(next)
  }

  return [route, navigate]
}

function LoadingScreen() {
  return (
    <main className="loading-screen">
      <Loader2 className="spin" size={34} />
      <p>正在冲洗这卷胶片...</p>
    </main>
  )
}

function LoginScreen({
  notice,
  onDemo,
  onNotice,
}: {
  notice: Notice
  onDemo: () => void
  onNotice: (notice: Notice) => void
}) {
  const [email, setEmail] = useState('')
  const [otpSentTo, setOtpSentTo] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [token, setToken] = useState('')

  const sendCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSending(true)
    try {
      await signInWithEmail(email)
      setOtpSentTo(email)
      setToken('')
      onNotice({ type: 'success', text: '验证码已发送，请在邮箱里查看数字验证码。' })
    } catch (error) {
      onNotice({ type: 'error', text: getErrorMessage(error) })
    } finally {
      setIsSending(false)
    }
  }

  const verifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsVerifying(true)
    try {
      await verifyEmailOtp(otpSentTo, token.replace(/\D/g, ''))
      onNotice({ type: 'success', text: '验证成功，正在进入空间。' })
    } catch (error) {
      onNotice({ type: 'error', text: getErrorMessage(error) })
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="brand-mark">
          <Film size={28} />
        </div>
        <p className="script-label">Our Little Film</p>
        <h1>把两个人的日子，慢慢冲洗出来。</h1>
        <p className="login-copy">私密照片墙、留言板、时间线和纪念日，只给你们两个人进入。</p>

        {isSupabaseConfigured ? (
          <>
            <form className="login-form" onSubmit={sendCode}>
              <label htmlFor="email">邮箱验证码登录</label>
              <div className="field-row">
                <input
                  id="email"
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
                <button disabled={isSending} type="submit">
                  {isSending ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
                  发送验证码
                </button>
              </div>
            </form>
            {otpSentTo ? (
              <form className="login-form otp-form" onSubmit={verifyCode}>
                <label htmlFor="otp">输入邮箱里的数字验证码</label>
                <div className="field-row">
                  <input
                    autoComplete="one-time-code"
                    id="otp"
                    inputMode="numeric"
                    maxLength={otpMaxLength}
                    pattern="[0-9]{6,8}"
                    required
                    value={token}
                    onChange={(event) => setToken(event.target.value.replace(/\D/g, '').slice(0, otpMaxLength))}
                    placeholder="12345678"
                  />
                  <button disabled={isVerifying || token.length < otpMinLength} type="submit">
                    {isVerifying ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
                    验证进入
                  </button>
                </div>
                <p className="form-hint">验证码发送到 {otpSentTo}，不用点击邮件链接。</p>
              </form>
            ) : null}
          </>
        ) : (
          <div className="setup-note">
            <strong>还没有配置 Supabase。</strong>
            <span>先进入演示界面查看完整体验；上线前按 README 配置环境变量和 SQL。</span>
          </div>
        )}

        <button className="ghost-button" type="button" onClick={onDemo}>
          查看演示界面
        </button>
        <NoticeBar notice={notice} onDismiss={() => onNotice(null)} />
      </section>
    </main>
  )
}

function AppShell({
  actions,
  isDemo,
  notice,
  onDismissNotice,
  onNavigate,
  route,
  workspace,
}: {
  actions: {
    addAnniversary: (input: { title: string; date: string; note: string }) => Promise<void>
    addMessage: (input: { content: string; mood: string }) => Promise<void>
    deleteAnniversary: (id: string) => Promise<void>
    deleteMessage: (id: string) => Promise<void>
    deletePhoto: (photo: Photo) => Promise<void>
    signOut: () => Promise<void>
    togglePin: (message: Message) => Promise<void>
    updateCouple: (input: { name: string; startDate: string }) => Promise<void>
    uploadPhoto: (input: { file: File; caption: string; takenAt: string; tags: string[] }) => Promise<void>
  }
  isDemo: boolean
  notice: Notice
  onDismissNotice: () => void
  onNavigate: (route: RouteId) => void
  route: RouteId
  workspace: WorkspaceData
}) {
  const content = {
    anniversaries: (
      <Anniversaries
        anniversaries={workspace.anniversaries}
        onCreate={actions.addAnniversary}
        onDelete={actions.deleteAnniversary}
      />
    ),
    home: <Dashboard workspace={workspace} onNavigate={onNavigate} />,
    messages: (
      <MessageBoard
        messages={workspace.messages}
        onCreate={actions.addMessage}
        onDelete={actions.deleteMessage}
        onTogglePin={actions.togglePin}
      />
    ),
    photos: <PhotoWall photos={workspace.photos} onDelete={actions.deletePhoto} onUpload={actions.uploadPhoto} />,
    settings: <SettingsPage isDemo={isDemo} onSignOut={actions.signOut} onUpdateCouple={actions.updateCouple} workspace={workspace} />,
  } satisfies Record<RouteId, ReactNode>

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="logo-button" type="button" onClick={() => onNavigate('home')}>
          <span className="logo-mark">
            <Film size={22} />
          </span>
          <span>
            <strong>{workspace.couple.name}</strong>
            <small>胶片复古纪念册</small>
          </span>
        </button>
        <nav aria-label="主导航">
          {routes.map((item) => {
            const Icon = item.icon
            return (
              <button
                aria-current={route === item.id ? 'page' : undefined}
                className="nav-button"
                key={item.id}
                onClick={() => onNavigate(item.id)}
                type="button"
              >
                <Icon size={17} />
                {item.label}
              </button>
            )
          })}
        </nav>
      </header>
      <NoticeBar notice={notice} onDismiss={onDismissNotice} />
      {content[route]}
    </div>
  )
}

function Dashboard({ onNavigate, workspace }: { onNavigate: (route: RouteId) => void; workspace: WorkspaceData }) {
  const timeline = useTimeline(workspace.photos, workspace.messages)
  const pinned = workspace.messages.find((message) => message.is_pinned)
  const nextAnniversary = [...workspace.anniversaries].sort(
    (a, b) => daysUntilAnnualDate(a.date) - daysUntilAnnualDate(b.date),
  )[0]

  return (
    <main className="dashboard">
      <section className="hero-panel">
        <div>
          <p className="script-label">Day {daysBetween(workspace.couple.start_date)}</p>
          <h1>今天也在同一卷胶片里。</h1>
          <p>把照片、留言和纪念日收在一个安静的小空间，随时翻回去看看那些发光的普通日子。</p>
        </div>
        <div className="hero-actions">
          <button type="button" onClick={() => onNavigate('photos')}>
            <ImagePlus size={18} />
            上传照片
          </button>
          <button className="secondary-button" type="button" onClick={() => onNavigate('messages')}>
            <MessageCircleHeart size={18} />
            写留言
          </button>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="timeline-column">
          <SectionTitle icon={Sparkles} title="最近冲洗" subtitle="照片和留言按时间混合成一条回忆线" />
          <div className="timeline-list">
            {timeline.slice(0, 6).map((item) => (
              <article className={`timeline-item ${item.type}`} key={item.id}>
                <div className="timeline-dot" />
                <div>
                  <time>{formatFullDate(item.date)}</time>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
                {item.type === 'photo' && item.photo.signedUrl ? (
                  <img alt={item.photo.caption} src={item.photo.signedUrl} />
                ) : null}
              </article>
            ))}
          </div>
        </div>

        <aside className="right-rail">
          <div className="stat-card">
            <span>已经一起</span>
            <strong>{daysBetween(workspace.couple.start_date)}</strong>
            <span>天</span>
          </div>
          {nextAnniversary ? (
            <div className="rail-card">
              <div className="rail-icon">
                <CalendarHeart size={20} />
              </div>
              <small>下一个纪念日</small>
              <h3>{nextAnniversary.title}</h3>
              <p>{daysUntilAnnualDate(nextAnniversary.date)} 天后 · {formatShortDate(nextAnniversary.date)}</p>
            </div>
          ) : null}
          {pinned ? (
            <div className="note-card">
              <Pin size={18} />
              <p>{pinned.content}</p>
              <small>{pinned.mood}</small>
            </div>
          ) : null}
          <div className="rail-card photo-preview">
            <small>照片墙预览</small>
            <div>
              {workspace.photos.slice(0, 4).map((photo) =>
                photo.signedUrl ? <img alt={photo.caption} key={photo.id} src={photo.signedUrl} /> : null,
              )}
            </div>
          </div>
        </aside>
      </section>
    </main>
  )
}

function PhotoWall({
  onDelete,
  onUpload,
  photos,
}: {
  onDelete: (photo: Photo) => Promise<void>
  onUpload: (input: { file: File; caption: string; takenAt: string; tags: string[] }) => Promise<void>
  photos: Photo[]
}) {
  const [activeTag, setActiveTag] = useState('全部')
  const [viewerPhoto, setViewerPhoto] = useState<Photo | null>(null)
  const tags = useMemo(() => ['全部', ...Array.from(new Set(photos.flatMap((photo) => photo.tags)))], [photos])
  const filtered = activeTag === '全部' ? photos : photos.filter((photo) => photo.tags.includes(activeTag))

  return (
    <main className="page-grid">
      <section>
        <SectionTitle icon={Camera} title="照片墙" subtitle="拍立得一样贴上去，日期和标签会帮你们慢慢整理" />
        <div className="tag-filter" aria-label="照片标签筛选">
          {tags.map((tag) => (
            <button className={activeTag === tag ? 'active' : ''} key={tag} onClick={() => setActiveTag(tag)} type="button">
              {tag}
            </button>
          ))}
        </div>
        <div className="photo-masonry">
          {filtered.map((photo, index) => (
            <article className="polaroid-card" key={photo.id} style={{ rotate: `${index % 2 === 0 ? -1.3 : 1.1}deg` }}>
              {photo.signedUrl ? (
                <button className="photo-open-button" type="button" onClick={() => setViewerPhoto(photo)} aria-label={`查看照片：${photo.caption}`}>
                  <img alt={photo.caption} src={photo.signedUrl} />
                </button>
              ) : (
                <div className="image-missing">照片链接过期</div>
              )}
              <div className="polaroid-caption">
                <p>{photo.caption}</p>
                <time>{formatFullDate(photo.taken_at)}</time>
                <div>
                  {photo.tags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
              </div>
              <button className="icon-button danger" title="删除照片" type="button" onClick={() => void onDelete(photo)}>
                <Trash2 size={17} />
              </button>
            </article>
          ))}
        </div>
      </section>
      <PhotoUploadForm onUpload={onUpload} />
      {viewerPhoto ? createPortal(<PhotoViewer photo={viewerPhoto} onClose={() => setViewerPhoto(null)} />, document.body) : null}
    </main>
  )
}

function PhotoViewer({ onClose, photo }: { onClose: () => void; photo: Photo }) {
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 })
  const gestureRef = useRef<{
    distance: number
    scale: number
    x: number
    y: number
    pointers: Map<number, { x: number; y: number }>
  }>({
    distance: 0,
    pointers: new Map(),
    scale: 1,
    x: 0,
    y: 0,
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const resetZoom = () => {
    gestureRef.current = { distance: 0, pointers: new Map(), scale: 1, x: 0, y: 0 }
    setTransform({ scale: 1, x: 0, y: 0 })
  }

  const updatePointer = (event: PointerEvent<HTMLDivElement>) => {
    gestureRef.current.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    updatePointer(event)
    const points = [...gestureRef.current.pointers.values()]
    gestureRef.current = {
      ...gestureRef.current,
      distance: points.length >= 2 ? distanceBetween(points[0], points[1]) : 0,
      scale: transform.scale,
      x: transform.x,
      y: transform.y,
    }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!gestureRef.current.pointers.has(event.pointerId)) {
      return
    }

    const previous = gestureRef.current.pointers.get(event.pointerId)
    updatePointer(event)
    const points = [...gestureRef.current.pointers.values()]

    if (points.length >= 2 && gestureRef.current.distance > 0) {
      const nextScale = clamp((gestureRef.current.scale * distanceBetween(points[0], points[1])) / gestureRef.current.distance, 1, 4)
      setTransform((current) => ({ ...current, scale: nextScale }))
      return
    }

    if (previous && transform.scale > 1) {
      setTransform((current) => ({
        ...current,
        x: current.x + event.clientX - previous.x,
        y: current.y + event.clientY - previous.y,
      }))
    }
  }

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    gestureRef.current.pointers.delete(event.pointerId)
    const points = [...gestureRef.current.pointers.values()]
    gestureRef.current = {
      ...gestureRef.current,
      distance: points.length >= 2 ? distanceBetween(points[0], points[1]) : 0,
      scale: transform.scale,
      x: transform.x,
      y: transform.y,
    }
  }

  return (
    <div className="photo-viewer" role="dialog" aria-modal="true" aria-label="照片查看器">
      <div className="photo-viewer-toolbar">
        <button type="button" onClick={resetZoom} title="重置缩放" aria-label="重置照片缩放">
          <RotateCcw size={18} />
        </button>
        <button type="button" onClick={onClose} title="关闭" aria-label="关闭照片查看器">
          <X size={20} />
        </button>
      </div>
      <div
        className="photo-viewer-stage"
        onDoubleClick={resetZoom}
        onPointerCancel={onPointerUp}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {photo.signedUrl ? (
          <img
            alt={photo.caption}
            draggable={false}
            src={photo.signedUrl}
            style={{ transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})` }}
          />
        ) : null}
      </div>
      <div className="photo-viewer-caption">
        <p>{photo.caption}</p>
        <time>{formatFullDate(photo.taken_at)}</time>
      </div>
    </div>
  )
}

function PhotoUploadForm({
  onUpload,
}: {
  onUpload: (input: { file: File; caption: string; takenAt: string; tags: string[] }) => Promise<void>
}) {
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [tags, setTags] = useState('')
  const [takenAt, setTakenAt] = useState(toDateInputValue())

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file) {
      return
    }

    setIsSaving(true)
    try {
      await onUpload({
        caption,
        file,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        takenAt,
      })
      setCaption('')
      setFile(null)
      setTags('')
    } catch {
      return
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <aside className="side-form">
      <SectionTitle icon={Upload} title="上传一张新胶片" subtitle="会在浏览器里先压缩，再传到 Supabase Storage" />
      <form onSubmit={submit}>
        <label>
          照片
          <input accept="image/*" required type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
        <label>
          一句话
          <textarea required value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="这天的风、光和你" />
        </label>
        <label>
          拍摄日期
          <input required type="date" value={takenAt} onChange={(event) => setTakenAt(event.target.value)} />
        </label>
        <label>
          标签
          <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="咖啡, 周末, 上海" />
        </label>
        <button disabled={isSaving} type="submit">
          {isSaving ? <Loader2 className="spin" size={18} /> : <ImagePlus size={18} />}
          贴到照片墙
        </button>
      </form>
    </aside>
  )
}

function MessageBoard({
  messages,
  onCreate,
  onDelete,
  onTogglePin,
}: {
  messages: Message[]
  onCreate: (input: { content: string; mood: string }) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onTogglePin: (message: Message) => Promise<void>
}) {
  return (
    <main className="page-grid">
      <section>
        <SectionTitle icon={MessageCircleHeart} title="留言板" subtitle="短短一句也可以被认真保存" />
        <div className="message-stack">
          {messages.map((message) => (
            <article className={message.is_pinned ? 'message-card pinned' : 'message-card'} key={message.id}>
              <div className="message-meta">
                <span>{message.mood}</span>
                <time>{formatFullDate(message.created_at)}</time>
              </div>
              <p>{message.content}</p>
              <div className="card-actions">
                <button type="button" onClick={() => void onTogglePin(message)}>
                  <Pin size={16} />
                  {message.is_pinned ? '取消置顶' : '置顶'}
                </button>
                <button className="text-danger" type="button" onClick={() => void onDelete(message.id)}>
                  <Trash2 size={16} />
                  删除
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <MessageForm onCreate={onCreate} />
    </main>
  )
}

function MessageForm({ onCreate }: { onCreate: (input: { content: string; mood: string }) => Promise<void> }) {
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [mood, setMood] = useState('想你')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    try {
      await onCreate({ content, mood })
      setContent('')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <aside className="side-form">
      <SectionTitle icon={HeartHandshake} title="写一张纸条" subtitle="置顶后会出现在首页右侧" />
      <form onSubmit={submit}>
        <label>
          心情
          <input required value={mood} onChange={(event) => setMood(event.target.value)} />
        </label>
        <label>
          留言
          <textarea required value={content} onChange={(event) => setContent(event.target.value)} placeholder="今天想对你说..." />
        </label>
        <button disabled={isSaving} type="submit">
          {isSaving ? <Loader2 className="spin" size={18} /> : <MessageCircleHeart size={18} />}
          贴上留言板
        </button>
      </form>
    </aside>
  )
}

function Anniversaries({
  anniversaries,
  onCreate,
  onDelete,
}: {
  anniversaries: Anniversary[]
  onCreate: (input: { title: string; date: string; note: string }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  return (
    <main className="page-grid">
      <section>
        <SectionTitle icon={CalendarHeart} title="纪念日" subtitle="重要的日子会在首页提醒下一次到来" />
        <div className="anniversary-grid">
          {anniversaries.map((anniversary) => (
            <article className="anniversary-card" key={anniversary.id}>
              <small>{formatFullDate(anniversary.date)}</small>
              <h3>{anniversary.title}</h3>
              <p>{anniversary.note || '这一天本身就值得被留下。'}</p>
              <strong>{daysUntilAnnualDate(anniversary.date)} 天后</strong>
              <button className="icon-button danger" title="删除纪念日" type="button" onClick={() => void onDelete(anniversary.id)}>
                <Trash2 size={17} />
              </button>
            </article>
          ))}
        </div>
      </section>
      <AnniversaryForm onCreate={onCreate} />
    </main>
  )
}

function AnniversaryForm({ onCreate }: { onCreate: (input: { title: string; date: string; note: string }) => Promise<void> }) {
  const [date, setDate] = useState(toDateInputValue())
  const [isSaving, setIsSaving] = useState(false)
  const [note, setNote] = useState('')
  const [title, setTitle] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    try {
      await onCreate({ date, note, title })
      setNote('')
      setTitle('')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <aside className="side-form">
      <SectionTitle icon={CalendarHeart} title="加入新日期" subtitle="比如第一次见面、旅行、搬家或约定" />
      <form onSubmit={submit}>
        <label>
          名称
          <input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="第一次旅行" />
        </label>
        <label>
          日期
          <input required type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label>
          备注
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="这天发生了什么？" />
        </label>
        <button disabled={isSaving} type="submit">
          {isSaving ? <Loader2 className="spin" size={18} /> : <CalendarHeart size={18} />}
          保存纪念日
        </button>
      </form>
    </aside>
  )
}

function SettingsPage({
  isDemo,
  onSignOut,
  onUpdateCouple,
  workspace,
}: {
  isDemo: boolean
  onSignOut: () => Promise<void>
  onUpdateCouple: (input: { name: string; startDate: string }) => Promise<void>
  workspace: WorkspaceData
}) {
  return (
    <main className="settings-page">
      <SectionTitle icon={Settings} title="设置" subtitle="这里放上线前检查和当前成员信息" />
      <div className="settings-grid">
        <article className="settings-card">
          <h3>当前空间</h3>
          <dl>
            <div>
              <dt>名称</dt>
              <dd>{workspace.couple.name}</dd>
            </div>
            <div>
              <dt>开始日期</dt>
              <dd>{formatFullDate(workspace.couple.start_date)}</dd>
            </div>
            <div>
              <dt>成员</dt>
              <dd>{workspace.member.display_name}</dd>
            </div>
          </dl>
        </article>
        <CoupleSettingsForm onSave={onUpdateCouple} workspace={workspace} />
        <article className="settings-card">
          <h3>上线检查</h3>
          <ul className="check-list">
            <li>Supabase Auth 开启 Email OTP</li>
            <li>执行 `supabase/migrations/20260707000000_initial_schema.sql`</li>
            <li>创建两位成员的 `couple_members` 记录</li>
            <li>GitHub Secrets 写入 Supabase URL 和 publishable key</li>
          </ul>
        </article>
      </div>
      {isDemo ? <p className="demo-ribbon">当前是演示模式，刷新后会恢复到内置示例数据。</p> : null}
      <button className="logout-button" type="button" onClick={() => void onSignOut()}>
        <LogOut size={18} />
        {isDemo ? '退出演示' : '退出登录'}
      </button>
    </main>
  )
}

function CoupleSettingsForm({
  onSave,
  workspace,
}: {
  onSave: (input: { name: string; startDate: string }) => Promise<void>
  workspace: WorkspaceData
}) {
  const [isSaving, setIsSaving] = useState(false)
  const [name, setName] = useState(workspace.couple.name)
  const [startDate, setStartDate] = useState(workspace.couple.start_date)

  useEffect(() => {
    setName(workspace.couple.name)
    setStartDate(workspace.couple.start_date)
  }, [workspace.couple.name, workspace.couple.start_date])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    try {
      await onSave({ name, startDate })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <article className="settings-card">
      <h3>自己设置纪念起点</h3>
      <p className="settings-copy">首页的相恋天数会按这里的日期计算；其他纪念日可以在“纪念日”页面继续添加。</p>
      <form className="settings-form" onSubmit={submit}>
        <label>
          空间名称
          <input required value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          在一起日期
          <input required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </label>
        <button disabled={isSaving} type="submit">
          {isSaving ? <Loader2 className="spin" size={18} /> : <CalendarHeart size={18} />}
          保存设置
        </button>
      </form>
    </article>
  )
}

function SectionTitle({ icon: Icon, subtitle, title }: { icon: typeof Camera; subtitle: string; title: string }) {
  return (
    <div className="section-title">
      <span>
        <Icon size={19} />
      </span>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  )
}

function NoticeBar({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) {
  if (!notice) {
    return null
  }

  return (
    <div className={`notice ${notice.type}`}>
      <span>{notice.text}</span>
      <button type="button" onClick={onDismiss}>
        知道了
      </button>
    </div>
  )
}

function useTimeline(photos: Photo[], messages: Message[]) {
  return useMemo<TimelineItem[]>(() => {
    const photoItems: TimelineItem[] = photos.map((photo) => ({
      body: photo.caption,
      date: photo.taken_at,
      id: `photo-${photo.id}`,
      photo,
      title: '新照片',
      type: 'photo',
    }))
    const messageItems: TimelineItem[] = messages.map((message) => ({
      body: message.content,
      date: message.created_at,
      id: `message-${message.id}`,
      message,
      title: message.is_pinned ? '置顶留言' : '新留言',
      type: 'message',
    }))

    return [...photoItems, ...messageItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [messages, photos])
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return '操作失败，请稍后再试。'
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function distanceBetween(first: { x: number; y: number }, second: { x: number; y: number }) {
  return Math.hypot(first.x - second.x, first.y - second.y)
}

export default App
