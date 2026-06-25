import { useEffect } from 'react'
import { useApp } from './store/store'
import { getProfile } from './db/actions'
import Onboarding from './screens/Onboarding'
import BrainDump from './screens/BrainDump'
import Review from './screens/Review'
import Home from './screens/Home'
import StarField from './components/StarField'

export default function App() {
  const view = useApp((s) => s.view)
  const go = useApp((s) => s.go)
  const setFirstDump = useApp((s) => s.setFirstDump)

  useEffect(() => {
    let cancelled = false
    getProfile().then((profile) => {
      if (cancelled) return
      if (!profile || !profile.onboardedAt) {
        go('onboarding')
      } else {
        go('home')
      }
    })
    return () => {
      cancelled = true
    }
  }, [go, setFirstDump])

  return (
    <div className="relative mx-auto flex min-h-full w-full max-w-md flex-1 flex-col overflow-hidden">
      <StarField />
      <div className="relative z-10 flex flex-1 flex-col">
        {view === 'loading' && <Splash />}
        {view === 'onboarding' && <Onboarding />}
        {view === 'dump' && <BrainDump />}
        {view === 'review' && <Review />}
        {view === 'home' && <Home />}
      </div>
    </div>
  )
}

function Splash() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="h-3 w-3 animate-breathe rounded-full bg-nebula-400" />
    </div>
  )
}
