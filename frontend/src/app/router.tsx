import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import DashboardPage from "../pages/dashboard/DashboardPage";
import LoginPage from "../pages/auth/LoginPage";
import ProtectedRoute from "../components/layout/ProtectedRoute";
import SaleListPage from "../pages/sales/SaleListPage";
import SaleDetailPage from "../pages/sales/SaleDetailPage";
import PosPage from "../pages/sales/PosPage";
import CashSessionPage from "../pages/sales/CashSessionPage";
import PurchaseListPage from "../pages/purchases/PurchaseListPage";
import PurchaseDetailPage from "../pages/purchases/PurchaseDetailPage";
import PurchaseFormPage from "../pages/purchases/PurchaseFormPage";
import ProductListPage from "../pages/products/ProductListPage";
import ProductFormPage from "../pages/products/ProductFormPage";
import StockLotListPage from "../pages/stock/StockLotListPage";
import StockMovementListPage from "../pages/stock/StockMovementListPage";
import StockReceiveFormPage from "../pages/stock/StockReceiveFormPage";
import StockAdjustFormPage from "../pages/stock/StockAdjustFormPage";
import ExpenseListPage from "../pages/expenses/ExpenseListPage";
import ExpenseFormPage from "../pages/expenses/ExpenseFormPage";
import ReportsPage from "../pages/reports/ReportsPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />

          <Route path="vendas" element={<SaleListPage />} />
          <Route path="vendas/:id" element={<SaleDetailPage />} />
          <Route path="vendas/novo" element={<PosPage />} />
          <Route path="caixa" element={<CashSessionPage />} />

          <Route path="compras" element={<PurchaseListPage />} />
          <Route path="compras/:id" element={<PurchaseDetailPage />} />
          <Route path="compras/novo" element={<PurchaseFormPage />} />

          <Route path="produtos" element={<ProductListPage />} />
          <Route path="produtos/novo" element={<ProductFormPage />} />
          <Route path="produtos/:id/editar" element={<ProductFormPage />} />

          <Route path="stock/lotes" element={<StockLotListPage />} />
          <Route path="stock/movimentos" element={<StockMovementListPage />} />
          <Route path="stock/receber" element={<StockReceiveFormPage />} />
          <Route path="stock/ajustar" element={<StockAdjustFormPage />} />

          <Route path="despesas" element={<ExpenseListPage />} />
          <Route path="despesas/novo" element={<ExpenseFormPage />} />
          <Route path="despesas/:id/editar" element={<ExpenseFormPage />} />

          <Route path="relatorios" element={<ReportsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
