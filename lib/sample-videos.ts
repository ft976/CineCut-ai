export interface SampleVideo {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: number; // in seconds
  thumbnail: string;
  videoUrl: string;
}

export const SAMPLE_VIDEOS: SampleVideo[] = [
  {
    id: 'sample-ocean-nature',
    title: 'Cinematic Ocean & Coastal Flight',
    description: 'High-definition 4K aerial footage of ocean waves, coastal cliffs, and island landscapes.',
    category: 'Nature & Film',
    duration: 120, // 2 minutes
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  },
  {
    id: 'sample-action-trailer',
    title: 'Cyberpunk Action Movie Sequence',
    description: 'Sci-fi futuristic city action trailer with intense pacing and sound design.',
    category: 'Movie & Action',
    duration: 180, // 3 minutes
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  },
  {
    id: 'sample-podcast-interview',
    title: 'Tech & AI Future Discussion',
    description: 'Dynamic interview clip discussion ideal for testing 1-minute vertical TikTok/Shorts auto-cuts.',
    category: 'Podcast & Talk',
    duration: 60, // 1 minute
    thumbnail: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  },
];
