import { lazy, Suspense, useEffect, useState } from 'react'
import { initialiseHistory, updateMetadata } from './shell/navigation'
import { resumeOn, resumePath, setResume, watchResume } from './shell/plain'
import { t } from './text'
import Desktop from './desktop/Desktop'
import Phone from './phone/Phone'
import Notepad, { AchievementToast } from './achievements/Notepad'
import TakeoverLayer from './achievements/Takeover'

const Resume = lazy(() => import('./apps/Resume'))

const PHONE_QUERY = '(max-width: 720px)'

function usePhone() {
  const [phone, setPhone] = useState(() => window.matchMedia(PHONE_QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY)
    const on = () => setPhone(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return phone
}

export default function App() {
  const phone = usePhone()
  const [resume, setResumeView] = useState(() => resumeOn())
  useEffect(() => {
    initialiseHistory()
    const restore = () => {
      const plain = resumePath(location.pathname)
      setResumeView(plain)
      if (plain) updateMetadata({ kind: 'markdown', path: '/resume.md', title: 'Resume' })
    }
    const unwatch = watchResume(setResumeView)
    window.addEventListener('popstate', restore)
    window.addEventListener('folioos:navigation', restore)
    if (resumeOn()) {
      if (!resumePath(location.pathname)) setResume(true)
      restore()
    }
    return () => {
      unwatch()
      window.removeEventListener('popstate', restore)
      window.removeEventListener('folioos:navigation', restore)
    }
  }, [])
  if (resume) {
    return (
      <Suspense fallback={<div className="appframe-loading">{t('windows.loading')}</div>}>
        <Resume />
      </Suspense>
    )
  }
  return (
    <>
      {phone ? <Phone /> : <Desktop />}
      <Notepad />
      <AchievementToast />
      <TakeoverLayer />
    </>
  )
}
