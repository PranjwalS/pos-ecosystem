import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import UserPage from "./pages/UserPage";
import Businesses from "./pages/Businesses";
import AddBusiness from "./pages/AddBusiness";         
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import CurrentProduct from "./pages/CurrentProduct";
import AddProduct from "./pages/AddProduct";
import MerchantProducts from "./pages/MerchantProducts";
import MerchantProduct  from "./pages/MerchantProduct";
import MerchantCheckout from "./pages/MerchantCheckout";


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
        <Route path="/:slug/:bizSlug/dashboard" element={<Dashboard />} />
        <Route path="/:slug/:bizSlug/products" element={<Products />} />
        <Route path="/:slug/:bizSlug/products/:productId" element={<CurrentProduct />} />
        <Route path="/:slug/:bizSlug/add-product" element={<AddProduct />} />
        <Route path="/:slug/:bizSlug/merchant/products" element={<MerchantProducts />} />
        <Route path="/:slug/:bizSlug/merchant/products/:productId" element={<MerchantProduct />} />
        <Route path="/:slug/:bizSlug/merchant/checkout" element={<MerchantCheckout />} />
      </Routes>
    </BrowserRouter>
  );
}