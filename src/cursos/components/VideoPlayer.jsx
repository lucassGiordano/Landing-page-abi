export default function VideoPlayer({ provider, videoRef, title }) {
  if (provider === 'youtube') {
    return (
      <div style={{ position: 'relative', paddingTop: '56.25%' }}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoRef}?rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
        />
      </div>
    )
  }
  return <p>Este video usa un proveedor que todavía no está disponible.</p>
}