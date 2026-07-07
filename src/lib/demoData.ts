import type { WorkspaceData } from '../types'

export const demoWorkspace: WorkspaceData = {
  couple: {
    id: '6f0f95d2-b3a1-47bb-a5d0-061c7180b9ad',
    name: '我们的胶片册',
    start_date: '2022-05-20',
  },
  member: {
    id: 'demo-member',
    couple_id: '6f0f95d2-b3a1-47bb-a5d0-061c7180b9ad',
    user_id: 'demo-user',
    display_name: '小胶片',
    email: 'demo@example.com',
    avatar_color: '#b96f5d',
  },
  photos: [
    {
      id: 'photo-1',
      couple_id: '6f0f95d2-b3a1-47bb-a5d0-061c7180b9ad',
      user_id: 'demo-user',
      storage_path: 'demo/coffee.jpg',
      caption: '第一次一起等一杯很慢的拿铁。',
      taken_at: '2026-06-18',
      tags: ['咖啡', '周末'],
      created_at: '2026-06-18T09:30:00.000Z',
      signedUrl:
        'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 'photo-2',
      couple_id: '6f0f95d2-b3a1-47bb-a5d0-061c7180b9ad',
      user_id: 'demo-user',
      storage_path: 'demo/road.jpg',
      caption: '傍晚的路灯亮起来，刚好在回家的路上。',
      taken_at: '2026-05-21',
      tags: ['散步', '傍晚'],
      created_at: '2026-05-21T11:12:00.000Z',
      signedUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 'photo-3',
      couple_id: '6f0f95d2-b3a1-47bb-a5d0-061c7180b9ad',
      user_id: 'demo-user',
      storage_path: 'demo/flowers.jpg',
      caption: '路边花店把今天装进了纸袋。',
      taken_at: '2026-04-09',
      tags: ['花', '日常'],
      created_at: '2026-04-09T08:20:00.000Z',
      signedUrl:
        'https://images.unsplash.com/photo-1487070183336-b863922373d4?auto=format&fit=crop&w=900&q=80',
    },
  ],
  messages: [
    {
      id: 'message-1',
      couple_id: '6f0f95d2-b3a1-47bb-a5d0-061c7180b9ad',
      user_id: 'demo-user',
      content: '今天也想把最柔软的十分钟留给你。',
      mood: '想你',
      is_pinned: true,
      created_at: '2026-07-05T21:18:00.000Z',
    },
    {
      id: 'message-2',
      couple_id: '6f0f95d2-b3a1-47bb-a5d0-061c7180b9ad',
      user_id: 'demo-user',
      content: '下次出门记得带那台小相机，我们把夏天拍满。',
      mood: '期待',
      is_pinned: false,
      created_at: '2026-06-26T12:00:00.000Z',
    },
  ],
  anniversaries: [
    {
      id: 'anniversary-1',
      couple_id: '6f0f95d2-b3a1-47bb-a5d0-061c7180b9ad',
      title: '在一起纪念日',
      date: '2022-05-20',
      note: '把这一天留在每一年的开头。',
      created_by: 'demo-user',
      created_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'anniversary-2',
      couple_id: '6f0f95d2-b3a1-47bb-a5d0-061c7180b9ad',
      title: '第一次旅行',
      date: '2023-10-03',
      note: '海风、车票、两张没对焦的自拍。',
      created_by: 'demo-user',
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ],
}
