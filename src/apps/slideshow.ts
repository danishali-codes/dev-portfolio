/** The gallery's Slideshow button opens the first picture and asks its viewer to start playing. */
let pending = false

export function requestSlideshow() {
  pending = true
}

export function peekSlideshow() {
  return pending
}

export function clearSlideshow() {
  pending = false
}

export const SLIDE_MS = 3500
