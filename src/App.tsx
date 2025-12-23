import { Routes, Route } from "react-router-dom";
import Guest from "./components/Guest";
import Host from "./components/Host";
import Home from "./components/Home";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/host" element={<Host />} />
      <Route path="/guest" element={<Guest />} />
    </Routes>
  );
}

export default App;
