import React, { useState, useEffect } from 'react';
import SplashScreen from './components/SplashScreen';
import MainApp from './components/MainApp';
import './App.css';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="App">
      {showSplash ? <SplashScreen /> : <MainApp />}
    </div>
  );
}

export default App;

