import React, { useState, useEffect } from 'react';
import SplashScreen from './components/SplashScreen';
import MainApp from './components/MainApp';
import './App.css';

function App() {
  const [splashFading, setSplashFading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // At 1.5s: splash starts fading out AND main app starts fading in (overlapping)
    // At 2.0s: splash unmounts (already transparent), main app is fully visible
    const fadeTimer = setTimeout(() => setSplashFading(true), 1500);
    const hideTimer = setTimeout(() => setShowSplash(false), 2000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  return (
    <div className="App">
      {showSplash && <SplashScreen fading={splashFading} />}
      <div className={`main-app-wrapper ${!splashFading ? 'hidden' : showSplash ? 'fading' : 'visible'}`}>
        <MainApp />
      </div>
    </div>
  );
}

export default App;

