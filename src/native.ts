import { Capacitor, registerPlugin, type Plugin } from '@capacitor/core'

type PlaybackState = { state: 'playing' | 'paused' | 'off'; text: string; toggle: string; close: string }

type SleepPlugin = Plugin & {
  setState(o: PlaybackState): Promise<void>
  setExitAt(o: { at: number }): Promise<void>
  exit(): Promise<void>
}

const Sleep = registerPlugin<SleepPlugin>('Sleep')
const on = Capacitor.isNativePlatform()
const quiet = (p: Promise<unknown>) => p.catch((e) => console.error('native', e))

export const native = {
  /** Foreground service, wake lock and the notification (its texts come from the page, already translated). */
  setState: (o: PlaybackState) => on && quiet(Sleep.setState(o)),
  /** Native backstop for the sleep timer (0 clears it); closes the app even if the WebView is throttled. */
  setExitAt: (at: number) => on && quiet(Sleep.setExitAt({ at })),
  exit: () => on && quiet(Sleep.exit()),
  /** 'toggle': play/pause pressed in the notification. 'call': a phone call started or ended. Returns an unsubscribe. */
  on(event: 'toggle' | 'call', cb: (data: { active?: boolean }) => void) {
    if (!on) return () => {}
    const handle = Sleep.addListener(event, cb)
    return () => void handle.then((h) => h.remove())
  },
}
