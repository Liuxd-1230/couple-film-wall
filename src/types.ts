export type RouteId = 'home' | 'photos' | 'messages' | 'anniversaries' | 'settings'

export type Couple = {
  id: string
  name: string
  start_date: string
  created_at?: string
}

export type CoupleMember = {
  id: string
  couple_id: string
  user_id: string
  display_name: string
  email: string | null
  avatar_color: string
  created_at?: string
}

export type Photo = {
  id: string
  couple_id: string
  user_id: string
  storage_path: string
  caption: string
  taken_at: string
  tags: string[]
  created_at: string
  signedUrl?: string
}

export type Message = {
  id: string
  couple_id: string
  user_id: string
  content: string
  mood: string
  is_pinned: boolean
  created_at: string
}

export type Anniversary = {
  id: string
  couple_id: string
  title: string
  date: string
  note: string | null
  created_by: string
  created_at: string
}

export type WorkspaceData = {
  couple: Couple
  member: CoupleMember
  photos: Photo[]
  messages: Message[]
  anniversaries: Anniversary[]
}

export type TimelineItem =
  | {
      id: string
      type: 'photo'
      date: string
      title: string
      body: string
      photo: Photo
    }
  | {
      id: string
      type: 'message'
      date: string
      title: string
      body: string
      message: Message
    }
