import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SocketProvider,useSocket } from "./components/context/SocketContext";

createRoot(document.getElementById('root')!).render(
    <SocketProvider>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </SocketProvider>
)
