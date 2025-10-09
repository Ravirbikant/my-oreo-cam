import { Routes, Route } from "react-router-dom";
import Guest from "./components/Guest";
import Host from "./components/Host";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Host />} />
      <Route path="/guest" element={<Guest />} />
    </Routes>
  );
}

export default App;
