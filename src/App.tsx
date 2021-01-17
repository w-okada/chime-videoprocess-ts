import React from 'react';
import './App.css';
import { Chime } from './components/Chime';
import { AppStateProvider } from './providers/AppStateProvider';
import { DeviceStateProvider } from './providers/DeviceStateProvider';
import { MeetingStateProvider } from './providers/MeetingProvider';

function App() {
  return (
    <div className="App" style={{height:"100%", width:"100%"}}>
      <DeviceStateProvider>
        <AppStateProvider>
          <MeetingStateProvider>
          <Chime />
          </MeetingStateProvider>
        </AppStateProvider>
      </DeviceStateProvider>
    </div>
  );
}

export default App;
