import React, { useState, useEffect, useRef } from 'react';
import { Moon } from 'lucide-react';
import { fetchMoonPhase, fetchApodBanner } from '../services/api';

export default function Navbar() {
  const [moonData, setMoonData] = useState(null);
  const [apodBanner, setApodBanner] = useState(null);
  const [bannerSrc, setBannerSrc] = useState('/banners/banner-main.jpg');
  const [isFading, setIsFading] = useState(false);
  const activeDateRef = useRef(null);
  const activeImageRef = useRef(null);

  useEffect(() => {
    // 1. Fetch Moon Phase Telemetry
    const loadMoon = () => {
      fetchMoonPhase()
        .then(data => setMoonData(data))
        .catch(e => console.warn('[Moon Navbar Error]', e));
    };
    loadMoon();

    // 2. Fetch APOD Daily Banner with seamless preloading & auto-swap
    const loadBanner = () => {
      fetchApodBanner()
        .then(banner => {
          if (banner && banner.imageUrl) {
            const isNewDate = !activeDateRef.current || banner.date !== activeDateRef.current;
            const isNewImage = !activeImageRef.current || banner.imageUrl !== activeImageRef.current;

            if (isNewDate || isNewImage) {
              const img = new Image();
              img.src = banner.imageUrl;
              img.onload = () => {
                // If we already had an active banner displayed, do a smooth fade transition
                if (activeImageRef.current && activeImageRef.current !== banner.imageUrl) {
                  setIsFading(true);
                  setTimeout(() => {
                    activeDateRef.current = banner.date;
                    activeImageRef.current = banner.imageUrl;
                    setApodBanner(banner);
                    setBannerSrc(banner.imageUrl);
                    setIsFading(false);
                  }, 250);
                } else {
                  activeDateRef.current = banner.date;
                  activeImageRef.current = banner.imageUrl;
                  setApodBanner(banner);
                  setBannerSrc(banner.imageUrl);
                }
              };
              img.onerror = () => {
                console.warn('[APOD Banner Image Preload Failed] Keeping current banner.');
              };
            }
          }
        })
        .catch(e => console.warn('[APOD Banner Fetch Error]', e));
    };

    loadBanner();

    // Check every 60 seconds so new day rollovers appear immediately
    const intervalId = setInterval(() => {
      loadBanner();
    }, 60 * 1000);

    // Refresh moon data hourly
    const moonIntervalId = setInterval(loadMoon, 60 * 60 * 1000);

    // Also check immediately when the user returns to or focuses the window/tab
    const handleActive = () => {
      if (!document.hidden) {
        loadBanner();
        loadMoon();
      }
    };
    document.addEventListener('visibilitychange', handleActive);
    window.addEventListener('focus', handleActive);

    return () => {
      clearInterval(intervalId);
      clearInterval(moonIntervalId);
      document.removeEventListener('visibilitychange', handleActive);
      window.removeEventListener('focus', handleActive);
    };
  }, []);

  const bannerTitle = apodBanner?.title || 'EZ HUB - Your Hub. Everything You Need.';
  const apodDate = apodBanner?.date || '';

  return (
    <header className="main-header-banner-container glass-panel" aria-label="EZ HUB - Daily NASA APOD Header">
      <div className="main-header-banner-wrapper">
        <img 
          src={bannerSrc} 
          alt={`EZ HUB Header Banner - ${bannerTitle} (${apodDate})`}
          className="main-header-banner-img"
          style={{
            opacity: isFading ? 0.3 : 1,
            transition: 'opacity 0.25s ease-in-out'
          }}
          loading="eager"
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
