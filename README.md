# My Oreo Cam

A simple peer-to-peer video calling application built with WebRTC technology. Connect with anyone in real-time through your browser.

## Tech Stack

- **React** - UI framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool
- **Firebase Firestore** - Signaling server for WebRTC
- **WebRTC** - Peer-to-peer video/audio communication
- **React Router** - Navigation
- **React Icons** - UI icons
- **Screenfull** - Fullscreen API

## Getting Started

### Installation

```bash
npm install
npm run dev
```

### Usage

#### As Host

1. Click **"Create Room"** to start a new video call
2. Share the **Room ID** or copy the guest link
3. Wait for the guest to join
4. Use controls to toggle video/audio, fullscreen, or end the call

#### As Guest

1. Navigate to the guest page or use the shared link
2. Enter the **Room ID** provided by the host
3. Click **"Enter Room"** to join the call
4. Use controls to toggle video/audio, fullscreen, or end the call

## Features

- Real-time peer-to-peer video calling
- Audio/video toggle controls
- Fullscreen mode
- Easy room sharing with copy-to-clipboard
- Automatic reconnection handling
- Mobile-friendly responsive design
