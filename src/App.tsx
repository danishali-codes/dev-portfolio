import { useEffect, useState } from 'react'
import Desktop from './desktop/Desktop'
import Phone from './phone/Phone'
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

export default function App() {
  const phone = usePhone()
  return (
    <>
      {phone ? <Phone /> : <Desktop />}
      <Notepad />
      <AchievementToast />
      <TakeoverLayer />
    </>
  )
}
