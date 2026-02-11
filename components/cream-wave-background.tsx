export function CreamWaveBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 800"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="wave-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(242, 235, 225)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="rgb(235, 225, 210)" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="wave-gradient-2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(238, 230, 218)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="rgb(230, 220, 205)" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="wave-gradient-3" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="rgb(245, 240, 230)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="rgb(240, 232, 220)" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Static wave paths - no animation for better performance */}
        <path fill="url(#wave-gradient-1)" d="M0,300 Q360,180 720,280 T1440,240 L1440,800 L0,800 Z" />
        <path fill="url(#wave-gradient-2)" d="M0,400 Q360,320 720,380 T1440,340 L1440,800 L0,800 Z" />
        <path fill="url(#wave-gradient-3)" d="M0,500 Q360,420 720,480 T1440,440 L1440,800 L0,800 Z" />
      </svg>
    </div>
  )
}
