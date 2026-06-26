/**
 * A very quiet nebula backdrop — soft glows, a few faint stars. Purely ambient,
 * deliberately understated so it never competes with the content.
 */
export default function StarField() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-space-800" />
      <div
        className="absolute -left-24 -top-24 h-80 w-80 rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, #7c3aed55, transparent 70%)' }}
      />
      <div
        className="absolute -right-20 top-40 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #4338ca55, transparent 70%)' }}
      />
      <div
        className="absolute bottom-[-6rem] left-1/3 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #8b5cf644, transparent 70%)' }}
      />
    </div>
  )
}
