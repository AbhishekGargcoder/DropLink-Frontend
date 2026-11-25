import { Routes, Route } from "react-router-dom";
import DashBoard from "./pages/DashBoard";
import PairDevice from "./pages/PairDevice";
import { useSocket } from "./components/context/SocketContext";
import Share from "./pages/Share";
import { useState, useEffect } from "react";

function App() {
  // if phone is opening this app then always redirect to pair or share page , never redirect it to '/' page
  const [isMobile, setIsMobile] = useState(false);
    let mobileConfig = ["Mobile","Android","iPhone","iPad","iPod","BlackBerry","IEMobile","Opera Mini"];
    
    useEffect(()=>{
      let userAgent = navigator.userAgent;
      userAgent.split(" ").forEach((item) => {
      if(mobileConfig.includes(item)){
        setIsMobile(true);
      }});
    },[])
    console.log("isMobile",isMobile);
  return (
    <div>
          <Routes>
            <Route path="/" element={ isMobile ? <Share /> : <DashBoard />} />   {/* laptop dasboard */}
            <Route path="/pair" element={<PairDevice />} />
            <Route path = "/share" element={<Share />}/>  {/* mobile dashboard */}
          </Routes>
    </div>
  )
}
export default App;