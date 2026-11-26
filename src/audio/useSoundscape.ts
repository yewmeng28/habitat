import { useEffect } from 'react'
import { setSoundscapeVolume, startSoundscape, type SoundOptions } from './soundscape'

/** Plays the biome's soundscape while `active` and the player has switched sound or music on. */
export function useSoundscape({ active, biomeId, night, sound, music, volume }: SoundOptions & { active: boolean }) {
  useEffect(() => {
    if (!active || (!sound && !music)) return
    return startSoundscape({ biomeId, night, sound, music, volume })
    // volume is applied live below, so changing it never restarts the sound
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, biomeId, night, sound, music])
  useEffect(() => setSoundscapeVolume(volume), [volume])
}
