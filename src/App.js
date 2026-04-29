import React, { useState, useEffect } from 'react';
import SplashScreen from './components/SplashScreen';
import MainApp from './components/MainApp';
import './App.css';

function App() {
  const [splashFading, setSplashFading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
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
      <div className={`main-app-wrapper ${showSplash ? 'hidden' : 'visible'}`}>
        <MainApp />
      </div>
    </div>
  );
}

export default App;

