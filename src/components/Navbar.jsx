import React, { useState, useEffect } from 'react';
import { Moon } from 'lucide-react';
import { fetchMoonPhase } from '../services/api';

export default function Navbar() {
  const [moonData, setMoonData] = useState(null);

  useEffect(() => {
    fetchMoonPhase()
      .then(data => setMoonData(data))
      .catch(e => console.warn('[Moon Navbar Error]', e));
  }, []);

  return (
    <header className="main-header-banner-container glass-panel">
      <div className="main-header-banner-wrapper">
        <img 
          src="/banners/banner-main.jpg" 
          alt="EZ HUB - Your Hub. Everything You Need."
          className="main-header-banner-img"
        />

        {/* NASA SVS Moon Phase Telemetry Pill */}
        {moonData && moonData.image_url && (
          <div 
            className="main-header-moon-pill"
            title={`NASA Scientific Visualization Studio Dial-A-Moon (LRO Telemetry)\nIllumination: ${moonData.phase}%\nMoon Age: ${moonData.age} days`}
          >
            <div className="moon-thumb">
              <img 
                src={moonData.image_url} 
                alt="NASA Moon Phase"
              />
            </div>
            <div className="moon-text">
              <span className="moon-phase">
                <Moon size={12} color="var(--accent-cyan)" />
                {moonData.phase}% Illuminated
              </span>
              <span className="moon-age">
                NASA SVS Age: {moonData.age}d
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

