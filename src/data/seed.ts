import type { AppData, Category, Activity } from '../domain/types';

function id(): string {
  return crypto.randomUUID();
}

export function createExampleSeed(): Pick<AppData, 'categories' | 'activities'> {
  const studyId = id();
  const workId = id();
  const healthId = id();
  const entertainmentId = id();

  const categories: Category[] = [
    { id: studyId, name: 'Study', icon: '📚', color: '#3D6F9A', sortOrder: 0 },
    { id: workId, name: 'Work', icon: '💼', color: '#5C4D8A', sortOrder: 1 },
    { id: healthId, name: 'Health', icon: '🏋️', color: '#2F7D4A', sortOrder: 2 },
    {
      id: entertainmentId,
      name: 'Entertainment',
      icon: '🎮',
      color: '#C47B2B',
      sortOrder: 3,
    },
  ];

  const activities: Activity[] = [
    { id: id(), categoryId: studyId, name: 'Medicine', points: 100, sortOrder: 0 },
    { id: id(), categoryId: studyId, name: 'Reading', points: 70, sortOrder: 1 },
    { id: id(), categoryId: studyId, name: 'Anki', points: 90, sortOrder: 2 },
    { id: id(), categoryId: studyId, name: 'Lectures', points: 85, sortOrder: 3 },
    { id: id(), categoryId: workId, name: 'Real Estate', points: 80, sortOrder: 0 },
    { id: id(), categoryId: workId, name: 'Programming', points: 100, sortOrder: 1 },
    { id: id(), categoryId: workId, name: 'Emails', points: 60, sortOrder: 2 },
    { id: id(), categoryId: workId, name: 'Meetings', points: 50, sortOrder: 3 },
    { id: id(), categoryId: healthId, name: 'Gym', points: 80, sortOrder: 0 },
    { id: id(), categoryId: healthId, name: 'Running', points: 80, sortOrder: 1 },
    { id: id(), categoryId: healthId, name: 'Walking', points: 70, sortOrder: 2 },
    { id: id(), categoryId: healthId, name: 'Sleep', points: 10, sortOrder: 3 },
    { id: id(), categoryId: entertainmentId, name: 'YouTube', points: -20, sortOrder: 0 },
    { id: id(), categoryId: entertainmentId, name: 'Gaming', points: -30, sortOrder: 1 },
    { id: id(), categoryId: entertainmentId, name: 'Social Media', points: -50, sortOrder: 2 },
  ];

  return { categories, activities };
}
