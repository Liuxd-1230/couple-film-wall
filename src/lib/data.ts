import type { Session } from '@supabase/supabase-js'
import { compressImage } from './image'
import { photoBucket, requireSupabase } from './supabase'
import type { Anniversary, Couple, CoupleMember, Message, Photo, WorkspaceData } from '../types'

type MemberWithCouple = CoupleMember & {
  couples: Couple | null
}

export async function getCurrentSession() {
  const client = requireSupabase()
  const {
    data: { session },
    error,
  } = await client.auth.getSession()

  if (error) {
    throw error
  }

  return session
}

export function listenToAuthChanges(onChange: (session: Session | null) => void) {
  const client = requireSupabase()
  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((_event, session) => onChange(session))

  return () => subscription.unsubscribe()
}

export async function signInWithEmail(email: string) {
  const client = requireSupabase()
  const redirectTo = `${window.location.origin}${window.location.pathname}`
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  })

  if (error) {
    throw error
  }
}

export async function signOut() {
  const client = requireSupabase()
  const { error } = await client.auth.signOut()

  if (error) {
    throw error
  }
}

export async function loadWorkspace(session: Session): Promise<WorkspaceData | null> {
  const client = requireSupabase()
  const { data: member, error: memberError } = await client
    .from('couple_members')
    .select('*, couples(*)')
    .eq('user_id', session.user.id)
    .maybeSingle<MemberWithCouple>()

  if (memberError) {
    throw memberError
  }

  if (!member?.couples) {
    return null
  }

  const [photos, messages, anniversaries] = await Promise.all([
    fetchPhotos(member.couple_id),
    fetchMessages(member.couple_id),
    fetchAnniversaries(member.couple_id),
  ])

  return {
    couple: member.couples,
    member,
    photos,
    messages,
    anniversaries,
  }
}

export async function fetchPhotos(coupleId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('photos')
    .select('*')
    .eq('couple_id', coupleId)
    .order('taken_at', { ascending: false })
    .returns<Photo[]>()

  if (error) {
    throw error
  }

  return Promise.all(
    (data ?? []).map(async (photo) => {
      const { data: signed } = await client.storage.from(photoBucket).createSignedUrl(photo.storage_path, 60 * 60)

      return { ...photo, signedUrl: signed?.signedUrl }
    }),
  )
}

export async function fetchMessages(coupleId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('messages')
    .select('*')
    .eq('couple_id', coupleId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .returns<Message[]>()

  if (error) {
    throw error
  }

  return data ?? []
}

export async function fetchAnniversaries(coupleId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anniversaries')
    .select('*')
    .eq('couple_id', coupleId)
    .order('date', { ascending: true })
    .returns<Anniversary[]>()

  if (error) {
    throw error
  }

  return data ?? []
}

export async function uploadPhoto(input: {
  coupleId: string
  userId: string
  file: File
  caption: string
  takenAt: string
  tags: string[]
}) {
  const client = requireSupabase()
  const compressed = await compressImage(input.file)
  const path = `${input.coupleId}/${input.userId}/${crypto.randomUUID()}.jpg`
  const { error: uploadError } = await client.storage.from(photoBucket).upload(path, compressed, {
    contentType: compressed.type,
    upsert: false,
  })

  if (uploadError) {
    throw uploadError
  }

  const { data, error } = await client
    .from('photos')
    .insert({
      caption: input.caption.trim(),
      couple_id: input.coupleId,
      storage_path: path,
      tags: input.tags,
      taken_at: input.takenAt,
      user_id: input.userId,
    })
    .select('*')
    .single<Photo>()

  if (error) {
    await client.storage.from(photoBucket).remove([path])
    throw error
  }

  const { data: signed } = await client.storage.from(photoBucket).createSignedUrl(path, 60 * 60)

  return { ...data, signedUrl: signed?.signedUrl }
}

export async function deletePhoto(photo: Photo) {
  const client = requireSupabase()
  const { error: storageError } = await client.storage.from(photoBucket).remove([photo.storage_path])

  if (storageError) {
    throw storageError
  }

  const { error } = await client.from('photos').delete().eq('id', photo.id)

  if (error) {
    throw error
  }
}

export async function createMessage(input: { coupleId: string; userId: string; content: string; mood: string }) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('messages')
    .insert({
      content: input.content.trim(),
      couple_id: input.coupleId,
      mood: input.mood.trim() || '日常',
      user_id: input.userId,
    })
    .select('*')
    .single<Message>()

  if (error) {
    throw error
  }

  return data
}

export async function toggleMessagePin(message: Message) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('messages')
    .update({ is_pinned: !message.is_pinned })
    .eq('id', message.id)
    .select('*')
    .single<Message>()

  if (error) {
    throw error
  }

  return data
}

export async function removeMessage(id: string) {
  const client = requireSupabase()
  const { error } = await client.from('messages').delete().eq('id', id)

  if (error) {
    throw error
  }
}

export async function createAnniversary(input: {
  coupleId: string
  userId: string
  title: string
  date: string
  note: string
}) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('anniversaries')
    .insert({
      couple_id: input.coupleId,
      created_by: input.userId,
      date: input.date,
      note: input.note.trim() || null,
      title: input.title.trim(),
    })
    .select('*')
    .single<Anniversary>()

  if (error) {
    throw error
  }

  return data
}

export async function removeAnniversary(id: string) {
  const client = requireSupabase()
  const { error } = await client.from('anniversaries').delete().eq('id', id)

  if (error) {
    throw error
  }
}
