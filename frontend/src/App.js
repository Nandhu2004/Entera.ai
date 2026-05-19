import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import SignIn from "./pages/Signin";
import SignUp from "./pages/Signup";
import Dashboard from "./pages/dashboard";
import Vault from "./pages/Vault";
import Chat from "./pages/Chat";
import Upload from "./pages/upload";
import VerifiedEmail from "./verifiedEmail";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/vault"  element={<Vault />} />
        <Route path="/chat"   element={<Chat />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/verified" element={<VerifiedEmail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;