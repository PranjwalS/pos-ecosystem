import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import UserPage from "./pages/UserPage";
import Businesses from "./pages/Businesses";
import AddBusiness from "./pages/AddBusiness";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/:slug" element={<UserPage />} />
        <Route path="/:slug/businesses" element={<Businesses />} />
        <Route path="/:slug/businesses/add" element={<AddBusiness />} />
      </Routes>
    </BrowserRouter>
  );
}