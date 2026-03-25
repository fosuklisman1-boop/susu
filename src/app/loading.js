'use client'

export default function Loading() {
  return (
    <div className="loading-container">
      <div className="loading-scene">
        {/* Shadow that scales with height */}
        <div className="coin-shadow"></div>
        
        {/* Flipping and Bouncing Coin */}
        <div className="loading-coin">
          <svg width="80" height="80" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="coinGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="45" fill="url(#coinGold)" stroke="#fef3c7" strokeWidth="2" />
            <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="5 5" />
            <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fontSize="40" fontWeight="900" fill="#451a03">₵</text>
          </svg>
        </div>
      </div>
      
      <p className="loading-text">Loading...</p>

      <style jsx>{`
        .loading-container {
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(15, 23, 42, 0.9);
          backdrop-filter: blur(8px);
          z-index: 10000;
        }

        .loading-scene {
          position: relative;
          height: 150px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 20px;
        }

        .loading-coin {
          animation: bounce-flip 0.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite alternate;
          filter: drop-shadow(0 0 15px rgba(251, 191, 36, 0.4));
          transform-origin: center;
        }

        .coin-shadow {
          position: absolute;
          bottom: 10px;
          width: 40px;
          height: 8px;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 50%;
          filter: blur(4px);
          animation: shadow-scale 0.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite alternate;
        }

        .loading-text {
          margin-top: 24px;
          color: white;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          font-size: 0.8rem;
          opacity: 0.6;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes bounce-flip {
          0% {
            transform: translateY(0) rotateY(0deg);
          }
          100% {
            transform: translateY(-80px) rotateY(180deg);
          }
        }

        @keyframes shadow-scale {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% {
            transform: scale(0.4);
            opacity: 0.2;
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
