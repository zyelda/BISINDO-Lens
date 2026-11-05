import { Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import AboutPage from "@/pages/AboutPage";
import DetectPage from "@/pages/DetectPage";
import GuidePage from "@/pages/GuidePage";
import HomePage from "@/pages/HomePage";
import ModelPage from "@/pages/ModelPage";
import NotFoundPage from "@/pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="deteksi" element={<DetectPage />} />
        <Route path="panduan" element={<GuidePage />} />
        <Route path="model" element={<ModelPage />} />
        <Route path="tentang" element={<AboutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
