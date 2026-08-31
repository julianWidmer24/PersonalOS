import type { WorkoutLog, WorkoutRoutineData } from '../types';
import { resolveDay } from '../hooks/usePhysical';
import type { LightboxPhoto } from '../components/shared/PhotoLightbox';

export interface WorkoutGallery {
  photos: LightboxPhoto[];
  /** day key (YYYY-MM-DD) → position in `photos` */
  indexByKey: Map<string, number>;
}

/**
 * Every workout photo in the log, oldest first, so the lightbox is one
 * continuous carousel across the whole history rather than per-month islands.
 */
export function buildWorkoutGallery(routine: WorkoutRoutineData, log: WorkoutLog): WorkoutGallery {
  const keys = Object.keys(log.entries).filter(k => log.entries[k]?.photo).sort();
  const indexByKey = new Map<string, number>();
  const photos = keys.map<LightboxPhoto>((k, i) => {
    indexByKey.set(k, i);
    const [y, m, d] = k.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const day = resolveDay(routine, log, date);
    return {
      src: log.entries[k]!.photo!,
      label: date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }),
      meta: day.entry?.confirmed ? `${day.name} · done` : day.name,
    };
  });
  return { photos, indexByKey };
}
