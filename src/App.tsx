import { Routes, Route } from "react-router-dom";
import Guest from "./components/Guest";
import Host from "./components/Host";

function App() {
  return (
    <Routes>
      <Route path="/guest" element={<Guest />} />
      <Route path="*" element={<Host />} />
    </Routes>
  );
}

export default App;
