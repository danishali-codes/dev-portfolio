import { useEffect, useState } from 'react'
import { findProject, findReadme } from './fs'
import { pageNode } from './shell/pages'
import { resumeOn, resumePath, setResume, watchResume } from './shell/plain'
import Resume from './apps/Resume'
import { specFor } from './apps/spec'
import Desktop from './desktop/Desktop'
import Phone from './phone/Phone'
import { usePower } from './shell/power'
import { useWindows } from './store/windows'
import Notepad, { AchievementToast } from './achievements/Notepad'
import TakeoverLayer from './achievements/Takeover'

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

/** First visit (and after a restart): terminal open. /projects/<name>: that project's folder and README open too. /cv, /contact, /now and /uses open that file. */
function openStartupWindows() {
  const { windows, open } = useWindows.getState()
  if (windows.length === 0) open({ kind: 'terminal', title: 'Terminal' })
  const page = pageNode()
  if (page) open(specFor(page))
  const match = location.pathname.match(/^\/projects\/([^/]+)/)
  const project = match && findProject(decodeURIComponent(match[1]))
  if (project) {
    open(specFor(project))
    const readme = findReadme(project)
    if (readme) open(specFor(readme))
  }
}

export default function App() {
  const phone = usePhone()
  const boots = usePower((s) => s.boots)
  const [resume, setResumeView] = useState(() => resumeOn())
  useEffect(() => watchResume(setResumeView), [])
  useEffect(() => {
    if (resumePath(location.pathname)) setResume(true)
  }, [])
  useEffect(() => {
    if (!phone && !resume) openStartupWindows()
  }, [phone, boots, resume])
  if (resume) return <Resume />
  return (
    <>
      {phone ? <Phone /> : <Desktop />}
      <Notepad />
      <AchievementToast />
      <TakeoverLayer />
    </>
  )
}
