import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingLayouts from './layouts/LandingLayouts';
import Home from './pages/landing/Home';
import './App.css'; // Global fonts

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingLayouts />}>
          <Route index element={<Home />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
